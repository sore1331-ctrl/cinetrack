// Returns upcoming-date info for a list of TMDB titles. Accepts ids as
// comma-separated `type:id` pairs (e.g. "tv:1399,movie:823464"). Bare
// numeric ids are treated as TV for backwards compatibility.
//
// TV: skips ended/cancelled, returns nextEpisode (or null if hiatus).
// Movie: returns releaseDate when available.

const ENDED = new Set(['Ended', 'Canceled', 'Cancelled']);

async function fetchTvUpcoming(id, key) {
  const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${key}&language=en-US`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  if (ENDED.has(d.status)) return null;
  const ne = d.next_episode_to_air;
  return {
    type:        'tv',
    tmdbId:      d.id,
    title:       d.name || '',
    status:      d.status || '',
    poster_path: d.poster_path || null,
    nextEpisode: ne ? {
      season:   ne.season_number,
      episode:  ne.episode_number,
      name:     ne.name || '',
      airDate:  ne.air_date || null,
      overview: ne.overview || '',
    } : null,
  };
}

async function fetchMovieUpcoming(id, key) {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${key}&language=en-US`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.release_date) return null;
  return {
    type:        'movie',
    tmdbId:      d.id,
    title:       d.title || d.original_title || '',
    status:      d.status || '',
    poster_path: d.poster_path || null,
    releaseDate: d.release_date,
  };
}

export default async function handler(req, res) {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids' });

  const key = process.env.TMDB_API_KEY;
  const items = ids.split(',').map(s => s.trim()).filter(Boolean);
  if (!items.length) return res.json({ results: [] });

  // Cap to avoid abuse / runaway
  const capped = items.slice(0, 80);

  const tasks = capped.map(item => {
    let type = 'tv';
    let id   = item;
    if (item.includes(':')) [type, id] = item.split(':');
    if (!/^\d+$/.test(id)) return Promise.resolve(null);
    if (type === 'movie') return fetchMovieUpcoming(id, key).catch(() => null);
    return fetchTvUpcoming(id, key).catch(() => null);
  });

  const results = (await Promise.all(tasks)).filter(Boolean);

  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.json({ results });
}
