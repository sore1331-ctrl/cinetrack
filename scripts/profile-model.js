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

  function usernameSaveStart({
    value = '',
    currentUsername = null,
  } = {}) {
    const username = String(value || '').trim();
    if (!username) return { canSave: false };
    return {
      canSave: true,
      previousUsername: currentUsername,
      optimisticUsername: username,
      updates: { username },
      closeForm: true,
      updateUserMenu: true,
    };
  }

  function usernameSaveResult({
    result = {},
    previousUsername = null,
    optimisticUsername = '',
  } = {}) {
    if (!result?.ok) {
      return {
        ok: false,
        username: previousUsername,
        updateUserMenu: true,
        toast: { message: 'Could not save username: ' + (result?.error || 'unknown error'), isError: true },
      };
    }
    return {
      ok: true,
      username: result?.data?.username || optimisticUsername,
      updateUserMenu: true,
      renderProfile: true,
      toast: { message: 'Username saved', isError: false },
    };
  }

  function sharingToggleStart({ checked = false } = {}) {
    return {
      sharingEnabled: Boolean(checked),
      storageValue: Boolean(checked),
      updates: { sharing_enabled: Boolean(checked) },
    };
  }

  function sharingToggleResult({
    result = {},
    previousSharing = false,
    optimisticSharing = false,
  } = {}) {
    if (!result?.ok) {
      return {
        ok: false,
        sharingEnabled: Boolean(previousSharing),
        checkboxChecked: Boolean(previousSharing),
        storageValue: Boolean(previousSharing),
        renderProfile: true,
        toast: { message: 'Could not update sharing: ' + (result?.error || 'unknown error'), isError: true },
      };
    }
    return {
      ok: true,
      sharingEnabled: Boolean(optimisticSharing),
      storageValue: Boolean(optimisticSharing),
      renderProfile: true,
    };
  }

  root.profile = {
    localLibraryBackups,
    formatBackupDate,
    backupImpactLabel,
    usernameSaveStart,
    usernameSaveResult,
    sharingToggleStart,
    sharingToggleResult,
  };
})();
