(function () {
  const root = window.CineTrack || (window.CineTrack = {});
  const DEFAULT_KEY = 'cinetrack_error_log_v1';
  const DEFAULT_LIMIT = 50;

  function serialiseError(error) {
    if (!error) return { message: 'Unknown error' };
    if (typeof error === 'string') return { message: error };
    return {
      message: error.message || String(error),
      name: error.name || '',
      stack: error.stack ? String(error.stack).slice(0, 1200) : '',
    };
  }

  function read(key = DEFAULT_KEY, storage = window.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function record({
    area = 'app',
    severity = 'error',
    error = null,
    message = '',
    meta = {},
    key = DEFAULT_KEY,
    limit = DEFAULT_LIMIT,
    storage = window.localStorage,
  } = {}) {
    const details = serialiseError(error || message);
    const entry = {
      at: new Date().toISOString(),
      area,
      severity,
      message: message || details.message,
      error: details,
      meta,
    };
    try {
      const next = [entry, ...read(key, storage)].slice(0, limit);
      storage.setItem(key, JSON.stringify(next));
    } catch {}
    return entry;
  }

  function clear(key = DEFAULT_KEY, storage = window.localStorage) {
    try { storage.removeItem(key); } catch {}
  }

  root.errors = {
    DEFAULT_KEY,
    read,
    record,
    clear,
  };
})();
