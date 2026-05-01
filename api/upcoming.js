// Returns upcoming-episode info for a list of TMDB TV IDs.
// Skips ended / cancelled series.
// For each show, returns every episode airing in the next 14 days
// (relative to server UTC). Shows currently between seasons return
// with episodes: [].

const ENDED       = new Set(['Ended', 'Canceled', 'Cancelled']);
const HORIZON_DAY = 14;

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchTvUpcoming(id, key, todayStr, horizonStr) {
  const showUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=${key}&language=en-US`;
  const r = await fetch(showUrl);
  if (!r.ok) return null;
  const d = await r.json();
  if (ENDED.has(d.status)) return null;

  const base = {
    tmdbId:      d.id,
    title:       d.name || '',
    status:      d.status || '',
    poster_path: d.poster_path || null,
    episodes:    [],
  };

  const ne = d.next_episode_to_air;
  if (!ne) return base;

  // Fetch the season that contains the next-to-air episode and pick out
  // every episode whose air_date falls inside the horizon window.
  const sUrl = `https://api.themoviedb.org/3/tv/${id}/season/${ne.season_number}?api_key=${key}&language=en-US`;
  const sr = await fetch(sUrl);
  if (!sr.ok) {
    // Fall back to just the single next episode if the season fetch fails.
    base.episodes = [{
      season:   ne.season_number,
      episode:  ne.episode_number,
      name:     ne.name || '',
      airDate:  ne.air_date || null,
      overview: ne.overview || '',
    }];
    return base;
  }
  const sd = await sr.json();

  base.episodes = (sd.episodes || [])
    .filter(e => e.air_date && e.air_date >= todayStr && e.air_date <= horizonStr)
    .map(e => ({
      season:   e.season_number,
      episode:  e.episode_number,
      name:     e.name || '',
      airDate:  e.air_date,
      overview: e.overview || '',
    }));

  return base;
}

export default async function handler(req, res) {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids' });

  const key = process.env.TMDB_API_KEY;
  const idList = ids.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s));
  if (!idList.length) return res.json({ results: [] });

  // Cap to avoid abuse / runaway
  const capped = idList.slice(0, 60);

  // Build the date window (UTC). Client does a final pass against its local
  // date so timezone offsets don't drop a same-day episode.
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + HORIZON_DAY * 86400000);
  const todayStr   = ymd(today);
  const horizonStr = ymd(horizon);

  const results = (await Promise.all(
    capped.map(id => fetchTvUpcoming(id, key, todayStr, horizonStr).catch(() => null))
  )).filter(Boolean);

  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.json({ results, horizonDays: HORIZON_DAY });
}
