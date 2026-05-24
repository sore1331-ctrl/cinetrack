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

  function airingTodaySignal(entry, cache, todayStr = dateString()) {
    if (!entry?.tmdbId || !cache?.byId) return null;
    const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
    const isMovie = entry.mediaType === 'movie';

    if (isShow && (entry.status === 'in_progress' || entry.status === 'watchlist')) {
      const episode = cache.byId[`tv:${entry.tmdbId}`]?.nextEpisode;
      if (hasUnwatchedAiringEpisodeToday(entry, episode, todayStr)) {
        return { type: 'episode', episode };
      }
    }

    if (isMovie && entry.status === 'watchlist') {
      const releaseDate = cache.byId[`movie:${entry.tmdbId}`]?.releaseDate;
      if (releaseDate === todayStr) return { type: 'movie', releaseDate };
    }

    return null;
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

  root.calendar = {
    dateString,
    addDaysString,
    keyForEntry,
    relativeDayLabel,
    episodeOrdinalForProgress,
    hasUnwatchedAiringEpisodeToday,
    airingTodaySignal,
    discoverActionFromDataset,
    discoverMediaType,
    discoverFetchType,
    discoverWatchlistEntry,
  };
})();
