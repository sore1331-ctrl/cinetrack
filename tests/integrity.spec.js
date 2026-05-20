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
});
