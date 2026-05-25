(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createSeasonController(options = {}) {
    const {
      seasonSelectLabel,
      seasonSelect,
      epWatchedInput,
      epTotalInput,
      modalModel,
      esc = value => String(value ?? ''),
      normaliseSeasons,
    } = options;

    let editingSeasons = [];
    let editingSeasonIdx = 0;

    function rebuildDropdown() {
      if (!editingSeasons.length) {
        seasonSelectLabel?.classList.add('hidden');
        return;
      }
      seasonSelectLabel?.classList.remove('hidden');
      if (seasonSelect) {
        seasonSelect.innerHTML = editingSeasons.map((season, index) =>
          `<option value="${index}"${index === editingSeasonIdx ? ' selected' : ''}>${esc(season.name || `Season ${season.number}`)} - ${season.watched || 0}/${season.total}</option>`
        ).join('');
      }
    }

    function loadIntoInputs(index) {
      editingSeasonIdx = index;
      const season = editingSeasons[index];
      if (!season) return;
      if (epWatchedInput) epWatchedInput.value = season.watched || 0;
      if (epTotalInput) epTotalInput.value = season.total || 0;
    }

    function captureCurrent() {
      const season = editingSeasons[editingSeasonIdx];
      if (!season) return;
      season.total = Math.max(0, parseInt(epTotalInput?.value, 10) || 0);
      season.watched = Math.max(0, parseInt(epWatchedInput?.value, 10) || 0);
      if (season.total > 0 && season.watched > season.total) season.watched = season.total;
    }

    function initFromEntry(entry) {
      editingSeasons = modalModel.cloneSeasons(entry);
      editingSeasonIdx = modalModel.initialSeasonIndex(editingSeasons);
      rebuildDropdown();
      if (editingSeasons.length) {
        loadIntoInputs(editingSeasonIdx);
      } else {
        if (epWatchedInput) epWatchedInput.value = entry?.watchedEpisodes || '';
        if (epTotalInput) epTotalInput.value = entry?.totalEpisodes || '';
      }
    }

    function applySelection(details, status = '') {
      const seasonState = modalModel.selectionSeasonState({
        details,
        seasons: editingSeasons,
        totalInput: epTotalInput?.value || '',
        watchedInput: epWatchedInput?.value || '',
        status,
      });
      if (seasonState.hasSeasons) {
        editingSeasons = seasonState.seasons;
        editingSeasonIdx = seasonState.seasonIndex;
        rebuildDropdown();
        loadIntoInputs(editingSeasonIdx);
      } else if (seasonState.totalInput && epTotalInput && !epTotalInput.value) {
        epTotalInput.value = seasonState.totalInput;
      }
    }

    function captureAndNormalise(shouldNormalise = true) {
      if (!editingSeasons.length) return;
      captureCurrent();
      if (shouldNormalise) normaliseSeasons?.(editingSeasons);
    }

    function seasons() {
      return editingSeasons;
    }

    function hasSeasons() {
      return editingSeasons.length > 0;
    }

    seasonSelect?.addEventListener('change', () => {
      const nextIndex = parseInt(seasonSelect.value, 10);
      captureCurrent();
      editingSeasonIdx = nextIndex;
      loadIntoInputs(editingSeasonIdx);
      rebuildDropdown();
    });

    return {
      initFromEntry,
      applySelection,
      captureAndNormalise,
      hasSeasons,
      seasons,
    };
  }

  function createRewatchController(options = {}) {
    const {
      row,
      countEl,
      pluralEl,
      incBtn,
      decBtn,
      statusInput,
      modalModel,
    } = options;

    let editingWatchCount = 0;
    let editingId = null;

    function update() {
      if (!row) return;
      const state = modalModel.rewatchState(statusInput?.value || '', editingId, editingWatchCount);
      row.classList.toggle('hidden', !state.visible);
      if (countEl) countEl.textContent = String(state.count);
      if (pluralEl) pluralEl.textContent = state.plural;
    }

    function initFromEntry(entry) {
      editingId = entry?.id || null;
      editingWatchCount = modalModel.initialWatchCount(entry);
      update();
    }

    function count() {
      return editingWatchCount;
    }

    incBtn?.addEventListener('click', () => {
      editingWatchCount = Math.max(1, editingWatchCount) + 1;
      update();
    });

    decBtn?.addEventListener('click', () => {
      if (editingWatchCount > 1) editingWatchCount -= 1;
      update();
    });

    return { initFromEntry, update, count };
  }

  function createProviderController(options = {}) {
    const {
      container,
      fetchDetails,
      sourceModel,
      esc = value => String(value ?? ''),
      scheduleSavePrefs = () => {},
      logoBase = 'https://image.tmdb.org/t/p/w92',
      regionStorageKey = 'cinetrack_provider_region',
    } = options;

    const cache = new Map();

    function clear() {
      if (!container) return;
      container.classList.add('hidden');
      container.innerHTML = '';
    }

    function render(providers) {
      if (!container) return;
      if (!providers || typeof providers !== 'object') {
        clear();
        return;
      }
      const region = localStorage.getItem(regionStorageKey) || 'US';
      const data = providers[region] || providers.US || providers[Object.keys(providers)[0]];
      if (!data) {
        clear();
        return;
      }

      const logos = items => items.slice(0, 6).map(provider =>
        `<img class="provider-logo" src="${logoBase}${provider.logo}" alt="${esc(provider.name)}" title="${esc(provider.name)}" loading="lazy" />`
      ).join('');

      const sections = [];
      if (data.flatrate?.length) sections.push(`<div class="provider-row"><span class="provider-row-label">Stream</span><div class="provider-logos">${logos(data.flatrate)}</div></div>`);
      if (data.rent?.length) sections.push(`<div class="provider-row"><span class="provider-row-label">Rent</span><div class="provider-logos">${logos(data.rent)}</div></div>`);
      if (data.buy?.length) sections.push(`<div class="provider-row"><span class="provider-row-label">Buy</span><div class="provider-logos">${logos(data.buy)}</div></div>`);

      if (!sections.length) {
        clear();
        return;
      }

      container.innerHTML = `
        <div class="modal-providers-header">
          <span>&#128250; Where to watch</span>
          <select class="provider-region-select" id="provider-region-select">
            ${Object.keys(providers).map(code =>
              `<option value="${code}"${code === region ? ' selected' : ''}>${code}</option>`
            ).join('')}
          </select>
        </div>
        ${sections.join('')}
        ${data.link ? `<a class="provider-link" href="${esc(data.link)}" target="_blank" rel="noopener noreferrer">View on JustWatch &#8599;</a>` : ''}
      `;
      container.classList.remove('hidden');

      container.querySelector('#provider-region-select')?.addEventListener('change', event => {
        localStorage.setItem(regionStorageKey, event.target.value);
        scheduleSavePrefs();
        render(providers);
      });
    }

    async function loadForEntry(entry) {
      if (!entry?.tmdbId) return;
      const fetchType = sourceModel.detailsFetchTypeForEntry
        ? sourceModel.detailsFetchTypeForEntry(entry)
        : (entry.mediaType === 'anime' ? 'tv' : (entry.mediaType || 'movie'));
      const cacheKey = `${fetchType}:${entry.tmdbId}`;
      if (cache.has(cacheKey)) {
        render(cache.get(cacheKey));
        return;
      }
      try {
        const details = await fetchDetails(entry.tmdbId, fetchType);
        cache.set(cacheKey, details.providers);
        render(details.providers);
      } catch {
        // Providers are supplementary; the edit modal should still open.
      }
    }

    return { clear, render, loadForEntry };
  }

  function createSubmitController(options = {}) {
    const {
      fields = {},
      epWatchedInput,
      epTotalInput,
      modalModel,
      seasons,
      rewatch,
      externalPosterUrl = value => value || '',
    } = options;

    function fieldValue(name, trim = false) {
      const value = fields[name]?.value || '';
      return trim ? value.trim() : value;
    }

    function readFields(titleOverride = '') {
      return {
        title: titleOverride || fieldValue('title', true),
        year: fieldValue('year'),
        genre: fieldValue('genre'),
        director: fieldValue('director'),
        country: fieldValue('country'),
        status: fieldValue('status'),
        notes: fieldValue('notes'),
        runtime: fieldValue('runtime'),
      };
    }

    function buildSubmission({
      mediaType = 'movie',
      editingId = null,
      existing = null,
      selection = null,
      selectedRating = 0,
    } = {}) {
      const title = fieldValue('title', true);
      if (!title) return { ok: false, reason: 'missing-title' };

      const posterUrl = selection?.poster_path
        ? externalPosterUrl(selection.poster_path)
        : existing?.posterUrl || '';
      const selected = modalModel.selectedExternal(selection);
      const isShow = mediaType === 'tv' || mediaType === 'anime';

      if (isShow && seasons?.hasSeasons()) seasons.captureAndNormalise();

      const progress = modalModel.episodeState({
        mediaType,
        seasons: seasons?.seasons() || [],
        totalInput: epTotalInput?.value || '',
        watchedInput: epWatchedInput?.value || '',
      });

      const data = modalModel.entryPayload({
        fields: readFields(title),
        mediaType,
        progress,
        selectedRating,
        editingWatchCount: rewatch?.count() || 0,
        existing,
        posterUrl,
        selection,
        selectedSource: selected.selectedSource,
        selectedExternalId: selected.selectedExternalId,
      });

      return {
        ok: true,
        title,
        data,
        duplicateProbe: editingId ? null : {
          title,
          year: fieldValue('year') || selection?.year || '',
          mediaType,
          source: selected.selectedSource || 'manual',
          externalId: selected.selectedExternalId,
        },
      };
    }

    return { buildSubmission };
  }

  function createSearchController(options = {}) {
    const {
      query,
      dropdown,
      selected,
      posterThumb,
      selectedTitle,
      selectedYear,
      clearBtn,
      searching,
      error,
      fields = {},
      modalModel,
      getMediaType = () => 'movie',
      searchExternalTitle,
      fetchExternalDetails,
      externalPosterUrl = value => value || '',
      populateYearSelect = () => {},
      esc = value => String(value ?? ''),
      onSelection = () => {},
      onClear = () => {},
      logError = () => {},
      debounceMs = 400,
    } = options;

    let searchTimer = null;

    function hideDropdown() {
      if (!dropdown) return;
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
    }

    function showStatus(message) {
      if (!searching) return;
      searching.textContent = message;
      searching.classList.remove('hidden');
    }

    function hideStatus() {
      searching?.classList.add('hidden');
    }

    function showError(message) {
      if (!error) return;
      error.textContent = message;
      error.classList.remove('hidden');
    }

    function hideError() {
      error?.classList.add('hidden');
    }

    function renderDropdown(results = []) {
      if (!dropdown) return;
      if (!results.length) {
        dropdown.innerHTML = '<div class="tmdb-no-results">No results found</div>';
        dropdown.classList.remove('hidden');
        return;
      }
      const mediaType = getMediaType();
      dropdown.innerHTML = results.map(result => `
        <div class="tmdb-result" data-id="${result.id}" data-source="${result.source || 'tmdb'}" data-media-type="${result.media_type}">
          <img class="tmdb-result-poster"
               src="${externalPosterUrl(result.poster_path)}"
               alt="" onerror="this.style.display='none'" />
          <div class="tmdb-result-info">
            <span class="tmdb-result-title">${esc(result.title)}</span>
            <span class="tmdb-result-year">${result.year || '&mdash;'}${mediaType === 'anime' ? ` &middot; ${esc(result.media_type)}` : ''}</span>
          </div>
        </div>
      `).join('');
      dropdown.querySelectorAll('.tmdb-result').forEach((row, index) => {
        row._result = results[index];
      });
      dropdown.classList.remove('hidden');
    }

    async function runSearch(searchTerm) {
      const mediaType = getMediaType();
      try {
        const data = await searchExternalTitle(searchTerm, mediaType);
        hideStatus();
        renderDropdown(data.results || []);
      } catch (err) {
        logError('search.external', err, { query: searchTerm, type: mediaType }, 'warn');
        hideStatus();
        showError(err.message);
      }
    }

    async function handleDropdownClick(event) {
      const row = event.target.closest('.tmdb-result');
      if (!row) return;
      const id = row.dataset.id;
      const rowData = row._result || null;
      const mediaType = getMediaType();
      const fetchType = modalModel.detailsFetchType(mediaType, {
        source: row.dataset.source,
        mediaType: row.dataset.mediaType,
      });
      hideDropdown();
      showStatus('Loading details...');
      if (query) query.value = '';

      try {
        const details = await fetchExternalDetails(id, fetchType, rowData);
        hideStatus();
        onSelection(details);
      } catch (err) {
        logError('metadata.selection', err, { id, type: fetchType }, 'warn');
        hideStatus();
        showError(err.message);
      }
    }

    function applySelection(details = {}) {
      if (posterThumb) {
        posterThumb.src = externalPosterUrl(details.poster_path);
        posterThumb.style.display = details.poster_path ? 'block' : 'none';
      }
      if (selectedTitle) selectedTitle.textContent = details.title || '';
      if (selectedYear) {
        selectedYear.textContent = [
          details.year,
          details.source === 'anilist' ? 'AniList' : details.source === 'tvmaze' ? 'TVmaze' : 'TMDB',
        ].filter(Boolean).join(' · ');
      }
      selected?.classList.remove('hidden');
      if (query) {
        query.disabled = true;
        query.value = '';
      }

      if (fields.title) fields.title.value = details.title || '';
      populateYearSelect(details.year || '');
      if (fields.year) fields.year.value = details.year || '';
      if (fields.genre) fields.genre.value = details.genre || '';
      if (fields.director) fields.director.value = details.director || '';
      if (fields.country) fields.country.value = details.country || '';
      if (fields.runtime && details.runtime) fields.runtime.value = details.runtime;
      if (fields.notes && !fields.notes.value) fields.notes.value = details.overview || '';
    }

    function reset() {
      selected?.classList.add('hidden');
      if (query) {
        query.disabled = false;
        query.value = '';
      }
      hideDropdown();
      hideError();
      hideStatus();
    }

    function clearFields() {
      ['title', 'year', 'genre', 'director', 'country', 'runtime'].forEach(name => {
        if (fields[name]) fields[name].value = '';
      });
    }

    query?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const searchTerm = query.value.trim();
      if (!searchTerm) {
        hideDropdown();
        return;
      }
      showStatus('Searching...');
      hideError();
      searchTimer = setTimeout(() => runSearch(searchTerm), debounceMs);
    });

    dropdown?.addEventListener('click', handleDropdownClick);

    clearBtn?.addEventListener('click', () => {
      reset();
      clearFields();
      onClear();
      query?.focus();
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('#tmdb-search-wrap')) hideDropdown();
    });

    return { applySelection, reset, hideDropdown };
  }

  root.modalController = {
    createSeasonController,
    createRewatchController,
    createProviderController,
    createSubmitController,
    createSearchController,
  };
})();
