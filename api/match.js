async function fetchDetails(id, mediaType, key) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${key}&append_to_response=credits&language=en-US`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();

  const director = mediaType === 'tv'
    ? (data.created_by?.[0]?.name || '')
    : (data.credits?.crew?.find(p => p.job === 'Director')?.name || '');

  const runtime = mediaType === 'movie'
    ? (data.runtime || 0)
    : Math.round((data.episode_run_time?.[0] || 0) * (data.number_of_episodes || 0));

  return {
    matched:     true,
    tmdbId:      data.id,
    title:       data.title || data.name || '',
    year:        (data.release_date || data.first_air_date || '').slice(0, 4),
    genre:       data.genres?.map(g => g.name).join(', ') || '',
    director,
    country:     data.production_countries?.[0]?.name || '',
    overview:    data.overview || '',
    poster_path: data.poster_path || null,
    runtime,
  };
}

export default async function handler(req, res) {
  const { title, year, type } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const key = process.env.TMDB_API_KEY;

  try {
    // For anime, try TV first (most anime are series), then movie
    const searchTypes = type === 'anime' ? ['tv', 'movie'] : [type === 'tv' ? 'tv' : 'movie'];

    for (const mediaType of searchTypes) {
      const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${key}&query=${encodeURIComponent(title)}&language=en-US&include_adult=false`;
      const sr = await fetch(searchUrl);
      if (!sr.ok) continue;

      const results = (await sr.json()).results || [];
      if (!results.length) continue;

      let best = results[0];
      if (year) {
        const hit = results.find(r => (r.release_date || r.first_air_date || '').startsWith(year));
        if (hit) best = hit;
      }

      const details = await fetchDetails(best.id, mediaType, key);
      if (details) return res.json(details);
    }

    res.json({ matched: false });
  } catch (e) {
    res.status(500).json({ matched: false, error: 'Internal error' });
  }
}
