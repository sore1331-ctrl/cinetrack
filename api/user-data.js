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

async function getUserIdFromToken(token, signal) {
  const { supabaseUrl, supabaseKey } = env();
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
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

  if (!r.ok || !data?.id) {
    const msg = data?.message || data?.error_description || text || `Supabase auth returned ${r.status}`;
    const error = new Error(msg);
    error.status = r.status === 401 || r.status === 403 ? r.status : 401;
    throw error;
  }

  return String(data.id);
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

function entryKey(movie) {
  if (!movie || typeof movie !== 'object') return '';
  const source = movie.mediaType || movie.type || '';
  if (movie.tmdbId) return `${source}:tmdb:${movie.tmdbId}`;
  if (movie.externalSource && movie.externalId) return `${source}:${movie.externalSource}:${movie.externalId}`;
  return movie.id ? `id:${movie.id}` : '';
}

function statusRank(status) {
  return { dropped: 0, watchlist: 1, in_progress: 2, watched: 3 }[status] ?? 0;
}

function showProgress(movie) {
  const watched = Number(movie?.watchedEpisodes || 0);
  const total = Number(movie?.totalEpisodes || 0);
  const seasonWatched = Array.isArray(movie?.seasons)
    ? movie.seasons.reduce((sum, season) => sum + Number(season?.watched || 0), 0)
    : 0;
  return Math.max(watched, seasonWatched, movie?.status === 'watched' && total > 0 ? total : 0);
}

function mergeSeasons(existing = [], incoming = []) {
  if (!Array.isArray(existing) && !Array.isArray(incoming)) return undefined;
  const byNumber = new Map();
  for (const season of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const key = String(season?.number ?? season?.seasonNumber ?? season?.name ?? byNumber.size);
    const previous = byNumber.get(key) || {};
    const total = Math.max(Number(previous.total || previous.episodeCount || 0), Number(season?.total || season?.episodeCount || 0));
    const watched = Math.max(Number(previous.watched || 0), Number(season?.watched || 0));
    byNumber.set(key, {
      ...previous,
      ...season,
      total: total || season?.total || previous.total,
      watched,
    });
  }
  return [...byNumber.values()];
}

function mergeEntry(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingProgress = showProgress(existing);
  const incomingProgress = showProgress(incoming);
  const merged = { ...existing, ...incoming };
  const seasons = mergeSeasons(existing.seasons, incoming.seasons);
  if (seasons) merged.seasons = seasons;
  if (Number(existing.rating || 0) > 0 && Number(incoming.rating || 0) === 0) {
    merged.rating = existing.rating;
  }

  merged.totalEpisodes = Math.max(Number(existing.totalEpisodes || 0), Number(incoming.totalEpisodes || 0));
  merged.watchedEpisodes = Math.max(existingProgress, incomingProgress);

  if (existing.status === 'watched' && incoming.status !== 'watched' && existingProgress >= incomingProgress) {
    merged.status = 'watched';
  } else if (incoming.status === 'watched' || existing.status === 'watched') {
    merged.status = merged.watchedEpisodes >= (merged.totalEpisodes || 0) || incoming.status === 'watched'
      ? 'watched'
      : (statusRank(incoming.status) >= statusRank(existing.status) ? incoming.status : existing.status);
  } else if (statusRank(existing.status) > statusRank(incoming.status) && existingProgress >= incomingProgress) {
    merged.status = existing.status;
  }

  if (Array.isArray(merged.seasons) && merged.seasons.length) {
    const total = merged.seasons.reduce((sum, season) => sum + Number(season?.total || 0), 0);
    const watched = merged.seasons.reduce((sum, season) => sum + Math.min(Number(season?.watched || 0), Number(season?.total || 0)), 0);
    merged.totalEpisodes = Math.max(merged.totalEpisodes || 0, total);
    merged.watchedEpisodes = Math.max(merged.watchedEpisodes || 0, watched);
  }

  return merged;
}

function mergeLibraries(existingMovies = [], incomingMovies = [], { keepMissingExisting = false } = {}) {
  const output = [];
  const indexByKey = new Map();
  const existingByKey = new Map();

  for (const movie of existingMovies) {
    const key = entryKey(movie);
    if (key) existingByKey.set(key, movie);
  }

  for (const movie of incomingMovies) {
    const key = entryKey(movie);
    const merged = key ? mergeEntry(existingByKey.get(key), movie) : movie;
    output.push(merged);
    if (key) indexByKey.set(key, output.length - 1);
  }

  if (keepMissingExisting) {
    for (const movie of existingMovies) {
      const key = entryKey(movie);
      if (key && indexByKey.has(key)) continue;
      output.push(movie);
    }
  }

  return output;
}

async function backupExistingUserData({ token, userId, row, reason, signal }) {
  if (!row || !Array.isArray(row.movies)) return;
  try {
    await supabaseRequest('user_data_backups', {
      method: 'POST',
      token,
      body: {
        user_id: userId,
        movies: row.movies,
        original_updated_at: row.updated_at,
        reason,
      },
      prefer: 'return=minimal',
      signal,
    });
  } catch (error) {
    console.warn('[cinetrack] User data backup failed:', error?.message || error);
  }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(res, 401, { error: 'Missing user session token.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const userId = await getUserIdFromToken(token, controller.signal);

    if (req.method === 'GET') {
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
      const { movies, updated_at, base_updated_at } = req.body || {};
      if (!Array.isArray(movies)) return json(res, 400, { error: 'movies must be an array.' });

      const existingRows = await supabaseRequest(
        `user_data?select=movies,updated_at&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`,
        { token, signal: controller.signal }
      );
      const existingRow = existingRows?.[0] || null;
      const staleClient = Boolean(existingRow?.updated_at && base_updated_at && existingRow.updated_at > base_updated_at);
      const mergedMovies = existingRow?.movies
        ? mergeLibraries(existingRow.movies, movies, { keepMissingExisting: staleClient })
        : movies;

      await backupExistingUserData({
        token,
        userId,
        row: existingRow,
        reason: staleClient ? 'pre-stale-merge-save' : 'pre-save',
        signal: controller.signal,
      });

      const payload = {
        user_id: userId,
        movies: mergedMovies,
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
        item_count: mergedMovies.length,
        updated_at: rows?.[0]?.updated_at || payload.updated_at,
        merged: Boolean(existingRow),
        stale_client: staleClient,
      });
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    const isAbort = e?.name === 'AbortError';
    return json(res, isAbort ? 504 : (e?.status || 500), {
      error: isAbort
        ? 'User data API timed out while querying Supabase.'
        : (e?.message || String(e)),
    });
  } finally {
    clearTimeout(timeout);
  }
}
