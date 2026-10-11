function json(res, status, body) {
  res.status(status).json(body);
}

// Only the fields the community UI renders. Personal notes (and anything
// else private) stay out of the shared payload.
const SHARED_MOVIE_FIELDS = [
  'title',
  'year',
  'genre',
  'country',
  'status',
  'rating',
  'runtime',
  'mediaType',
  'tmdbId',
  'posterUrl',
  'watchedEpisodes',
  'totalEpisodes',
  'addedAt',
];

// Rows are written by other users, and a user can write to their own row
// directly through Supabase without passing /api/user-data validation. Coerce
// every field to the type the UI expects so nothing unexpected gets rendered.
const SHARED_NUMBER_FIELDS = new Set(['rating', 'runtime', 'watchedEpisodes', 'totalEpisodes', 'addedAt']);

function slimSharedMovie(movie) {
  if (!movie || typeof movie !== 'object') return null;
  const slim = {};
  for (const field of SHARED_MOVIE_FIELDS) {
    const value = movie[field];
    if (value === undefined || value === null) continue;
    if (SHARED_NUMBER_FIELDS.has(field)) {
      const number = Number(value);
      if (typeof value !== 'object' && Number.isFinite(number) && number >= 0) slim[field] = number;
    } else if (typeof value === 'string' || typeof value === 'number') {
      slim[field] = value;
    }
  }
  return slim;
}

function slimSharedData(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    user_id: row?.user_id,
    movies: (Array.isArray(row?.movies) ? row.movies : []).map(slimSharedMovie).filter(Boolean),
  }));
}

async function supabaseFetch(path, token, signal) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Vercel.');
  }

  const r = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    signal,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) {
    const msg = data?.message || data?.hint || data?.details || text || `Supabase returned ${r.status}`;
    throw new Error(msg);
  }

  return data;
}

// Pre-migration path: same shape as shared_libraries(). Remove once every
// deployment's database has the function.
async function legacySharedLibraries(token, currentUserId, signal) {
  const profiles = await supabaseFetch(
    `profiles?select=user_id,username&sharing_enabled=eq.true` +
      (currentUserId ? `&user_id=neq.${encodeURIComponent(currentUserId)}` : ''),
    token,
    signal
  );
  const ids = (profiles || []).map(p => p.user_id).filter(Boolean);
  if (!ids.length) return [];
  const libraries = await supabaseFetch(
    `user_data?select=user_id,movies&user_id=in.(${ids.map(encodeURIComponent).join(',')})`,
    token,
    signal
  );
  const moviesById = new Map((libraries || []).map(row => [row.user_id, row.movies]));
  return profiles.map(p => ({ user_id: p.user_id, username: p.username, movies: moviesById.get(p.user_id) || [] }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token) return json(res, 401, { error: 'Missing user session token.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    // Row-level security only lets a user read their own profile and library.
    // shared_libraries() is the single door to other users' data: it returns
    // sharing-enabled users (never the caller) with the public fields only.
    let sharedData;
    try {
      sharedData = await supabaseFetch('rpc/shared_libraries', token, controller.signal);
    } catch (e) {
      // Database not migrated yet (SUPABASE_SETUP.sql has not been re-run):
      // fall back to the direct queries the old policies still allow.
      if (!/could not find the function/i.test(e?.message || '')) throw e;
      sharedData = await legacySharedLibraries(token, String(req.query.currentUserId || ''), controller.signal);
    }
    const rows = Array.isArray(sharedData) ? sharedData : [];
    const profiles = rows
      .filter(row => row?.user_id)
      .map(row => ({ user_id: row.user_id, username: typeof row.username === 'string' ? row.username : '' }));

    return json(res, 200, { profiles, sharedData: slimSharedData(sharedData) });
  } catch (e) {
    const isAbort = e?.name === 'AbortError';
    return json(res, isAbort ? 504 : 500, {
      error: isAbort
        ? 'Community API timed out while querying Supabase.'
        : (e?.message || String(e)),
    });
  } finally {
    clearTimeout(timeout);
  }
}
