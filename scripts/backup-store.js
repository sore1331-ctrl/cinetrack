// Recovery copies of the library live in IndexedDB, not localStorage.
//
// localStorage is capped by the browser at roughly 5 MB per site, and two full
// copies of a large library used most of it (a ~1.6 MB library plus two ~1.3 MB
// copies put the app at 4.6 MB and triggered "local storage is near quota").
// IndexedDB has a far larger allowance, so the copies move there.
//
// The store looks like localStorage (getItem / setItem / removeItem) so the
// existing backup code in storage-model.js works on it unchanged. Reads come
// from memory; writes update memory immediately and are saved to IndexedDB in
// the background. Copies already in localStorage are moved over on first load.
// Without IndexedDB (very old browsers, some private modes) it falls back to
// plain localStorage, i.e. the previous behaviour.
(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function parseList(raw) {
    if (!raw) return [];
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  // Newest first, one entry per (createdAt, reason), capped.
  function mergeBackups(lists, maxBackups) {
    const seen = new Set();
    const merged = [];
    lists.flat().forEach(backup => {
      if (!backup || !Array.isArray(backup.movies)) return;
      const id = `${backup.createdAt || ''}|${backup.reason || ''}`;
      if (seen.has(id)) return;
      seen.add(id);
      merged.push(backup);
    });
    merged.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return merged.slice(0, Math.max(1, maxBackups));
  }

  function create({
    key,
    maxBackups = 2,
    legacyStorage = window.localStorage,
    indexedDB = window.indexedDB,
    dbName = 'cinetrack',
    storeName = 'kv',
  } = {}) {
    let usesIndexedDb = Boolean(indexedDB && key);
    let value = null; // JSON string, exactly what localStorage would hold
    let dbPromise = null;

    const openDb = () => dbPromise || (dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    }));
    const idbGet = async () => {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    };
    const idbPut = async data => {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };

    // Load (and move any localStorage copies over). Writes made before this
    // finishes are kept: they are merged with what was stored.
    const ready = (async () => {
      if (!usesIndexedDb) return;
      try {
        const legacy = parseList(legacyStorage?.getItem(key));
        const stored = parseList(await idbGet());
        value = JSON.stringify(mergeBackups([parseList(value), stored, legacy], maxBackups));
        await idbPut(value);
        if (legacy.length || legacyStorage?.getItem(key) !== null) legacyStorage?.removeItem(key);
      } catch (error) {
        console.warn('[cinetrack] Recovery copies stay in localStorage (IndexedDB unavailable):', error?.message || error);
        usesIndexedDb = false;
        // Keep anything written while we were trying.
        const pending = parseList(value);
        if (pending.length) {
          try {
            legacyStorage.setItem(key, JSON.stringify(mergeBackups([pending, parseList(legacyStorage.getItem(key))], maxBackups)));
          } catch {}
        }
      }
    })();

    let writeChain = ready;
    const persist = () => {
      writeChain = writeChain
        .then(() => (usesIndexedDb ? idbPut(value) : undefined))
        .catch(error => console.warn('[cinetrack] Could not save a recovery copy:', error?.message || error));
      return writeChain;
    };

    return {
      ready,
      get usesIndexedDb() { return usesIndexedDb; },
      getItem(k) {
        if (k !== key) return legacyStorage?.getItem(k) ?? null;
        return usesIndexedDb ? value : legacyStorage?.getItem(k) ?? null;
      },
      setItem(k, v) {
        if (k !== key || !usesIndexedDb) return legacyStorage.setItem(k, v);
        value = String(v);
        persist();
        return undefined;
      },
      removeItem(k) {
        if (k !== key || !usesIndexedDb) return legacyStorage?.removeItem(k);
        value = null;
        persist();
        return undefined;
      },
      flush: () => writeChain,
    };
  }

  root.backupStore = { create, mergeBackups };
})();
