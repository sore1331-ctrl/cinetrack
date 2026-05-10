export default async function handler(req, res) {
  const { ids } = req.query;
  const targetType = ['movie', 'tv', 'anime'].includes(req.query.type) ? req.query.type : '';
  if (!ids) return res.status(400).json({ error: 'Missing ids' });

  const key = process.env.TMDB_API_KEY;
  const pairs = ids.split(',').slice(0, 8).map(s => {
    const [id, type] = s.split(':');
    const seedType = type === 'anime' ? 'anime' : (type === 'tv' ? 'tv' : 'movie');
    const apiType  = seedType === 'anime' ? 'tv' : seedType;
    return { id, seedType, apiType };
  }).filter(p => p.id && /^\d+$/.test(p.id));

  if (!pairs.length) return res.json({ results: [] });

  const seedSet       = new Set(pairs.map(p => p.id));
  const scoreMap      = {};
  const infoMap       = {};
  const seedTypeScore = {};

  await Promise.all(pairs.map(async ({ id, seedType, apiType }, idx) => {
    const weight = Math.max(1, pairs.length - idx);
    try {
      const r = await fetch(
        `https://api.themoviedb.org/3/${apiType}/${id}/recommendations?api_key=${key}&language=en-US&page=1`
      );
      if (!r.ok) return;
      const data = await r.json();
      (data.results || []).slice(0, 12).forEach(item => {
        const mtype  = item.media_type || apiType;
        if (targetType && mtype !== (targetType === 'anime' ? 'tv' : targetType)) return;
        const mapKey = `${item.id}:${mtype}`;
        scoreMap[mapKey] = (scoreMap[mapKey] || 0) + weight;
        seedTypeScore[mapKey] = seedTypeScore[mapKey] || {};
        seedTypeScore[mapKey][seedType] = (seedTypeScore[mapKey][seedType] || 0) + weight;
        if (!infoMap[mapKey]) {
          infoMap[mapKey] = {
            id:          item.id,
            title:       item.title || item.name || '',
            year:        (item.release_date || item.first_air_date || '').slice(0, 4),
            poster_path: item.poster_path || null,
            overview:    item.overview || '',
            media_type:  mtype,
            popularity:  item.popularity || 0,
            vote_average: item.vote_average || 0,
            vote_count:   item.vote_count || 0,
          };
        }
      });
    } catch {}
  }));

  const results = Object.entries(scoreMap)
    .filter(([key]) => !seedSet.has(key.split(':')[0]))
    .sort((a, b) => b[1] - a[1] || (infoMap[b[0]].popularity - infoMap[a[0]].popularity))
    .map(([key]) => {
      const info = { ...infoMap[key] };
      const ts   = seedTypeScore[key] || {};
      // Reclassify as anime when anime seeds contributed at least as
      // much weighted score as TV seeds did.
      if (info.media_type === 'tv' && (ts.anime || 0) > 0 && (ts.anime || 0) >= (ts.tv || 0)) {
        info.media_type = 'anime';
      }
      return info;
    })
    .filter(info => {
      if (targetType === 'anime') return info.media_type === 'anime';
      if (targetType) return info.media_type === targetType;
      return true;
    });

  const seen = new Set();
  const deduped = [];
  for (const item of results) {
    const key = `${String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}:${item.year || ''}:${item.media_type}`;
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= 24) break;
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ results: deduped });
}
