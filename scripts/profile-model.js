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

  function profileLoadLocalPlan({
    localUsername = null,
    currentUsername = null,
  } = {}) {
    if (localUsername && !currentUsername) {
      return { apply: true, username: localUsername, updateUserMenu: true };
    }
    return { apply: false };
  }

  function profileLoadDataPlan({
    data = null,
    localUsername = null,
  } = {}) {
    if (!data) return { apply: false, updateUserMenu: true, renderProfile: true };
    return {
      apply: true,
      username: data.username || localUsername || null,
      sharingEnabled: Boolean(data.sharing_enabled),
      sharingStorageValue: Boolean(data.sharing_enabled),
      updateUserMenu: true,
      renderProfile: true,
    };
  }

  function profileSaveApplyPlan({
    updates = {},
    data = null,
  } = {}) {
    const plan = {};
    if (Object.prototype.hasOwnProperty.call(updates, 'username')) {
      plan.username = data?.username || updates.username || null;
      plan.storeUsername = true;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'sharing_enabled') && data) {
      plan.sharingEnabled = Boolean(data.sharing_enabled);
      plan.sharingStorageValue = Boolean(data.sharing_enabled);
      plan.storeSharing = true;
    }
    return plan;
  }

  function isMissingPreferencesColumn(error = {}) {
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('preferences') || msg.includes('column') || error?.code === 'PGRST204' || error?.code === '42703';
  }

  function preferencesApplyPlan({
    prefs = null,
    syncKeys = [],
    calendarDailyRefreshKey = '',
  } = {}) {
    if (!prefs || typeof prefs !== 'object') return { apply: false };
    const storageWrites = [];
    syncKeys.forEach(key => {
      if (prefs[key] != null) storageWrites.push([key, String(prefs[key])]);
    });
    if (calendarDailyRefreshKey && prefs[calendarDailyRefreshKey] != null) {
      storageWrites.push([calendarDailyRefreshKey, String(prefs[calendarDailyRefreshKey])]);
    }
    return {
      apply: true,
      storageWrites,
      applyAppearance: true,
      refreshCurrentView: true,
    };
  }

  function preferenceSaveErrorPlan({
    error = {},
    alreadyWarned = false,
  } = {}) {
    if (isMissingPreferencesColumn(error) && !alreadyWarned) {
      return {
        warn: true,
        nextWarned: true,
        toast: { message: 'Cross-device sync needs a one-line SQL update \u2014 see console.', isError: true },
      };
    }
    return { warn: false, nextWarned: alreadyWarned };
  }

  root.profile = {
    localLibraryBackups,
    formatBackupDate,
    backupImpactLabel,
    usernameSaveStart,
    usernameSaveResult,
    sharingToggleStart,
    sharingToggleResult,
    profileLoadLocalPlan,
    profileLoadDataPlan,
    profileSaveApplyPlan,
    isMissingPreferencesColumn,
    preferencesApplyPlan,
    preferenceSaveErrorPlan,
  };
})();
