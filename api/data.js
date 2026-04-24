export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY      = 'cinetrack_movies';

async function kvGet() {
  const r = await fetch(`${KV_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) throw new Error(`KV GET failed: ${r.status}`);
  const { result } = await r.json();
  return result ? JSON.parse(result) : null;
}

async function kvSet(value) {
  const r = await fetch(KV_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(['SET', KEY, JSON.stringify(value)]),
  });
  if (!r.ok) throw new Error(`KV SET failed: ${r.status}`);
}

export default async function handler(req, res) {
  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({
      error: 'Database not configured — add KV_REST_API_URL and KV_REST_API_TOKEN to Vercel environment variables.',
    });
  }

  try {
    if (req.method === 'GET') {
      const movies = await kvGet();
      return res.json({ movies: movies || [] });
    }

    if (req.method === 'POST') {
      const movies = req.body?.movies;
      if (!Array.isArray(movies)) return res.status(400).json({ error: 'Expected { movies: [] }' });
      await kvSet(movies);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
