// Returns globally upcoming titles. Supports:
//   type=movie  → TMDB /movie/upcoming (region-specific)
//   type=tv     → TMDB /discover/tv with first_air_date.gte=today
//   type=anime  → /discover/tv + JP language + animation genre

const REGION_RE = /^[A-Z]{2}$/;
const TV_GENRE_ANIMATION = 16;

function todayStr() {
  const d = new Date(); d.setHours(0,0,0,0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function fetchMovies({ region, page, key }) {
  const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${key}&language=en-US&region=${region}&page=${page}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const today = todayStr();
  const results = (data.results || [])
    .filter(m => m.release_date && m.release_date >= today)
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
  return { results, total_pages: data.total_pages || 1 };
}

async function fetchUpcomingTV({ anime, page, key }) {
  const params = new URLSearchParams({
    api_key: key,
    language: 'en-US',
    'first_air_date.gte': todayStr(),
    sort_by: 'popularity.desc',
    page: String(page),
    include_adult: 'false',
  });
  if (anime) {
    params.set('with_original_language', 'ja');
    params.set('with_genres', String(TV_GENRE_ANIMATION));
  }
  const url = `https://api.themoviedb.org/3/discover/tv?${params}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const results = (data.results || [])
    .filter(t => t.first_air_date)
    .sort((a, b) => a.first_air_date.localeCompare(b.first_air_date))
    .map(t => ({
      tmdbId:        t.id,
      title:         t.name || t.original_name || '',
      year:          (t.first_air_date || '').slice(0, 4),
      releaseDate:   t.first_air_date,
      poster_path:   t.poster_path  || null,
      backdrop_path: t.backdrop_path || null,
      overview:      t.overview     || '',
      vote_average:  t.vote_average || 0,
    }));
  return { results, total_pages: data.total_pages || 1 };
}

export default async function handler(req, res) {
  const type   = req.query.type   || 'movie';
  const region = (req.query.region || 'US').toUpperCase();
  const page   = req.query.page   || '1';

  const safeRegion = REGION_RE.test(region) ? region : 'US';
  const safePage   = (/^\d+$/.test(page) && +page > 0 && +page < 50) ? page : '1';
  const key = process.env.TMDB_API_KEY;

  try {
    let result;
    if (type === 'movie') {
      result = await fetchMovies({ region: safeRegion, page: safePage, key });
    } else if (type === 'tv') {
      result = await fetchUpcomingTV({ anime: false, page: safePage, key });
    } else if (type === 'anime') {
      result = await fetchUpcomingTV({ anime: true, page: safePage, key });
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (!result) return res.status(502).json({ error: 'TMDB error' });

    res.setHeader('Cache-Control', 'public, max-age=21600'); // 6h CDN cache
    res.json({
      type,
      region: type === 'movie' ? safeRegion : null,
      page: +safePage,
      total_pages: result.total_pages,
      results: result.results,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}
