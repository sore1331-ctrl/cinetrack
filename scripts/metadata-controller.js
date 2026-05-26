(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createBulkMetadataRefreshController(options = {}) {
    const {
      button,
      progressContainer,
      progressBar,
      progressText,
      cancelButton,
      userDropdown,
      getTargets = () => [],
      refreshEntry,
      libraryModel,
      save,
      updateCountryDropdown,
      render,
      showToast = () => {},
    } = options;

    let cancelled = false;

    function showProgress() {
      progressContainer?.classList.remove('hidden');
      if (progressBar) progressBar.style.width = '0%';
    }

    function hideProgress() {
      if (progressBar) progressBar.style.width = '100%';
      progressContainer?.classList.add('hidden');
    }

    button?.addEventListener('click', async () => {
      userDropdown?.classList.add('hidden');
      const targets = getTargets();
      if (!targets.length) {
        showToast('No source-linked titles to refresh.');
        return;
      }

      cancelled = false;
      showProgress();
      const refreshState = libraryModel.bulkMetadataRefreshState();

      for (let index = 0; index < targets.length; index++) {
        if (cancelled) break;
        const entry = targets[index];
        if (progressText) progressText.textContent = `Refreshing "${entry.title}" (${index + 1} of ${targets.length})...`;
        if (progressBar) progressBar.style.width = `${Math.round((index / targets.length) * 100)}%`;
        try {
          const result = await refreshEntry(entry);
          libraryModel.recordBulkMetadataRefresh(refreshState, {
            demoted: result?.demoted,
            title: entry.title,
          });
        } catch {
          libraryModel.recordBulkMetadataRefresh(refreshState, { failed: true });
        }
      }

      hideProgress();
      save?.();
      updateCountryDropdown?.();
      render?.();
      showToast(libraryModel.bulkMetadataRefreshSummary(refreshState, { cancelled }));
    });

    cancelButton?.addEventListener('click', () => {
      cancelled = true;
    });

    return {
      cancel: () => { cancelled = true; },
      isCancelled: () => cancelled,
    };
  }

  root.metadataController = { createBulkMetadataRefreshController };
})();
