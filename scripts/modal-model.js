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

  function numberValue(value) {
    return Math.max(0, parseInt(value, 10) || 0);
  }

  function episodeState({ mediaType, seasons = [], totalInput = '', watchedInput = '' } = {}) {
    const isShow = mediaType === 'tv' || mediaType === 'anime';
    if (!isShow) {
      return { isShow, totalEpisodes: 0, watchedEpisodes: 0, seasons: [] };
    }

    if (seasons.length) {
      const cleanSeasons = seasons.map(season => ({
        number: season.number,
        total: numberValue(season.total),
        watched: Math.min(numberValue(season.watched), numberValue(season.total)),
        name: season.name,
      }));
      return {
        isShow,
        totalEpisodes: cleanSeasons.reduce((sum, season) => sum + (season.total || 0), 0),
        watchedEpisodes: cleanSeasons.reduce((sum, season) => sum + (season.watched || 0), 0),
        seasons: cleanSeasons,
      };
    }

    const totalEpisodes = numberValue(totalInput);
    const watchedEpisodes = Math.min(numberValue(watchedInput), totalEpisodes || numberValue(watchedInput));
    return { isShow, totalEpisodes, watchedEpisodes, seasons: [] };
  }

  function derivedStatus(status, progress) {
    if (status === 'dropped') return status;
    if (!progress?.isShow || !progress.totalEpisodes) return status;
    if (progress.watchedEpisodes >= progress.totalEpisodes) return 'watched';
    if (progress.watchedEpisodes > 0) return 'in_progress';
    return status;
  }

  function externalFields({ selection = null, selectedSource = null, selectedExternalId = '', existing = {} } = {}) {
    return {
      tmdbId: selectedSource === 'tmdb'
        ? (selection?.id || existing?.tmdbId || null)
        : (selection ? null : existing?.tmdbId || null),
      externalSource: selectedSource || existing?.externalSource || (existing?.tmdbId ? 'tmdb' : 'manual'),
      externalId: selectedExternalId || existing?.externalId || (existing?.tmdbId ? String(existing.tmdbId) : null),
      sourceStatus: selection?.source_status || existing?.sourceStatus || '',
    };
  }

  function entryPayload({
    fields = {},
    mediaType = 'movie',
    progress = {},
    selectedRating = 0,
    editingWatchCount = 0,
    existing = {},
    posterUrl = '',
    selection = null,
    selectedSource = null,
    selectedExternalId = '',
  } = {}) {
    const status = derivedStatus(fields.status || 'watchlist', progress);
    return {
      title: fields.title || '',
      year: fields.year || '',
      genre: fields.genre || '',
      director: fields.director || '',
      country: fields.country || '',
      status,
      notes: fields.notes || '',
      runtime: numberValue(fields.runtime),
      rating: status === 'watchlist' ? 0 : selectedRating,
      mediaType,
      totalEpisodes: progress.totalEpisodes || 0,
      watchedEpisodes: progress.watchedEpisodes || 0,
      seasons: progress.seasons || [],
      watchCount: finalWatchCount(status, editingWatchCount, existing),
      posterUrl,
      ...externalFields({ selection, selectedSource, selectedExternalId, existing }),
    };
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
    episodeState,
    derivedStatus,
    externalFields,
    entryPayload,
  };
})();
