(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function defaultNormaliseTitle(value) {
    return String(value || '').trim().toLowerCase();
  }

  function defaultNormaliseYear(value) {
    const match = String(value || '').match(/\d{4}/);
    return match ? match[0] : '';
  }

  function isDuplicateCandidate(entry, query, options = {}) {
    const normaliseTitle = options.normaliseTitle || defaultNormaliseTitle;
    const normaliseYear = options.normaliseYear || defaultNormaliseYear;
    const editingId = options.editingId || null;
    const selectedSource = query.source || 'tmdb';
    const selectedExternalId = String(query.externalId || '');
    const wantedType = query.mediaType || '';
    const wantedTitle = normaliseTitle(query.title);
    const wantedYear = normaliseYear(query.year);

    if (!entry || entry.id === editingId) return false;

    if (selectedExternalId) {
      if (selectedSource === 'tmdb' && Number(entry.tmdbId) === Number(selectedExternalId)) return true;
      if (entry.externalSource === selectedSource && String(entry.externalId || '') === selectedExternalId) return true;
    }

    if (!wantedTitle || entry.mediaType !== wantedType) return false;
    const existingTitle = normaliseTitle(entry.title);
    if (existingTitle !== wantedTitle) return false;

    const existingYear = normaliseYear(entry.year);
    if (wantedYear && existingYear) return wantedYear === existingYear;

    return wantedTitle.length >= 8;
  }

  function findDuplicate(library = [], query = {}, options = {}) {
    return library.find(entry => isDuplicateCandidate(entry, query, options)) || null;
  }

  function findTrackedRecommendation(library = [], rec = {}, options = {}) {
    if (!rec) return null;
    const normaliseTitle = options.normaliseTitle || defaultNormaliseTitle;
    const normaliseYear = options.normaliseYear || defaultNormaliseYear;
    const compatibleTypes = options.compatibleTypes || ((a, b) => !a || !b || a === b);
    const recommendationMediaType = options.recommendationMediaType || (item => item?.media_type || item?.mediaType || '');
    const recommendationSourceKey = options.recommendationSourceKey || (item => {
      const source = item?.source || 'tmdb';
      const externalId = item?.externalId || item?.id;
      return externalId ? `${source}:${externalId}` : '';
    });

    const source = rec.source || 'tmdb';
    const recType = recommendationMediaType(rec);
    const recId = rec.id == null ? '' : String(rec.id);
    const recSourceKey = recommendationSourceKey(rec);
    const recTitle = normaliseTitle(rec.title);
    const recYear = normaliseYear(rec.year);

    return library.find(entry => {
      const entryType = entry?.mediaType || '';
      if (!compatibleTypes(entryType, recType)) return false;

      if (source === 'tmdb' && recId && entry.tmdbId && String(entry.tmdbId) === recId) return true;
      if (recSourceKey && entry.externalSource && entry.externalId && `${entry.externalSource}:${entry.externalId}` === recSourceKey) return true;

      const entryTitle = normaliseTitle(entry.title);
      if (!entryTitle || !recTitle || entryTitle !== recTitle) return false;

      const entryYear = normaliseYear(entry.year);
      if (entryYear && recYear) return entryYear === recYear;

      return recTitle.length >= 8;
    }) || null;
  }

  root.duplicates = {
    findDuplicate,
    findTrackedRecommendation,
    isDuplicateCandidate,
  };
})();
