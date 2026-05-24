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

  root.duplicates = {
    findDuplicate,
    isDuplicateCandidate,
  };
})();
