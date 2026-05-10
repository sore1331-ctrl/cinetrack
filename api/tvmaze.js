function json(res, status, body) {
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=1800' : 'no-store');
  res.status(status).json(body);
}

async function tvmaze(path) {
  const r = await fetch(`https://api.tvmaze.com${path}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || `TVmaze returned ${r.status}`);
  return data;
}

function slimShow(show = {}) {
  return {
    id: show.id,
    title: show.name || '',
    year: (show.premiered || '').slice(0, 4),
    premiered: show.premiered || '',
    ended: show.ended || '',
    status: show.status || '',
    type: show.type || '',
    language: show.language || '',
    genres: show.genres || [],
    runtime: show.runtime || show.averageRuntime || 0,
    country: show.network?.country?.name || show.webChannel?.country?.name || '',
    network: show.network?.name || show.webChannel?.name || '',
    officialSite: show.officialSite || '',
    tvmazeUrl: show.url || '',
    image: show.image?.medium || show.image?.original || '',
    summary: show.summary ? show.summary.replace(/<[^>]+>/g, '') : '',
  };
}

function slimEpisode(ep = {}) {
  return {
    id: ep.id,
    title: ep.name || '',
    season: ep.season || 0,
    episode: ep.number || 0,
    airdate: ep.airdate || '',
    airtime: ep.airtime || '',
    airstamp: ep.airstamp || '',
    runtime: ep.runtime || 0,
    tvmazeUrl: ep.url || '',
    image: ep.image?.medium || ep.image?.original || '',
    summary: ep.summary ? ep.summary.replace(/<[^>]+>/g, '') : '',
    show: ep._embedded?.show ? slimShow(ep._embedded.show) : null,
  };
}

export default async function handler(req, res) {
  const action = String(req.query.action || 'search');

  try {
    if (action === 'search') {
      const q = String(req.query.q || '').trim();
      if (!q) return json(res, 400, { error: 'Missing q.' });
      const data = await tvmaze(`/search/shows?q=${encodeURIComponent(q)}`);
      return json(res, 200, {
        results: (data || []).map(item => ({
          score: item.score || 0,
          ...slimShow(item.show || {}),
        })),
      });
    }

    if (action === 'episodes') {
      const id = String(req.query.id || '').trim();
      if (!/^\d+$/.test(id)) return json(res, 400, { error: 'Missing numeric show id.' });
      const specials = req.query.specials === '1' ? '?specials=1' : '';
      const data = await tvmaze(`/shows/${id}/episodes${specials}`);
      return json(res, 200, { episodes: (data || []).map(slimEpisode) });
    }

    if (action === 'schedule') {
      const country = String(req.query.country || 'US').trim().toUpperCase().slice(0, 2);
      const date = String(req.query.date || '').trim();
      const params = new URLSearchParams({ country });
      if (date) params.set('date', date);
      const data = await tvmaze(`/schedule?${params.toString()}`);
      return json(res, 200, { episodes: (data || []).map(slimEpisode) });
    }

    return json(res, 400, { error: 'Unknown TVmaze action.' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Failed to reach TVmaze.' });
  }
}
