(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function numberIsBad(value) {
    if (value === null || value === undefined || value === '') return false;
    const number = Number(value);
    return !Number.isFinite(number) || number < 0;
  }

  function entryKey(entry) {
    if (root.library?.entryKey) return root.library.entryKey(entry);
    if (!entry || typeof entry !== 'object') return '';
    const source = entry.mediaType || entry.type || '';
    if (entry.tmdbId) return `${source}:tmdb:${entry.tmdbId}`;
    if (entry.externalSource && entry.externalId) return `${source}:${entry.externalSource}:${entry.externalId}`;
    return entry.id ? `id:${entry.id}` : '';
  }

  function storageBytes(storage = window.localStorage) {
    if (root.storage?.storageBytes) return root.storage.storageBytes(storage);
    let total = 0;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        const value = storage.getItem(key) || '';
        total += (String(key).length + String(value).length) * 2;
      }
    } catch {}
    return total;
  }

  function analyse(library = [], options = {}) {
    const storage = options.storage || window.localStorage;
    const seenKeys = new Set();
    const duplicateKeys = [];
    const missingIds = [];
    const invalidProgress = [];
    const overflowProgress = [];

    (Array.isArray(library) ? library : []).forEach(entry => {
      if (!entry?.id) missingIds.push(entry);

      const key = entryKey(entry);
      if (key) {
        if (seenKeys.has(key)) duplicateKeys.push(entry);
        seenKeys.add(key);
      }

      const watched = Number(entry?.watchedEpisodes || 0);
      const total = Number(entry?.totalEpisodes || 0);
      const hasBadTopLevel = ['watchedEpisodes', 'totalEpisodes', 'rating', 'runtime', 'watchCount', 'timesWatched']
        .some(field => numberIsBad(entry?.[field]));
      const hasBadSeason = Array.isArray(entry?.seasons)
        ? entry.seasons.some(season => numberIsBad(season?.watched) || numberIsBad(season?.total) || numberIsBad(season?.number))
        : false;

      if (hasBadTopLevel || hasBadSeason) invalidProgress.push(entry);
      if (Number.isFinite(watched) && Number.isFinite(total) && total > 0 && watched > total) {
        overflowProgress.push(entry);
      }
    });

    const bytes = storageBytes(storage);
    const quotaWarningBytes = Number(options.quotaWarningBytes || 4_500_000);
    const issues = [
      missingIds.length ? { level: 'warn', label: `${missingIds.length} missing IDs` } : null,
      duplicateKeys.length ? { level: 'warn', label: `${duplicateKeys.length} duplicate source keys` } : null,
      invalidProgress.length ? { level: 'danger', label: `${invalidProgress.length} invalid progress values` } : null,
      overflowProgress.length ? { level: 'info', label: `${overflowProgress.length} titles ahead of known metadata` } : null,
      bytes > quotaWarningBytes ? { level: 'warn', label: 'local storage is near quota' } : null,
    ].filter(Boolean);

    return {
      ok: !issues.some(issue => issue.level !== 'info'),
      issues,
      counts: {
        missingIds: missingIds.length,
        duplicateKeys: duplicateKeys.length,
        invalidProgress: invalidProgress.length,
        overflowProgress: overflowProgress.length,
      },
      storage: {
        bytes,
        megabytes: bytes / 1024 / 1024,
        nearQuota: bytes > quotaWarningBytes,
      },
    };
  }

  root.libraryHealth = { analyse, storageBytes };
})();
