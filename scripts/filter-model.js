(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function isSeries(entry = {}) {
    return entry.mediaType === 'tv' || entry.mediaType === 'anime';
  }

  function hasActiveFilters(state = {}) {
    return !!(
      state.searchQuery ||
      state.genreFilter ||
      state.countryFilter ||
      state.activeStatus !== 'all' ||
      state.seriesStatusFilter ||
      state.sortOrder === 'series_ongoing' ||
      state.sortOrder === 'series_ended' ||
      state.yearMinFilter ||
      state.yearMaxFilter ||
      state.ratingMinFilter ||
      state.ratingMaxFilter
    );
  }

  function countMoreFilters(state = {}) {
    let count = 0;
    if (state.genreFilter) count++;
    if (state.countryFilter) count++;
    if (state.sortOrder && state.sortOrder !== 'added') count++;
    if (state.yearMinFilter) count++;
    if (state.yearMaxFilter) count++;
    if (state.ratingMinFilter) count++;
    if (state.ratingMaxFilter) count++;
    return count;
  }

  function yearPreset(value) {
    if (value === '2020s') return { yearMinFilter: '2020', yearMaxFilter: '2029' };
    if (value === '2010s') return { yearMinFilter: '2010', yearMaxFilter: '2019' };
    if (value === '2000s') return { yearMinFilter: '2000', yearMaxFilter: '2009' };
    if (value === '1990s') return { yearMinFilter: '1990', yearMaxFilter: '1999' };
    if (value === 'older') return { yearMinFilter: '', yearMaxFilter: '1989' };
    return { yearMinFilter: '', yearMaxFilter: '' };
  }

  function ratingPreset(value) {
    return {
      ratingMinFilter: value || '',
      ratingMaxFilter: '',
    };
  }

  function pageSize(value, fallback = 50, allowed = [25, 50, 100, 150, 200, 300]) {
    const parsed = parseInt(value);
    return allowed.includes(parsed) ? parsed : fallback;
  }

  function matches(entry = {}, state = {}, helpers = {}) {
    const seriesStatusBucket = helpers.seriesStatusBucket || (() => 'unknown');
    const activeType = state.activeType || 'movie';
    const activeStatus = state.activeStatus || 'all';
    const sortOrder = state.sortOrder || 'added';

    if (activeType === 'dropped') {
      if (entry.status !== 'dropped') return false;
    } else {
      if (entry.mediaType !== activeType) return false;
      if (entry.status === 'dropped') return false;
      if (activeStatus !== 'all' && entry.status !== activeStatus) return false;
    }

    if (state.countryFilter && entry.country !== state.countryFilter) return false;

    if (state.seriesStatusFilter) {
      if (!isSeries(entry) || seriesStatusBucket(entry) !== state.seriesStatusFilter) return false;
    }

    if (sortOrder === 'series_ongoing' || sortOrder === 'series_ended') {
      const target = sortOrder === 'series_ongoing' ? 'ongoing' : 'ended';
      if (!isSeries(entry) || seriesStatusBucket(entry) !== target) return false;
    }

    if (state.genreFilter) {
      const genres = (entry.genre || '').split(',').map(genre => genre.trim());
      if (!genres.includes(state.genreFilter)) return false;
    }

    if (state.yearMinFilter || state.yearMaxFilter) {
      const year = parseInt(entry.year);
      if (state.yearMinFilter && (!year || year < parseInt(state.yearMinFilter))) return false;
      if (state.yearMaxFilter && (!year || year > parseInt(state.yearMaxFilter))) return false;
    }

    if (state.ratingMinFilter === 'unrated') {
      if (entry.rating) return false;
    } else if (state.ratingMinFilter && (entry.rating || 0) < parseInt(state.ratingMinFilter)) {
      return false;
    }
    if (state.ratingMaxFilter && (entry.rating || 0) > parseInt(state.ratingMaxFilter)) return false;

    const query = String(state.searchQuery || '').toLowerCase();
    if (query) {
      const haystack = [entry.title, entry.genre, entry.director, entry.country].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  }

  function sortEntries(list = [], state = {}, helpers = {}) {
    const isAiringToday = helpers.isAiringToday || (() => false);
    const sortOrder = state.sortOrder || 'added';
    return list.slice().sort((a, b) => {
      const aToday = isAiringToday(a) ? 0 : 1;
      const bToday = isAiringToday(b) ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      switch (sortOrder) {
        case 'title': return String(a.title || '').localeCompare(String(b.title || ''));
        case 'year': return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        default: return (b.addedAt || 0) - (a.addedAt || 0);
      }
    });
  }

  function apply(entries = [], state = {}, helpers = {}) {
    return sortEntries(entries.filter(entry => matches(entry, state, helpers)), state, helpers);
  }

  root.filters = {
    isSeries,
    hasActiveFilters,
    countMoreFilters,
    yearPreset,
    ratingPreset,
    pageSize,
    matches,
    sortEntries,
    apply,
  };
})();
