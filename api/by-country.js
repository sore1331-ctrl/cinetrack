export default async function handler(req, res) {
  const { code, type, page } = req.query;
  if (!code || !/^[A-Z]{2}$/i.test(code)) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  const key       = process.env.TMDB_API_KEY;
  const iso       = code.toUpperCase();
  const pg        = Math.max(1, Math.min(5, parseInt(page) || 1));
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const dateField = mediaType === 'tv' ? 'first_air_date' : 'release_date';
  const url =
    `https://api.themoviedb.org/3/discover/${mediaType}` +
    `?api_key=${key}&language=en-US&sort_by=vote_count.desc` +
    `&with_origin_country=${iso}&vote_count.gte=100&page=${pg}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    const results = (data.results || []).map(item => ({
      id:          item.id,
      title:       item.title || item.name || '',
      year:        (item[dateField] || '').slice(0, 4),
      poster_path: item.poster_path || null,
      overview:    item.overview || '',
      media_type:  mediaType,
      popularity:  item.popularity || 0,
      vote_count:  item.vote_count || 0,
    }));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ results });
  } catch {
    res.status(502).json({ error: 'TMDB request failed' });
  }
}
