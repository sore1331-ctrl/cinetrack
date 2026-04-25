export default async function handler(req, res) {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids' });

  const key = process.env.TMDB_API_KEY;
  const pairs = ids.split(',').slice(0, 8).map(s => {
    const [id, type] = s.split(':');
    return { id, type: type === 'tv' ? 'tv' : 'movie' };
  }).filter(p => p.id && /^\d+$/.test(p.id));

  if (!pairs.length) return res.json({ results: [] });

  const seedSet  = new Set(pairs.map(p => p.id));
  const scoreMap = {};
  const infoMap  = {};

  await Promise.all(pairs.map(async ({ id, type }, idx) => {
    const weight = Math.max(1, pairs.length - idx);
    try {
      const r = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/recommendations?api_key=${key}&language=en-US&page=1`
      );
      if (!r.ok) return;
      const data = await r.json();
      (data.results || []).slice(0, 20).forEach(item => {
        const mtype  = item.media_type || type;
        const mapKey = `${item.id}:${mtype}`;
        scoreMap[mapKey] = (scoreMap[mapKey] || 0) + weight;
        if (!infoMap[mapKey]) {
          infoMap[mapKey] = {
            id:          item.id,
            title:       item.title || item.name || '',
            year:        (item.release_date || item.first_air_date || '').slice(0, 4),
            poster_path: item.poster_path || null,
            overview:    item.overview || '',
            media_type:  mtype,
            popularity:  item.popularity || 0,
          };
        }
      });
    } catch {}
  }));

  const results = Object.entries(scoreMap)
    .filter(([key]) => !seedSet.has(key.split(':')[0]))
    .sort((a, b) => b[1] - a[1] || (infoMap[b[0]].popularity - infoMap[a[0]].popularity))
    .slice(0, 20)
    .map(([key]) => infoMap[key]);

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ results });
}
