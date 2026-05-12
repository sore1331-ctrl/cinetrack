export default async function handler(req, res) {
  const { id, type } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,watch/providers&language=en-US`;

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

    const seasons = mediaType === 'tv'
      ? (data.seasons || [])
          .filter(s => s.season_number > 0 && (s.episode_count || 0) > 0)
          .map(s => ({ number: s.season_number, total: s.episode_count, name: s.name || `Season ${s.season_number}` }))
      : [];

    // Watch providers: pull a small set of common regions to keep payload lean.
    const providersAll = data['watch/providers']?.results || {};
    const REGIONS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'MX', 'IN', 'NL', 'ES', 'IT'];
    const slim = p => p ? { id: p.provider_id, name: p.provider_name, logo: p.logo_path } : null;
    const providers = {};
    for (const region of REGIONS) {
      const r = providersAll[region];
      if (!r) continue;
      const flatrate = (r.flatrate || []).map(slim).filter(Boolean);
      const rent     = (r.rent     || []).map(slim).filter(Boolean);
      const buy      = (r.buy      || []).map(slim).filter(Boolean);
      if (flatrate.length || rent.length || buy.length) {
        providers[region] = { link: r.link || '', flatrate, rent, buy };
      }
    }

    res.json({
      id:          data.id,
      title:       data.title || data.name || '',
      year:        (data.release_date || data.first_air_date || '').slice(0, 4),
      genre:       genres,
      director,
      overview:    data.overview || '',
      poster_path: data.poster_path || null,
      country,
      source_status: data.status || '',
      media_type:  mediaType,
      runtime,
      total_episodes: mediaType === 'tv' ? (data.number_of_episodes || 0) : 0,
      seasons,
      providers,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
