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

const VALID_MEDIA_TYPES = new Set(['movie', 'tv', 'anime']);
const VALID_STATUSES = new Set(['watchlist', 'in_progress', 'watched', 'dropped']);
const MAX_LIBRARY_ITEMS = 10000;
const MAX_SEASONS_PER_TITLE = 500;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return true;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function validateShortString(value, field, maxLength) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return `${field} must be a string.`;
  if (value.length > maxLength) return `${field} is too long.`;
  return null;
}

function validateSeasonPayload(season, movieIndex, seasonIndex) {
  if (!isPlainObject(season)) return `movies[${movieIndex}].seasons[${seasonIndex}] must be an object.`;

  const numberFields = ['number', 'total', 'watched'];
  for (const field of numberFields) {
    if (!hasNonNegativeNumber(season[field])) {
      return `movies[${movieIndex}].seasons[${seasonIndex}].${field} must be a non-negative number.`;
    }
  }

  return null;
}

function validateMoviePayload(movie, index) {
  if (!isPlainObject(movie)) return `movies[${index}] must be an object.`;

  const titleError = validateShortString(movie.title, `movies[${index}].title`, 500);
  if (titleError) return titleError;

  const mediaType = movie.mediaType || movie.type;
  if (mediaType && !VALID_MEDIA_TYPES.has(mediaType)) {
    return `movies[${index}].mediaType must be movie, tv, or anime.`;
  }

  if (movie.status && !VALID_STATUSES.has(movie.status)) {
    return `movies[${index}].status is not supported.`;
  }

  const numberFields = ['watchedEpisodes', 'totalEpisodes', 'rating', 'runtime', 'watchCount', 'timesWatched'];
  for (const field of numberFields) {
    if (!hasNonNegativeNumber(movie[field])) {
      return `movies[${index}].${field} must be a non-negative number.`;
    }
  }

  if (movie.rating !== null && movie.rating !== undefined && movie.rating !== '' && Number(movie.rating) > 10) {
    return `movies[${index}].rating cannot be greater than 10.`;
  }

  if (movie.seasons !== null && movie.seasons !== undefined) {
    if (!Array.isArray(movie.seasons)) return `movies[${index}].seasons must be an array.`;
    if (movie.seasons.length > MAX_SEASONS_PER_TITLE) {
      return `movies[${index}].seasons cannot exceed ${MAX_SEASONS_PER_TITLE} entries.`;
    }
    for (let seasonIndex = 0; seasonIndex < movie.seasons.length; seasonIndex += 1) {
      const error = validateSeasonPayload(movie.seasons[seasonIndex], index, seasonIndex);
      if (error) return error;
    }
  }

  return null;
}

function validateMoviesPayload(movies) {
  if (!Array.isArray(movies)) return 'movies must be an array.';
  if (movies.length > MAX_LIBRARY_ITEMS) return `movies cannot exceed ${MAX_LIBRARY_ITEMS} items.`;

  for (let index = 0; index < movies.length; index += 1) {
    const error = validateMoviePayload(movies[index], index);
    if (error) return error;
  }

  return null;
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

function stableString(value) {
  return value == null ? null : String(value);
}

function showProgress(movie) {
  const watched = Number(movie?.watchedEpisodes || 0);
  const total = Number(movie?.totalEpisodes || 0);
  const seasonWatched = Array.isArray(movie?.seasons)
    ? movie.seasons.reduce((sum, season) => sum + Number(season?.watched || 0), 0)
    : 0;
  return Math.max(watched, seasonWatched, movie?.status === 'watched' && total > 0 ? total : 0);
}

function progressSnapshot(movie) {
  if (!movie || typeof movie !== 'object') return null;
  return {
    status: movie.status || '',
    watchedEpisodes: showProgress(movie),
    totalEpisodes: Number(movie.totalEpisodes || 0),
    rating: Number(movie.rating || 0),
    watchCount: Number(movie.watchCount || movie.timesWatched || 0),
  };
}

function eventIdentity(movie) {
  const key = entryKey(movie);
  return {
    item_key: key || null,
    media_type: movie?.mediaType || movie?.type || null,
    tmdb_id: stableString(movie?.tmdbId),
    external_source: movie?.externalSource || null,
    external_id: stableString(movie?.externalId),
    title: movie?.title || '',
  };
}

function meaningfulChange(before, after) {
  if (!before && after) return 'title_added';
  if (before && !after) return 'title_removed';
  if (!before || !after) return null;

  const previous = progressSnapshot(before);
  const next = progressSnapshot(after);
  if (previous.status !== next.status) return 'status_changed';
  if (previous.watchedEpisodes !== next.watchedEpisodes) return 'episodes_changed';
  if (previous.totalEpisodes !== next.totalEpisodes) return 'total_episodes_changed';
  if (previous.rating !== next.rating) return 'rating_changed';
  if (previous.watchCount !== next.watchCount) return 'watch_count_changed';
  return null;
}

function buildProgressEvents({ userId, beforeMovies = [], afterMovies = [], saveId, source = 'cloud-save' }) {
  const beforeByKey = new Map();
  const afterByKey = new Map();
  const orderedKeys = [];

  for (const movie of beforeMovies) {
    const key = entryKey(movie);
    if (!key) continue;
    beforeByKey.set(key, movie);
    orderedKeys.push(key);
  }
  for (const movie of afterMovies) {
    const key = entryKey(movie);
    if (!key) continue;
    afterByKey.set(key, movie);
    if (!beforeByKey.has(key)) orderedKeys.push(key);
  }

  return [...new Set(orderedKeys)].flatMap((key) => {
    const before = beforeByKey.get(key) || null;
    const after = afterByKey.get(key) || null;
    const eventType = meaningfulChange(before, after);
    if (!eventType) return [];
    const identity = eventIdentity(after || before);
    return [{
      user_id: userId,
      ...identity,
      event_type: eventType,
      before_value: progressSnapshot(before),
      after_value: progressSnapshot(after),
      save_id: saveId,
      source,
    }];
  });
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

function mergeEntry(existing, incoming, { protectExistingProgress = true } = {}) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingProgress = showProgress(existing);
  const incomingProgress = showProgress(incoming);
  const merged = { ...existing, ...incoming };
  const seasons = mergeSeasons(existing.seasons, incoming.seasons);
  if (seasons) merged.seasons = seasons;
  if (protectExistingProgress && Number(existing.rating || 0) > 0 && Number(incoming.rating || 0) === 0) {
    merged.rating = existing.rating;
  }

  if (protectExistingProgress) {
    merged.totalEpisodes = Math.max(Number(existing.totalEpisodes || 0), Number(incoming.totalEpisodes || 0));
    merged.watchedEpisodes = Math.max(existingProgress, incomingProgress);
  }

  if (!protectExistingProgress) {
    merged.status = incoming.status;
  } else if (existing.status === 'watched' && incoming.status !== 'watched' && existingProgress >= incomingProgress) {
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
    merged.watchedEpisodes = protectExistingProgress
      ? Math.max(merged.watchedEpisodes || 0, watched)
      : watched;
  }

  return merged;
}

function mergeLibraries(existingMovies = [], incomingMovies = [], { keepMissingExisting = false, protectExistingProgress = true, protectIncomingDuplicates = true } = {}) {
  const output = [];
  const indexByKey = new Map();
  const existingByKey = new Map();
  const incomingByKey = new Map();

  for (const movie of existingMovies) {
    const key = entryKey(movie);
    if (key) existingByKey.set(key, movie);
  }

  for (const movie of incomingMovies) {
    const key = entryKey(movie);
    const duplicateInIncoming = key && incomingByKey.has(key);
    const existing = key ? (incomingByKey.get(key) || existingByKey.get(key)) : null;
    const merged = key ? mergeEntry(existing, movie, {
      protectExistingProgress: protectExistingProgress || (protectIncomingDuplicates && duplicateInIncoming),
    }) : movie;
    if (key && incomingByKey.has(key)) {
      output[indexByKey.get(key)] = merged;
      incomingByKey.set(key, merged);
      continue;
    }
    output.push(merged);
    if (key) {
      indexByKey.set(key, output.length - 1);
      incomingByKey.set(key, merged);
    }
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
}

async function writeProgressEvents({ token, userId, beforeMovies, afterMovies, saveId, source, signal }) {
  const events = buildProgressEvents({ userId, beforeMovies, afterMovies, saveId, source });
  if (!events.length) return 0;
  await supabaseRequest('progress_events', {
    method: 'POST',
    token,
    body: events,
    prefer: 'return=minimal',
    signal,
  });
  return events.length;
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
        `user_data?select=movies,updated_at,version&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`,
        { token, signal: controller.signal }
      );
      const row = rows?.[0] || null;
      return json(res, 200, {
        movies: Array.isArray(row?.movies) ? row.movies : [],
        item_count: Array.isArray(row?.movies) ? row.movies.length : 0,
        updated_at: row?.updated_at || null,
        version: Number(row?.version || 0),
        exists: Boolean(row),
      });
    }

    if (req.method === 'PUT') {
      const { movies, base_updated_at, base_version } = req.body || {};
      const validationError = validateMoviesPayload(movies);
      if (validationError) return json(res, 400, { error: validationError });

      const existingRows = await supabaseRequest(
        `user_data?select=movies,updated_at,version&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`,
        { token, signal: controller.signal }
      );
      const existingRow = existingRows?.[0] || null;
      const existingTime = Date.parse(existingRow?.updated_at || '');
      const baseTime = Date.parse(base_updated_at || '');
      const existingVersion = Number(existingRow?.version || 0);
      const clientBaseVersion = Number(base_version || 0);
      const hasCloudBaseline = Number.isFinite(existingTime);
      const hasClientBaseline = Number.isFinite(baseTime);
      const versionMismatch = Boolean(existingRow && (!clientBaseVersion || clientBaseVersion !== existingVersion));
      const staleClient = Boolean(
        versionMismatch ||
        (hasCloudBaseline && (!hasClientBaseline || existingTime > baseTime))
      );
      const mergedMovies = existingRow?.movies
        ? mergeLibraries(existingRow.movies, movies, {
            keepMissingExisting: staleClient,
            protectExistingProgress: staleClient,
            protectIncomingDuplicates: true,
          })
        : movies;

      await backupExistingUserData({
        token,
        userId,
        row: existingRow,
        reason: staleClient ? 'pre-stale-merge-save' : 'pre-save',
        signal: controller.signal,
      });

      const saveId = crypto.randomUUID();
      const nextVersion = existingRow ? existingVersion + 1 : 1;
      const payload = {
        user_id: userId,
        movies: mergedMovies,
        updated_at: new Date().toISOString(),
        version: nextVersion,
      };

      let rows;
      if (existingRow) {
        rows = await supabaseRequest(
          `user_data?user_id=eq.${encodeURIComponent(userId)}&version=eq.${encodeURIComponent(existingVersion)}&select=user_id,updated_at,version`,
          {
            method: 'PATCH',
            token,
            body: payload,
            prefer: 'return=representation',
            signal: controller.signal,
          }
        );
        if (!rows?.length) {
          return json(res, 409, {
            error: 'Cloud data changed during save. Reloading before saving prevents progress loss.',
            conflict: true,
          });
        }
      } else {
        rows = await supabaseRequest('user_data?on_conflict=user_id&select=user_id,updated_at,version', {
          method: 'POST',
          token,
          body: payload,
          prefer: 'resolution=merge-duplicates,return=representation',
          signal: controller.signal,
        });
      }

      const eventCount = await writeProgressEvents({
        token,
        userId,
        beforeMovies: existingRow?.movies || [],
        afterMovies: mergedMovies,
        saveId,
        source: staleClient ? 'stale-merge-save' : 'cloud-save',
        signal: controller.signal,
      });

      return json(res, 200, {
        ok: true,
        item_count: mergedMovies.length,
        updated_at: rows?.[0]?.updated_at || payload.updated_at,
        version: Number(rows?.[0]?.version || payload.version),
        merged: Boolean(existingRow),
        stale_client: staleClient,
        event_count: eventCount,
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
