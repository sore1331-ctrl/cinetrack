(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function localLibraryBackups(storageModel, key) {
    if (!storageModel?.readArray || !key) return [];
    return storageModel.readArray(key)
      .filter(backup => backup && Array.isArray(backup.movies));
  }

  function formatBackupDate(value, options = {}) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString(options.locale || [], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(options.dateTimeFormat || {}),
    });
  }

  function backupImpactLabel(compare) {
    if (!compare?.hasIssues) return 'No obvious loss detected';
    const parts = [];
    if (compare.missing?.length) parts.push(`${compare.missing.length} missing`);
    if (compare.progressRegressed?.length) parts.push(`${compare.progressRegressed.length} progress`);
    if (compare.statusRegressed?.length) parts.push(`${compare.statusRegressed.length} status`);
    return parts.join(' / ');
  }

  root.profile = {
    localLibraryBackups,
    formatBackupDate,
    backupImpactLabel,
  };
})();
