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

  function parse(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    const headers = parseLine(lines[0]).map(normaliseHeader);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseLine(line);
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
    ].map(escapeCell).join(','));
    return [EXPORT_HEADERS.join(','), ...rows].join('\n');
  }

  root.csv = {
    COLUMN_MAP,
    EXPORT_HEADERS,
    TEMPLATE_CSV,
    parse,
    normaliseRow,
    escapeCell,
    exportText,
  };
})();
