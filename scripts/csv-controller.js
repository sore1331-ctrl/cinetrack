(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createCsvImportController(options = {}) {
    const {
      input,
      progressContainer,
      progressBar,
      progressText,
      cancelButton,
      csvModel,
      processRow,
      afterImport = () => {},
      showToast = () => {},
    } = options;

    let cancelled = false;

    function showProgress() {
      cancelled = false;
      progressContainer?.classList.remove('hidden');
      if (progressBar) progressBar.style.width = '0%';
    }

    function hideProgress() {
      if (progressBar) progressBar.style.width = '100%';
      progressContainer?.classList.add('hidden');
    }

    async function importRows(rows = []) {
      showProgress();
      const summary = { imported: 0, skipped: 0, unmatched: 0 };
      const total = rows.length;

      for (let index = 0; index < total; index++) {
        if (cancelled) break;
        const row = rows[index];
        const title = row.title?.trim();
        if (!title) {
          summary.skipped++;
          continue;
        }
        if (progressText) progressText.textContent = `Matching "${title}" (${index + 1} of ${total})...`;
        if (progressBar) progressBar.style.width = `${Math.round((index / total) * 100)}%`;

        const result = await processRow(row, { title });
        if (result?.imported) summary.imported++;
        if (result?.skipped) summary.skipped++;
        if (result?.unmatched) summary.unmatched++;
      }

      hideProgress();
      afterImport();
      const parts = [`Imported ${summary.imported} title${summary.imported !== 1 ? 's' : ''}`];
      if (summary.skipped) parts.push(`${summary.skipped} skipped`);
      if (summary.unmatched) parts.push(`${summary.unmatched} not on TMDB`);
      if (cancelled) parts.push('cancelled');
      showToast(parts.join(' · '));
    }

    function readFile(file) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const rows = csvModel.parse(event.target.result);
          if (!rows.length) {
            showToast('CSV appears empty or has no valid rows.', true);
            return;
          }
          importRows(rows);
        } catch {
          showToast('Failed to parse CSV. Check the file format.', true);
        }
      };
      reader.readAsText(file);
    }

    cancelButton?.addEventListener('click', () => {
      cancelled = true;
    });

    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      input.value = '';
      readFile(file);
    });

    return {
      importRows,
      cancel: () => { cancelled = true; },
      isCancelled: () => cancelled,
    };
  }

  root.csvController = { createCsvImportController };
})();
