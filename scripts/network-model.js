(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function withTimeout(promise, label = 'Operation', timeoutMs = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => {
        reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`));
      }, timeoutMs)),
    ]);
  }

  async function fetchJsonWithTimeout(url, options = {}, label = 'Request', timeoutMs = 30000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      let data = null;
      try { data = await response.json(); }
      catch { data = null; }
      return { response, data };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  root.network = {
    withTimeout,
    fetchJsonWithTimeout,
  };
})();
