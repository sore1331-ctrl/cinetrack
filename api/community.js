function json(res, status, body) {
  res.status(status).json(body);
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const currentUserId = String(req.query.currentUserId || '');

  if (!token) return json(res, 401, { error: 'Missing user session token.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const profilesPath =
      `profiles?select=user_id,username&sharing_enabled=eq.true` +
      (currentUserId ? `&user_id=neq.${encodeURIComponent(currentUserId)}` : '');

    const profiles = await supabaseFetch(profilesPath, token, controller.signal);

    if (!profiles?.length) {
      return json(res, 200, { profiles: [], sharedData: [] });
    }

    const ids = profiles.map(p => p.user_id).filter(Boolean);
    const idsFilter = ids.map(encodeURIComponent).join(',');
    const sharedData = ids.length
      ? await supabaseFetch(`user_data?select=user_id,movies&user_id=in.(${idsFilter})`, token, controller.signal)
      : [];

    return json(res, 200, { profiles, sharedData: sharedData || [] });
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
