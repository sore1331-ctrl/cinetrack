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
    profileSummary,
  };
})();
