(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function readArray(key, storage = window.localStorage) {
    const raw = storage.getItem(key);
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn(`[cinetrack] Ignoring corrupt ${key} data:`, error?.message || error);
      return [];
    }
  }

  function readObject(key, storage = window.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(key) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }

  function compactEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const keep = [
      'id',
      'title',
      'year',
      'genre',
      'director',
      'country',
      'status',
      'rating',
      'runtime',
      'notes',
      'mediaType',
      'tmdbId',
      'externalSource',
      'externalId',
      'watchedEpisodes',
      'totalEpisodes',
      'progressOverflow',
      'watchCount',
      'timesWatched',
      'addedAt',
      'updatedAt',
      'lastWatchedAt',
      'seasonStatus',
      'nextEpisodeDate',
      'nextEpisodeName',
      'nextEpisodeNumber',
      'nextSeasonNumber',
    ];
    const compact = {};
    keep.forEach(field => {
      if (entry[field] !== undefined && entry[field] !== null && entry[field] !== '') compact[field] = entry[field];
    });
    if (Array.isArray(entry.seasons)) {
      compact.seasons = entry.seasons.map(season => ({
        number: season?.number,
        total: season?.total,
        watched: season?.watched,
        name: season?.name,
      })).filter(season => season.number !== undefined || season.total !== undefined || season.watched !== undefined);
    }
    return compact;
  }

  function compactBackup(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.movies)) return snapshot;
    return {
      reason: snapshot.reason,
      createdAt: snapshot.createdAt,
      cloudUpdatedAt: snapshot.cloudUpdatedAt || null,
      cloudVersion: Number(snapshot.cloudVersion || 0),
      itemCount: Number(snapshot.itemCount || snapshot.movies.length),
      compact: true,
      movies: snapshot.movies.map(compactEntry),
    };
  }

  function storageBytes(storage = window.localStorage) {
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

  function removeKeys(keys = [], storage = window.localStorage) {
    keys.forEach(key => {
      try { storage.removeItem(key); } catch {}
    });
  }

  function trimStorage({
    volatileKeys = [],
    backupKey = '',
    maxBackups = 2,
    pressureBytes = 4_500_000,
    targetBytes = 3_800_000,
    storage = window.localStorage,
  } = {}) {
    const beforeBytes = storageBytes(storage);
    let changed = false;

    if (backupKey) {
      const backups = readArray(backupKey, storage).map(compactBackup).slice(0, maxBackups);
      try {
        storage.setItem(backupKey, JSON.stringify(backups));
        changed = true;
      } catch {
        for (let limit = Math.max(1, maxBackups - 1); limit >= 1; limit -= 1) {
          try {
            storage.setItem(backupKey, JSON.stringify(backups.slice(0, limit)));
            changed = true;
            break;
          } catch {}
        }
      }
    }

    if (storageBytes(storage) > pressureBytes) {
      for (const key of volatileKeys) {
        try {
          storage.removeItem(key);
          changed = true;
        } catch {}
        if (storageBytes(storage) <= targetBytes) break;
      }
    }

    return {
      changed,
      beforeBytes,
      afterBytes: storageBytes(storage),
    };
  }

  function writeLibraryBackup({
    key,
    reason,
    movies,
    cloudUpdatedAt = null,
    cloudVersion = 0,
    maxBackups = 3,
    storage = window.localStorage,
  }) {
    if (!key || !Array.isArray(movies) || !movies.length) return true;
    const snapshot = compactBackup({
      reason,
      createdAt: new Date().toISOString(),
      cloudUpdatedAt,
      cloudVersion,
      itemCount: movies.length,
      movies,
    });
    try {
      const existing = readArray(key, storage).map(compactBackup);
      for (let limit = maxBackups; limit >= 1; limit--) {
        try {
          storage.setItem(key, JSON.stringify([snapshot, ...existing].slice(0, limit)));
          return true;
        } catch {}
      }
    } catch (error) {
      try {
        storage.setItem(key, JSON.stringify([snapshot]));
        return true;
      } catch {
        console.warn('[cinetrack] Could not write local library backup:', error?.message || error);
      }
    }
    return false;
  }

  function readPendingSyncMarker(key, storage = window.localStorage) {
    return readObject(key, storage);
  }

  function markPendingSync(key, {
    reason = 'local-change',
    itemCount = 0,
    storage = window.localStorage,
  } = {}) {
    if (!key) return;
    try {
      storage.setItem(key, JSON.stringify({
        reason,
        updatedAt: new Date().toISOString(),
        itemCount,
      }));
    } catch {}
  }

  function clearPendingSyncMarker(key, storage = window.localStorage) {
    try { storage.removeItem(key); } catch {}
  }

  function readNumber(key, fallback = 0, storage = window.localStorage) {
    const value = Number(storage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  }

  function writeJson(key, value, storage = window.localStorage) {
    storage.setItem(key, JSON.stringify(value));
  }

  function migrateLibraryStorage({
    storageKey,
    schemaKey,
    currentVersion,
    backupKey,
    sanitise,
    maxBackups = 3,
    storage = window.localStorage,
  }) {
    const rawMovies = readArray(storageKey, storage);
    const storedVersion = readNumber(schemaKey, 0, storage);
    const movies = typeof sanitise === 'function' ? sanitise(rawMovies) : rawMovies;
    const changed = JSON.stringify(rawMovies) !== JSON.stringify(movies);
    const needsMigration = storedVersion < currentVersion || changed;

    if (needsMigration) {
      writeLibraryBackup({
        key: backupKey,
        reason: `before-schema-${currentVersion}-migration`,
        movies: rawMovies,
        maxBackups,
        storage,
      });
      try {
        writeJson(storageKey, movies, storage);
        storage.setItem(schemaKey, String(currentVersion));
      } catch (error) {
        console.warn('[cinetrack] Could not persist local schema migration:', error?.message || error);
      }
    }

    return {
      movies,
      migrated: needsMigration,
      fromVersion: storedVersion,
      toVersion: currentVersion,
    };
  }

  root.storage = {
    readArray,
    writeLibraryBackup,
    storageBytes,
    removeKeys,
    trimStorage,
    readPendingSyncMarker,
    markPendingSync,
    clearPendingSyncMarker,
    migrateLibraryStorage,
  };
})();
