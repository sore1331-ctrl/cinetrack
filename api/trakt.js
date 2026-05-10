const TRAKT_API = 'https://api.trakt.tv';

function json(res, status, body) {
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=900' : 'no-store');
  res.status(status).json(body);
}

function headers({ needsAuth = false } = {}) {
  const clientId = process.env.TRAKT_CLIENT_ID || '';
  if (!clientId) throw new Error('Missing TRAKT_CLIENT_ID in Vercel.');

  const h = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': clientId,
  };

  const token = process.env.TRAKT_ACCESS_TOKEN || '';
  if (needsAuth) {
    if (!token) throw new Error('Missing TRAKT_ACCESS_TOKEN. User OAuth is required for this Trakt action.');
    h.Authorization = `Bearer ${token}`;
  }

  return h;
}

async function trakt(path, opts = {}) {
  const r = await fetch(`${TRAKT_API}${path}`, {
    method: opts.method || 'GET',
    headers: headers({ needsAuth: opts.needsAuth }),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error || data?.message || `Trakt returned ${r.status}`);
  return data;
}

function slimMovie(movie = {}) {
  return {
    title: movie.title || '',
    year: movie.year || '',
    ids: movie.ids || {},
  };
}

function slimShow(show = {}) {
  return {
    title: show.title || '',
    year: show.year || '',
    ids: show.ids || {},
  };
}

function slimSearchItem(item = {}) {
  return {
    type: item.type || '',
    score: item.score || 0,
    movie: item.movie ? slimMovie(item.movie) : null,
    show: item.show ? slimShow(item.show) : null,
  };
}

export default async function handler(req, res) {
  const action = String(req.query.action || 'search');

  try {
    if (action === 'search') {
      const q = String(req.query.q || '').trim();
      const type = String(req.query.type || 'movie,show').trim();
      const safeType = type
        .split(',')
        .map(t => t.trim())
        .filter(t => ['movie', 'show', 'episode', 'person', 'list'].includes(t))
        .join(',') || 'movie,show';
      if (!q) return json(res, 400, { error: 'Missing q.' });
      const params = new URLSearchParams({ query: q, limit: '12' });
      const data = await trakt(`/search/${safeType}?${params.toString()}`);
      return json(res, 200, { results: (data || []).map(slimSearchItem) });
    }

    if (action === 'watchlist') {
      const type = String(req.query.type || 'movies,shows').trim();
      const safeType = type
        .split(',')
        .map(t => t.trim())
        .filter(t => ['movies', 'shows', 'seasons', 'episodes'].includes(t))
        .join(',') || 'movies,shows';
      const data = await trakt(`/sync/watchlist/${safeType}`, { needsAuth: true });
      return json(res, 200, { items: data || [] });
    }

    if (action === 'history') {
      const type = String(req.query.type || 'movies,shows').trim();
      const safeType = type
        .split(',')
        .map(t => t.trim())
        .filter(t => ['movies', 'shows', 'seasons', 'episodes'].includes(t))
        .join(',') || 'movies,shows';
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
      const data = await trakt(`/sync/history/${safeType}?page=${page}&limit=${limit}`, { needsAuth: true });
      return json(res, 200, { items: data || [] });
    }

    return json(res, 400, { error: 'Unknown Trakt action.' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Failed to reach Trakt.' });
  }
}
