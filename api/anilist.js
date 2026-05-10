const ANILIST_URL = 'https://graphql.anilist.co';

function json(res, status, body) {
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=1800' : 'no-store');
  res.status(status).json(body);
}

async function anilistQuery(query, variables = {}) {
  const r = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || data?.errors?.length) {
    throw new Error(data?.errors?.[0]?.message || `AniList returned ${r.status}`);
  }
  return data.data;
}

function title(media = {}) {
  return media.title?.english || media.title?.romaji || media.title?.native || '';
}

function slimMedia(media = {}) {
  return {
    id: media.id,
    idMal: media.idMal || null,
    title: title(media),
    titleRomaji: media.title?.romaji || '',
    titleEnglish: media.title?.english || '',
    year: media.startDate?.year || null,
    season: media.season || '',
    seasonYear: media.seasonYear || null,
    format: media.format || '',
    status: media.status || '',
    episodes: media.episodes || 0,
    duration: media.duration || 0,
    genres: media.genres || [],
    studios: media.studios?.nodes?.map(s => s.name).filter(Boolean) || [],
    country: media.countryOfOrigin || '',
    coverImage: media.coverImage?.large || media.coverImage?.medium || '',
    bannerImage: media.bannerImage || '',
    averageScore: media.averageScore || null,
    popularity: media.popularity || 0,
    nextAiringEpisode: media.nextAiringEpisode ? {
      airingAt: media.nextAiringEpisode.airingAt,
      episode: media.nextAiringEpisode.episode,
      timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
    } : null,
    description: media.description ? media.description.replace(/<[^>]+>/g, '') : '',
    siteUrl: media.siteUrl || '',
  };
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  startDate { year month day }
  season
  seasonYear
  format
  status
  episodes
  duration
  genres
  countryOfOrigin
  averageScore
  popularity
  description(asHtml: false)
  siteUrl
  coverImage { large medium }
  bannerImage
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { airingAt episode timeUntilAiring }
`;

export default async function handler(req, res) {
  const action = String(req.query.action || 'search');

  try {
    if (action === 'search') {
      const q = String(req.query.q || '').trim();
      if (!q) return json(res, 400, { error: 'Missing q.' });
      const data = await anilistQuery(`
        query ($search: String!) {
          Page(page: 1, perPage: 12) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
          }
        }
      `, { search: q });
      return json(res, 200, { results: (data.Page?.media || []).map(slimMedia) });
    }

    if (action === 'details') {
      const id = Number(req.query.id || 0);
      if (!id) return json(res, 400, { error: 'Missing numeric AniList id.' });
      const data = await anilistQuery(`
        query ($id: Int!) {
          Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
        }
      `, { id });
      return json(res, 200, { media: slimMedia(data.Media || {}) });
    }

    if (action === 'airing') {
      const id = Number(req.query.id || 0);
      if (!id) return json(res, 400, { error: 'Missing numeric AniList id.' });
      const data = await anilistQuery(`
        query ($id: Int!) {
          Page(page: 1, perPage: 20) {
            airingSchedules(mediaId: $id, sort: TIME) {
              id
              episode
              airingAt
              timeUntilAiring
              media { ${MEDIA_FIELDS} }
            }
          }
        }
      `, { id });
      return json(res, 200, {
        airing: (data.Page?.airingSchedules || []).map(a => ({
          id: a.id,
          episode: a.episode,
          airingAt: a.airingAt,
          timeUntilAiring: a.timeUntilAiring,
          media: slimMedia(a.media || {}),
        })),
      });
    }

    return json(res, 400, { error: 'Unknown AniList action.' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Failed to reach AniList.' });
  }
}
