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
    // For anime, prefer AniList over TMDB when an AniList link exists —
    // AniList has richer anime-specific data (episode counts, air dates, etc.)
    if (entry?.mediaType === 'anime' && entry?.externalSource === 'anilist' && entry?.externalId) {
      return 'anilist';
    }
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

  function metadataRefreshTooltip(entry) {
    const source = sourceForEntry(entry);
    const from = source === 'anilist' ? 'AniList'
               : source === 'tmdb'    ? 'TMDB'
               :                        'the best available source';
    return entry
      ? `Re-fetch metadata from ${from} while preserving watch progress`
      : 'Re-fetch metadata from this title\'s source while preserving watch progress';
  }

  root.sources = {
    posterUrl,
    safeImageUrl,
    sourceForEntry,
    infoUrlForEntry,
    metadataRefreshLabel,
    metadataRefreshTooltip,
  };
})();
