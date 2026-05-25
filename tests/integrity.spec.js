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

function loadUserDataValidationHelpers() {
  const source = fs.readFileSync(path.join(root, 'api', 'user-data.js'), 'utf8');
  const start = source.indexOf('const VALID_MEDIA_TYPES');
  const end = source.indexOf('function entryKey');
  const sandbox = {};
  vm.runInNewContext(`${source.slice(start, end)}; helpers = { validateMoviesPayload };`, sandbox);
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

function loadLibraryHealthModel() {
  const librarySource = fs.readFileSync(path.join(root, 'scripts', 'library-model.js'), 'utf8');
  const healthSource = fs.readFileSync(path.join(root, 'scripts', 'library-health.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
      localStorage: memoryStorage(),
    },
  };
  vm.runInNewContext(`${librarySource}\n${healthSource}`, sandbox);
  return sandbox.window.CineTrack.libraryHealth;
}

function loadProfileModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'profile-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.profile;
}

function loadCalendarModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'calendar-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.calendar;
}

function loadStatsModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'stats-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.stats;
}

function loadCardModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'card-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.cards;
}

function loadFilterModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'filter-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.filters;
}

function loadPaginationModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'pagination-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.pagination;
}

function loadRandomPickerModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'random-picker-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.randomPicker;
}

function loadModalModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'modal-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.modal;
}

function loadDuplicateModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'duplicate-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.duplicates;
}

function loadRecommendationModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'recommendation-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.recommendations;
}

function loadFormatModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'format-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.format;
}

function loadNetworkModel(extra = {}) {
  const source = fs.readFileSync(path.join(root, 'scripts', 'network-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
    setTimeout,
    clearTimeout,
    AbortController,
    fetch,
    ...extra,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.network;
}

function loadCsvModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'csv-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.csv;
}

function loadLibraryModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'library-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
    Date,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.library;
}

function loadErrorLog(storage) {
  const source = fs.readFileSync(path.join(root, 'scripts', 'error-log.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
      localStorage: storage,
    },
    Date,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.errors;
}

function loadSyncModel() {
  const source = fs.readFileSync(path.join(root, 'scripts', 'sync-model.js'), 'utf8');
  const sandbox = {
    window: {
      CineTrack: {},
    },
    Date,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.CineTrack.sync;
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key: index => [...data.keys()][index] || null,
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

  test('cloud user data API rejects malformed library payloads', () => {
    const { validateMoviesPayload } = loadUserDataValidationHelpers();

    expect(validateMoviesPayload([
      {
        title: 'Safe Show',
        mediaType: 'tv',
        status: 'in_progress',
        watchedEpisodes: 14,
        totalEpisodes: 12,
        rating: 8,
        seasons: [{ number: 1, total: 12, watched: 12 }],
      },
    ])).toBeNull();

    expect(validateMoviesPayload([{ title: 'Bad Type', mediaType: 'podcast' }])).toContain('mediaType');
    expect(validateMoviesPayload([{ title: 'Bad Progress', watchedEpisodes: -1 }])).toContain('watchedEpisodes');
    expect(validateMoviesPayload([{ title: 'Bad Seasons', seasons: [{ watched: -1 }] }])).toContain('seasons[0].watched');
    expect(validateMoviesPayload(new Array(10001).fill({ title: 'Too Many' }))).toContain('10000');
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
    expect(api).toContain('updated_at: new Date().toISOString()');
    expect(api).not.toContain('updated_at: updated_at ||');
    expect(app).toContain('syncModel.buildSavePayload');
    expect(app).toContain('lastCloudVersion,');
    expect(app).toContain('syncModel.saveSuccessState');
    expect(app).toContain('lastCloudVersion = nextSyncState.lastCloudVersion');
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
    expect(app).toContain("requiredSource: 'tvmaze'");
    expect(app).toContain('mergeUpcomingCache(results)');
    expect(app).toContain('tvmazeUpcoming = await fetchTvmazeCalendarForEntries(tracked, { force });');
    expect(tvmazeApi).toContain('findCalendarEpisode');
    expect(tvmazeApi).toContain('ep.airdate >= today && ep.airdate <= horizon');
  });

  test('upcoming cache refresh preserves existing entries while warming badges', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('function patchUpcomingCache(results = [], requestedKeys = [])');
    expect(app).toContain('const byId = cache.byId && typeof cache.byId ===');
    expect(app).toContain('calendarModel.cacheWarmPlan');
    expect(app).toContain('upcomingWarmInFlight = true');
    expect(app).toContain("warmUpcomingCacheForBadge({ force: true, reason: 'daily' })");
  });

  test('airing today checks reuse the upcoming cache during render passes', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const calendarModel = fs.readFileSync(path.join(root, 'scripts', 'calendar-model.js'), 'utf8');

    expect(app).toContain('function airingTodayChecker(cache = readUpcomingCache())');
    expect(app).toContain('function filtered(upcomingCache = readUpcomingCache())');
    expect(app).toContain('const upcomingCache = readUpcomingCache();');
    expect(app).toContain('const checkAiringToday = airingTodayChecker(upcomingCache);');
    expect(app).toContain('const list = filtered(upcomingCache);');
    expect(app).toContain('calendarModel.trackedRows({');
    expect(calendarModel).toContain('airingTodaySignal(local, cache, todayStr)');
  });

  test('tracked calendar only renders confirmed future dates', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const calendarModel = fs.readFileSync(path.join(root, 'scripts', 'calendar-model.js'), 'utf8');
    const tvmazeApi = fs.readFileSync(path.join(root, 'api', 'tvmaze-calendar.js'), 'utf8');

    expect(app).toContain('calendarModel.trackedRows({');
    expect(app).toContain('calendarModel.groupRowsByDate(dated)');
    expect(calendarModel).toContain('if (!row?.date) return;');
    expect(calendarModel).toContain('episode.airDate >= todayStr && episode.airDate <= tvHorizonStr');
    expect(app).not.toContain('Between seasons / no date yet');
    expect(app).not.toContain('No date scheduled');
    expect(tvmazeApi).toContain('if (!episode) return null;');
  });

  test('calendar model formats keys, dates, and airing-today signals', () => {
    const model = loadCalendarModel();
    const base = new Date('2026-05-23T12:00:00Z');

    expect(model.dateString(base)).toBe('2026-05-23');
    expect(model.addDaysString(14, base)).toBe('2026-06-06');
    expect(model.warmKeysForEntries([
      { mediaType: 'tv', status: 'in_progress', tmdbId: 10 },
      { mediaType: 'anime', status: 'watchlist', tmdbId: 11 },
      { mediaType: 'movie', status: 'watchlist', tmdbId: 12 },
      { mediaType: 'movie', status: 'watched', tmdbId: 13 },
      { mediaType: 'tv', status: 'watched', tmdbId: 14 },
    ])).toEqual({
      ids: ['tv:10', 'tv:11', 'movie:12'],
      tvEntries: [{ mediaType: 'tv', status: 'in_progress', tmdbId: 10 }],
    });
    expect(model.keyForEntry({ mediaType: 'anime', tmdbId: 10 })).toBe('tv:10');
    expect(model.keyForEntry({ mediaType: 'movie', tmdbId: 20 })).toBe('movie:20');
    expect(model.keyForEntry({ externalSource: 'anilist', externalId: '777' })).toBe('anilist:777');
    expect(model.relativeDayLabel('2026-05-24', base)).toBe('Tomorrow');
    expect(model.episodeOrdinalForProgress({
      seasons: [
        { number: 1, total: 10 },
        { number: 2, total: 8 },
      ],
    }, { season: 2, episode: 3 })).toBe(13);

    const cache = {
      byId: {
        'tv:10': { nextEpisode: { season: 2, episode: 3, airDate: '2026-05-23' } },
        'movie:20': { releaseDate: '2026-05-23' },
      },
    };

    expect(model.airingTodaySignal({
      mediaType: 'anime',
      status: 'in_progress',
      tmdbId: 10,
      watchedEpisodes: 12,
      seasons: [{ number: 1, total: 10 }, { number: 2, total: 8 }],
    }, cache, '2026-05-23')).toEqual(expect.objectContaining({ type: 'episode' }));
    expect(model.airingTodaySignal({
      mediaType: 'movie',
      status: 'watchlist',
      tmdbId: 20,
    }, cache, '2026-05-23')).toEqual({ type: 'movie', releaseDate: '2026-05-23' });

    const tracked = model.trackedEntries([
      { mediaType: 'tv', status: 'in_progress', tmdbId: 10, title: 'Local Show', posterUrl: 'local-show.jpg' },
      { mediaType: 'movie', status: 'watchlist', tmdbId: 20, title: 'Local Film' },
      { mediaType: 'tv', status: 'watched', tmdbId: 30, title: 'Finished' },
    ]);
    expect(tracked.map(entry => entry.title)).toEqual(['Local Show', 'Local Film']);

    const rows = model.trackedRows({
      tracked,
      upcoming: [
        { type: 'tv', sourceKey: 'tv:10', tmdbId: 10, title: 'Remote Show', nextEpisode: { season: 1, episode: 2, name: 'Pilot', airDate: '2026-05-24' } },
        { type: 'movie', sourceKey: 'movie:20', tmdbId: 20, title: 'Remote Film', poster_path: '/film.jpg', releaseDate: '2026-06-01' },
        { type: 'movie', sourceKey: 'movie:99', tmdbId: 99, title: 'Too Late', releaseDate: '2026-09-01' },
      ],
      todayStr: '2026-05-23',
      tvHorizonStr: '2026-06-06',
      movieHorizonStr: '2026-07-22',
      posterBase: 'poster:',
      cache: { byId: {} },
      infoUrlForEntry: entry => `/title/${entry.tmdbId}`,
    });
    expect(rows.map(row => row.title)).toEqual(['Local Show', 'Local Film']);
    expect(rows[0]).toEqual(expect.objectContaining({
      date: '2026-05-24',
      kind: 'tv',
      poster: 'local-show.jpg',
      sublabel: 'S1E2 \u00B7 Pilot',
    }));
    expect(rows[1]).toEqual(expect.objectContaining({
      date: '2026-06-01',
      kind: 'movie',
      poster: 'poster:/film.jpg',
    }));
    expect(model.groupRowsByDate(rows)['2026-05-24']).toHaveLength(1);
  });

  test('calendar model plans cache warming without duplicate network work', () => {
    const model = loadCalendarModel();
    const now = Date.parse('2026-05-24T09:00:00Z');
    const freshCache = { fetchedAt: now - 1000, byId: { 'tv:1': null, 'movie:2': { releaseDate: '2026-05-24' } } };

    expect(model.cacheWarmPlan({
      keys: ['tv:1', 'movie:2', 'tv:1'],
      cache: freshCache,
      ttlMs: 60000,
      now,
    })).toMatchObject({ shouldWarm: false, reason: 'fresh', keys: ['tv:1', 'movie:2'] });

    expect(model.cacheWarmPlan({
      keys: ['tv:1', 'movie:3'],
      cache: freshCache,
      ttlMs: 60000,
      now,
    })).toMatchObject({ shouldWarm: true, reason: 'stale-or-missing' });

    expect(model.cacheWarmPlan({
      keys: ['tv:1'],
      cache: freshCache,
      ttlMs: 60000,
      now,
      inFlight: true,
    })).toMatchObject({ shouldWarm: false, reason: 'in-flight' });

    expect(model.cacheHasFreshKeys({
      cache: { fetchedAt: now, byId: { 'tv:4': { source: 'tmdb' } } },
      keys: ['tv:4'],
      ttlMs: 60000,
      now,
      requiredSource: 'tvmaze',
    })).toBe(false);
  });

  test('calendar model builds discover watchlist entries', () => {
    const model = loadCalendarModel();
    const action = model.discoverActionFromDataset({
      addId: '123',
      addType: 'anime',
      addTitle: 'Upcoming Show',
      addYear: '2026',
      addPoster: '/poster.jpg',
    });

    expect(action).toEqual({
      tmdbId: '123',
      type: 'anime',
      title: 'Upcoming Show',
      year: '2026',
      posterPath: '/poster.jpg',
    });
    expect(model.discoverFetchType(action.type)).toBe('tv');
    expect(model.discoverCacheKey({ type: 'anime', region: 'GB', page: 2 })).toBe('anime:GB:2');
    expect(Object.keys(model.pruneTimestampCache({
      old: { fetchedAt: 1 },
      newer: { fetchedAt: 3 },
      middle: { fetchedAt: 2 },
    }, { maxEntries: 2 }))).toEqual(['newer', 'middle']);
    expect(model.discoverWatchlistEntry(action, path => `poster:${path}`)).toEqual(expect.objectContaining({
      title: 'Upcoming Show',
      year: '2026',
      status: 'watchlist',
      mediaType: 'anime',
      tmdbId: 123,
      posterUrl: 'poster:/poster.jpg',
    }));
  });

  test('discover add payload is routed through the calendar model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('calendarModel.discoverActionFromDataset(btn.dataset)');
    expect(app).toContain('calendarModel.discoverFetchType(action.type)');
    expect(app).toContain('calendarModel.discoverWatchlistEntry(action, externalPosterUrl)');
    expect(app).toContain('calendarModel.discoverCacheKey({ type, region, page })');
    expect(app).toContain('discoverFetchInFlight.has(key)');
    expect(app).toContain('calendarModel.pruneTimestampCache');
    expect(app).toContain('libraryModel.metadataEnrichmentPatch(details, m, externalPosterUrl)');
  });

  test('stats model builds reusable profile summaries', () => {
    const model = loadStatsModel();
    const summary = model.profileSummary([
      { id: 'movie', mediaType: 'movie', status: 'watched', runtime: 120, rating: 8, genre: 'Drama, Comedy', country: 'US' },
      { id: 'show', mediaType: 'tv', status: 'in_progress', runtime: 500, watchedEpisodes: 5, totalEpisodes: 10, genre: 'Drama' },
      { id: 'anime', mediaType: 'anime', status: 'watchlist', runtime: 0, genre: 'Action' },
    ]);

    expect(model.actualWatchedMinutes({ mediaType: 'tv', status: 'in_progress', runtime: 500, watchedEpisodes: 5, totalEpisodes: 10 })).toBe(250);
    expect(summary.watched).toHaveLength(1);
    expect(summary.watchlist).toHaveLength(1);
    expect(summary.totalMinutes).toBe(370);
    expect(summary.avgRating).toBe('8.0');
    expect(summary.byType).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'movie', watched: 1 }),
      expect.objectContaining({ type: 'tv', inProgress: 1 }),
      expect.objectContaining({ type: 'anime', watchlist: 1 }),
    ]));
    expect(summary.topGenres[0]).toEqual(['Drama', 1]);
    expect(summary.topCountries[0]).toEqual(['US', 1]);
    expect(summary.ratingDist).toEqual([[8, 1]]);

    const page = model.statsPageSummary([
      { id: 'movie', mediaType: 'movie', status: 'watched', runtime: 120, rating: 8, genre: 'Drama, Comedy', country: 'US', director: 'A', year: 2020 },
      { id: 'movie2', mediaType: 'movie', status: 'watched', runtime: 90, rating: 9, genre: 'Drama', country: 'US', director: 'A', year: 2021 },
      { id: 'show', mediaType: 'tv', status: 'in_progress', runtime: 500, watchedEpisodes: 5, totalEpisodes: 10, genre: 'Drama' },
    ], 'all');

    expect(model.statusSummary(page.scoped, 'movie')).toEqual(expect.objectContaining({
      watchedCnt: 2,
      inProgressCnt: 0,
      watchlistCnt: 0,
    }));
    expect(page.totalMin).toBe(460);
    expect(page.epsWatched).toBe(5);
    expect(page.epsTotal).toBe(10);
    expect(page.topGenres[0]).toEqual(['Drama', 2]);
    expect(page.topDirectors[0]).toEqual(['A', 2]);
    expect(page.decadeEntries).toEqual([['2020s', 2]]);
    expect(page.typeEntries).toEqual([[model.typeLabel('movie'), 2]]);
    expect(page.currentlyWatching[0]).toEqual(expect.objectContaining({ pct: 50, remaining: 5 }));
    expect(page.topGenreName).toBe('Drama');
    expect(page.topCountryName).toBe('US');
  });

  test('vercel hobby api function count stays within limit', () => {
    const apiFiles = fs.readdirSync(path.join(root, 'api')).filter(file => file.endsWith('.js'));

    expect(apiFiles).not.toEqual(expect.arrayContaining(['push-episode-alerts.js', 'push-subscription.js']));
    expect(apiFiles.length).toBeLessThanOrEqual(12);
  });

  test('card model builds reusable card state', () => {
    const model = loadCardModel();
    const view = model.view({
      id: 'show',
      mediaType: 'tv',
      title: 'Tracked Show',
      status: 'in_progress',
      runtime: 45,
      seasons: [
        { number: 1, total: 8, watched: 8 },
        { number: 2, name: 'Second Season', total: 10, watched: 4 },
      ],
    }, {
      activeSeason: item => item.seasons[1],
      posterEmoji: title => title[0],
      formatRuntime: minutes => `${minutes}m`,
      infoUrlForEntry: item => `/title/${item.id}`,
    });

    expect(model.fallbackPosterLabel({ mediaType: 'movie', title: 'Movie' }, title => title[0])).toBe('M');
    expect(view.isShow).toBe(true);
    expect(view.isTV).toBe(true);
    expect(view.runtime).toBe('45m');
    expect(view.infoUrl).toBe('/title/show');
    expect(view.episode.total).toBe(10);
    expect(view.episode.watched).toBe(4);
    expect(view.episode.pct).toBe(40);
    expect(view.episode.label).toContain('S2 4/10 eps');
    expect(view.primaryAction.type).toBe('episode');
    expect(model.statusLabel({ status: 'watched', watchCount: 2 })).toContain('2');
  });

  test('card rendering uses the card model helper', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/card-model.js');
    expect(app).toContain('const cardModel = window.CineTrack?.cards;');
    expect(app).toContain('const cardView = cardModel.view');
    expect(app).toContain('const infoUrl = cardView.infoUrl;');
    expect(app).toContain('updateLibraryEntry(epIncId, libraryModel.incrementEpisode');
    expect(app).toContain('updateLibraryEntry(toggleId, libraryModel.cycleCardStatus');
  });

  test('split stylesheets load directly without the CSS import hub', () => {
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');

    expect(index).not.toContain('href="style.css');
    expect(fs.existsSync(path.join(root, 'style.css'))).toBe(false);
    expect(vercel).not.toContain('/style.css');
    expect(vercel).toContain('/styles/(.*).css');
    [
      'theme',
      'layout',
      'cards',
      'settings',
      'mobile',
      'stats',
      'profile',
      'community',
      'calendar',
      'overlays',
      'controls',
      'account',
      'glass',
      'skin',
    ].forEach(name => {
      expect(index).toContain(`href="styles/${name}.css`);
    });
  });

  test('filter model applies library filters and sorting', () => {
    const model = loadFilterModel();
    const entries = [
      { id: 'old', mediaType: 'movie', title: 'Old Comedy', status: 'watchlist', genre: 'Comedy', country: 'US', year: '1999', rating: 0, addedAt: 1 },
      { id: 'hit', mediaType: 'movie', title: 'Bright Drama', status: 'watched', genre: 'Drama, Comedy', country: 'US', year: '2024', rating: 9, addedAt: 2 },
      { id: 'drop', mediaType: 'movie', title: 'Dropped', status: 'dropped', genre: 'Drama', country: 'US', year: '2024', rating: 8, addedAt: 3 },
      { id: 'show', mediaType: 'tv', title: 'Running Show', status: 'watchlist', genre: 'Drama', country: 'GB', year: '2025', rating: 7, sourceStatus: 'Returning Series', addedAt: 4 },
    ];

    expect(model.hasActiveFilters({ activeStatus: 'all', searchQuery: 'bright' })).toBe(true);
    expect(model.countMoreFilters({ genreFilter: 'Drama', sortOrder: 'rating', yearMinFilter: '2020' })).toBe(3);
    expect(model.yearPreset('2010s')).toEqual({ yearMinFilter: '2010', yearMaxFilter: '2019' });
    expect(model.ratingPreset('unrated')).toEqual({ ratingMinFilter: 'unrated', ratingMaxFilter: '' });
    expect(model.pageSize('100')).toBe(100);
    expect(model.pageSize('999', 50)).toBe(50);

    const movieResults = model.apply(entries, {
      activeType: 'movie',
      activeStatus: 'all',
      genreFilter: 'Comedy',
      countryFilter: 'US',
      yearMinFilter: '2020',
      ratingMinFilter: '8',
      sortOrder: 'rating',
    }, {
      seriesStatusBucket: entry => entry.sourceStatus === 'Returning Series' ? 'ongoing' : 'unknown',
      isAiringToday: entry => entry.id === 'old',
    });
    expect(movieResults.map(entry => entry.id)).toEqual(['hit']);

    const seriesResults = model.apply(entries, {
      activeType: 'tv',
      activeStatus: 'all',
      sortOrder: 'series_ongoing',
    }, {
      seriesStatusBucket: entry => entry.sourceStatus === 'Returning Series' ? 'ongoing' : 'unknown',
    });
    expect(seriesResults.map(entry => entry.id)).toEqual(['show']);
  });

  test('library filters are routed through the filter model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/filter-model.js');
    expect(app).toContain('const filterModel = window.CineTrack?.filters;');
    expect(app).toContain('function currentFilterState()');
    expect(app).toContain('filterModel.apply(movies, currentFilterState()');
    expect(app).toContain('filterModel.hasActiveFilters(currentFilterState())');
    expect(app).toContain('filterModel.countMoreFilters(currentFilterState())');
    expect(app).toContain("filterModel.pageSize(localStorage.getItem('cinetrack_pagesize'))");
  });

  test('pagination model clamps pages and builds visible windows', () => {
    const model = loadPaginationModel();

    expect(model.totalPages(0, 50)).toBe(1);
    expect(model.clampPage(99, 120, 50)).toEqual({ page: 2, totalPages: 3 });
    expect(model.clampPage(-4, 120, 50)).toEqual({ page: 0, totalPages: 3 });
    expect(model.slicePage(['a', 'b', 'c', 'd'], 1, 2)).toEqual(['c', 'd']);

    const middle = model.view(500, 5, 25, 5);
    expect(middle.showControls).toBe(true);
    expect(middle.pages.map(item => item.type === 'page' ? item.page : '...')).toEqual([0, '...', 3, 4, 5, 6, 7, '...', 19]);

    const single = model.view(10, 0, 25);
    expect(single.showControls).toBe(false);
    expect(single.prevDisabled).toBe(true);
    expect(single.nextDisabled).toBe(true);
  });

  test('pagination rendering is routed through the pagination model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/pagination-model.js');
    expect(app).toContain('const paginationModel = window.CineTrack?.pagination;');
    expect(app).toContain('paginationModel.view(totalItems, currentPage, pageSize)');
    expect(app).toContain('paginationModel.clampPage(currentPage, list.length, pageSize)');
    expect(app).toContain('paginationModel.slicePage(list, currentPage, pageSize)');
  });

  test('random picker model selects watchlist titles and metadata', () => {
    const model = loadRandomPickerModel();
    const entries = [
      { id: 'watched', mediaType: 'movie', title: 'Already Seen', status: 'watched' },
      { id: 'anime', mediaType: 'anime', title: 'Anime Pick', status: 'watchlist', year: '2026', genre: 'Action' },
      { id: 'tv', mediaType: 'tv', title: 'TV Pick', status: 'watchlist', posterUrl: '/poster.jpg' },
    ];

    expect(model.eligible(entries).map(entry => entry.id)).toEqual(['anime', 'tv']);
    expect(model.pick(entries, () => 0).id).toBe('anime');
    expect(model.pick(entries, () => 0.99).id).toBe('tv');
    expect(model.fallbackEmoji({ mediaType: 'tv' })).toBe('📺');
    expect(model.meta(entries[1])).toEqual(expect.objectContaining({
      id: 'anime',
      title: 'Anime Pick',
      metaText: '2026 · Action',
      fallbackEmoji: '🎌',
    }));
    expect(model.view([{ id: 'done', status: 'watched' }], () => 0).empty).toBe(true);
  });

  test('random picker rendering is routed through the random picker model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/random-picker-model.js');
    expect(app).toContain('const randomPickerModel = window.CineTrack?.randomPicker;');
    expect(app).toContain('const randomPick = randomPickerModel.view(filtered())');
    expect(app).toContain('const pickMeta = randomPick.meta;');
  });

  test('modal model derives form defaults and watch-count state', () => {
    const model = loadModalModel();
    const entry = {
      title: 'Show',
      year: '2026',
      mediaType: 'tv',
      status: 'watched',
      rating: 9,
      watchCount: 3,
      seasons: [
        { number: 1, total: 8, watched: 8, name: 'One' },
        { number: 2, total: 10, watched: 4, name: 'Two' },
      ],
    };

    expect(model.mediaTypeForOpen(null, 'dropped')).toBe('movie');
    expect(model.mediaTypeForOpen(entry, 'movie')).toBe('tv');
    expect(model.formValues(entry)).toEqual(expect.objectContaining({ title: 'Show', year: '2026', status: 'watched', rating: 9 }));
    expect(model.typeUiState('anime')).toEqual(expect.objectContaining({
      isShow: true,
      searchLabel: 'Search AniList',
      directorPlaceholder: 'e.g. Hayao Miyazaki',
    }));
    expect(model.cloneSeasons(entry)).toEqual(entry.seasons);
    expect(model.cloneSeasons(entry)).not.toBe(entry.seasons);
    expect(model.initialSeasonIndex(entry.seasons)).toBe(1);
    expect(model.initialWatchCount(entry)).toBe(3);
    expect(model.initialWatchCount({ status: 'watched' })).toBe(1);
    expect(model.showsRating('dropped')).toBe(true);
    expect(model.showsRating('watchlist')).toBe(false);
    expect(model.rewatchState('watched', 'id', 2)).toEqual({ visible: true, count: 2, plural: 's' });
    expect(model.finalWatchCount('watchlist', 4, { watchCount: 7 })).toBe(7);
    expect(model.finalWatchCount('watched', 0, {})).toBe(1);
    expect(model.episodeState({
      mediaType: 'tv',
      seasons: [
        { number: 1, total: 12, watched: 12, name: 'One' },
        { number: 2, total: 8, watched: 99, name: 'Two' },
      ],
    })).toEqual({
      isShow: true,
      totalEpisodes: 20,
      watchedEpisodes: 20,
      seasons: [
        { number: 1, total: 12, watched: 12, name: 'One' },
        { number: 2, total: 8, watched: 8, name: 'Two' },
      ],
    });
    expect(model.derivedStatus('watchlist', { isShow: true, totalEpisodes: 10, watchedEpisodes: 3 })).toBe('in_progress');
    expect(model.derivedStatus('dropped', { isShow: true, totalEpisodes: 10, watchedEpisodes: 10 })).toBe('dropped');
    expect(model.detailsFetchType('anime', { source: 'tmdb', mediaType: 'tv' })).toBe('tv');
    expect(model.selectedExternal({ id: 42, source: 'tmdb' })).toEqual({ selectedSource: 'tmdb', selectedExternalId: '42' });
    expect(model.selectionSeasonState({
      details: { seasons: [{ number: 1, total: 8, name: 'One' }, { number: 2, total: 8, name: 'Two' }] },
      seasons: [{ number: 1, total: 6, watched: 6 }],
      watchedInput: '2',
      status: 'in_progress',
    })).toEqual(expect.objectContaining({
      hasSeasons: true,
      seasonIndex: 0,
      seasons: [
        { number: 1, total: 8, watched: 6, name: 'One' },
        { number: 2, total: 8, watched: 0, name: 'Two' },
      ],
    }));
    expect(model.entryPayload({
      fields: { title: 'Show', status: 'watchlist', runtime: '45' },
      mediaType: 'tv',
      progress: { isShow: true, totalEpisodes: 12, watchedEpisodes: 12, seasons: [] },
      selectedRating: 8,
      editingWatchCount: 0,
      existing: { watchCount: 4, tmdbId: 123 },
    })).toEqual(expect.objectContaining({
      title: 'Show',
      status: 'watched',
      rating: 8,
      runtime: 45,
      watchCount: 1,
      externalSource: 'tmdb',
      externalId: '123',
    }));
  });

  test('modal UI state is routed through the modal model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/modal-model.js');
    expect(app).toContain('const modalModel = window.CineTrack?.modal;');
    expect(app).toContain('modalModel.mediaTypeForOpen(movie, activeType)');
    expect(app).toContain('modalModel.formValues(movie)');
    expect(app).toContain('modalModel.typeUiState(activeMediaType)');
    expect(app).toContain('modalModel.cloneSeasons(movie)');
    expect(app).toContain('modalModel.selectionSeasonState({');
    expect(app).toContain('modalModel.detailsFetchType(activeMediaType');
    expect(app).toContain('modalModel.selectedExternal(tmdbSelection)');
    expect(app).toContain('modalModel.rewatchState(status, editingId, editingWatchCount)');
    expect(app).toContain('modalModel.episodeState({');
    expect(app).toContain('const data = modalModel.entryPayload({');
  });

  test('duplicate model matches source ids and conservative title fallbacks', () => {
    const model = loadDuplicateModel();
    const library = [
      { id: 'a', title: 'The Same Show', year: '2024', mediaType: 'tv', tmdbId: 11 },
      { id: 'b', title: 'Manual Long Title', year: '', mediaType: 'movie', externalSource: 'manual', externalId: 'local-1' },
      { id: 'c', title: 'Edit Me', year: '2026', mediaType: 'movie' },
    ];
    const normaliseTitle = value => String(value || '').trim().toLowerCase();
    const normaliseYear = value => String(value || '').match(/\d{4}/)?.[0] || '';

    expect(model.findDuplicate(library, {
      title: 'Other',
      mediaType: 'tv',
      source: 'tmdb',
      externalId: '11',
    })).toBe(library[0]);
    expect(model.findDuplicate(library, {
      title: 'Manual Long Title',
      mediaType: 'movie',
      source: 'manual',
      externalId: '',
    }, { normaliseTitle, normaliseYear })).toBe(library[1]);
    expect(model.findDuplicate(library, {
      title: 'Edit Me',
      year: '2026',
      mediaType: 'movie',
    }, { editingId: 'c', normaliseTitle, normaliseYear })).toBeNull();
  });

  test('duplicate model matches recommendations already tracked in the library', () => {
    const model = loadDuplicateModel();
    const library = [
      { id: 'a', title: 'Young Justice', year: '2010', mediaType: 'tv', tmdbId: 33217 },
      { id: 'b', title: 'NANA', year: '2006', mediaType: 'anime', externalSource: 'anilist', externalId: '877' },
      { id: 'c', title: 'Long Manual Match', year: '', mediaType: 'movie' },
    ];
    const normaliseTitle = value => String(value || '').trim().toLowerCase();
    const normaliseYear = value => String(value || '').match(/\d{4}/)?.[0] || '';
    const compatibleTypes = (a, b) => a === b || (a === 'anime' && b === 'tv') || (a === 'tv' && b === 'anime');
    const recommendationSourceKey = rec => `${rec.source || 'tmdb'}:${rec.externalId || rec.id}`;

    expect(model.findTrackedRecommendation(library, {
      id: 33217,
      source: 'tmdb',
      media_type: 'tv',
      title: 'Other',
    }, { normaliseTitle, normaliseYear, compatibleTypes, recommendationSourceKey })).toBe(library[0]);
    expect(model.findTrackedRecommendation(library, {
      id: 877,
      externalId: 877,
      source: 'anilist',
      media_type: 'tv',
      title: 'Nana',
    }, { normaliseTitle, normaliseYear, compatibleTypes, recommendationSourceKey })).toBe(library[1]);
    expect(model.findTrackedRecommendation(library, {
      id: 'missing',
      source: 'tmdb',
      media_type: 'movie',
      title: 'Long Manual Match',
    }, { normaliseTitle, normaliseYear, compatibleTypes, recommendationSourceKey })).toBe(library[2]);
  });

  test('duplicate detection is routed through the duplicate model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/duplicate-model.js');
    expect(app).toContain('const duplicateModel = window.CineTrack?.duplicates;');
    expect(app).toContain('return duplicateModel.findDuplicate(movies, {');
    expect(app).toContain('return duplicateModel.findTrackedRecommendation(movies, rec, {');
  });

  test('anime recommendations prefer AniList before TMDB fallback', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const externalApi = fs.readFileSync(path.join(root, 'api', 'external.js'), 'utf8');

    expect(externalApi).toContain("if (action === 'match')");
    expect(app).toContain("provider: 'anilist'");
    expect(app).toContain("action: 'match'");
    expect(app).toContain('async function fetchAnilistRecommendationResults');
    expect(app).toContain("'anilist-first'");
    expect(app.indexOf("if (scope === 'anime')")).toBeLessThan(app.indexOf('recommendationModel.seedRequest(seededPool'));
  });

  test('recommendations use controlled seeds and post-fetch scoring', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const recView = fs.readFileSync(path.join(root, 'scripts', 'recommendation-view.js'), 'utf8');

    expect(app).toContain('function selectRecommendationSeeds');
    expect(app).toContain('function rankRecommendationResults');
    expect(fs.readFileSync(path.join(root, 'scripts', 'recommendation-model.js'), 'utf8'))
      .toContain('function score(rec');
    expect(app).toContain('function dismissedRecProfile');
    expect(app).toContain('function visibleRecommendationCount');
    expect(app).toContain('recommendationModel.isCacheUsable');
    expect(app).toContain('recommendationModel.seedProfile(movies, scope)');
    expect(app).toContain('recommendationModel.seedRequest(seededPool');
    expect(app).toContain('recommendationView.renderCards({');
    expect(recView).toContain('model.visibleResults(results');
    expect(app).toContain('recommendationModel.dismissedProfile(dismissed, results)');
    expect(app).not.toContain('const sample = pickRandom');
  });

  test('recommendation fetch orchestration avoids stale renders and duplicate requests', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const recView = fs.readFileSync(path.join(root, 'scripts', 'recommendation-view.js'), 'utf8');

    expect(app).toContain('const recommendationFetchInFlight = new Map()');
    expect(app).toContain('let recommendationLoadSeq = 0');
    expect(app).toContain('async function fetchRecommendationJson');
    expect(app).toContain('recommendationFetchInFlight.has(key)');
    expect(app).toContain('if (loadSeq !== recommendationLoadSeq) return');
    expect(app).toContain('recommendationView.bindCards(section');
    expect(recView).toContain('model.shouldTopUpRecommendations');
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
    expect(app).toContain('visibleLimit: RECS_VISIBLE_LIMIT');
    expect(fs.readFileSync(path.join(root, 'scripts', 'recommendation-model.js'), 'utf8'))
      .toContain('if (recs.length >= visibleLimit) break;');
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
    expect(app).toContain('const applyPlan = syncModel.cloudApplyPlan({ row, force, backupWritten: backedUpLocal });');
    expect(app).toContain('if (applyPlan.error) throw new Error(applyPlan.error);');
    expect(api).toContain("await supabaseRequest('progress_events'");
  });

  test('supabase setup limits destructive cloud data access', () => {
    const sql = fs.readFileSync(path.join(root, 'SUPABASE_SETUP.sql'), 'utf8');

    expect(sql).toContain('user_data_movies_is_array');
    expect(sql).toContain('user_data_version_positive');
    expect(sql).toContain('user_data_backups_movies_is_array');
    expect(sql).toContain('progress_events_type_allowed');
    expect(sql).not.toContain('CREATE POLICY "user_data_delete_own"');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON public.user_data TO authenticated;');
    expect(sql).toContain('REVOKE DELETE ON public.user_data FROM authenticated');
    expect(sql).toContain('REVOKE UPDATE, DELETE ON public.user_data_backups FROM authenticated');
    expect(sql).toContain('REVOKE UPDATE, DELETE ON public.progress_events FROM authenticated');
  });

  test('profile exposes local recovery snapshots', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const profileCss = fs.readFileSync(path.join(root, 'styles', 'profile.css'), 'utf8');
    const skinCss = fs.readFileSync(path.join(root, 'styles', 'skin.css'), 'utf8');

    expect(app).toContain('function localLibraryBackups()');
    expect(app).toContain('profileModel.backupImpactLabel(compare)');
    expect(app).toContain('data-restore-backup');
    expect(app).toContain('restoreLibraryFromBackup(backup.movies)');
    expect(app).toContain('Local safety snapshots are created before cloud loads');
    expect(app).toContain('function currentUserDisplayName()');
    expect(app).toContain('function userInitial');
    expect(app).toContain('<div class="profile-avatar-lg">${esc(initial)}</div>');
    expect(app).toContain('userAvatar.textContent  = userInitial(displayName);');
    expect(index).toContain('scripts/profile-model.js');
    expect(index).toContain('<span id="user-avatar">?</span>');
    expect(index).not.toContain('account-control.png');
    expect(profileCss).toContain('.profile-sharing-badge');
    expect(profileCss).toContain('border: 0;');
    expect(skinCss).not.toContain('.profile-sharing-badge {\n  background:');
  });

  test('profile model formats recovery metadata', () => {
    const model = loadProfileModel();
    const storageModel = {
      readArray: () => [
        { reason: 'valid', movies: [{ id: 'one' }] },
        { reason: 'invalid', movies: null },
      ],
    };

    expect(model.localLibraryBackups(storageModel, 'backups')).toHaveLength(1);
    expect(model.formatBackupDate('not-a-date')).toBe('Unknown time');
    expect(model.backupImpactLabel({ hasIssues: false })).toBe('No obvious loss detected');
    expect(model.backupImpactLabel({
      hasIssues: true,
      missing: [{}],
      progressRegressed: [{}, {}],
      statusRegressed: [{}],
    })).toBe('1 missing / 2 progress / 1 status');
    expect(model.usernameSaveStart({ value: '  Nova  ', currentUsername: 'Equinox' })).toEqual({
      canSave: true,
      previousUsername: 'Equinox',
      optimisticUsername: 'Nova',
      updates: { username: 'Nova' },
      closeForm: true,
      updateUserMenu: true,
    });
    expect(model.usernameSaveStart({ value: '   ', currentUsername: 'Equinox' })).toEqual({ canSave: false });
    expect(model.usernameSaveResult({
      result: { ok: true, data: { username: 'ServerNova' } },
      previousUsername: 'Equinox',
      optimisticUsername: 'Nova',
    })).toEqual({
      ok: true,
      username: 'ServerNova',
      updateUserMenu: true,
      renderProfile: true,
      toast: { message: 'Username saved', isError: false },
    });
    expect(model.usernameSaveResult({
      result: { ok: false, error: 'Nope' },
      previousUsername: 'Equinox',
      optimisticUsername: 'Nova',
    })).toEqual({
      ok: false,
      username: 'Equinox',
      updateUserMenu: true,
      toast: { message: 'Could not save username: Nope', isError: true },
    });
    expect(model.sharingToggleStart({ checked: true })).toEqual({
      sharingEnabled: true,
      storageValue: true,
      updates: { sharing_enabled: true },
    });
    expect(model.sharingToggleResult({
      result: { ok: false, error: 'Nope' },
      previousSharing: false,
      optimisticSharing: true,
    })).toEqual({
      ok: false,
      sharingEnabled: false,
      checkboxChecked: false,
      storageValue: false,
      renderProfile: true,
      toast: { message: 'Could not update sharing: Nope', isError: true },
    });
    expect(model.sharingToggleResult({
      result: { ok: true },
      previousSharing: false,
      optimisticSharing: true,
    })).toEqual({
      ok: true,
      sharingEnabled: true,
      storageValue: true,
      renderProfile: true,
    });
    expect(model.profileLoadLocalPlan({ localUsername: 'Local', currentUsername: null })).toEqual({
      apply: true,
      username: 'Local',
      updateUserMenu: true,
    });
    expect(model.profileLoadLocalPlan({ localUsername: 'Local', currentUsername: 'Current' })).toEqual({ apply: false });
    expect(model.profileLoadDataPlan({
      data: { username: '', sharing_enabled: 1 },
      localUsername: 'Local',
    })).toEqual({
      apply: true,
      username: 'Local',
      sharingEnabled: true,
      sharingStorageValue: true,
      updateUserMenu: true,
      renderProfile: true,
    });
    expect(model.profileSaveApplyPlan({
      updates: { username: 'Nova', sharing_enabled: false },
      data: { username: 'ServerNova', sharing_enabled: true },
    })).toEqual({
      username: 'ServerNova',
      storeUsername: true,
      sharingEnabled: true,
      sharingStorageValue: true,
      storeSharing: true,
    });
    expect(model.isMissingPreferencesColumn({ code: '42703' })).toBe(true);
    expect(model.preferencesApplyPlan({
      prefs: { a: 1, b: null, daily: 'off' },
      syncKeys: ['a', 'b'],
      calendarDailyRefreshKey: 'daily',
    })).toEqual({
      apply: true,
      storageWrites: [['a', '1'], ['daily', 'off']],
      applyAppearance: true,
      refreshCurrentView: true,
    });
    expect(model.preferenceSaveErrorPlan({
      error: { code: 'PGRST204' },
      alreadyWarned: false,
    })).toEqual({
      warn: true,
      nextWarned: true,
      toast: { message: 'Cross-device sync needs a one-line SQL update \u2014 see console.', isError: true },
    });
  });

  test('profile preference saves are routed through the profile model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const saveStart = profileModel.usernameSaveStart({');
    expect(app).toContain('const result = await saveProfile(saveStart.updates);');
    expect(app).toContain('const saveResult = profileModel.usernameSaveResult({');
    expect(app).toContain('showToast(saveResult.toast.message, saveResult.toast.isError);');
    expect(app).toContain('const toggleStart = profileModel.sharingToggleStart({ checked: e.target.checked });');
    expect(app).toContain('const result = await saveProfile(toggleStart.updates);');
    expect(app).toContain('const toggleResult = profileModel.sharingToggleResult({');
    expect(app).toContain('e.target.checked = toggleResult.checkboxChecked;');
  });

  test('profile load and preference helpers are routed through the profile model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const errorPlan = profileModel.preferenceSaveErrorPlan({ error: e, alreadyWarned: prefMigrationWarned });');
    expect(app).toContain('if (profileModel.isMissingPreferencesColumn(error)) {');
    expect(app).toContain('const prefsPlan = profileModel.preferencesApplyPlan({');
    expect(app).toContain('prefsPlan.storageWrites.forEach(([key, value]) => localStorage.setItem(key, value));');
    expect(app).toContain('const localPlan = profileModel.profileLoadLocalPlan({ localUsername, currentUsername });');
    expect(app).toContain('const dataPlan = profileModel.profileLoadDataPlan({ data, localUsername });');
    expect(app).toContain('const applyPlan = profileModel.profileSaveApplyPlan({ updates, data });');
  });

  test('library health model reports data risks without blocking metadata overflow', () => {
    const model = loadLibraryHealthModel();
    const storage = memoryStorage({ movies: 'x'.repeat(128) });

    const health = model.analyse([
      { title: 'Missing Id', mediaType: 'movie', tmdbId: 1, watchedEpisodes: 0 },
      { id: 'dupe-a', title: 'Duplicate A', mediaType: 'tv', tmdbId: 2, watchedEpisodes: 8, totalEpisodes: 6 },
      { id: 'dupe-b', title: 'Duplicate B', mediaType: 'tv', tmdbId: 2, watchedEpisodes: -1 },
    ], { storage, quotaWarningBytes: 16 });

    expect(health.ok).toBe(false);
    expect(health.counts).toEqual(expect.objectContaining({
      missingIds: 1,
      duplicateKeys: 1,
      invalidProgress: 1,
      overflowProgress: 1,
    }));
    expect(health.issues.map(issue => issue.label)).toEqual(expect.arrayContaining([
      '1 missing IDs',
      '1 duplicate source keys',
      '1 invalid progress values',
      '1 titles ahead of known metadata',
      'local storage is near quota',
    ]));
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

  test('storage model compacts backups and clears volatile caches under pressure', () => {
    const storage = memoryStorage({
      backups: JSON.stringify([
        {
          reason: 'old',
          movies: [{
            id: 'old',
            title: 'Old',
            posterUrl: 'https://image.example/large.jpg',
            overview: 'x'.repeat(200),
            watchedEpisodes: 3,
            seasons: [{ number: 1, total: 6, watched: 3, posterUrl: 'drop-me' }],
          }],
        },
      ]),
      cacheA: 'x'.repeat(200),
      cacheB: 'x'.repeat(200),
    });
    const model = loadStorageModel(storage);

    expect(model.writeLibraryBackup({
      key: 'backups',
      reason: 'new',
      movies: [{
        id: 'new',
        title: 'New',
        posterUrl: 'https://image.example/new.jpg',
        overview: 'y'.repeat(200),
        watchedEpisodes: 4,
        seasons: [{ number: 1, total: 8, watched: 4, posterUrl: 'drop-me-too' }],
      }],
      maxBackups: 2,
      storage,
    })).toBe(true);

    const backups = JSON.parse(storage.getItem('backups'));
    expect(backups).toHaveLength(2);
    expect(backups[0].compact).toBe(true);
    expect(backups[0].movies[0].posterUrl).toBeUndefined();
    expect(backups[0].movies[0].overview).toBeUndefined();
    expect(backups[0].movies[0].seasons[0].posterUrl).toBeUndefined();
    expect(backups[0].movies[0].watchedEpisodes).toBe(4);

    const trim = model.trimStorage({
      volatileKeys: ['cacheA', 'cacheB'],
      backupKey: 'backups',
      maxBackups: 1,
      pressureBytes: 100,
      targetBytes: 80,
      storage,
    });

    expect(trim.changed).toBe(true);
    expect(JSON.parse(storage.getItem('backups'))).toHaveLength(1);
    expect(storage.getItem('cacheA')).toBeNull();
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

  test('storage model migrates local library schema with a backup', () => {
    const storage = memoryStorage({
      movies: JSON.stringify([{ title: '  Migrated  ', mediaType: 'show', status: 'in progress' }]),
      schema: '0',
    });
    const storageModel = loadStorageModel(storage);
    const libraryModel = loadLibraryModel();

    const result = storageModel.migrateLibraryStorage({
      storageKey: 'movies',
      schemaKey: 'schema',
      currentVersion: 1,
      backupKey: 'backups',
      storage,
      sanitise: entries => libraryModel.sanitiseLibrary(entries, {
        idFactory: () => 'migrated-id',
        now: () => 456,
      }),
    });

    expect(result.migrated).toBe(true);
    expect(result.movies[0]).toEqual(expect.objectContaining({
      id: 'migrated-id',
      title: 'Migrated',
      mediaType: 'tv',
      status: 'in_progress',
    }));
    expect(storage.getItem('schema')).toBe('1');
    expect(JSON.parse(storage.getItem('backups'))[0]).toEqual(expect.objectContaining({
      reason: 'before-schema-1-migration',
      itemCount: 1,
    }));
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

  test('recommendation model ranks anime source and rotates forced batches', () => {
    const model = loadRecommendationModel();
    const results = [
      { id: 1, source: 'tmdb', media_type: 'tv', genre: 'Action', popularity: 10, vote_count: 100, vote_average: 8 },
      { id: 2, source: 'anilist', media_type: 'anime', genre: 'Drama', averageScore: 80 },
    ];

    const ranked = model.rank(results, {
      genreCounts: { Action: 1, Drama: 1 },
      dismissedProfile: { genres: {}, mediaTypes: {} },
      scope: 'anime',
    });

    expect(ranked[0]).toEqual(expect.objectContaining({ id: 2, source: 'anilist' }));
    expect(model.normaliseForScope({ media_type: 'tv' }, 'anime').media_type).toBe('anime');
    expect(model.compatibleTypes('anime', 'tv')).toBe(true);
    expect(model.sourceKey({ source: 'anilist', externalId: 123 })).toBe('anilist:123');
    expect(model.rotateForced([1, 2, 3, 4], 1, true, 2)).toEqual([3, 4, 1, 2]);
    expect(model.requestKey({ scope: 'tv', idParam: '1:tv', force: true })).toBe('tmdb:tv:1:tv:force');
    const profile = model.seedProfile([
      { id: 'a', mediaType: 'movie', status: 'watched', tmdbId: 1, rating: 10, genre: 'Drama', addedAt: 1 },
      { id: 'b', mediaType: 'movie', status: 'in_progress', tmdbId: 2, rating: 5, genre: 'Drama', addedAt: 2 },
      { id: 'c', mediaType: 'movie', status: 'watchlist', tmdbId: 3, genre: 'Drama', addedAt: 3 },
    ], 'movie');
    expect(profile.pool.map(item => item.id)).toEqual(['a', 'b']);
    expect(profile.genreCounts).toEqual({ Drama: 1 });
    expect(profile.topPool[0]._score).toBeGreaterThan(profile.topPool[1]._score);
    expect(profile.poolKey).toContain('movie:tmdb:1');
    expect(model.isCacheUsable({
      cache: { poolKey: 'a', fetchedAt: 10, results: [] },
      poolKey: 'a',
      now: 20,
      ttlMs: 100,
      visibleCount: 6,
      minVisible: 6,
    })).toBe(true);
    expect(model.shouldTopUpRecommendations({ visibleCount: 5, visibleLimit: 10 })).toBe(true);
    expect(model.dismissedProfile(new Set(['1']), [
      { id: 1, media_type: 'tv', genre: 'Action, Drama' },
      { id: 2, media_type: 'movie', genre: 'Comedy' },
    ])).toEqual({ genres: { Action: 1, Drama: 1 }, mediaTypes: { tv: 1 } });
    expect(model.visibleResults([
      { id: 1, media_type: 'movie', title: 'Seen', year: 2020 },
      { id: 2, media_type: 'movie', title: 'New', year: 2021 },
      { id: 3, media_type: 'tv', title: 'Wrong', year: 2022 },
      { id: 4, media_type: 'movie', title: 'New', year: 2021 },
    ], {
      scope: 'movie',
      dismissedIds: new Set(['1']),
      visibleLimit: 10,
    }).map(item => item.id)).toEqual([2]);
    expect(model.displayMeta({ Drama: 2, Comedy: 3 }, 'tv')).toEqual(expect.objectContaining({
      genreLabel: 'Comedy, Drama',
      scopeLabel: 'TV shows',
    }));
    expect(model.seedRequest([
      { _recTmdbId: 10, mediaType: 'movie' },
      { _recAnilistId: 20, mediaType: 'anime' },
    ]).idParam).toBe('10:movie');
    expect(model.mergeAnimeResults({
      anilistResults: [{ id: 20, source: 'anilist', externalId: 20, title: 'Anime' }],
      tmdbResults: [{ id: 20, source: 'anilist', externalId: 20, title: 'Anime' }, { id: 30, media_type: 'tv', title: 'Fallback' }],
      visibleLimit: 2,
    }).map(item => item.id)).toEqual([20, 30]);
  });

  test('recommendation model builds watchlist actions and enrichment targets', () => {
    const model = loadRecommendationModel();
    const action = model.actionFromDataset({
      recId: '877',
      recSource: 'anilist',
      recType: 'anime',
      recTitle: 'NANA',
      recYear: '2006',
      recPoster: 'https://img.example/nana.jpg',
    });

    expect(action.candidate).toEqual({
      id: '877',
      source: 'anilist',
      externalId: '877',
      media_type: 'anime',
      title: 'NANA',
      year: '2006',
    });
    expect(model.watchlistEntryFromAction(action, path => `poster:${path}`)).toEqual(expect.objectContaining({
      title: 'NANA',
      year: '2006',
      status: 'watchlist',
      mediaType: 'anime',
      tmdbId: null,
      externalSource: 'anilist',
      externalId: '877',
      posterUrl: 'poster:https://img.example/nana.jpg',
    }));
    expect(model.detailsFetchTarget(action)).toEqual({ source: 'anilist', id: '877', type: 'anime' });
    expect(model.detailsFetchTarget({ id: '22', source: 'tmdb', type: 'anime' })).toEqual({ source: 'tmdb', id: '22', type: 'tv' });
  });

  test('recommendation add actions are routed through the recommendation model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('function recommendationActionFromButton');
    expect(app).toContain('return recommendationModel.actionFromDataset(btn?.dataset || {});');
    expect(app).toContain('return recommendationModel.watchlistEntryFromAction(action, externalPosterUrl);');
    expect(app).toContain('return recommendationModel.detailsFetchTarget(action);');
    expect(app).toContain('const recAction = recommendationActionFromButton(btn);');
    expect(app).toContain('recommendationWatchlistEntry(recAction)');
    expect(app).toContain('libraryModel.metadataEnrichmentPatch(details, m, externalPosterUrl)');
  });

  test('format model normalizes duplicate titles and durations', () => {
    const model = loadFormatModel();

    expect(model.escapeHtml('<CineTrack & "Films">')).toBe('&lt;CineTrack &amp; &quot;Films&quot;&gt;');
    expect(model.normaliseTitle('The Lord & the Rings (Extended)')).toBe('lord and rings');
    expect(model.normaliseYear('Released in 2026')).toBe('2026');
    expect(model.runtime(125)).toBe('2h 5m');
    expect(model.calendarDuration(1440 * 400 + 60)).toBe('1y 1mo 5d');
    expect(model.starsHtml(2)).toContain('★★☆☆');
  });

  test('network model parses JSON responses with timeout wrapper', async () => {
    const model = loadNetworkModel({
      fetch: async () => ({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    });

    await expect(model.withTimeout(Promise.resolve('done'), 'Fast op', 100)).resolves.toBe('done');
    const result = await model.fetchJsonWithTimeout('/api/example', {}, 'Example', 100);

    expect(result.data).toEqual({ ok: true });
    expect(result.response.ok).toBe(true);
  });

  test('csv model parses aliases, quotes, and normalizes show progress', () => {
    const model = loadCsvModel();
    const rows = model.parse([
      'name,release_year,genres,type,status,rating,total_episodes,episodes_watched,overview',
      '"Dark, The",2017,"Sci-Fi, Thriller",show,watchlist,12,26,40,"A ""time"" story"',
    ].join('\n'));

    expect(rows).toEqual([expect.objectContaining({
      title: 'Dark, The',
      year: '2017',
      genre: 'Sci-Fi, Thriller',
      mediaType: 'show',
      notes: 'A "time" story',
    })]);

    expect(model.normaliseRow(rows[0])).toEqual(expect.objectContaining({
      mediaType: 'tv',
      status: 'watched',
      rating: 10,
      totalEpisodes: 26,
      watchedEpisodes: 26,
    }));
  });

  test('csv model exports safe spreadsheet text and template data', () => {
    const model = loadCsvModel();
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const rows = [{
      title: 'Quote "Test"',
      year: 2026,
      genre: 'Drama, Action',
      director: 'Someone',
      country: 'United States',
      status: 'watched',
      rating: 9,
      runtime: 120,
      notes: null,
      mediaType: 'movie',
    }, {
      title: 'Dropped Show',
      status: 'dropped',
      mediaType: 'tv',
    }];
    const text = model.exportText([rows[0]]);

    expect(text).toContain('title,year,genre,director,country,status,rating,runtime,notes,type');
    expect(text).toContain('"Quote ""Test"""');
    expect(text).toContain('"Drama, Action"');
    expect(model.TEMPLATE_CSV).toContain('episodes_watched');
    expect(model.exportList(rows, 'movie').map(row => row.title)).toEqual(['Quote "Test"']);
    expect(model.exportList(rows, 'dropped').map(row => row.title)).toEqual(['Dropped Show']);
    expect(model.exportFilename('anime', new Date('2026-05-24T12:00:00Z'))).toBe('cinetrack-anime-2026-05-24.csv');
    expect(model.exportPayload(rows, 'movie', new Date('2026-05-24T12:00:00Z'))).toEqual(expect.objectContaining({
      filename: 'cinetrack-movie-2026-05-24.csv',
      list: [rows[0]],
    }));
    expect(app).toContain('const payload = csvModel.exportPayload(movies, activeType);');
    expect(app).toContain('a.download = payload.filename;');
  });

  test('library model sanitizes invalid title data before persistence', () => {
    const model = loadLibraryModel();
    const library = model.sanitiseLibrary([{
      title: '  Example  ',
      mediaType: 'show',
      status: 'in progress',
      rating: 99,
      totalEpisodes: 10,
      watchedEpisodes: 15,
      runtime: -20,
      seasons: [{ number: 1, total: 5, watched: 7 }],
    }], {
      idFactory: () => 'generated-id',
      now: () => 123,
    });

    expect(library).toEqual([expect.objectContaining({
      id: 'generated-id',
      addedAt: 123,
      title: 'Example',
      mediaType: 'tv',
      status: 'in_progress',
      rating: 10,
      runtime: 0,
      totalEpisodes: 10,
      watchedEpisodes: 10,
    })]);
    expect(library[0].seasons[0]).toEqual(expect.objectContaining({ watched: 5 }));
  });

  test('library model blocks non-user progress downgrades', () => {
    const model = loadLibraryModel();
    const previous = {
      id: 'show-1',
      title: 'Safe Show',
      mediaType: 'tv',
      status: 'watched',
      totalEpisodes: 8,
      watchedEpisodes: 8,
      seasons: [{ number: 1, total: 8, watched: 8 }],
    };
    const incoming = {
      ...previous,
      status: 'watchlist',
      watchedEpisodes: 0,
      seasons: [],
    };

    const protectedEntry = model.protectProgress(previous, incoming);

    expect(protectedEntry).toEqual(expect.objectContaining({
      status: 'watched',
      watchedEpisodes: 8,
      totalEpisodes: 8,
    }));
    expect(protectedEntry.seasons).toHaveLength(1);
  });

  test('library model owns card episode and status actions', () => {
    const model = loadLibraryModel();
    const incremented = model.incrementEpisode({
      id: 'show-1',
      mediaType: 'tv',
      status: 'in_progress',
      seasons: [
        { number: 1, total: 3, watched: 1 },
        { number: 2, total: 2, watched: 0 },
      ],
    });

    expect(incremented).toEqual(expect.objectContaining({
      status: 'in_progress',
      totalEpisodes: 5,
      watchedEpisodes: 2,
    }));
    expect(incremented.seasons[0].watched).toBe(2);

    const completed = model.incrementEpisode({
      id: 'show-2',
      mediaType: 'tv',
      status: 'in_progress',
      totalEpisodes: 2,
      watchedEpisodes: 1,
    });
    expect(completed).toEqual(expect.objectContaining({ status: 'watched', watchedEpisodes: 2 }));

    const cycled = model.cycleCardStatus({
      mediaType: 'tv',
      status: 'watched',
      rating: 9,
      watchedEpisodes: 4,
      seasons: [{ number: 1, total: 4, watched: 4 }],
    });
    expect(cycled).toEqual(expect.objectContaining({ status: 'watchlist', rating: 0, watchedEpisodes: 0 }));
    expect(cycled.seasons[0].watched).toBe(0);
    expect([...model.pruneSelectionToVisible(new Set(['a', 'b']), new Set(['b', 'c']))]).toEqual(['b']);
  });

  test('library model preserves stronger season progress during metadata refresh', () => {
    const model = loadLibraryModel();
    const previous = {
      id: 'show-1',
      title: 'Safe Show',
      mediaType: 'tv',
      status: 'in_progress',
      totalEpisodes: 8,
      watchedEpisodes: 6,
      seasons: [{ number: 1, total: 8, watched: 6, name: 'Season 1' }],
    };
    const incoming = {
      ...previous,
      totalEpisodes: 4,
      watchedEpisodes: 4,
      seasons: [{ number: 1, total: 4, watched: 4, name: 'Season 1' }],
    };

    const protectedEntry = model.protectProgress(previous, incoming);

    expect(protectedEntry).toEqual(expect.objectContaining({
      status: 'in_progress',
      totalEpisodes: 8,
      watchedEpisodes: 6,
    }));
    expect(protectedEntry.seasons[0]).toEqual(expect.objectContaining({
      total: 8,
      watched: 6,
    }));
  });

  test('library model builds shared metadata enrichment patches', () => {
    const model = loadLibraryModel();
    const patch = model.metadataEnrichmentPatch({
      title: 'Full Title',
      year: '2026',
      genre: 'Drama',
      director: 'Creator',
      country: 'Japan',
      runtime: 24,
      source_status: 'Running',
      overview: 'Summary',
      poster_path: '/full.jpg',
      seasons: [{ number: 1, total: 12, name: 'Season 1' }],
    }, {}, path => `poster:${path}`);

    expect(patch).toEqual(expect.objectContaining({
      title: 'Full Title',
      year: '2026',
      genre: 'Drama',
      director: 'Creator',
      country: 'Japan',
      runtime: 24,
      sourceStatus: 'Running',
      notes: 'Summary',
      posterUrl: 'poster:/full.jpg',
      totalEpisodes: 12,
      watchedEpisodes: 0,
      seasons: [{ number: 1, total: 12, watched: 0, name: 'Season 1' }],
    }));
    expect(model.metadataEnrichmentPatch({ overview: 'New' }, { notes: 'Keep' })).not.toHaveProperty('notes');
  });

  test('library model summarizes bulk metadata refresh results', () => {
    const model = loadLibraryModel();
    const state = model.bulkMetadataRefreshState();

    model.recordBulkMetadataRefresh(state, { title: 'Finished Show', demoted: true });
    model.recordBulkMetadataRefresh(state, { title: 'Another Show', demoted: true });
    model.recordBulkMetadataRefresh(state, { failed: true });

    expect(state).toEqual({
      updated: 2,
      failed: 1,
      demoted: 2,
      demotedTitles: ['Finished Show', 'Another Show'],
    });
    expect(model.bulkMetadataRefreshSummary(state, { cancelled: true }))
      .toBe('Refreshed 2 titles · ⏳ 2 back to In Progress (Finished Show, Another Show) · 1 failed · cancelled');
  });

  test('bulk metadata refresh results are routed through the library model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const refreshState = libraryModel.bulkMetadataRefreshState();');
    expect(app).toContain('libraryModel.recordBulkMetadataRefresh(refreshState, { demoted: result?.demoted, title: m.title });');
    expect(app).toContain('libraryModel.recordBulkMetadataRefresh(refreshState, { failed: true });');
    expect(app).toContain('libraryModel.bulkMetadataRefreshSummary(refreshState, { cancelled: cancelTmdbRefresh })');
  });

  test('library model compares and restores from backup snapshots', () => {
    const model = loadLibraryModel();
    const snapshot = [
      {
        id: 'old-safe',
        title: 'Safe Show',
        mediaType: 'tv',
        tmdbId: 42,
        status: 'watched',
        totalEpisodes: 8,
        watchedEpisodes: 8,
      },
      {
        id: 'missing',
        title: 'Missing Film',
        mediaType: 'movie',
        tmdbId: 99,
        status: 'watched',
        rating: 8,
      },
    ];
    const current = [{
      id: 'current-safe',
      title: 'Safe Show',
      mediaType: 'tv',
      tmdbId: 42,
      status: 'watchlist',
      totalEpisodes: 8,
      watchedEpisodes: 0,
    }];

    const comparison = model.compareSnapshot(current, snapshot);
    expect(comparison.hasIssues).toBe(true);
    expect(comparison.missing).toHaveLength(1);
    expect(comparison.progressRegressed).toHaveLength(1);

    const restored = model.restoreFromSnapshot(current, snapshot);
    expect(restored).toHaveLength(2);
    expect(restored.find(entry => entry.tmdbId === 42)).toEqual(expect.objectContaining({
      status: 'watched',
      watchedEpisodes: 8,
    }));
    expect(restored.find(entry => entry.tmdbId === 99)).toEqual(expect.objectContaining({
      title: 'Missing Film',
      status: 'watched',
    }));
  });

  test('library mutations are routed through the safety model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(index).toContain('scripts/library-model.js');
    expect(app).toContain('const libraryModel = window.CineTrack?.library;');
    expect(app).toContain('function addLibraryEntry');
    expect(app).toContain('function updateLibraryEntry');
    expect(app).toContain('function removeLibraryEntry');
    expect(app).toContain('function compareLibraryBackup');
    expect(app).toContain('function restoreLibraryFromBackup');
    expect(app).toContain('movies = sanitiseLibrary();');
    expect(app).toContain('writeLocalLibraryBackup(signOutPlan.backupReason, movies);');
  });

  test('error log stores bounded structured diagnostics', () => {
    const storage = memoryStorage();
    const model = loadErrorLog(storage);

    for (let i = 0; i < 4; i++) {
      model.record({
        area: 'sync.save',
        severity: 'warn',
        error: new Error(`Failure ${i}`),
        meta: { attempt: i },
        limit: 3,
        storage,
      });
    }

    const entries = model.read(model.DEFAULT_KEY, storage);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual(expect.objectContaining({
      area: 'sync.save',
      severity: 'warn',
      message: 'Failure 3',
      meta: { attempt: 3 },
    }));
    expect(entries[0].error).toEqual(expect.objectContaining({ name: 'Error' }));
  });

  test('sync model preserves local-change guards and save payload shape', () => {
    const model = loadSyncModel();

    expect(model.hasUnsyncedLocalChanges({
      cloudSyncTimer: null,
      localChangeVersion: 3,
      lastSavedLocalVersion: 2,
      pendingSync: null,
    })).toBe(true);
    expect(model.shouldSkipCloudLoad({ force: false, hasLocalChanges: true })).toBe(true);
    expect(model.shouldSkipCloudLoad({ force: true, hasLocalChanges: true })).toBe(false);
    expect(model.didEditDuringLoad({
      initialChangeVersion: 1,
      currentChangeVersion: 1,
      initialTimerSet: false,
      currentTimerSet: true,
    })).toBe(true);
    expect(model.shouldUseLoadedRow({
      onlyIfNewer: true,
      lastCloudUpdatedAt: '2026-05-23T10:00:00.000Z',
      row: { updated_at: '2026-05-23T09:00:00.000Z' },
    })).toBe(false);
    expect(model.cloudLoadDecision({
      force: false,
      hasLocalChanges: true,
    })).toEqual({
      action: 'skip-pending',
      result: { ok: false, pendingLocal: true, error: 'Skipped cloud load because this device has pending local changes.' },
    });
    expect(model.cloudLoadDecision({
      onlyIfNewer: true,
      row: { updated_at: '2026-05-23T09:00:00.000Z' },
      lastCloudUpdatedAt: '2026-05-23T10:00:00.000Z',
    })).toEqual({
      action: 'skip-not-newer',
      result: { ok: true, changed: false },
    });
    expect(model.cloudLoadDecision({
      initialChangeVersion: 1,
      currentChangeVersion: 2,
    })).toEqual({
      action: 'skip-midflight',
      result: { ok: false, pendingLocal: true, error: 'Skipped cloud load because new local changes appeared during the load.' },
    });
    expect(model.cloudLoadDecision({ row: { updated_at: '2026-05-23T11:00:00.000Z' } }).action).toBe('apply');
    expect(model.cloudApplyPlan({
      row: { exists: true, movies: [{ id: 'a' }], updated_at: '2026-05-23T11:00:00.000Z', version: 7 },
      backupWritten: true,
    })).toEqual({
      shouldApply: true,
      changed: true,
      next: {
        lastCloudUpdatedAt: '2026-05-23T11:00:00.000Z',
        lastCloudVersion: 7,
        lastCloudItemCount: 1,
      },
    });
    expect(model.cloudApplyPlan({
      row: { exists: true, movies: [{ id: 'a' }] },
      backupWritten: false,
    })).toEqual(expect.objectContaining({
      shouldApply: false,
      error: 'Could not create a local safety backup before refreshing cloud data.',
    }));
    expect(model.cloudRefreshDecision({
      hasClient: true,
      hasUser: true,
      now: 5000,
      lastAttempt: 1000,
      reason: 'pageshow',
    })).toEqual({ shouldRefresh: true, delay: 250, nextLastAttempt: 5000 });
    expect(model.cloudRefreshDecision({
      hasClient: true,
      hasUser: true,
      now: 3000,
      lastAttempt: 1000,
    }).shouldRefresh).toBe(false);
    expect(model.cloudRefreshDecision({
      hasClient: true,
      hasUser: true,
      hasLocalChanges: true,
      now: 5000,
      lastAttempt: 0,
    }).shouldRefresh).toBe(false);
    expect(model.signInSyncToast({ previousCount: 2, newCount: 5 }))
      .toBe('Synced — 3 new titles from another device');
    expect(model.signInSyncToast({ previousCount: 5, newCount: 2 }))
      .toBe('Synced — 3 titles removed since this device last synced');
    expect(model.signInSyncToast({ previousCount: 5, newCount: 6 })).toBe('');
    expect(model.signInLoadPlan({ hasLocalChanges: true })).toEqual({
      saveFirst: true,
      loadOptions: { onlyIfNewer: true },
      savingMessage: 'Saving local changes before cloud load',
    });
    expect(model.signInLoadPlan({ hasLocalChanges: false })).toEqual({
      saveFirst: false,
      loadOptions: {},
      savingMessage: '',
    });
    expect(model.failedSaveLoadResult({ error: 'Nope' })).toEqual({ ok: false, error: 'Nope' });
    expect(model.signOutCleanupPlan({ storageKey: 'cinetrack_movies' })).toEqual({
      backupReason: 'before-sign-out-clear',
      reset: {
        currentUser: null,
        currentUsername: null,
        sharingEnabled: false,
        initialLibrarySyncPending: false,
        lastCloudUpdatedAt: null,
        lastCloudItemCount: null,
        localChangeVersion: 0,
        lastSavedLocalVersion: 0,
      },
      clearStorageKeys: ['cinetrack_movies', 'cinetrack_sharing'],
      nextAuthMode: 'form',
    });
    expect(model.authStateChangePlan({
      event: 'SIGNED_IN',
      session: { user: { id: 'user-1' }, access_token: 'token-1' },
      currentAccessToken: 'old-token',
    })).toEqual({
      type: 'sign-in',
      currentAccessToken: 'token-1',
      user: { id: 'user-1' },
      accessToken: 'token-1',
    });
    expect(model.authStateChangePlan({
      event: 'SIGNED_OUT',
      session: null,
      currentAccessToken: 'token-1',
    })).toEqual({
      type: 'sign-out',
      currentAccessToken: '',
      reset: {
        userDataFetched: false,
        currentUser: null,
        initialLibrarySyncPending: false,
      },
      stopCloudPolling: true,
      updateMutationLock: true,
      updateUserMenu: true,
    });
    expect(model.authStateChangePlan({
      event: 'TOKEN_REFRESHED',
      session: { access_token: 'token-2' },
      currentAccessToken: 'token-1',
    })).toEqual({ type: 'ignore', currentAccessToken: 'token-2' });
    expect(model.initialSessionPlan({
      session: { user: { id: 'user-1' }, access_token: 'session-token' },
    })).toEqual({
      type: 'sign-in',
      user: { id: 'user-1' },
      accessToken: 'session-token',
    });
    expect(model.initialSessionPlan({ session: null })).toEqual({
      type: 'show-auth',
      authMode: 'form',
    });
    expect(model.initialSessionErrorPlan({
      hasCurrentUser: true,
      hasMovies: true,
      errorMessage: 'Timeout',
    })).toEqual({
      type: 'keep-current-user',
      hideAuthOverlay: true,
      updateCountryDropdown: true,
      render: true,
      startCloudPolling: true,
    });
    expect(model.initialSessionErrorPlan({
      hasCurrentUser: false,
      hasMovies: false,
      errorMessage: 'Timeout',
    })).toEqual({
      type: 'local-mode',
      offlineMode: true,
      hideAuthOverlay: true,
      syncState: { state: 'error', message: 'Timeout' },
      seedData: true,
      updateCountryDropdown: true,
      render: true,
      toast: { message: 'Cloud session timed out. Opened in local mode.', isError: true },
    });
    expect(model.reloadFromCloudPlan()).toEqual(expect.objectContaining({
      hideUserDropdown: true,
      clearPendingSave: true,
      loadOptions: { force: true },
      successToast: expect.any(String),
    }));
    expect(model.reloadFromCloudResultPlan({ ok: true }).toast).toBe(model.reloadFromCloudPlan().successToast);
    expect(model.reloadFromCloudResultPlan({ ok: false }).toast).toBe('');
    expect(model.manualSyncStartPlan({ offlineMode: true, hasCurrentUser: true })).toEqual({
      canSync: false,
      hideUserDropdown: true,
      toast: { message: 'Sync unavailable in offline mode.', isError: true },
    });
    expect(model.manualSyncStartPlan({ offlineMode: false, hasCurrentUser: true })).toEqual(expect.objectContaining({
      canSync: true,
      hideUserDropdown: true,
      clearPendingSave: true,
    }));
    expect(model.manualSyncWorkPlan({ hasLocalChanges: true })).toEqual(expect.objectContaining({
      saveFirst: true,
      loadOptions: { force: true },
      saveError: 'Cloud save failed',
      loadError: 'Cloud reload failed',
      successToast: expect.any(String),
    }));
    expect(model.manualSyncWorkPlan({ hasLocalChanges: false }).saveFirst).toBe(false);
    expect(model.manualSyncErrorToast({ message: 'Nope' })).toEqual({
      message: 'Sync failed: Nope',
      isError: true,
    });
    expect(model.shouldSaveUserData({ hasClient: false, hasUser: true })).toEqual({
      shouldSave: false,
      result: { ok: false, error: 'Not signed in' },
    });
    expect(model.shouldSaveUserData({ hasClient: true, hasUser: true })).toEqual({
      shouldSave: false,
      result: { ok: true, skipped: true },
    });
    expect(model.shouldSaveUserData({ hasClient: true, hasUser: true, hasPendingMarker: true }).shouldSave).toBe(true);
    expect(model.saveSuccessState({
      result: { updated_at: '2026-05-23T13:00:00.000Z', version: 8, item_count: 3 },
      payload: { updated_at: '2026-05-23T12:00:00.000Z' },
      moviesLength: 2,
      lastCloudVersion: 7,
      lastSavedLocalVersion: 4,
      saveVersion: 5,
    })).toEqual({
      lastCloudUpdatedAt: '2026-05-23T13:00:00.000Z',
      lastCloudVersion: 8,
      lastCloudItemCount: 3,
      lastSavedLocalVersion: 5,
    });

    expect(model.buildSavePayload({
      userId: 'user-1',
      movies: [{ id: 'a' }],
      updatedAt: '2026-05-23T11:00:00.000Z',
      lastCloudUpdatedAt: '2026-05-22T10:00:00.000Z',
      lastCloudVersion: 4,
    })).toEqual({
      userId: 'user-1',
      movies: [{ id: 'a' }],
      updated_at: '2026-05-23T11:00:00.000Z',
      base_updated_at: '2026-05-22T10:00:00.000Z',
      base_version: 4,
    });

    expect(model.normaliseUserDataRow({
      movies: [{ id: 'one' }],
      updated_at: '2026-05-23T12:00:00.000Z',
      version: '7',
    })).toEqual({
      movies: [{ id: 'one' }],
      updated_at: '2026-05-23T12:00:00.000Z',
      version: 7,
      item_count: 1,
      exists: true,
    });

    expect(model.assertApiLoadResponse({ ok: true }, { movies: [] })).toEqual(expect.objectContaining({
      movies: [],
      exists: true,
    }));
    expect(() => model.assertApiSaveResponse({ ok: false, status: 409 }, { error: 'Conflict' }, { movies: [] }))
      .toThrow('Conflict');
  });

  test('cloud refresh scheduling is routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const decision = syncModel.cloudRefreshDecision({');
    expect(app).toContain('hasLocalChanges: hasUnsyncedLocalChanges()');
    expect(app).toContain('if (!decision.shouldRefresh) return;');
    expect(app).toContain('lastCloudRefreshAttempt = decision.nextLastAttempt;');
    expect(app).toContain('}, decision.delay);');
  });

  test('cloud load and save state decisions are routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const preLoadDecision = syncModel.cloudLoadDecision({ force, hasLocalChanges });');
    expect(app).toContain('const loadDecision = syncModel.cloudLoadDecision({');
    expect(app).toContain('if (loadDecision.action !== \'apply\') {');
    expect(app).toContain('const saveDecision = syncModel.shouldSaveUserData({');
    expect(app).toContain('const nextSyncState = syncModel.saveSuccessState({');
    expect(app).not.toContain('const newEditsMidFlight = syncModel.didEditDuringLoad');
  });

  test('sign-in sync count toast is routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const syncToast = syncModel.signInSyncToast({');
    expect(app).toContain('newCount: Array.isArray(movies) ? movies.length : 0');
    expect(app).toContain('if (syncToast) showToast(syncToast);');
  });

  test('sign-in cloud load plan is routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const loadPlan = syncModel.signInLoadPlan({ hasLocalChanges: hasUnsyncedLocalChanges() });');
    expect(app).toContain('if (loadPlan.saveFirst) {');
    expect(app).toContain('setSyncState(\'saving\', loadPlan.savingMessage);');
    expect(app).toContain('loaded = syncModel.failedSaveLoadResult(saved);');
    expect(app).toContain('loaded = await loadUserData(loadPlan.loadOptions);');
  });

  test('sign-out cleanup is routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const signOutPlan = syncModel.signOutCleanupPlan({ storageKey: STORAGE_KEY });');
    expect(app).toContain('writeLocalLibraryBackup(signOutPlan.backupReason, movies);');
    expect(app).toContain('currentUser = signOutPlan.reset.currentUser;');
    expect(app).toContain('signOutPlan.clearStorageKeys.forEach(key => localStorage.removeItem(key));');
    expect(app).toContain('showAuthOverlay(signOutPlan.nextAuthMode);');
  });

  test('auth state changes are routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const authPlan = syncModel.authStateChangePlan({ event, session, currentAccessToken });');
    expect(app).toContain('currentAccessToken = authPlan.currentAccessToken;');
    expect(app).toContain('if (authPlan.type === \'sign-in\') {');
    expect(app).toContain('await handleUserSignIn(authPlan.user, authPlan.accessToken);');
    expect(app).toContain('} else if (authPlan.type === \'sign-out\') {');
    expect(app).toContain('userDataFetched = authPlan.reset.userDataFetched;');
    expect(app).toContain('if (authPlan.stopCloudPolling) stopCloudPolling();');
  });

  test('initial session startup is routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const initialSessionPlan = syncModel.initialSessionPlan({ session });');
    expect(app).toContain('await handleUserSignIn(initialSessionPlan.user, initialSessionPlan.accessToken);');
    expect(app).toContain('showAuthOverlay(initialSessionPlan.authMode);');
    expect(app).toContain('const initialSessionErrorPlan = syncModel.initialSessionErrorPlan({');
    expect(app).toContain('hasCurrentUser: Boolean(currentUser)');
    expect(app).toContain('if (initialSessionErrorPlan.type === \'keep-current-user\') {');
    expect(app).toContain('offlineMode = initialSessionErrorPlan.offlineMode;');
    expect(app).toContain('showToast(initialSessionErrorPlan.toast.message, initialSessionErrorPlan.toast.isError);');
  });

  test('manual cloud controls are routed through the sync model', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    expect(app).toContain('const reloadPlan = syncModel.reloadFromCloudPlan();');
    expect(app).toContain('const result = await loadUserData(reloadPlan.loadOptions);');
    expect(app).toContain('const resultPlan = syncModel.reloadFromCloudResultPlan(result);');
    expect(app).toContain('const syncStartPlan = syncModel.manualSyncStartPlan({ offlineMode, hasCurrentUser: Boolean(currentUser) });');
    expect(app).toContain('showToast(syncStartPlan.toast.message, syncStartPlan.toast.isError);');
    expect(app).toContain('const syncWorkPlan = syncModel.manualSyncWorkPlan({ hasLocalChanges: hasUnsyncedLocalChanges() });');
    expect(app).toContain('const loadResult = await loadUserData(syncWorkPlan.loadOptions);');
    expect(app).toContain('const errorToast = syncModel.manualSyncErrorToast(e);');
  });
});
