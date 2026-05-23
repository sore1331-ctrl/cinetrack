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
    const snapshot = {
      reason,
      createdAt: new Date().toISOString(),
      cloudUpdatedAt,
      cloudVersion,
      itemCount: movies.length,
      movies,
    };
    try {
      const existing = readArray(key, storage);
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
    readPendingSyncMarker,
    markPendingSync,
    clearPendingSyncMarker,
    migrateLibraryStorage,
  };
})();
