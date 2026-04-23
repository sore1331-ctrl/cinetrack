export default async function handler(req, res) {
  const { q, type } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB error' });
    const data = await r.json();

    // Normalize movie and TV result shapes
    const results = (data.results || []).slice(0, 6).map(item => ({
      id:           item.id,
      title:        item.title || item.name || '',
      year:         (item.release_date || item.first_air_date || '').slice(0, 4),
      poster_path:  item.poster_path || null,
      media_type:   mediaType,
    }));

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
