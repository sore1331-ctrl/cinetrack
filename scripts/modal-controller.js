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

  root.modalController = {
    createSeasonController,
    createRewatchController,
    createProviderController,
  };
})();
