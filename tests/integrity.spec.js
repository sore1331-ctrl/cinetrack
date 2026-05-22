const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadUserDataHelpers() {
  const source = fs.readFileSync(path.join(root, 'api', 'user-data.js'), 'utf8');
  const start = source.indexOf('function entryKey');
  const end = source.indexOf('async function backupExistingUserData');
  const sandbox = {};
  vm.runInNewContext(`${source.slice(start, end)}; helpers = { mergeLibraries, buildProgressEvents };`, sandbox);
  return sandbox.helpers;
}

function loadStorageModel(storage) {
  const source = fs.readFileSync(path.join(root, 'scripts', 'storage-model.js'), 'utf8');
  const sandbox = {
    console,
    window: {
      CineTrack: {},
      localStorage: storage,
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.storage;
}

function loadSourceModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'source-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.sources;
}

function loadProgressModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'progress-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.progress;
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: key => { data.delete(key); },
    dump: () => Object.fromEntries(data.entries()),
  };
}

test.describe('tracker data integrity', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Run integrity checks once.');
  });

  test('stale cloud saves preserve stronger existing progress and missing entries', () => {
    const { mergeLibraries } = loadUserDataHelpers();
    const existing = [
      {
        id: 'cloud-watched',
        mediaType: 'tv',
        tmdbId: 123,
        title: 'Safe Show',
        status: 'watched',
        totalEpisodes: 8,
        watchedEpisodes: 8,
        seasons: [{ number: 1, total: 8, watched: 8 }],
      },
      { id: 'cloud-only', mediaType: 'movie', tmdbId: 456, title: 'Cloud Only', status: 'watched', rating: 7 },
    ];
    const incoming = [
      {
        id: 'stale-watchlist',
        mediaType: 'tv',
        tmdbId: 123,
        title: 'Safe Show',
        status: 'watchlist',
        totalEpisodes: 8,
        watchedEpisodes: 0,
        seasons: [{ number: 1, total: 8, watched: 0 }],
      },
    ];

    const merged = mergeLibraries(existing, incoming, {
      keepMissingExisting: true,
      protectExistingProgress: true,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(expect.objectContaining({
      status: 'watched',
      watchedEpisodes: 8,
      totalEpisodes: 8,
    }));
    expect(merged.some(movie => movie.id === 'cloud-only')).toBeTruthy();
  });

  test('fresh cloud saves allow intentional status downgrades', () => {
    const { mergeLibraries } = loadUserDataHelpers();
    const existing = [{
      id: 'cloud-watched',
      mediaType: 'movie',
      tmdbId: 123,
      title: 'Intentional Change',
      status: 'watched',
      rating: 9,
    }];
    const incoming = [{
      id: 'same-title',
      mediaType: 'movie',
      tmdbId: 123,
      title: 'Intentional Change',
      status: 'watchlist',
      rating: 0,
    }];

    const merged = mergeLibraries(existing, incoming, {
      keepMissingExisting: false,
      protectExistingProgress: false,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(expect.objectContaining({
      status: 'watchlist',
      rating: 0,
    }));
  });

  test('incoming duplicate rows collapse by source key before saving', () => {
    const { mergeLibraries } = loadUserDataHelpers();
    const incoming = [
      { id: 'first', mediaType: 'tv', tmdbId: 999, title: 'Duplicate Show', status: 'in_progress', watchedEpisodes: 4, totalEpisodes: 10 },
      { id: 'second', mediaType: 'tv', tmdbId: 999, title: 'Duplicate Show', status: 'watchlist', watchedEpisodes: 0, totalEpisodes: 10 },
    ];

    const merged = mergeLibraries([], incoming, {
      keepMissingExisting: false,
      protectExistingProgress: false,
      protectIncomingDuplicates: true,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(expect.objectContaining({
      id: 'second',
      status: 'in_progress',
      watchedEpisodes: 4,
    }));
  });

  test('missing client baseline is treated as stale when cloud already exists', () => {
    const api = fs.readFileSync(path.join(root, 'api', 'user-data.js'), 'utf8');

    expect(api).toContain('const hasCloudBaseline = Number.isFinite(existingTime);');
    expect(api).toContain('const hasClientBaseline = Number.isFinite(baseTime);');
    expect(api).toContain('hasCloudBaseline && (!hasClientBaseline || existingTime > baseTime)');
  });

  test('cloud saves use optimistic versions and conflict instead of blind overwrite', () => {
    const api = fs.readFileSync(path.join(root, 'api', 'user-data.js'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(api).toContain('base_version');
    expect(api).toContain('versionMismatch');
    expect(api).toContain('&version=eq.${encodeURIComponent(existingVersion)}');
    expect(api).toContain("return json(res, 409");
    expect(app).toContain('base_version: lastCloudVersion');
    expect(app).toContain('lastCloudVersion = Number(result.version');
  });

  test('progress events capture append-only audit changes', () => {
    const { buildProgressEvents } = loadUserDataHelpers();
    const before = [{
      id: 'same-title',
      mediaType: 'tv',
      tmdbId: 777,
      title: 'Audited Show',
      status: 'in_progress',
      watchedEpisodes: 6,
      totalEpisodes: 8,
    }];
    const after = [{
      id: 'same-title',
      mediaType: 'tv',
      tmdbId: 777,
      title: 'Audited Show',
      status: 'watched',
      watchedEpisodes: 8,
      totalEpisodes: 8,
    }];

    const events = buildProgressEvents({
      userId: '00000000-0000-0000-0000-000000000001',
      beforeMovies: before,
      afterMovies: after,
      saveId: '00000000-0000-0000-0000-000000000002',
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      item_key: 'tv:tmdb:777',
      event_type: 'status_changed',
      title: 'Audited Show',
    }));
    expect(events[0].before_value).toEqual(expect.objectContaining({ status: 'in_progress', watchedEpisodes: 6 }));
    expect(events[0].after_value).toEqual(expect.objectContaining({ status: 'watched', watchedEpisodes: 8 }));
  });

  test('tracked TV calendar uses TVMaze data for card highlights', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const tvmazeApi = fs.readFileSync(path.join(root, 'api', 'tvmaze-calendar.js'), 'utf8');

    expect(app).toContain('async function fetchTvmazeCalendarForEntries');
    expect(app).toContain("cache.byId?.[key]?.source === 'tvmaze'");
    expect(app).toContain('mergeUpcomingCache(results)');
    expect(app).toContain('tvmazeUpcoming = await fetchTvmazeCalendarForEntries(tracked, { force });');
    expect(tvmazeApi).toContain('findCalendarEpisode');
    expect(tvmazeApi).toContain('ep.airdate >= today && ep.airdate <= horizon');
  });

  test('tracked calendar only renders confirmed future dates', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const tvmazeApi = fs.readFileSync(path.join(root, 'api', 'tvmaze-calendar.js'), 'utf8');

    expect(app).toContain('Calendar only shows confirmed future dates');
    expect(app).toContain('if (!row.date) return;');
    expect(app).toContain('ne.airDate >= todayStr && ne.airDate <= tvHorizonStr');
    expect(app).not.toContain('Between seasons / no date yet');
    expect(app).not.toContain('No date scheduled');
    expect(tvmazeApi).toContain('if (!episode) return null;');
  });

  test('anime recommendations prefer AniList before TMDB fallback', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const externalApi = fs.readFileSync(path.join(root, 'api', 'external.js'), 'utf8');

    expect(externalApi).toContain("if (action === 'match')");
    expect(app).toContain("provider: 'anilist'");
    expect(app).toContain("action: 'match'");
    expect(app).toContain('async function fetchAnilistRecommendationResults');
    expect(app).toContain("'anilist-first'");
    expect(app.indexOf("if (scope === 'anime')")).toBeLessThan(app.indexOf('const tmdbSeededPool = seededPool.filter'));
  });

  test('recommendations use controlled seeds and post-fetch scoring', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('function selectRecommendationSeeds');
    expect(app).toContain('function rankRecommendationResults');
    expect(app).toContain('function scoreRecommendation');
    expect(app).toContain('function dismissedRecProfile');
    expect(app).toContain('function visibleRecommendationCount');
    expect(app).toContain('visibleRecommendationCount(cache.results, scope) >= 6');
    expect(app).toContain('const sample = selectRecommendationSeeds');
    expect(app).not.toContain('const sample = pickRandom');
  });

  test('recommendation refresh rotates seeds and bypasses request cache', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('function recommendationRefreshIndex');
    expect(app).toContain('const refreshIndex = recommendationRefreshIndex(scope, force);');
    expect(app).toContain('selectRecommendationSeeds(topPool, Math.min(8, topPool.length), refreshIndex, force)');
    expect(app).toContain('function rotateForcedRecommendations');
    expect(app).toContain('rotateForcedRecommendations(results, refreshIndex, force)');
    expect(app).toContain("params.set('_', String(Date.now()))");
    expect(app).toContain("{ cache: force ? 'no-store' : 'default' }");
  });

  test('recommendations render ten cards per page', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const RECS_VISIBLE_LIMIT = 10;');
    expect(app).toContain('if (recs.length >= RECS_VISIBLE_LIMIT) break;');
    expect(app).not.toContain('if (recs.length >= 18) break;');
  });

  test('unsafe sync fallback and fail-open backup patterns are absent', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const api = fs.readFileSync(path.join(root, 'api', 'user-data.js'), 'utf8');
    const saveFallback = app.slice(app.indexOf('async function saveUserDataWithFallback'), app.indexOf('async function loadUserData', app.indexOf('async function saveUserDataWithFallback')));
    const backupFn = api.slice(api.indexOf('async function backupExistingUserData'), api.indexOf('export default async function handler'));

    expect(saveFallback).not.toContain('saveUserDataDirect(payload)');
    expect(backupFn).not.toContain('catch');
    expect(api).toContain('Date.parse(existingRow?.updated_at');
    expect(app).toContain('if (!backedUpLocal && force)');
    expect(api).toContain("await supabaseRequest('progress_events'");
  });

  test('storage model ignores corrupt arrays and trims local backups', () => {
    const storage = memoryStorage({
      broken: '{bad json',
      backups: JSON.stringify([{ reason: 'old-a' }, { reason: 'old-b' }]),
    });
    const model = loadStorageModel(storage);

    expect(model.readArray('broken', storage)).toEqual([]);
    expect(model.writeLibraryBackup({
      key: 'backups',
      reason: 'before-cloud-save',
      movies: [{ id: 'one', title: 'Safe Title' }],
      cloudUpdatedAt: '2026-05-22T10:00:00.000Z',
      cloudVersion: 4,
      maxBackups: 2,
      storage,
    })).toBe(true);

    const saved = JSON.parse(storage.getItem('backups'));
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual(expect.objectContaining({
      reason: 'before-cloud-save',
      cloudVersion: 4,
      itemCount: 1,
    }));
    expect(saved[0].movies).toEqual([{ id: 'one', title: 'Safe Title' }]);
  });

  test('storage model records and clears pending sync markers', () => {
    const storage = memoryStorage();
    const model = loadStorageModel(storage);

    model.markPendingSync('pending', {
      reason: 'episode-progress',
      itemCount: 12,
      storage,
    });

    expect(model.readPendingSyncMarker('pending', storage)).toEqual(expect.objectContaining({
      reason: 'episode-progress',
      itemCount: 12,
    }));

    model.clearPendingSyncMarker('pending', storage);
    expect(model.readPendingSyncMarker('pending', storage)).toBeNull();
  });

  test('source model normalizes poster and metadata links', () => {
    const model = loadSourceModel();

    expect(model.posterUrl('/abc.jpg', 'https://image.tmdb.org/t/p/w200')).toBe('https://image.tmdb.org/t/p/w200/abc.jpg');
    expect(model.posterUrl('https://cdn.example/poster.jpg', 'https://image.tmdb.org/t/p/w200')).toBe('https://cdn.example/poster.jpg');
    expect(model.sourceForEntry({ tmdbId: 42, externalSource: 'anilist' })).toBe('tmdb');
    expect(model.sourceForEntry({ externalSource: 'anilist' })).toBe('anilist');
    expect(model.infoUrlForEntry({ tmdbId: 42, mediaType: 'movie' })).toBe('https://www.themoviedb.org/movie/42');
    expect(model.infoUrlForEntry({ externalSource: 'anilist', externalId: '123 45' })).toBe('https://anilist.co/anime/123%2045');
    expect(model.metadataRefreshLabel({ externalSource: 'anilist' })).toBe('Refresh from AniList');
  });

  test('progress model cascades season progress and recomputes totals', () => {
    const model = loadProgressModel();
    const entry = {
      mediaType: 'tv',
      status: 'in_progress',
      seasons: [
        { number: 1, total: 10, watched: 0 },
        { number: 2, total: 8, watched: 3 },
        { number: 3, total: 6, watched: 0 },
      ],
    };

    model.syncEpisodeProgress([entry]);

    expect(entry.seasons[0].watched).toBe(10);
    expect(entry.seasons[1].watched).toBe(3);
    expect(entry.totalEpisodes).toBe(24);
    expect(entry.watchedEpisodes).toBe(13);
    expect(model.activeSeason(entry)).toEqual(expect.objectContaining({ number: 2 }));
  });

  test('progress model preserves overflow when watched count exceeds known seasons', () => {
    const model = loadProgressModel();
    const entry = {
      seasons: [
        { number: 1, total: 4, watched: 0 },
        { number: 2, total: 4, watched: 0 },
      ],
    };

    expect(model.applyWatchedCountAcrossSeasons(entry, 10)).toBe(true);

    expect(entry.seasons.map(season => season.watched)).toEqual([4, 4]);
    expect(entry.totalEpisodes).toBe(8);
    expect(entry.watchedEpisodes).toBe(10);
    expect(entry.progressOverflow).toBe(2);
  });
});
