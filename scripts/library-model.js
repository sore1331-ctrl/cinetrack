(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  const MEDIA_TYPES = new Set(['movie', 'tv', 'anime']);
  const STATUSES = new Set(['watchlist', 'in_progress', 'watched', 'dropped']);

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  }

  function isShow(entry) {
    return entry?.mediaType === 'tv' || entry?.mediaType === 'anime';
  }

  function normaliseMediaType(value) {
    const raw = String(value || '').toLowerCase().trim();
    if (raw === 'show' || raw === 'tv show') return 'tv';
    return MEDIA_TYPES.has(raw) ? raw : 'movie';
  }

  function normaliseStatus(value) {
    const raw = String(value || '').toLowerCase().trim().replace(/\s+/g, '_');
    return STATUSES.has(raw) ? raw : 'watchlist';
  }

  function toInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normaliseSeasons(seasons) {
    if (!Array.isArray(seasons)) return [];
    return seasons
      .map((season, index) => {
        const total = Math.max(0, toInt(season?.total, 0));
        const watched = Math.min(total || Math.max(0, toInt(season?.watched, 0)), Math.max(0, toInt(season?.watched, 0)));
        return {
          number: toInt(season?.number, index + 1) || index + 1,
          total,
          watched,
          name: season?.name || '',
        };
      })
      .filter(season => season.total > 0 || season.watched > 0 || season.name);
  }

  function progressValue(entry) {
    if (!isShow(entry)) return entry?.status === 'watched' ? 1 : 0;
    const total = Math.max(0, toInt(entry?.totalEpisodes, 0));
    const watched = Math.max(0, toInt(entry?.watchedEpisodes, 0));
    return total > 0 ? watched / total : watched;
  }

  function seasonSum(entry, field) {
    return Array.isArray(entry?.seasons)
      ? entry.seasons.reduce((sum, season) => sum + Math.max(0, toInt(season?.[field], 0)), 0)
      : 0;
  }

  function statusRank(status) {
    return { watchlist: 0, dropped: 1, in_progress: 2, watched: 3 }[normaliseStatus(status)] ?? 0;
  }

  function normaliseTitle(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(the|a|an)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function entryKey(entry) {
    const mediaType = normaliseMediaType(entry?.mediaType);
    if (entry?.tmdbId) return `${mediaType}:tmdb:${String(entry.tmdbId)}`;
    if (entry?.externalSource && entry?.externalId) {
      return `${mediaType}:${String(entry.externalSource).toLowerCase()}:${String(entry.externalId)}`;
    }
    return `${mediaType}:title:${normaliseTitle(entry?.title)}:${String(entry?.year || '').slice(0, 4)}`;
  }

  function sanitiseEntry(entry = {}, { idFactory = null, now = null } = {}) {
    const mediaType = normaliseMediaType(entry.mediaType);
    const status = normaliseStatus(entry.status);
    const show = mediaType === 'tv' || mediaType === 'anime';
    const seasons = show ? normaliseSeasons(entry.seasons) : [];
    const seasonTotal = seasons.reduce((sum, season) => sum + (season.total || 0), 0);
    const seasonWatched = seasons.reduce((sum, season) => sum + (season.watched || 0), 0);
    const totalEpisodes = show ? Math.max(0, toInt(entry.totalEpisodes, 0), seasonTotal) : 0;
    let watchedEpisodes = show ? Math.max(0, toInt(entry.watchedEpisodes, 0), seasonWatched) : 0;
    if (totalEpisodes > 0 && watchedEpisodes > totalEpisodes) watchedEpisodes = totalEpisodes;

    const next = {
      ...entry,
      id: entry.id || (typeof idFactory === 'function' ? idFactory() : ''),
      addedAt: Number(entry.addedAt) || (typeof now === 'function' ? now() : Date.now()),
      title: String(entry.title || '').trim(),
      year: String(entry.year || '').slice(0, 4),
      genre: String(entry.genre || ''),
      director: String(entry.director || ''),
      country: String(entry.country || ''),
      notes: String(entry.notes || ''),
      runtime: Math.max(0, toInt(entry.runtime, 0)),
      rating: status === 'watchlist' ? 0 : Math.min(10, Math.max(0, toInt(entry.rating, 0))),
      mediaType,
      status,
      totalEpisodes,
      watchedEpisodes,
      seasons,
      watchCount: Math.max(0, toInt(entry.watchCount, status === 'watched' ? 1 : 0)),
    };

    if (next.status === 'watched' && show && next.totalEpisodes > 0) {
      next.watchedEpisodes = next.totalEpisodes;
      next.seasons = next.seasons.map(season => ({ ...season, watched: season.total || 0 }));
    }
    if (next.status === 'watchlist') next.rating = 0;
    if (!next.title) next.title = 'Untitled';
    return next;
  }

  function sanitiseLibrary(entries = [], options = {}) {
    if (!Array.isArray(entries)) return [];
    return entries.map(entry => sanitiseEntry(entry, options));
  }

  function protectProgress(previous, candidate, { allowDowngrade = false } = {}) {
    if (allowDowngrade || !previous || !candidate) return candidate;
    const prev = sanitiseEntry(previous);
    const next = sanitiseEntry(candidate);
    const prevProgress = progressValue(prev);
    const nextProgress = progressValue(next);
    const prevRank = statusRank(prev.status);
    const nextRank = statusRank(next.status);

    if (prevRank > nextRank) next.status = prev.status;
    if (isShow(prev) && isShow(next)) {
      if ((prev.watchedEpisodes || 0) > (next.watchedEpisodes || 0)) {
        next.watchedEpisodes = prev.watchedEpisodes || 0;
      }
      if ((prev.totalEpisodes || 0) > (next.totalEpisodes || 0)) {
        next.totalEpisodes = prev.totalEpisodes || 0;
      }
      const prevSeasonTotal = seasonSum(prev, 'total');
      const nextSeasonTotal = seasonSum(next, 'total');
      const prevSeasonWatched = seasonSum(prev, 'watched');
      const nextSeasonWatched = seasonSum(next, 'watched');
      if (
        Array.isArray(prev.seasons) &&
        prev.seasons.length &&
        (
          !Array.isArray(next.seasons) ||
          !next.seasons.length ||
          prevSeasonTotal > nextSeasonTotal ||
          prevSeasonWatched > nextSeasonWatched
        )
      ) {
        next.seasons = clone(prev.seasons);
      }
    }
    if (prevProgress > nextProgress && prev.status === 'watched') next.status = 'watched';
    if ((prev.rating || 0) > 0 && (next.rating || 0) === 0 && next.status !== 'watchlist') next.rating = prev.rating;
    return sanitiseEntry(next);
  }

  function addEntry(library, entry, options = {}) {
    const next = sanitiseEntry(entry, options);
    return options.position === 'end' ? [...library, next] : [next, ...library];
  }

  function updateEntry(library, id, patch, options = {}) {
    return library.map(entry => {
      if (entry.id !== id) return entry;
      const candidate = typeof patch === 'function' ? patch(clone(entry)) : { ...entry, ...patch };
      const safe = protectProgress(entry, candidate, options);
      return sanitiseEntry(safe, options);
    });
  }

  function removeEntry(library, id) {
    return library.filter(entry => entry.id !== id);
  }

  function removeEntries(library, ids) {
    const set = ids instanceof Set ? ids : new Set(ids || []);
    return library.filter(entry => !set.has(entry.id));
  }

  function changeStatus(library, ids, status, options = {}) {
    const set = ids instanceof Set ? ids : new Set(ids || []);
    const safeStatus = normaliseStatus(status);
    return library.map(entry => {
      if (!set.has(entry.id)) return entry;
      const next = sanitiseEntry({ ...entry, status: safeStatus, rating: safeStatus === 'watchlist' ? 0 : entry.rating }, options);
      return protectProgress(entry, next, { ...options, allowDowngrade: true });
    });
  }

  function incrementEpisode(entry = {}) {
    const next = clone(entry) || {};
    if (Array.isArray(next.seasons) && next.seasons.length) {
      const sorted = [...next.seasons].sort((a, b) => (a.number || 0) - (b.number || 0));
      const active = sorted.find(season => (season.watched || 0) < (season.total || 0));
      if (active) {
        active.watched = Math.min((active.watched || 0) + 1, active.total || 0);
        let lastTouched = -1;
        for (let i = 0; i < sorted.length; i++) {
          sorted[i].watched = Math.min(sorted[i].watched || 0, sorted[i].total || 0);
          if ((sorted[i].watched || 0) > 0) lastTouched = i;
        }
        for (let i = 0; i < lastTouched; i++) sorted[i].watched = sorted[i].total || 0;
        next.totalEpisodes = next.seasons.reduce((sum, season) => sum + (season.total || 0), 0);
        next.watchedEpisodes = next.seasons.reduce((sum, season) => {
          return sum + Math.min(season.watched || 0, season.total || 0);
        }, 0);
        next.status = next.watchedEpisodes >= next.totalEpisodes ? 'watched' : 'in_progress';
      }
    } else if ((next.totalEpisodes || 0) > 0) {
      const watched = Math.min((next.watchedEpisodes || 0) + 1, next.totalEpisodes);
      next.watchedEpisodes = watched;
      next.status = watched >= next.totalEpisodes ? 'watched' : 'in_progress';
    }
    return next;
  }

  function cycleCardStatus(entry = {}) {
    const next = clone(entry) || {};
    next.status = next.status === 'watched' ? 'watchlist'
      : next.status === 'in_progress' ? 'watched'
      : next.status === 'dropped' ? 'in_progress'
      : 'in_progress';
    if (next.status === 'watchlist') {
      next.rating = 0;
      next.watchedEpisodes = 0;
      if (Array.isArray(next.seasons)) next.seasons.forEach(season => { season.watched = 0; });
    }
    return next;
  }

  function pruneSelectionToVisible(selectedIds = [], visibleIds = []) {
    const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds || []);
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
    return new Set([...selected].filter(id => visible.has(id)));
  }

  function metadataEnrichmentPatch(details = {}, current = {}, posterUrl = path => path || '') {
    const patch = {};
    if (details.title) patch.title = details.title;
    if (details.year) patch.year = details.year;
    if (details.genre) patch.genre = details.genre;
    if (details.director) patch.director = details.director;
    if (details.country) patch.country = details.country;
    if (details.runtime) patch.runtime = details.runtime;
    if (details.source_status != null) patch.sourceStatus = details.source_status || '';
    if (details.overview && !current.notes) patch.notes = details.overview;
    if (details.poster_path && !current.posterUrl) patch.posterUrl = posterUrl(details.poster_path);
    if (Array.isArray(details.seasons) && details.seasons.length) {
      patch.seasons = details.seasons.map((season, index) => ({
        number: toInt(season?.number, index + 1) || index + 1,
        total: Math.max(0, toInt(season?.total, 0)),
        watched: 0,
        name: season?.name || '',
      }));
      patch.totalEpisodes = patch.seasons.reduce((sum, season) => sum + (season.total || 0), 0);
      patch.watchedEpisodes = 0;
    } else if (details.total_episodes) {
      patch.totalEpisodes = Math.max(0, toInt(details.total_episodes, 0));
    }
    return patch;
  }

  function bulkMetadataRefreshState() {
    return {
      updated: 0,
      failed: 0,
      demoted: 0,
      demotedTitles: [],
    };
  }

  function recordBulkMetadataRefresh(state, result = {}) {
    const next = state || bulkMetadataRefreshState();
    if (result.failed) {
      next.failed += 1;
      return next;
    }
    next.updated += 1;
    if (result.demoted) {
      next.demoted += 1;
      if (next.demotedTitles.length < 3 && result.title) next.demotedTitles.push(result.title);
    }
    return next;
  }

  function bulkMetadataRefreshSummary(state = {}, { cancelled = false } = {}) {
    const updated = Math.max(0, toInt(state.updated, 0));
    const failed = Math.max(0, toInt(state.failed, 0));
    const demoted = Math.max(0, toInt(state.demoted, 0));
    const demotedTitles = Array.isArray(state.demotedTitles) ? state.demotedTitles : [];
    const parts = [`Refreshed ${updated} title${updated !== 1 ? 's' : ''}`];

    if (demoted) {
      const sample = demotedTitles.join(', ');
      const more = demoted - demotedTitles.length;
      const list = more > 0 ? `${sample} +${more} more` : sample;
      parts.push(`⏳ ${demoted} back to In Progress (${list})`);
    }
    if (failed) parts.push(`${failed} failed`);
    if (cancelled) parts.push('cancelled');
    return parts.join(' · ');
  }

  function compareSnapshot(current = [], snapshot = []) {
    const currentSafe = sanitiseLibrary(current);
    const snapshotSafe = sanitiseLibrary(snapshot);
    const currentByKey = new Map(currentSafe.map(entry => [entryKey(entry), entry]));
    const missing = [];
    const progressRegressed = [];
    const statusRegressed = [];

    snapshotSafe.forEach(previous => {
      const existing = currentByKey.get(entryKey(previous));
      if (!existing) {
        missing.push(previous);
        return;
      }
      if (progressValue(previous) > progressValue(existing)) {
        progressRegressed.push({ current: existing, snapshot: previous });
      }
      if (statusRank(previous.status) > statusRank(existing.status)) {
        statusRegressed.push({ current: existing, snapshot: previous });
      }
    });

    return {
      missing,
      progressRegressed,
      statusRegressed,
      hasIssues: Boolean(missing.length || progressRegressed.length || statusRegressed.length),
    };
  }

  function restoreFromSnapshot(current = [], snapshot = [], options = {}) {
    const { restoreMissing = true } = options;
    const currentSafe = sanitiseLibrary(current);
    const snapshotSafe = sanitiseLibrary(snapshot);
    const snapshotByKey = new Map(snapshotSafe.map(entry => [entryKey(entry), entry]));
    const seen = new Set();
    const restored = currentSafe.map(entry => {
      const key = entryKey(entry);
      seen.add(key);
      const previous = snapshotByKey.get(key);
      return previous ? protectProgress(previous, entry) : entry;
    });

    if (restoreMissing) {
      snapshotSafe.forEach(entry => {
        const key = entryKey(entry);
        if (!seen.has(key)) restored.push(entry);
      });
    }

    return sanitiseLibrary(restored);
  }

  root.library = {
    clone,
    isShow,
    entryKey,
    normaliseMediaType,
    normaliseStatus,
    sanitiseEntry,
    sanitiseLibrary,
    protectProgress,
    addEntry,
    updateEntry,
    removeEntry,
    removeEntries,
    changeStatus,
    incrementEpisode,
    cycleCardStatus,
    pruneSelectionToVisible,
    metadataEnrichmentPatch,
    bulkMetadataRefreshState,
    recordBulkMetadataRefresh,
    bulkMetadataRefreshSummary,
    compareSnapshot,
    restoreFromSnapshot,
  };
})();
