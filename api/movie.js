export default async function handler(req, res) {
  const { id, type } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits&language=en-US`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB error' });
    const data = await r.json();

    let director = '';
    if (mediaType === 'tv') {
      director = data.created_by?.[0]?.name || '';
    } else {
      director = data.credits?.crew?.find(p => p.job === 'Director')?.name || '';
    }

    const genres = data.genres?.map(g => g.name).join(', ') || '';

    // Country: production_countries works for both movie and TV
    const country = data.production_countries?.[0]?.name || '';

    const runtime = mediaType === 'movie'
      ? (data.runtime || 0)
      : Math.round((data.episode_run_time?.[0] || 0) * (data.number_of_episodes || 0));

    res.json({
      id:          data.id,
      title:       data.title || data.name || '',
      year:        (data.release_date || data.first_air_date || '').slice(0, 4),
      genre:       genres,
      director,
      overview:    data.overview || '',
      poster_path: data.poster_path || null,
      country,
      media_type:  mediaType,
      runtime,
      total_episodes: mediaType === 'tv' ? (data.number_of_episodes || 0) : 0,
      total_seasons:  mediaType === 'tv' ? (data.number_of_seasons  || 0) : 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
