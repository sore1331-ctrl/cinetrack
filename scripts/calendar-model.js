(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function dateString(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDaysString(days, base = new Date()) {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Number(days || 0));
    return dateString(d);
  }

  function keyForEntry(entry) {
    if (!entry) return '';
    const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
    if (entry.tmdbId) return `${isShow ? 'tv' : 'movie'}:${entry.tmdbId}`;
    if (entry.externalSource === 'tvmaze' && entry.externalId) {
      return `tvmaze:${entry.externalId}`;
    }
    if (entry.externalSource === 'anilist' && entry.externalId) {
      return `${entry.externalSource}:${entry.externalId}`;
    }
    return '';
  }

  function relativeDayLabel(dateStr, base = new Date()) {
    const today = new Date(base);
    today.setHours(0, 0, 0, 0);
    const d = new Date(`${dateStr}T00:00:00`);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString(undefined, opts);
  }

  function episodeOrdinalForProgress(entry, episode) {
    if (!episode) return null;
    const seasonNo = Number(episode.season) || 1;
    const epNo = Number(episode.episode) || 0;
    if (!epNo) return null;

    if (Array.isArray(entry?.seasons) && entry.seasons.length) {
      const sorted = [...entry.seasons].sort((a, b) => (a.number || 0) - (b.number || 0));
      let before = 0;
      for (const season of sorted) {
        const number = Number(season.number) || 0;
        if (number < seasonNo) before += Number(season.total) || 0;
        if (number === seasonNo) return before + epNo;
      }
      return null;
    }

    return seasonNo <= 1 ? epNo : null;
  }

  function hasUnwatchedAiringEpisodeToday(entry, episode, todayStr = dateString()) {
    if (!episode || episode.airDate !== todayStr) return false;
    const ordinal = episodeOrdinalForProgress(entry, episode);
    if (ordinal == null) return true;
    return (entry.watchedEpisodes || 0) < ordinal;
  }

  function airingTodaySignal(entry, cache, todayStr = dateString(), { watchedMode = 'hide' } = {}) {
    if (!entry || !cache?.byId) return null;
    const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
    const isMovie = entry.mediaType === 'movie';

    if (isShow && (entry.status === 'in_progress' || entry.status === 'watchlist')) {
      const key = keyForEntry(entry);
      const episode = key ? cache.byId[key]?.nextEpisode : null;
      if (!episode || episode.airDate !== todayStr) return null;
      if (hasUnwatchedAiringEpisodeToday(entry, episode, todayStr)) return { type: 'episode', episode, watched: false };
      if (watchedMode !== 'hide') return { type: 'episode', episode, watched: true, dim: watchedMode === 'dim' };
    }

    if (isMovie && entry.status === 'watchlist') {
      const releaseDate = cache.byId[`movie:${entry.tmdbId}`]?.releaseDate;
      if (releaseDate === todayStr) return { type: 'movie', releaseDate };
    }

    return null;
  }

  function cacheHasFreshKeys({
    cache = null,
    keys = [],
    ttlMs = 0,
    now = Date.now(),
    requiredSource = '',
  } = {}) {
    if (!keys.length) return true;
    if (!cache?.byId || !cache.fetchedAt) return false;
    if (ttlMs && Number(now || 0) - Number(cache.fetchedAt || 0) >= Number(ttlMs || 0)) return false;
    return keys.every(key => {
      if (!(key in cache.byId)) return false;
      if (!requiredSource) return true;
      return cache.byId[key]?.source === requiredSource;
    });
  }

  function cacheWarmPlan({
    keys = [],
    cache = null,
    ttlMs = 0,
    now = Date.now(),
    force = false,
    inFlight = false,
    lastWarmAt = 0,
    minIntervalMs = 30000,
    requiredSource = '',
  } = {}) {
    const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
    if (!uniqueKeys.length) return { shouldWarm: false, reason: 'empty', keys: uniqueKeys };
    if (inFlight) return { shouldWarm: false, reason: 'in-flight', keys: uniqueKeys };
    if (!force && Number(now || 0) - Number(lastWarmAt || 0) < Number(minIntervalMs || 0)) {
      return { shouldWarm: false, reason: 'throttled', keys: uniqueKeys };
    }
    if (!force && cacheHasFreshKeys({ cache, keys: uniqueKeys, ttlMs, now, requiredSource })) {
      return { shouldWarm: false, reason: 'fresh', keys: uniqueKeys };
    }
    return { shouldWarm: true, reason: force ? 'forced' : 'stale-or-missing', keys: uniqueKeys };
  }

  function discoverActionFromDataset(dataset = {}) {
    return {
      tmdbId: dataset.addId || dataset.tmdbId || '',
      type: dataset.addType || dataset.type || 'movie',
      title: dataset.addTitle || dataset.title || '',
      year: dataset.addYear || dataset.year || '',
      posterPath: dataset.addPoster || dataset.posterPath || '',
    };
  }

  function discoverMediaType(type) {
    return type === 'anime' ? 'anime' : (type === 'tv' ? 'tv' : 'movie');
  }

  function discoverFetchType(type) {
    return discoverMediaType(type) === 'movie' ? 'movie' : 'tv';
  }

  function discoverCacheKey({ type = 'movie', region = 'US', page = 1 } = {}) {
    return `${discoverMediaType(type)}:${region || 'US'}:${Number(page || 1)}`;
  }

  function pruneTimestampCache(cache = {}, { maxEntries = 24 } = {}) {
    const entries = Object.entries(cache || {});
    if (entries.length <= maxEntries) return cache || {};
    return Object.fromEntries(
      entries
        .sort((a, b) => Number(b[1]?.fetchedAt || 0) - Number(a[1]?.fetchedAt || 0))
        .slice(0, maxEntries)
    );
  }

  function discoverWatchlistEntry(action = {}, posterUrl = path => path || '') {
    return {
      title: action.title || '',
      year: action.year || '',
      status: 'watchlist',
      rating: 0,
      mediaType: discoverMediaType(action.type),
      tmdbId: Number(action.tmdbId),
      posterUrl: action.posterPath ? posterUrl(action.posterPath) : '',
      genre: '',
      director: '',
      country: '',
      notes: '',
      runtime: 0,
    };
  }

  function warmKeysForEntries(entries = []) {
    const ids = [];
    const tvEntries = [];
    const externalEntries = [];
    for (const entry of entries || []) {
      const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
      if (isShow && (entry.status === 'in_progress' || entry.status === 'watchlist')) {
        if (entry.tmdbId) ids.push(`tv:${entry.tmdbId}`);
        if (entry.externalSource === 'anilist' && entry.externalId) {
          externalEntries.push(entry);
        }
        tvEntries.push(entry);
      } else if (entry.mediaType === 'movie' && entry.status === 'watchlist' && entry.tmdbId) {
        ids.push(`movie:${entry.tmdbId}`);
      }
    }
    return { ids: [...new Set(ids)], tvEntries, externalEntries };
  }

  function trackedEntries(library = [], keyFor = keyForEntry) {
    return (library || []).filter(entry => keyFor(entry) && (
      ((entry.mediaType === 'tv' || entry.mediaType === 'anime') && (entry.status === 'in_progress' || entry.status === 'watchlist')) ||
      (entry.mediaType === 'movie' && entry.status === 'watchlist')
    ));
  }

  function addUniqueRow(rows, seen, row) {
    if (!row?.date) return;
    const baseKey = `${row.kind}:${row.uniqueKey || row.tmdbId || row.title}:${row.date}`;
    const key = row.episodeKey ? `${baseKey}:${row.episodeKey}` : `${baseKey}:${row.sublabel || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }

  function trackedRows({
    upcoming = [],
    tracked = [],
    cache = null,
    todayStr = dateString(),
    tvHorizonStr = addDaysString(14),
    movieHorizonStr = addDaysString(60),
    posterBase = '',
    keyFor = keyForEntry,
    infoUrlForEntry = () => '',
    watchedMode = 'hide',
  } = {}) {
    const localByKey = new Map((tracked || []).map(entry => [keyFor(entry), entry]));
    const rows = [];
    const seen = new Set();
    const heldTodayKeys = new Set();

    for (const item of upcoming || []) {
      const key = item?.sourceKey || `${item?.type}:${item?.tmdbId}`;
      const local = localByKey.get(key);
      const episode = item?.nextEpisode;
      if (
        local &&
        episode?.airDate === todayStr &&
        hasUnwatchedAiringEpisodeToday(local, episode, todayStr)
      ) {
        heldTodayKeys.add(key);
      }
    }

    for (const item of upcoming || []) {
      const key = item?.sourceKey || `${item?.type}:${item?.tmdbId}`;
      const local = localByKey.get(key);

      if (item?.type === 'movie') {
        const releaseDate = item.releaseDate;
        if (releaseDate && releaseDate >= todayStr && releaseDate <= movieHorizonStr) {
        addUniqueRow(rows, seen, {
          uniqueKey: key,
          date: releaseDate,
          kind: 'movie',
          tmdbId: item.tmdbId,
            title: local?.title || item.title,
            poster: local?.posterUrl || item.poster_url || (item.poster_path ? posterBase + item.poster_path : ''),
            sublabel: '\u{1F3AC} Theatrical release',
            tmdbUrl: item.externalUrl || `https://www.themoviedb.org/movie/${item.tmdbId}`,
          });
        }
        continue;
      }

      const episode = item?.nextEpisode;
      if (episode?.airDate && episode.airDate >= todayStr && episode.airDate <= tvHorizonStr) {
        if (heldTodayKeys.has(key) && episode.airDate !== todayStr) continue;
        const watchedToday = local && episode.airDate === todayStr && !hasUnwatchedAiringEpisodeToday(local, episode, todayStr);
        if (watchedToday && watchedMode === 'hide') continue;
        addUniqueRow(rows, seen, {
          uniqueKey: key,
          date: episode.airDate,
          kind: local?.mediaType === 'anime' ? 'anime' : 'tv',
          tmdbId: item.tmdbId || item.externalId || '',
          title: local?.title || item.title,
          poster: local?.posterUrl || item.poster_url || (item.poster_path ? posterBase + item.poster_path : ''),
          sublabel: `S${episode.season}E${episode.episode}${episode.name ? ` \u00B7 ${episode.name}` : ''}`,
          episodeKey: `S${episode.season}E${episode.episode}`,
          tmdbUrl: item.externalUrl || (local ? infoUrlForEntry(local) : '') || (item.tmdbId ? `https://www.themoviedb.org/tv/${item.tmdbId}` : ''),
          source: item.source || '',
          watched: Boolean(watchedToday),
          dimWatched: Boolean(watchedToday && watchedMode === 'dim'),
        });
      }
    }

    for (const local of tracked || []) {
      const signal = airingTodaySignal(local, cache, todayStr, { watchedMode });
      if (!signal) continue;
      if (signal.type === 'episode') {
        const episode = signal.episode;
        addUniqueRow(rows, seen, {
          uniqueKey: keyFor(local),
          date: todayStr,
          kind: local.mediaType === 'anime' ? 'anime' : 'tv',
          tmdbId: local.tmdbId || local.externalId || '',
          title: local.title,
          poster: local.posterUrl || '',
          sublabel: `S${episode.season}E${episode.episode}${episode.name ? ` \u00B7 ${episode.name}` : ''}`,
          episodeKey: `S${episode.season}E${episode.episode}`,
          tmdbUrl: infoUrlForEntry(local),
          source: signal.source || '',
          watched: Boolean(signal.watched),
          dimWatched: Boolean(signal.dim),
        });
      } else if (signal.type === 'movie') {
        addUniqueRow(rows, seen, {
          uniqueKey: keyFor(local),
          date: todayStr,
          kind: 'movie',
          tmdbId: local.tmdbId || '',
          title: local.title,
          poster: local.posterUrl || '',
          sublabel: '\u{1F3AC} Theatrical release',
          tmdbUrl: infoUrlForEntry(local),
        });
      }
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  function groupRowsByDate(rows = []) {
    return (rows || []).reduce((groups, row) => {
      (groups[row.date] ||= []).push(row);
      return groups;
    }, {});
  }

  root.calendar = {
    dateString,
    addDaysString,
    keyForEntry,
    relativeDayLabel,
    episodeOrdinalForProgress,
    hasUnwatchedAiringEpisodeToday,
    airingTodaySignal,
    cacheHasFreshKeys,
    cacheWarmPlan,
    discoverActionFromDataset,
    discoverMediaType,
    discoverFetchType,
    discoverCacheKey,
    pruneTimestampCache,
    discoverWatchlistEntry,
    warmKeysForEntries,
    trackedEntries,
    trackedRows,
    groupRowsByDate,
  };
})();
