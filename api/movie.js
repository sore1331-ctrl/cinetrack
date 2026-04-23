export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits&language=en-US`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB error' });
    const data = await r.json();

    const director = data.credits?.crew?.find(p => p.job === 'Director')?.name || '';
    const genres = data.genres?.map(g => g.name).join(', ') || '';

    res.json({
      id: data.id,
      title: data.title,
      year: data.release_date?.slice(0, 4) || '',
      genre: genres,
      director,
      overview: data.overview || '',
      poster_path: data.poster_path || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
