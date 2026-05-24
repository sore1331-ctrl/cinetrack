function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

function env() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env vars.');
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey };
}

async function getUserIdFromToken(token) {
  const { supabaseUrl, supabaseKey } = env();
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.id) {
    const error = new Error(data?.message || `Auth returned ${r.status}`);
    error.status = r.status === 401 || r.status === 403 ? r.status : 401;
    throw error;
  }
  return String(data.id);
}

async function supabaseRequest(path, { method = 'GET', token, body, prefer } = {}) {
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
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(data?.message || data?.hint || text || `Supabase returned ${r.status}`);
  return data;
}

function bearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : '';
}

function endpointFrom(subscription) {
  return typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
}

function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
    typeof subscription === 'object' &&
    endpointFrom(subscription) &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
}

export default async function handler(req, res) {
  const token = bearer(req);
  if (!token) return json(res, 401, { error: 'Missing auth token.' });

  try {
    const userId = await getUserIdFromToken(token);

    if (req.method === 'GET') {
      const rows = await supabaseRequest(
        `push_subscriptions?select=endpoint,created_at,last_seen_at&user_id=eq.${encodeURIComponent(userId)}`,
        { token }
      );
      return json(res, 200, { subscriptions: rows || [] });
    }

    if (req.method === 'POST') {
      const subscription = req.body?.subscription;
      if (!isValidSubscription(subscription)) return json(res, 400, { error: 'Invalid push subscription.' });
      const endpoint = endpointFrom(subscription);
      const payload = {
        user_id: userId,
        endpoint,
        subscription,
        user_agent: String(req.body?.userAgent || req.headers['user-agent'] || '').slice(0, 500),
        last_seen_at: new Date().toISOString(),
      };
      const rows = await supabaseRequest('push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        token,
        body: payload,
        prefer: 'resolution=merge-duplicates,return=representation',
      });
      return json(res, 200, { ok: true, subscription: rows?.[0] || null });
    }

    if (req.method === 'DELETE') {
      const endpoint = String(req.body?.endpoint || '').trim();
      if (!endpoint) return json(res, 400, { error: 'Missing endpoint.' });
      await supabaseRequest(
        `push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
        { method: 'DELETE', token }
      );
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    return json(res, e.status || 500, { error: e?.message || 'Push subscription failed.' });
  }
}
