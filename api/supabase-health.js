export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

  const result = {
    env: {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseKey),
    },
    reachable: false,
    status: null,
    error: null,
  };

  if (!supabaseUrl || !supabaseKey) {
    result.error = 'Missing SUPABASE_URL or SUPABASE_ANON_KEY in Vercel environment variables.';
    return res.status(200).json(result);
  }

  try {
    const r = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    result.reachable = true;
    result.status = r.status;
    if (!r.ok && r.status !== 401 && r.status !== 403 && r.status !== 404) {
      result.error = `Supabase REST responded with ${r.status}.`;
    }
  } catch (e) {
    result.error = e?.message || String(e);
  }

  res.status(200).json(result);
}
