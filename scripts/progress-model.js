(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function normaliseSeasons(seasons) {
    if (!Array.isArray(seasons) || !seasons.length) return;
    const sorted = [...seasons].sort((a, b) => a.number - b.number);
    let lastTouched = -1;
    for (let i = 0; i < sorted.length; i++) {
      const watched = Math.min(sorted[i].watched || 0, sorted[i].total || 0);
      sorted[i].watched = watched;
      if (watched > 0) lastTouched = i;
    }
    for (let i = 0; i < lastTouched; i++) {
      sorted[i].watched = sorted[i].total;
    }
  }

  function recomputeShowProgress(entry) {
    if (!Array.isArray(entry?.seasons) || !entry.seasons.length) return;
    entry.totalEpisodes = entry.seasons.reduce((sum, season) => sum + (season.total || 0), 0);
    entry.watchedEpisodes = entry.seasons.reduce((sum, season) => {
      return sum + Math.min(season.watched || 0, season.total || 0);
    }, 0);
  }

  function applyWatchedCountAcrossSeasons(entry, watchedCount) {
    if (!Array.isArray(entry?.seasons) || !entry.seasons.length) return false;
    const target = Math.max(0, Number(watchedCount) || 0);
    const sorted = [...entry.seasons].sort((a, b) => (a.number || 0) - (b.number || 0));
    let remaining = target;
    for (const season of sorted) {
      const total = Math.max(0, Number(season.total) || 0);
      season.watched = Math.min(total, remaining);
      remaining -= season.watched;
    }
    recomputeShowProgress(entry);
    if (remaining > 0) {
      entry.watchedEpisodes = target;
      entry.progressOverflow = remaining;
    } else {
      delete entry.progressOverflow;
    }
    return true;
  }

  function seasonTotal(seasons, field) {
    if (!Array.isArray(seasons)) return 0;
    return seasons.reduce((sum, season) => sum + Math.max(0, Number(season?.[field]) || 0), 0);
  }

  // How many episodes of a season have actually aired. Entries saved before
  // aired-tracking existed have no `aired` field — treat those as fully aired
  // so nothing regresses for an existing library.
  function seasonAired(season) {
    if (!season) return 0;
    const total = Math.max(0, Number(season.total) || 0);
    if (season.aired == null) return total;
    return Math.min(total, Math.max(0, Number(season.aired) || 0));
  }

  // Aired episode count for a whole entry, across seasons or flat tracking.
  function airedTotal(entry) {
    if (!entry) return 0;
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    if (seasons.length) return seasons.reduce((sum, s) => sum + seasonAired(s), 0);
    const total = Math.max(0, Number(entry.totalEpisodes) || 0);
    if (entry.airedEpisodes == null) return total;
    return Math.min(total, Math.max(0, Number(entry.airedEpisodes) || 0));
  }

  function activeSeason(entry) {
    if (!Array.isArray(entry?.seasons) || !entry.seasons.length) return null;
    const sorted = [...entry.seasons].sort((a, b) => a.number - b.number);
    return sorted.find(season => (season.watched || 0) < (season.total || 0)) || null;
  }

  function syncEpisodeProgress(entries) {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (entry.mediaType !== 'tv' && entry.mediaType !== 'anime') continue;
      if (entry.status === 'watched') {
        if (Array.isArray(entry.seasons) && entry.seasons.length) {
          entry.seasons.forEach(season => { season.watched = season.total; });
          recomputeShowProgress(entry);
        } else if ((entry.totalEpisodes || 0) > 0) {
          entry.watchedEpisodes = entry.totalEpisodes;
        }
      } else if (Array.isArray(entry.seasons) && entry.seasons.length) {
        normaliseSeasons(entry.seasons);
        recomputeShowProgress(entry);
      }
    }
  }

  function isGenericSeasonName(name) {
    return !name || /^season\s*\d+$/i.test(String(name).trim());
  }

  function sameSeason(previous, next) {
    if (isGenericSeasonName(previous?.name) || isGenericSeasonName(next?.name)) return true;
    const norm = value => String(value).toLowerCase().replace(/\s+/g, ' ').trim();
    return norm(previous.name) === norm(next.name);
  }

  // Carry watch progress onto a refreshed season list without moving it.
  // Each season keeps its own watched count, matched by season number, and is
  // only lowered when that season itself got shorter (an episode was moved to
  // Specials, merged, or the order was cut). Refilling seasons from a single
  // running total instead would hand an unwatched episode of a later season
  // to the viewer whenever an earlier season lost one.
  //
  // Returns null when the two lists don't line up (a season with progress has
  // no counterpart, or a named season was renamed), so the caller can fall
  // back to the running total and flag the title for a manual check.
  function carrySeasonProgress(previousSeasons, nextSeasons) {
    const previous = Array.isArray(previousSeasons) ? previousSeasons : [];
    if (!previous.length || !Array.isArray(nextSeasons) || !nextSeasons.length) return null;

    const nextByNumber = new Map(nextSeasons.map(season => [Number(season?.number), season]));
    for (const season of previous) {
      if (!(Number(season?.watched) > 0)) continue;
      const counterpart = nextByNumber.get(Number(season.number));
      if (!counterpart || !sameSeason(season, counterpart)) return null;
    }

    const previousByNumber = new Map(previous.map(season => [Number(season?.number), season]));
    return nextSeasons.map(season => {
      const total = Math.max(0, Number(season?.total) || 0);
      const before = previousByNumber.get(Number(season?.number));
      const carried = {
        ...season,
        watched: Math.min(total, Math.max(0, Number(before?.watched) || 0)),
      };
      // Episodes don't un-air. If the season already recorded more aired
      // episodes (e.g. from the daily airing check) than the source reports
      // right now, keep the higher count.
      if (before?.aired != null && season?.aired != null) {
        carried.aired = Math.min(total, Math.max(Number(season.aired) || 0, Number(before.aired) || 0));
      }
      return carried;
    });
  }

  root.progress = {
    carrySeasonProgress,
    normaliseSeasons,
    recomputeShowProgress,
    applyWatchedCountAcrossSeasons,
    seasonTotal,
    seasonAired,
    airedTotal,
    activeSeason,
    syncEpisodeProgress,
  };
})();
