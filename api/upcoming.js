// Returns upcoming-episode info for a list of TMDB TV IDs.
// Skips ended / cancelled series. Shows with no scheduled next episode
// (between-seasons hiatus) come back with nextEpisode: null.

const ENDED = new Set(['Ended', 'Canceled', 'Cancelled']);

async function fetchTvUpcoming(id, key) {
  const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${key}&language=en-US`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  if (ENDED.has(d.status)) return null;
  const ne = d.next_episode_to_air;
  return {
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

export default async function handler(req, res) {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids' });

  const key = process.env.TMDB_API_KEY;
  const idList = ids.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s));
  if (!idList.length) return res.json({ results: [] });

  // Cap to avoid abuse / runaway
  const capped = idList.slice(0, 60);

  const results = (await Promise.all(
    capped.map(id => fetchTvUpcoming(id, key).catch(() => null))
  )).filter(Boolean);

  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.json({ results });
}
