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

  root.modalController = { createSeasonController };
})();
