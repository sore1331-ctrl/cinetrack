(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createBulkSelectionController(options = {}) {
    const {
      grid,
      bulkBar,
      bulkCount,
      bulkSelectAll,
      bulkDeselect,
      bulkDelete,
      bulkMarkWatched,
      bulkMarkInProgress,
      bulkMarkWatchlist,
      filtered = () => [],
      changeLibraryStatus,
      removeLibraryEntries,
      save,
      updateCountryDropdown,
      render,
      confirm: confirmDialog = window.confirm.bind(window),
      pruneSelection,
    } = options;
    let selectedIds = new Set();

    function updateBar() {
      const count = selectedIds.size;
      bulkBar?.classList.toggle('hidden', count === 0);
      if (bulkCount) bulkCount.textContent = `${count} selected`;
    }

    function clear() {
      selectedIds.clear();
      updateBar();
    }

    function has(id) {
      return selectedIds.has(id);
    }

    function pruneToVisible(visibleIds) {
      selectedIds = typeof pruneSelection === 'function'
        ? pruneSelection(selectedIds, visibleIds)
        : new Set([...selectedIds].filter(id => visibleIds.has(id)));
      updateBar();
    }

    grid?.addEventListener('change', e => {
      const id = e.target.dataset.check;
      if (!id) return;
      if (e.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      e.target.closest('.movie-card')?.classList.toggle('selected', e.target.checked);
      updateBar();
    });

    bulkSelectAll?.addEventListener('click', () => {
      filtered().forEach(entry => selectedIds.add(entry.id));
      render?.();
    });

    bulkDeselect?.addEventListener('click', () => {
      selectedIds.clear();
      render?.();
    });

    function markSelected(status) {
      changeLibraryStatus?.(selectedIds, status);
      selectedIds.clear();
      save?.();
      render?.();
    }

    bulkMarkWatched?.addEventListener('click', () => markSelected('watched'));
    bulkMarkInProgress?.addEventListener('click', () => markSelected('in_progress'));
    bulkMarkWatchlist?.addEventListener('click', () => markSelected('watchlist'));

    bulkDelete?.addEventListener('click', () => {
      const count = selectedIds.size;
      if (!confirmDialog(`Delete ${count} title${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
      removeLibraryEntries?.(selectedIds);
      selectedIds.clear();
      save?.();
      updateCountryDropdown?.();
      render?.();
    });

    return {
      clear,
      has,
      pruneToVisible,
      updateBar,
    };
  }

  root.bulkController = { createBulkSelectionController };
})();
