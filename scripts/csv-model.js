(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  const COLUMN_MAP = {
    title: 'title',
    name: 'title',
    year: 'year',
    release_year: 'year',
    release_date: 'year',
    genre: 'genre',
    genres: 'genre',
    director: 'director',
    creator: 'director',
    created_by: 'director',
    country: 'country',
    origin_country: 'country',
    status: 'status',
    rating: 'rating',
    runtime: 'runtime',
    notes: 'notes',
    overview: 'notes',
    description: 'notes',
    type: 'mediaType',
    media_type: 'mediaType',
    mediatype: 'mediaType',
    poster: 'posterUrl',
    poster_url: 'posterUrl',
    posterurl: 'posterUrl',
    total_episodes: 'totalEpisodes',
    totalepisodes: 'totalEpisodes',
    episodes: 'totalEpisodes',
    episode_count: 'totalEpisodes',
    episodes_watched: 'watchedEpisodes',
    watched_episodes: 'watchedEpisodes',
    watchedepisodes: 'watchedEpisodes',
    // Columns written by CineTrack's own export, so a backup restores exactly.
    tmdb_id: 'tmdbId',
    external_source: 'externalSource',
    external_id: 'externalId',
    seasons: 'seasons',
    watch_count: 'watchCount',
    planned_date: 'plannedWatchDate',
    planned_time: 'plannedWatchTime',
    added_at: 'addedAt',
    aired_episodes: 'airedEpisodes',
    source_status: 'sourceStatus',
  };

  const EXPORT_HEADERS = [
    'title',
    'year',
    'genre',
    'director',
    'country',
    'status',
    'rating',
    'runtime',
    'notes',
    'type',
    'total_episodes',
    'episodes_watched',
    'tmdb_id',
    'external_source',
    'external_id',
    'poster_url',
    'seasons',
    'watch_count',
    'planned_date',
    'planned_time',
    'added_at',
    'aired_episodes',
    'source_status',
  ];

  const TEMPLATE_CSV = [
    'title,year,genre,director,country,status,rating,runtime,notes,type,total_episodes,episodes_watched',
    'Inception,2010,"Sci-Fi, Thriller",Christopher Nolan,United States,watched,9,148,Mind-bending film,movie,,',
    'Breaking Bad,2008,"Crime, Drama",Vince Gilligan,United States,watched,10,2700,Greatest TV drama,tv,62,62',
    'Dark,2017,"Sci-Fi, Thriller",Baran bo Odar,Germany,in_progress,9,1530,Time-travel mystery,tv,26,12',
    '',
  ].join('\n');

  function parseLine(line) {
    const fields = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  function normaliseHeader(header) {
    return String(header || '').toLowerCase().replace(/\s+/g, '_');
  }

  // Split into logical records, keeping newlines that sit inside quoted
  // fields (e.g. multi-line notes, which exportText produces) as part of the
  // field instead of starting a bogus new row. A double "" escape toggles the
  // quote state twice, so it nets out correctly.
  function splitRecords(text) {
    const records = [];
    let current = '';
    let inQuote = false;
    for (const ch of text) {
      if (ch === '"') {
        inQuote = !inQuote;
        current += ch;
      } else if (ch === '\n' && !inQuote) {
        records.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    records.push(current);
    return records;
  }

  function parse(text) {
    const normalised = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const records = splitRecords(normalised);
    if (records.length < 2) return [];

    const headers = parseLine(records[0]).map(normaliseHeader);
    const rows = [];
    for (let i = 1; i < records.length; i++) {
      const record = records[i];
      if (!record.trim()) continue;
      const values = parseLine(record);
      const row = {};
      headers.forEach((header, index) => {
        const field = COLUMN_MAP[header];
        if (field) row[field] = values[index] ?? '';
      });
      rows.push(row);
    }
    return rows;
  }

  function normaliseRow(row) {
    const rawType = String(row.mediaType || '').toLowerCase();
    const mediaType = (rawType === 'tv' || rawType === 'tv show' || rawType === 'show') ? 'tv'
      : rawType === 'anime' ? 'anime'
      : 'movie';
    const rawStatus = String(row.status || '').toLowerCase().trim();
    let status = rawStatus === 'watched' ? 'watched'
      : (rawStatus === 'in_progress' || rawStatus === 'in progress' || rawStatus === 'inprogress') ? 'in_progress'
      : rawStatus === 'dropped' ? 'dropped'
      : 'watchlist';
    const year = String(row.year || '').slice(0, 4);
    const runtime = parseInt(row.runtime, 10) || 0;
    const isShow = mediaType === 'tv' || mediaType === 'anime';
    const totalEpisodes = isShow ? Math.max(0, parseInt(row.totalEpisodes, 10) || 0) : 0;
    let watchedEpisodes = isShow ? Math.max(0, parseInt(row.watchedEpisodes, 10) || 0) : 0;
    if (totalEpisodes > 0 && watchedEpisodes > totalEpisodes) watchedEpisodes = totalEpisodes;
    if (status !== 'dropped' && isShow && totalEpisodes > 0) {
      if (watchedEpisodes >= totalEpisodes) status = 'watched';
      else if (watchedEpisodes > 0) status = 'in_progress';
    }
    const rating = (status === 'watched' || status === 'in_progress' || status === 'dropped')
      ? Math.min(10, Math.max(0, parseInt(row.rating, 10) || 0))
      : 0;
    return { mediaType, status, rating, year, runtime, totalEpisodes, watchedEpisodes };
  }

  function exportSeasons(seasons) {
    if (!Array.isArray(seasons) || !seasons.length) return '';
    return JSON.stringify(seasons.map(season => {
      const out = {
        number: season?.number,
        total: season?.total,
        watched: season?.watched || 0,
        name: season?.name || '',
      };
      if (season?.aired != null) out.aired = season.aired;
      if (season?.airDate) out.airDate = season.airDate;
      return out;
    }));
  }

  function count(value) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  // Extra fields from a CineTrack backup row, validated. Rows from other
  // spreadsheets simply have none of these columns and get {}.
  function restoreFields(row = {}) {
    const out = {};
    const tmdbId = String(row.tmdbId || '').trim();
    if (/^\d+$/.test(tmdbId)) out.tmdbId = Number(tmdbId);
    const source = String(row.externalSource || '').trim().toLowerCase();
    if (['tmdb', 'anilist', 'tvmaze', 'manual'].includes(source)) out.externalSource = source;
    const externalId = String(row.externalId || '').trim();
    if (/^[A-Za-z0-9_-]{1,64}$/.test(externalId)) out.externalId = externalId;
    const watchCount = count(row.watchCount);
    if (watchCount != null) out.watchCount = watchCount;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(row.plannedWatchDate || '').trim())) out.plannedWatchDate = row.plannedWatchDate.trim();
    if (/^\d{2}:\d{2}$/.test(String(row.plannedWatchTime || '').trim())) out.plannedWatchTime = row.plannedWatchTime.trim();
    const addedAt = count(row.addedAt);
    if (addedAt) out.addedAt = addedAt;
    const airedEpisodes = count(row.airedEpisodes);
    if (airedEpisodes != null && String(row.airedEpisodes).trim() !== '') out.airedEpisodes = airedEpisodes;
    const sourceStatus = String(row.sourceStatus || '').trim();
    if (sourceStatus && sourceStatus.length <= 40) out.sourceStatus = sourceStatus;
    if (row.seasons) {
      try {
        const parsed = JSON.parse(row.seasons);
        if (Array.isArray(parsed)) {
          out.seasons = parsed.slice(0, 500).filter(s => s && typeof s === 'object').map((s, index) => {
            const season = {
              number: count(s.number) ?? index + 1,
              total: count(s.total) ?? 0,
              watched: count(s.watched) ?? 0,
              name: typeof s.name === 'string' ? s.name.slice(0, 200) : '',
            };
            if (count(s.aired) != null) season.aired = count(s.aired);
            if (typeof s.airDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.airDate)) season.airDate = s.airDate;
            return season;
          });
        }
      } catch {}
    }
    return out;
  }

  function escapeCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  }

  function exportText(list) {
    const rows = list.map(movie => [
      movie.title,
      movie.year,
      movie.genre,
      movie.director,
      movie.country,
      movie.status,
      movie.rating || '',
      movie.runtime || '',
      movie.notes,
      movie.mediaType,
      movie.totalEpisodes || '',
      movie.watchedEpisodes || '',
      movie.tmdbId || '',
      movie.externalSource || '',
      movie.externalId || '',
      movie.posterUrl && /^https?:\/\//i.test(movie.posterUrl) ? movie.posterUrl : '',
      exportSeasons(movie.seasons),
      movie.watchCount || '',
      movie.plannedWatchDate || '',
      movie.plannedWatchTime || '',
      movie.addedAt || '',
      movie.airedEpisodes ?? '',
      movie.sourceStatus || '',
    ].map(escapeCell).join(','));
    return [EXPORT_HEADERS.join(','), ...rows].join('\n');
  }

  function exportList(entries = [], activeType = 'movie') {
    if (activeType === 'all') return entries.slice();
    return activeType === 'dropped'
      ? entries.filter(entry => entry.status === 'dropped')
      : entries.filter(entry => entry.mediaType === activeType && entry.status !== 'dropped');
  }

  function exportFilename(activeType = 'movie', date = new Date()) {
    const day = typeof date?.toISOString === 'function'
      ? date.toISOString().slice(0, 10)
      : String(date || '').slice(0, 10);
    return `cinetrack-${activeType}-${day}.csv`;
  }

  function exportPayload(entries = [], activeType = 'movie', date = new Date()) {
    const list = exportList(entries, activeType);
    return {
      list,
      text: list.length ? exportText(list) : '',
      filename: exportFilename(activeType, date),
    };
  }

  root.csv = {
    COLUMN_MAP,
    EXPORT_HEADERS,
    TEMPLATE_CSV,
    parse,
    normaliseRow,
    escapeCell,
    restoreFields,
    exportText,
    exportList,
    exportFilename,
    exportPayload,
  };
})();
