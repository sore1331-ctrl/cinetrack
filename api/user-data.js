function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

function env() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Vercel.');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey };
}

async function supabaseRequest(path, { method = 'GET', token, body, signal, prefer } = {}) {
  const { supabaseUrl, supabaseKey } = env();
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
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

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(res, 401, { error: 'Missing user session token.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    if (req.method === 'GET') {
      const userId = String(req.query.userId || '');
      if (!userId) return json(res, 400, { error: 'Missing userId.' });

      const rows = await supabaseRequest(
        `user_data?select=movies,updated_at&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`,
        { token, signal: controller.signal }
      );
      const row = rows?.[0] || null;
      return json(res, 200, {
        movies: Array.isArray(row?.movies) ? row.movies : [],
        item_count: Array.isArray(row?.movies) ? row.movies.length : 0,
        updated_at: row?.updated_at || null,
        exists: Boolean(row),
      });
    }

    if (req.method === 'PUT') {
      const { userId, movies, updated_at } = req.body || {};
      if (!userId) return json(res, 400, { error: 'Missing userId.' });
      if (!Array.isArray(movies)) return json(res, 400, { error: 'movies must be an array.' });

      const payload = {
        user_id: userId,
        movies,
        updated_at: updated_at || new Date().toISOString(),
      };

      // Upsert is the simplest and most reliable operation for one row per user.
      const rows = await supabaseRequest('user_data?on_conflict=user_id&select=user_id,updated_at', {
        method: 'POST',
        token,
        body: payload,
        prefer: 'resolution=merge-duplicates,return=representation',
        signal: controller.signal,
      });

      return json(res, 200, {
        ok: true,
        item_count: movies.length,
        updated_at: rows?.[0]?.updated_at || payload.updated_at,
      });
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    const isAbort = e?.name === 'AbortError';
    return json(res, isAbort ? 504 : 500, {
      error: isAbort
        ? 'User data API timed out while querying Supabase.'
        : (e?.message || String(e)),
    });
  } finally {
    clearTimeout(timeout);
  }
}
