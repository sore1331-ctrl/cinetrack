export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB error' });
    const data = await r.json();
    res.json({ results: data.results.slice(0, 6) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
