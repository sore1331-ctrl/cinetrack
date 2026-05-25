(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function actualWatchedMinutes(entry = {}) {
    const isShow = entry.mediaType === 'tv' || entry.mediaType === 'anime';
    if (isShow && (entry.totalEpisodes || 0) > 0) {
      const watched = Math.min(entry.watchedEpisodes || 0, entry.totalEpisodes);
      return Math.round((entry.runtime || 0) * (watched / entry.totalEpisodes));
    }
    return entry.status === 'watched' ? (entry.runtime || 0) : 0;
  }

  function topCounts(entries, field, limit = 10) {
    const counts = {};
    entries.forEach(entry => {
      const value = entry?.[field];
      if (!value) return;
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  function topGenres(entries, limit = 10) {
    const counts = {};
    entries.forEach(entry => {
      (entry?.genre || '').split(',')
        .map(genre => genre.trim())
        .filter(Boolean)
        .forEach(genre => { counts[genre] = (counts[genre] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  function ratingDistribution(ratings = []) {
    return Array.from({ length: 10 }, (_, i) => {
      const star = 10 - i;
      return [star, ratings.filter(rating => rating === star).length];
    }).filter(([, count]) => count > 0);
  }

  function byTypeSummary(library = []) {
    return ['movie', 'tv', 'anime'].map(type => ({
      type,
      label: type === 'movie' ? '🎬 Films' : type === 'tv' ? '📺 TV Shows' : '🎌 Anime',
      watched: library.filter(entry => entry.mediaType === type && entry.status === 'watched').length,
      inProgress: library.filter(entry => entry.mediaType === type && entry.status === 'in_progress').length,
      watchlist: library.filter(entry => entry.mediaType === type && entry.status === 'watchlist').length,
    })).filter(summary => summary.watched + summary.inProgress + summary.watchlist > 0);
  }

  function statusSummary(library = [], activeType = 'movie', countryFilter = '') {
    const isDroppedView = activeType === 'dropped';
    const allOfType = isDroppedView
      ? library.filter(entry => entry.status === 'dropped')
      : library.filter(entry => entry.mediaType === activeType && entry.status !== 'dropped');
    const countStatus = status => allOfType.filter(entry => entry.status === status).length;
    const byCountry = countryFilter
      ? allOfType.filter(entry => entry.country === countryFilter)
      : [];

    return {
      isDroppedView,
      allOfType,
      watchedCnt: isDroppedView ? 0 : countStatus('watched'),
      inProgressCnt: isDroppedView ? 0 : countStatus('in_progress'),
      watchlistCnt: isDroppedView ? 0 : countStatus('watchlist'),
      country: countryFilter ? {
        entries: byCountry,
        watched: byCountry.filter(entry => entry.status === 'watched').length,
        inProgress: byCountry.filter(entry => entry.status === 'in_progress').length,
        watchlist: byCountry.filter(entry => entry.status === 'watchlist').length,
      } : null,
    };
  }

  function decadeSummary(entries = []) {
    const counts = {};
    entries.forEach(entry => {
      const year = parseInt(entry?.year, 10);
      if (!year || year < 1900 || year > 2100) return;
      const decade = Math.floor(year / 10) * 10;
      counts[decade] = (counts[decade] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
      .map(([decade, count]) => [`${decade}s`, count]);
  }

  function ratingBuckets(ratings = []) {
    const buckets = Array.from({ length: 10 }, (_, i) => [String(i + 1), 0]);
    ratings.forEach(rating => {
      if (rating >= 1 && rating <= 10) buckets[rating - 1][1]++;
    });
    return buckets;
  }

  function statsPageSummary(library = [], typeFilter = 'all') {
    const scoped = typeFilter === 'all'
      ? library
      : library.filter(entry => entry.mediaType === typeFilter);
    const watched = scoped.filter(entry => entry.status === 'watched');
    const inProgress = scoped.filter(entry => entry.status === 'in_progress');
    const showsWithEps = scoped.filter(entry =>
      (entry.mediaType === 'tv' || entry.mediaType === 'anime') && (entry.totalEpisodes || 0) > 0
    );
    const ratings = watched.filter(entry => entry.rating > 0).map(entry => entry.rating);
    const avgRating = ratings.length
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : null;

    const typeEntries = typeFilter === 'all'
      ? ['movie', 'tv', 'anime']
        .map(type => [type, library.filter(entry => entry.mediaType === type && entry.status === 'watched').length])
        .filter(([, count]) => count > 0)
      : [];

    const currentlyWatching = typeFilter === 'movie' ? [] : inProgress
      .filter(entry => (entry.mediaType === 'tv' || entry.mediaType === 'anime') && (entry.totalEpisodes || 0) > 0)
      .map(entry => {
        const watchedEpisodes = Math.min(entry.watchedEpisodes || 0, entry.totalEpisodes);
        return {
          m: entry,
          pct: Math.round((watchedEpisodes / entry.totalEpisodes) * 100),
          remaining: entry.totalEpisodes - watchedEpisodes,
        };
      })
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 8);

    return {
      scoped,
      watched,
      inProgress,
      inProgressN: inProgress.length,
      watchlistN: scoped.filter(entry => entry.status === 'watchlist').length,
      watchedN: watched.length,
      totalMin: scoped.reduce((sum, entry) => sum + actualWatchedMinutes(entry), 0),
      epsWatched: showsWithEps.reduce((sum, entry) => sum + Math.min(entry.watchedEpisodes || 0, entry.totalEpisodes), 0),
      epsTotal: showsWithEps.reduce((sum, entry) => sum + entry.totalEpisodes, 0),
      ratings,
      avgRating,
      topGenres: topGenres(watched, 12),
      topCountries: topCounts(watched, 'country', 10),
      topDirectors: topCounts(watched, 'director', 100).filter(([, count]) => count >= 2).slice(0, 10),
      decadeEntries: decadeSummary(watched),
      ratingBuckets: ratingBuckets(ratings),
      hasRatings: ratings.length > 0,
      topRated: watched
        .filter(entry => entry.rating > 0)
        .sort((a, b) => b.rating - a.rating || (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, 8),
      typeEntries,
      currentlyWatching,
    };
  }

  function profileSummary(library = []) {
    const watched = library.filter(entry => entry.status === 'watched');
    const watchlist = library.filter(entry => entry.status === 'watchlist');
    const ratings = watched.filter(entry => entry.rating > 0).map(entry => entry.rating);
    const avgRating = ratings.length
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : null;

    return {
      watched,
      watchlist,
      ratings,
      avgRating,
      totalMinutes: library.reduce((sum, entry) => sum + actualWatchedMinutes(entry), 0),
      byType: byTypeSummary(library),
      topGenres: topGenres(watched, 10),
      topCountries: topCounts(watched, 'country', 8),
      ratingDist: ratingDistribution(ratings),
    };
  }

  root.stats = {
    actualWatchedMinutes,
    topCounts,
    topGenres,
    ratingDistribution,
    byTypeSummary,
    statusSummary,
    decadeSummary,
    ratingBuckets,
    statsPageSummary,
    profileSummary,
  };
})();
