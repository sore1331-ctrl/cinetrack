function json(res, status, body) {
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=1800' : 'no-store');
  res.status(status).json(body);
}

async function tvmaze(path) {
  const r = await fetch(`https://api.tvmaze.com${path}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || `TVMaze returned ${r.status}`);
  return data;
}

function stripTags(value = '') {
  return String(value || '').replace(/<[^>]+>/g, '');
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

function slimEpisode(ep = {}) {
  return {
    season: ep.season || 0,
    episode: ep.number || 0,
    name: ep.name || '',
    airDate: ep.airdate || null,
    overview: stripTags(ep.summary || ''),
  };
}

function findCalendarEpisode(episodes, today, horizon) {
  return (episodes || [])
    .filter(ep => ep?.airdate && ep.airdate >= today && ep.airdate <= horizon)
    .sort((a, b) => a.airdate.localeCompare(b.airdate))[0] || null;
}

async function calendarEntry(entry, today, horizon) {
  const title = String(entry?.title || '').trim();
  if (!title) return null;

  let show = null;
  if (entry.externalSource === 'tvmaze' && /^\d+$/.test(String(entry.externalId || ''))) {
    show = await tvmaze(`/shows/${entry.externalId}`);
  } else {
    const results = await tvmaze(`/search/shows?q=${encodeURIComponent(title)}`);
    show = chooseShow(results, entry);
  }
  if (!show?.id) return null;

  const episodes = await tvmaze(`/shows/${show.id}/episodes`);
  const episode = findCalendarEpisode(episodes, today, horizon);
  const sourceKey = entry.sourceKey || (entry.tmdbId ? `tv:${entry.tmdbId}` : `tvmaze:${show.id}`);

  return {
    type: 'tv',
    source: 'tvmaze',
    sourceKey,
    tmdbId: entry.tmdbId || null,
    externalId: show.id,
    title: entry.title || show.name || '',
    status: show.status || '',
    poster_url: entry.posterUrl || show.image?.medium || show.image?.original || '',
    externalUrl: show.url || `https://www.tvmaze.com/shows/${show.id}`,
    nextEpisode: episode ? slimEpisode(episode) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const entries = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, 60) : [];
  const today = String(req.body?.today || '').trim();
  const horizon = String(req.body?.horizon || '').trim();
  if (!entries.length) return json(res, 200, { results: [] });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !/^\d{4}-\d{2}-\d{2}$/.test(horizon)) {
    return json(res, 400, { error: 'Missing valid today/horizon dates.' });
  }

  try {
    const results = await Promise.all(entries.map(entry =>
      calendarEntry(entry, today, horizon).catch(() => null)
    ));
    return json(res, 200, { results: results.filter(Boolean) });
  } catch (e) {
    return json(res, 500, { error: e?.message || 'TVMaze calendar lookup failed.' });
  }
}
