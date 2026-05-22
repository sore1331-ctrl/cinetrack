(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function posterUrl(path, posterBase) {
    if (!path) return '';
    return /^https?:\/\//i.test(path) ? path : `${posterBase || ''}${path}`;
  }

  function sourceForEntry(entry) {
    if (entry?.tmdbId) return 'tmdb';
    if (entry?.externalSource && entry.externalSource !== 'manual') return entry.externalSource;
    return 'manual';
  }

  function infoUrlForEntry(entry) {
    if (!entry) return '';
    if (entry.tmdbId) {
      const tmdbType = entry.mediaType === 'movie' ? 'movie' : 'tv';
      return `https://www.themoviedb.org/${tmdbType}/${entry.tmdbId}`;
    }
    if (entry.externalSource === 'anilist' && entry.externalId) {
      return `https://anilist.co/anime/${encodeURIComponent(entry.externalId)}`;
    }
    return '';
  }

  function metadataRefreshLabel(entry) {
    const source = sourceForEntry(entry);
    if (source === 'anilist') return 'Refresh from AniList';
    if (source === 'tmdb') return 'Refresh from TMDB';
    return 'Refresh metadata';
  }

  root.sources = {
    posterUrl,
    sourceForEntry,
    infoUrlForEntry,
    metadataRefreshLabel,
  };
})();
