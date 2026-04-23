export default async function handler(req, res) {
  const { title, year, type } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const key = process.env.TMDB_API_KEY;

  try {
    // Search
    const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${key}&query=${encodeURIComponent(title)}&language=en-US&include_adult=false`;
    const sr = await fetch(searchUrl);
    if (!sr.ok) return res.status(sr.status).json({ matched: false, error: 'TMDB search failed' });

    const results = (await sr.json()).results || [];
    if (!results.length) return res.json({ matched: false });

    // Prefer result whose year matches the CSV year, otherwise take top result
    let best = results[0];
    if (year) {
      const hit = results.find(r =>
        (r.release_date || r.first_air_date || '').startsWith(year)
      );
      if (hit) best = hit;
    }

    // Fetch full details + credits
    const detailUrl = `https://api.themoviedb.org/3/${mediaType}/${best.id}?api_key=${key}&append_to_response=credits&language=en-US`;
    const dr = await fetch(detailUrl);
    if (!dr.ok) return res.json({ matched: false });
    const data = await dr.json();

    const director = mediaType === 'tv'
      ? (data.created_by?.[0]?.name || '')
      : (data.credits?.crew?.find(p => p.job === 'Director')?.name || '');

    res.json({
      matched:     true,
      tmdbId:      data.id,
      title:       data.title || data.name || '',
      year:        (data.release_date || data.first_air_date || '').slice(0, 4),
      genre:       data.genres?.map(g => g.name).join(', ') || '',
      director,
      country:     data.production_countries?.[0]?.name || '',
      overview:    data.overview || '',
      poster_path: data.poster_path || null,
    });
  } catch (e) {
    res.status(500).json({ matched: false, error: 'Internal error' });
  }
}
