(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function mediaType(rec) {
    return rec?.media_type || rec?.mediaType || '';
  }

  function compatibleTypes(a, b) {
    if (!a || !b) return true;
    if (a === b) return true;
    return (a === 'anime' && b === 'tv') || (a === 'tv' && b === 'anime');
  }

  function normaliseForScope(rec, scope = 'all') {
    const type = scope === 'anime' && rec?.media_type === 'tv'
      ? 'anime'
      : mediaType(rec);
    return { ...rec, media_type: type };
  }

  function sourceKey(rec) {
    const source = rec?.source || 'tmdb';
    const externalId = rec?.externalId || rec?.id;
    return externalId ? `${source}:${externalId}` : '';
  }

  function infoUrl(rec) {
    if (!rec?.id) return '';
    const source = rec.source || 'tmdb';
    if (source === 'anilist') return `https://anilist.co/anime/${encodeURIComponent(rec.externalId || rec.id)}`;
    const tmdbType = rec.media_type === 'movie' ? 'movie' : 'tv';
    return `https://www.themoviedb.org/${tmdbType}/${encodeURIComponent(rec.id)}`;
  }

  function normaliseAnilist(media) {
    return {
      id: media.id,
      source: 'anilist',
      externalId: media.id,
      media_type: 'anime',
      title: media.title,
      year: media.year || media.seasonYear || '',
      poster_path: media.coverImage || '',
      overview: media.description || '',
      genre: (media.genres || []).join(', '),
      runtime: media.duration || 0,
      total_episodes: media.episodes || 0,
    };
  }

  function seedKey(movie) {
    return movie.tmdbId ? `tmdb:${movie.tmdbId}` : `${movie.externalSource}:${movie.externalId}:${movie.title}:${movie.year}`;
  }

  function rotateList(items, offset) {
    if (!items.length) return items;
    const n = Math.abs(offset) % items.length;
    return [...items.slice(n), ...items.slice(0, n)];
  }

  function selectSeeds(scored, limit = 8, rotationIndex = 0, force = false) {
    if (force) {
      return rotateList(scored.slice(0, 24), rotationIndex * limit).slice(0, limit);
    }
    const primary = scored.slice(0, Math.min(4, limit));
    const rotation = scored
      .slice(primary.length, Math.min(scored.length, 24))
      .sort((a, b) => String(seedKey(a)).localeCompare(String(seedKey(b))));
    const rotated = rotateList(rotation, rotationIndex * Math.max(1, limit - primary.length));
    return [...primary, ...rotated.slice(0, Math.max(0, limit - primary.length))];
  }

  function score(rec, { genreCounts = {}, dismissedProfile = {}, scope = 'all' } = {}) {
    const genres = String(rec.genre || '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean);
    const genreScore = genres.reduce((sum, genre) => sum + (genreCounts[genre] || 0), 0);
    const dismissedGenrePenalty = genres.reduce((sum, genre) => sum + (dismissedProfile.genres?.[genre] || 0), 0);
    const type = mediaType(rec);
    const typePenalty = dismissedProfile.mediaTypes?.[type] || 0;
    const popularity = Math.log10(Math.max(1, Number(rec.popularity || 0)));
    const votes = Math.log10(Math.max(1, Number(rec.vote_count || 0)));
    const rating = Number(rec.vote_average || rec.averageScore || 0) / 2;
    const sourceBoost = scope === 'anime' && (rec.source || '') === 'anilist' ? 8 : 0;

    return sourceBoost + genreScore * 2 + popularity + votes + rating - dismissedGenrePenalty * 2 - typePenalty;
  }

  function rank(results, context) {
    return [...(results || [])]
      .map((rec, idx) => ({ ...rec, _recScore: score(rec, context), _recOrder: idx }))
      .sort((a, b) => b._recScore - a._recScore || a._recOrder - b._recOrder);
  }

  function rotateForced(results, refreshIndex, force, visibleLimit) {
    if (!force || results.length <= visibleLimit) return results;
    return rotateList(results, refreshIndex * visibleLimit);
  }

  function actionFromDataset(dataset = {}) {
    const id = dataset.recId || '';
    const source = dataset.recSource || 'tmdb';
    const type = dataset.recType || '';
    return {
      id,
      source,
      type,
      title: dataset.recTitle || '',
      year: dataset.recYear || '',
      posterPath: dataset.recPoster || '',
      candidate: {
        id,
        source,
        externalId: id,
        media_type: type,
        title: dataset.recTitle || '',
        year: dataset.recYear || '',
      },
    };
  }

  function watchlistEntryFromAction(action = {}, posterUrl = path => path || '') {
    const type = action.type === 'anime' ? 'anime' : (action.type === 'tv' ? 'tv' : 'movie');
    return {
      title: action.title || '',
      year: action.year || '',
      status: 'watchlist',
      rating: 0,
      mediaType: type,
      tmdbId: action.source === 'tmdb' ? Number(action.id) : null,
      externalSource: action.source || 'tmdb',
      externalId: action.source === 'tmdb' ? String(action.id) : action.id,
      posterUrl: action.posterPath ? posterUrl(action.posterPath) : '',
      genre: '',
      director: '',
      country: '',
      notes: '',
      runtime: 0,
    };
  }

  function detailsFetchTarget(action = {}) {
    if (action.source === 'anilist') return { source: 'anilist', id: action.id, type: 'anime' };
    return {
      source: 'tmdb',
      id: action.id,
      type: action.type === 'anime' ? 'tv' : (action.type === 'tv' ? 'tv' : 'movie'),
    };
  }

  root.recommendations = {
    mediaType,
    compatibleTypes,
    normaliseForScope,
    sourceKey,
    infoUrl,
    normaliseAnilist,
    seedKey,
    rotateList,
    selectSeeds,
    score,
    rank,
    rotateForced,
    actionFromDataset,
    watchlistEntryFromAction,
    detailsFetchTarget,
  };
})();
