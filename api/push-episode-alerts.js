const webPush = require('web-push');

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

function requiredEnv(name) {
  const value = process.env[name] || '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function supabaseEnv() {
  return {
    supabaseUrl: requiredEnv('SUPABASE_URL').replace(/\/$/, ''),
    serviceKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function configureWebPush() {
  const publicKey = requiredEnv('VAPID_PUBLIC_KEY');
  const privateKey = requiredEnv('VAPID_PRIVATE_KEY');
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@cinetrack.local';
  webPush.setVapidDetails(subject, publicKey, privateKey);
}

function checkCronAuth(req) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return true;
  const header = req.headers.authorization || req.headers.Authorization || '';
  return header === `Bearer ${secret}`;
}

async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const { supabaseUrl, serviceKey } = supabaseEnv();
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
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

function dateString(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function norm(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function yearOf(value = '') {
  return String(value || '').slice(0, 4);
}

function scoreShow(candidate, entry) {
  const show = candidate?.show || {};
  const title = norm(entry.title);
  const name = norm(show.name);
  let score = Number(candidate?.score || 0);
  if (title && name === title) score += 3;
  else if (title && name.includes(title)) score += 1;
  if (entry.year && yearOf(show.premiered) === String(entry.year)) score += 2;
  if (show.status && show.status !== 'Ended') score += 0.25;
  return score;
}

function chooseShow(results, entry) {
  return [...(results || [])]
    .sort((a, b) => scoreShow(b, entry) - scoreShow(a, entry))[0]?.show || null;
}

async function tvmaze(path) {
  const r = await fetch(`https://api.tvmaze.com${path}`, { headers: { Accept: 'application/json' } });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || `TVMaze returned ${r.status}`);
  return data;
}

async function anilistDetails(id) {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        siteUrl
        coverImage { medium }
        nextAiringEpisode { airingAt episode }
      }
    }
  `;
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: Number(id) } }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || data?.errors?.length) throw new Error(data?.errors?.[0]?.message || `AniList returned ${r.status}`);
  return data?.data?.Media || null;
}

function episodeOrdinalForProgress(entry, episode) {
  const epNo = Number(episode?.episode || 0);
  if (!epNo) return null;
  const seasonNo = Number(episode?.season || 1);
  if (!Array.isArray(entry?.seasons) || !entry.seasons.length) return epNo;
  let before = 0;
  for (const season of entry.seasons) {
    const current = Number(season?.number || 0);
    if (current && current < seasonNo) before += Number(season?.total || 0);
  }
  return before + epNo;
}

function hasUnwatchedEpisodeToday(entry, episode, today) {
  if (!episode || episode.airDate !== today) return false;
  const ordinal = episodeOrdinalForProgress(entry, episode);
  if (!ordinal) return true;
  return Number(entry?.watchedEpisodes || 0) < ordinal;
}

async function tvEpisodeToday(entry, today) {
  let show = null;
  if (entry.externalSource === 'tvmaze' && /^\d+$/.test(String(entry.externalId || ''))) {
    show = await tvmaze(`/shows/${entry.externalId}`);
  } else {
    const results = await tvmaze(`/search/shows?q=${encodeURIComponent(entry.title || '')}`);
    show = chooseShow(results, entry);
  }
  if (!show?.id) return null;
  const episodes = await tvmaze(`/shows/${show.id}/episodes`);
  const ep = (episodes || []).find(item => item?.airdate === today);
  if (!ep) return null;
  return {
    source: 'tvmaze',
    title: entry.title || show.name || '',
    icon: entry.posterUrl || show.image?.medium || show.image?.original || '',
    url: show.url || '/',
    episode: { season: ep.season || 0, episode: ep.number || 0, name: ep.name || '', airDate: ep.airdate || today },
  };
}

async function animeEpisodeToday(entry, today) {
  if (entry.externalSource !== 'anilist' || !entry.externalId) return null;
  const media = await anilistDetails(entry.externalId);
  const airing = media?.nextAiringEpisode;
  if (!airing?.airingAt) return null;
  const airDate = dateString(new Date(airing.airingAt * 1000));
  if (airDate !== today) return null;
  const title = media.title?.english || media.title?.romaji || media.title?.native || entry.title || '';
  return {
    source: 'anilist',
    title,
    icon: entry.posterUrl || media.coverImage?.medium || '',
    url: media.siteUrl || '/',
    episode: { season: 1, episode: airing.episode || 0, name: '', airDate },
  };
}

function trackedEntries(movies = []) {
  return (Array.isArray(movies) ? movies : []).filter(entry =>
    entry &&
    (entry.mediaType === 'tv' || entry.mediaType === 'anime') &&
    entry.status === 'in_progress' &&
    entry.title
  ).slice(0, 80);
}

async function notificationForEntry(entry, today) {
  const item = entry.mediaType === 'anime'
    ? await animeEpisodeToday(entry, today).catch(() => null)
    : await tvEpisodeToday(entry, today).catch(() => null);
  if (!item || !hasUnwatchedEpisodeToday(entry, item.episode, today)) return null;
  const ep = item.episode;
  const itemKey = entry.tmdbId || entry.externalId || entry.id || norm(entry.title);
  const key = `${entry.mediaType}:${itemKey}:s${ep.season}e${ep.episode}:${today}`;
  return {
    key,
    title: 'Episode airs today',
    body: `${item.title} - ${ep.name || `S${ep.season} E${ep.episode}`}`,
    icon: item.icon || undefined,
    tag: key,
    url: '/',
  };
}

async function alreadySent(userId, key) {
  const rows = await supabaseRequest(
    `push_notification_events?select=id&user_id=eq.${encodeURIComponent(userId)}&notification_key=eq.${encodeURIComponent(key)}&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function recordSent(userId, key, payload) {
  await supabaseRequest('push_notification_events', {
    method: 'POST',
    body: {
      user_id: userId,
      notification_key: key,
      payload,
      sent_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  });
}

async function deleteSubscription(endpoint) {
  await supabaseRequest(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
}

async function sendToUserSubscriptions(userId, payload) {
  const subs = await supabaseRequest(
    `push_subscriptions?select=endpoint,subscription&user_id=eq.${encodeURIComponent(userId)}`
  );
  let sent = 0;
  for (const row of subs || []) {
    try {
      await webPush.sendNotification(row.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent += 1;
    } catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await deleteSubscription(row.endpoint).catch(() => {});
      }
    }
  }
  return sent;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!checkCronAuth(req)) return json(res, 401, { error: 'Unauthorized.' });

  try {
    configureWebPush();
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query?.date || ''))
      ? String(req.query.date)
      : dateString();
    const rows = await supabaseRequest('user_data?select=user_id,movies&order=updated_at.desc&limit=1000');
    let checked = 0;
    let queued = 0;
    let sent = 0;

    for (const row of rows || []) {
      const entries = trackedEntries(row.movies);
      if (!entries.length) continue;
      checked += 1;
      for (const entry of entries) {
        const notification = await notificationForEntry(entry, today);
        if (!notification) continue;
        if (await alreadySent(row.user_id, notification.key)) continue;
        const delivered = await sendToUserSubscriptions(row.user_id, notification);
        if (delivered > 0) {
          await recordSent(row.user_id, notification.key, notification);
          queued += 1;
          sent += delivered;
        }
      }
    }

    return json(res, 200, { ok: true, today, checkedUsers: checked, queuedNotifications: queued, sent });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || 'Push alert job failed.' });
  }
}
