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

  root.progress = {
    normaliseSeasons,
    recomputeShowProgress,
    applyWatchedCountAcrossSeasons,
    seasonTotal,
    activeSeason,
    syncEpisodeProgress,
  };
})();
