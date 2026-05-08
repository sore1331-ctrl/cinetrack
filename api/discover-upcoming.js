// Returns globally upcoming films for a region (TMDB /movie/upcoming).
// Future PRs will extend this for type=tv and type=anime via /discover/tv.

const REGION_RE = /^[A-Z]{2}$/;

export default async function handler(req, res) {
  const type   = req.query.type   || 'movie';
  const region = (req.query.region || 'US').toUpperCase();
  const page   = req.query.page   || '1';

  if (type !== 'movie') {
    return res.status(400).json({ error: 'Only type=movie is supported in this version' });
  }
  const safeRegion = REGION_RE.test(region) ? region : 'US';
  const safePage   = (/^\d+$/.test(page) && +page > 0 && +page < 50) ? page : '1';

  const key = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${key}&language=en-US&region=${safeRegion}&page=${safePage}`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB error' });
    const data = await r.json();

    // Some "upcoming" results actually have past release dates — TMDB widens
    // the window. Filter strictly to today-or-later.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const results = (data.results || [])
      .filter(m => m.release_date && m.release_date >= todayStr)
      .sort((a, b) => a.release_date.localeCompare(b.release_date))
      .map(m => ({
        tmdbId:        m.id,
        title:         m.title || m.original_title || '',
        year:          (m.release_date || '').slice(0, 4),
        releaseDate:   m.release_date,
        poster_path:   m.poster_path  || null,
        backdrop_path: m.backdrop_path || null,
        overview:      m.overview     || '',
        vote_average:  m.vote_average || 0,
      }));

    res.setHeader('Cache-Control', 'public, max-age=21600'); // 6h CDN cache
    res.json({
      type,
      region: safeRegion,
      page: +safePage,
      total_pages: data.total_pages || 1,
      results,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
