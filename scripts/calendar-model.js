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

  function episodeRange(from, to, prefix = '') {
    if (!(from > 0) || to < from) return '';
    return from === to ? `${prefix}E${from}` : `${prefix}E${from}–${to}`;
  }

  // Short label for a source episode in the numbering the card's progress
  // uses: "S2 E10" for multi-season tracking, "E10" otherwise. Returns '' when
  // the source numbering can't be placed (e.g. an anime cour numbered from 13
  // but tracked as 1-12), so a card never shows a misleading episode number.
  function episodeTag(entry, episode) {
    if (!episode) return '';
    const seasonNo = Number(episode.season) || 1;
    const epNo = Number(episode.episode) || 0;
    if (!epNo) return '';
    const seasons = Array.isArray(entry?.seasons) ? entry.seasons : [];
    if (seasons.length > 1) {
      const season = seasons.find(s => Number(s?.number) === seasonNo);
      if (!season) return '';
      const total = Number(season.total) || 0;
      return total && epNo > total ? '' : `S${seasonNo} E${epNo}`;
    }
    const total = seasons.length ? (Number(seasons[0]?.total) || 0) : (Number(entry?.totalEpisodes) || 0);
    return total && epNo > total ? '' : `E${epNo}`;
  }

  function hasUnwatchedAiringEpisodeToday(entry, episode, todayStr = dateString()) {
    if (!episode || episode.airDate !== todayStr) return false;
    const ordinal = episodeOrdinalForProgress(entry, episode);
    if (ordinal != null) return (entry.watchedEpisodes || 0) < ordinal;

    // The source labelled this episode with a season that isn't in the entry's
    // tracked season structure. For entries tracked as a flat count or a single
    // season — common for anime added as a standalone cour, where AniList/TMDB
    // disagree on season boundaries — fall back to the raw episode number vs.
    // the flat watched count so an already-watched episode isn't re-surfaced as
    // still-to-watch. Multi-season entries keep the "treat as unwatched" default
    // so a genuinely new season still appears.
    const seasons = Array.isArray(entry?.seasons) ? entry.seasons : [];
    if (seasons.length <= 1) {
      const epNo = Number(episode?.episode) || 0;
      if (!epNo) return true;
      return (entry.watchedEpisodes || 0) < epNo;
    }
    return true;
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

  // ── Aired episodes: one rule for every part of a card ──────────────────
  //
  // A show's "aired" count used to come from three places that disagreed: a
  // snapshot saved at the last metadata refresh (label and +1), the cached
  // next episode (behind count, bar, Today pill), and nothing at all for
  // AniList/TVmaze titles. Everything now reads effectiveAired(), which takes
  // the highest of:
  //   - the saved per-season `aired` (refresh snapshot, raised by live checks),
  //   - what the live airing data proves has aired (per-season counts from the
  //     full episode list, and "everything before the next episode"),
  //   - what the viewer has watched (you can't have watched an unaired episode),
  // clamped to the season's episode total. Aired counts only ever go up, so
  // the highest trustworthy value is the most recent one.

  function seasonTotal(season) {
    return Math.max(0, Number(season?.total) || 0);
  }

  // Live counts from another source only apply to a season whose size roughly
  // matches ours; a mismatch means the sources number seasons differently
  // (common for anime) and the counts can't be mapped safely.
  function similarSize(liveTotal, ourTotal) {
    if (!liveTotal || !ourTotal) return true;
    return Math.abs(liveTotal - ourTotal) <= Math.max(2, Math.round(ourTotal * 0.25));
  }

  function episodeHasAired(episode, { nowMs = Date.now(), todayStr = dateString() } = {}) {
    const stamp = Date.parse(episode?.airstamp || '');
    if (Number.isFinite(stamp)) return stamp <= nowMs;
    return Boolean(episode?.airDate) && episode.airDate < todayStr;
  }

  // Lower bounds on aired episodes proven by live data, in the entry's own
  // season numbering: { bySeason: Map<seasonNumber, aired>, flat: number|null }.
  function liveAired(entry, item, clock = {}) {
    const out = { bySeason: new Map(), flat: null };
    if (!entry || !item || typeof item !== 'object') return out;
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    const byNumber = new Map(seasons.map(season => [Number(season?.number), season]));
    const raise = (number, value) => {
      const season = byNumber.get(number);
      if (!season) return;
      const capped = Math.min(seasonTotal(season), Math.max(0, value));
      out.bySeason.set(number, Math.max(out.bySeason.get(number) || 0, capped));
    };

    if (seasons.length) {
      for (const [key, value] of Object.entries(item.airedBySeason || {})) {
        const number = Number(key);
        const season = byNumber.get(number);
        if (!season || !similarSize(Number(item.seasonTotals?.[key]) || 0, seasonTotal(season))) continue;
        raise(number, Number(value) || 0);
      }
    }

    const next = item.nextEpisode;
    const nextSeason = Number(next?.season) || 1;
    const nextEp = Number(next?.episode) || 0;
    if (nextEp > 0) {
      const airedInSeason = episodeHasAired(next, clock) ? nextEp : nextEp - 1;
      if (seasons.length) {
        const season = byNumber.get(nextSeason);
        if (season && nextEp <= seasonTotal(season) + 1) {
          raise(nextSeason, airedInSeason);
          // Every earlier season has finished airing.
          for (const other of seasons) {
            if (Number(other?.number) < nextSeason) raise(Number(other.number), seasonTotal(other));
          }
        }
      } else if (nextSeason <= 1) {
        out.flat = Math.max(0, airedInSeason);
      }
    }

    if (!seasons.length && item.airedBySeason && Object.keys(item.airedBySeason).length === 1) {
      const only = Number(Object.values(item.airedBySeason)[0]) || 0;
      const liveTotal = Number(Object.values(item.seasonTotals || {})[0]) || 0;
      if (similarSize(liveTotal, Number(entry.totalEpisodes) || 0)) out.flat = Math.max(out.flat || 0, only);
    }
    return out;
  }

  // The entry as every card part should see it: same fields, with `aired`
  // on each season (and airedEpisodes for flat entries) set by the rule above.
  function effectiveAired(entry, item, clock = {}) {
    const isShow = entry?.mediaType === 'tv' || entry?.mediaType === 'anime';
    if (!isShow) return entry;
    const live = liveAired(entry, item, clock);
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    if (seasons.length) {
      return {
        ...entry,
        seasons: seasons.map(season => {
          const total = seasonTotal(season);
          const number = Number(season?.number);
          const liveValue = live.bySeason.get(number);
          // A season saved before aired-tracking reads as fully aired, unless
          // live data now says otherwise.
          const saved = season?.aired != null
            ? Number(season.aired) || 0
            : (liveValue != null ? 0 : total);
          const watched = Math.min(total, Math.max(0, Number(season?.watched) || 0));
          const aired = Math.min(total, Math.max(saved, liveValue || 0, watched));
          return { ...season, aired };
        }),
      };
    }
    const total = Math.max(0, Number(entry.totalEpisodes) || 0);
    if (!total) return entry;
    const saved = entry.airedEpisodes != null ? Number(entry.airedEpisodes) || 0 : (live.flat != null ? 0 : total);
    const watched = Math.max(0, Number(entry.watchedEpisodes) || 0);
    return { ...entry, airedEpisodes: Math.min(total, Math.max(saved, live.flat || 0, watched)) };
  }

  // Saved-value update when live data proves more episodes have aired than
  // the entry records. Only aired fields change; watch progress never does.
  // Returns the patch, or null when nothing needs saving.
  function airedUpdatePatch(entry, item, clock = {}) {
    const isShow = entry?.mediaType === 'tv' || entry?.mediaType === 'anime';
    if (!isShow || !item) return null;
    const live = liveAired(entry, item, clock);
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    if (seasons.length) {
      let changed = false;
      const next = seasons.map(season => {
        const liveValue = live.bySeason.get(Number(season?.number));
        if (liveValue == null) return season;
        const saved = season?.aired != null ? Number(season.aired) || 0 : null;
        if (saved != null && liveValue <= saved) return season;
        if (saved == null && liveValue >= seasonTotal(season)) return season;
        changed = true;
        return { ...season, aired: liveValue };
      });
      return changed ? { seasons: next } : null;
    }
    if (live.flat == null) return null;
    const saved = entry.airedEpisodes != null ? Number(entry.airedEpisodes) || 0 : null;
    const total = Math.max(0, Number(entry.totalEpisodes) || 0);
    const value = total ? Math.min(total, live.flat) : live.flat;
    if (saved != null ? value <= saved : (!total || value >= total)) return null;
    return { airedEpisodes: value };
  }

  function seasonLabel(seasons, number) {
    return seasons.length > 1 ? `S${number} ` : '';
  }

  // "Behind" for a show that is still airing: aired episodes not yet watched,
  // counted across the whole show (watched 2, 5 aired → 3 behind). airedPct
  // places the aired point on the card's bar, which spans the active season
  // (or the whole show for flat entries). A show with nothing left to air
  // reports no behind count.
  function airedProgress(entry, cache, activeSeasonFn, clock = {}) {
    const none = { behind: 0, airedPct: 0, behindLabel: '' };
    if (!entry) return none;
    const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
    if (!isShow) return none;
    if (entry.status !== 'in_progress' && entry.status !== 'watchlist') return none;
    const key = keyForEntry(entry);
    const item = key ? cache?.byId?.[key] : null;
    const view = effectiveAired(entry, item, clock);
    const seasons = Array.isArray(view.seasons) ? view.seasons : [];

    if (seasons.length) {
      const sorted = [...seasons].sort((a, b) => (a.number || 0) - (b.number || 0));
      const stillAiring = sorted.some(season => season.aired < seasonTotal(season)) || Boolean(item?.nextEpisode);
      if (!stillAiring) return none;
      let behind = 0;
      let first = null;
      let last = null;
      for (const season of sorted) {
        const watched = Math.min(seasonTotal(season), Math.max(0, Number(season.watched) || 0));
        const gap = Math.max(0, season.aired - watched);
        if (!gap) continue;
        behind += gap;
        if (!first) first = { number: season.number, episode: watched + 1 };
        last = { number: season.number, episode: season.aired };
      }
      const active = typeof activeSeasonFn === 'function' ? activeSeasonFn(view) : null;
      const frame = active ? seasonTotal(active) : 0;
      let behindLabel = '';
      if (first && last) {
        behindLabel = first.number === last.number
          ? episodeRange(first.episode, last.episode, seasonLabel(seasons, first.number))
          : `S${first.number} E${first.episode} – S${last.number} E${last.episode}`;
      }
      return {
        behind,
        airedPct: active && frame > 0 ? Math.round((active.aired / frame) * 100) : 0,
        behindLabel,
      };
    }

    const total = Math.max(0, Number(view.totalEpisodes) || 0);
    if (!total) return none;
    const aired = Math.min(total, Math.max(0, Number(view.airedEpisodes) || 0));
    if (aired >= total && !item?.nextEpisode) return none;
    const watched = Math.min(total, Math.max(0, Number(view.watchedEpisodes) || 0));
    return {
      behind: Math.max(0, aired - watched),
      airedPct: Math.round((aired / total) * 100),
      behindLabel: episodeRange(watched + 1, aired),
    };
  }

  function cacheHasFreshKeys({
    cache = null,
    keys = [],
    ttlMs = 0,
    now = Date.now(),
    requiredSource = '',
    notBefore = 0,
  } = {}) {
    if (!keys.length) return true;
    if (!cache?.byId || !cache.fetchedAt) return false;
    return keys.every(key => {
      if (!(key in cache.byId)) return false;
      // Freshness is per entry: partial cache merges used to renew the single
      // global fetchedAt, keeping entries fetched long ago "fresh" forever.
      // Entries written before per-key stamps existed fall back to the global.
      const stamp = Number(cache.fetchedAtById?.[key] ?? cache.fetchedAt ?? 0);
      if (ttlMs && Number(now || 0) - stamp >= Number(ttlMs || 0)) return false;
      // Airing data checked before today is stale even inside the TTL, so the
      // first open of a new day picks up that day's episodes.
      if (notBefore && stamp < Number(notBefore)) return false;
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
    notBefore = 0,
  } = {}) {
    const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
    if (!uniqueKeys.length) return { shouldWarm: false, reason: 'empty', keys: uniqueKeys };
    if (inFlight) return { shouldWarm: false, reason: 'in-flight', keys: uniqueKeys };
    if (!force && Number(now || 0) - Number(lastWarmAt || 0) < Number(minIntervalMs || 0)) {
      return { shouldWarm: false, reason: 'throttled', keys: uniqueKeys };
    }
    if (!force && cacheHasFreshKeys({ cache, keys: uniqueKeys, ttlMs, now, requiredSource, notBefore })) {
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
    const key = row.episodeKey ? baseKey : `${baseKey}:${row.sublabel || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }

  function cachedUpcomingForTracked({ cache = null, tracked = [], keyFor = keyForEntry } = {}) {
    if (!cache?.byId) return [];
    return (tracked || [])
      .map(entry => {
        const key = keyFor(entry);
        const item = key ? cache.byId[key] : null;
        return item && typeof item === 'object' ? item : null;
      })
      .filter(Boolean);
  }

  function mergeUpcomingForTracked({ live = [], cache = null, tracked = [], keyFor = keyForEntry } = {}) {
    const byKey = new Map();
    for (const item of cachedUpcomingForTracked({ cache, tracked, keyFor })) {
      const key = item?.sourceKey || `${item?.type || 'tv'}:${item?.tmdbId || item?.externalId || ''}`;
      if (key && !key.endsWith(':')) byKey.set(key, item);
    }
    for (const item of live || []) {
      const key = item?.sourceKey || `${item?.type || 'tv'}:${item?.tmdbId || item?.externalId || ''}`;
      if (key && !key.endsWith(':')) byKey.set(key, item);
    }
    return [...byKey.values()];
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

  // ── New-season detection ──────────────────────────────
  // The daily upcoming refresh already returns `nextEpisode.season`, so a
  // premiere can be spotted without spending an extra request per show:
  // if the next episode belongs to a season the library has never recorded,
  // that season is new. Returns one event per newly-seen season.
  //
  // `seen` is a Set of previously-emitted event keys so a premiere is
  // announced once rather than every refresh.
  function newSeasonEvents({ tracked = [], cache = null, seen = new Set(), keyFor = keyForEntry } = {}) {
    const byId = cache?.byId || {};
    const events = [];
    for (const entry of tracked) {
      if (entry?.mediaType !== 'tv' && entry?.mediaType !== 'anime') continue;
      const item = byId[keyFor(entry)];
      const next = item?.nextEpisode;
      if (!next || next.season == null) continue;

      const knownSeasons = Array.isArray(entry.seasons) ? entry.seasons : [];
      const maxKnown = knownSeasons.reduce((max, s) => Math.max(max, Number(s?.number) || 0), 0);
      // A season we already track isn't news, even if it's mid-run.
      if (maxKnown && Number(next.season) <= maxKnown) continue;
      // With no season breakdown at all we can't tell new from ongoing, so
      // only treat an explicit episode 1 as a premiere.
      if (!maxKnown && Number(next.episode) !== 1) continue;

      const key = `${keyFor(entry)}:s${next.season}:premiere`;
      if (seen.has(key)) continue;
      events.push({
        key,
        entryId: entry.id,
        title: entry.title || item.title || '',
        season: Number(next.season),
        episode: Number(next.episode) || 1,
        airDate: next.airDate || null,
        posterUrl: entry.posterUrl || '',
      });
    }
    return events;
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
    airedProgress,
    effectiveAired,
    airedUpdatePatch,
    episodeHasAired,
    episodeTag,
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
    cachedUpcomingForTracked,
    mergeUpcomingForTracked,
    newSeasonEvents,
    trackedRows,
    groupRowsByDate,
  };
})();
