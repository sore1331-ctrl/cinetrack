(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function eligible(entries = []) {
    return entries.filter(entry => entry.status === 'watchlist');
  }

  function fallbackEmoji(entry = {}) {
    if (entry.mediaType === 'anime') return '🎌';
    if (entry.mediaType === 'tv') return '📺';
    return '🎬';
  }

  function pick(entries = [], rng = Math.random) {
    const pool = eligible(entries);
    if (!pool.length) return null;
    const index = Math.floor(rng() * pool.length);
    return pool[Math.min(index, pool.length - 1)];
  }

  function meta(entry = {}) {
    return {
      id: entry.id,
      title: entry.title || '',
      year: entry.year || '',
      genre: entry.genre || '',
      posterUrl: entry.posterUrl || '',
      fallbackEmoji: fallbackEmoji(entry),
      metaText: `${entry.year || ''}${entry.year && entry.genre ? ' · ' : ''}${entry.genre || ''}`,
    };
  }

  function view(entries = [], rng = Math.random) {
    const selected = pick(entries, rng);
    return selected ? { empty: false, entry: selected, meta: meta(selected) } : { empty: true, entry: null, meta: null };
  }

  root.randomPicker = {
    eligible,
    fallbackEmoji,
    pick,
    meta,
    view,
  };
})();
