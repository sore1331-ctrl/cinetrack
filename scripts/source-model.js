(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function safeImageUrl(value, { allowDataImage = true } = {}) {
    const raw = String(value || '').trim();
    if (!raw || /[\u0000-\u001f"'<>\s]/.test(raw)) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (allowDataImage && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(raw)) return raw;
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '';
  }

  function posterUrl(path, posterBase) {
    if (!path) return '';
    const raw = String(path || '').trim();
    if (/^https?:\/\//i.test(raw) || /^data:image\//i.test(raw)) return safeImageUrl(raw);
    if (!raw.startsWith('/')) return '';
    return safeImageUrl(`${posterBase || ''}${raw}`);
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
    if (entry.externalSource === 'tvmaze' && entry.externalId) {
      return `https://www.tvmaze.com/shows/${encodeURIComponent(entry.externalId)}`;
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
    safeImageUrl,
    sourceForEntry,
    infoUrlForEntry,
    metadataRefreshLabel,
  };
})();
