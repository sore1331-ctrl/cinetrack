(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function mediaTypeForOpen(entry = null, activeType = 'movie') {
    return entry?.mediaType || (activeType === 'dropped' ? 'movie' : activeType);
  }

  function formValues(entry = {}) {
    return {
      title: entry?.title || '',
      year: entry?.year || '',
      genre: entry?.genre || '',
      director: entry?.director || '',
      country: entry?.country || '',
      status: entry?.status || 'watchlist',
      runtime: entry?.runtime || '',
      notes: entry?.notes || '',
      rating: entry?.rating || 0,
    };
  }

  function cloneSeasons(entry = {}) {
    return Array.isArray(entry?.seasons)
      ? entry.seasons.map(season => ({
        number: season.number,
        total: season.total,
        watched: season.watched || 0,
        name: season.name,
      }))
      : [];
  }

  function initialSeasonIndex(seasons = []) {
    if (!seasons.length) return 0;
    const unfinished = seasons.findIndex(season => (season.watched || 0) < (season.total || 0));
    return unfinished === -1 ? 0 : unfinished;
  }

  function initialWatchCount(entry = {}) {
    if (entry?.watchCount != null) return entry.watchCount;
    return entry?.status === 'watched' ? 1 : 0;
  }

  function showsRating(status) {
    return status === 'watched' || status === 'in_progress' || status === 'dropped';
  }

  function rewatchState(status, editingId, watchCount) {
    const count = Math.max(1, watchCount || 1);
    return {
      visible: status === 'watched' && !!editingId,
      count,
      plural: count === 1 ? '' : 's',
    };
  }

  function finalWatchCount(status, editingWatchCount, existing = {}) {
    if (status === 'watched') return Math.max(1, editingWatchCount || 1);
    if (existing?.watchCount != null) return existing.watchCount;
    return 0;
  }

  root.modal = {
    mediaTypeForOpen,
    formValues,
    cloneSeasons,
    initialSeasonIndex,
    initialWatchCount,
    showsRating,
    rewatchState,
    finalWatchCount,
  };
})();
