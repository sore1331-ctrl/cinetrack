(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function hasUnsyncedLocalChanges({
    cloudSyncTimer = null,
    localChangeVersion = 0,
    lastSavedLocalVersion = 0,
    pendingSync = null,
  } = {}) {
    return Boolean(cloudSyncTimer) || localChangeVersion > lastSavedLocalVersion || Boolean(pendingSync);
  }

  function shouldSkipCloudLoad({
    force = false,
    hasLocalChanges = false,
  } = {}) {
    return !force && hasLocalChanges;
  }

  function didEditDuringLoad({
    initialChangeVersion = 0,
    currentChangeVersion = 0,
    initialTimerSet = false,
    currentTimerSet = false,
  } = {}) {
    return currentChangeVersion > initialChangeVersion || (Boolean(currentTimerSet) && !initialTimerSet);
  }

  function shouldUseLoadedRow({
    row = null,
    onlyIfNewer = false,
    lastCloudUpdatedAt = null,
  } = {}) {
    if (!onlyIfNewer) return true;
    if (!row?.updated_at) return false;
    return !lastCloudUpdatedAt || row.updated_at > lastCloudUpdatedAt;
  }

  function buildSavePayload({
    userId,
    movies,
    updatedAt,
    lastCloudUpdatedAt = null,
    lastCloudVersion = 0,
  }) {
    return {
      userId,
      movies,
      updated_at: updatedAt || new Date().toISOString(),
      base_updated_at: lastCloudUpdatedAt,
      base_version: lastCloudVersion,
    };
  }

  function normaliseUserDataRow(row) {
    return {
      movies: Array.isArray(row?.movies) ? row.movies : [],
      updated_at: row?.updated_at || null,
      version: Number(row?.version || 0),
      item_count: Array.isArray(row?.movies) ? row.movies.length : Number(row?.item_count || 0),
      exists: Boolean(row?.exists || row),
    };
  }

  function assertApiLoadResponse(response, row) {
    if (!response?.ok) throw new Error(row?.error || `User data load failed (${response?.status || 'unknown'})`);
    return normaliseUserDataRow(row);
  }

  function assertApiSaveResponse(response, result, payload) {
    if (!response?.ok || !result?.ok) {
      throw new Error(result?.error || `User data save failed (${response?.status || 'unknown'})`);
    }
    if (result && result.item_count == null) result.item_count = Array.isArray(payload?.movies) ? payload.movies.length : 0;
    return result;
  }

  function cloudRefreshDecision({
    hasClient = false,
    hasUser = false,
    offlineMode = false,
    documentHidden = false,
    hasLocalChanges = false,
    inFlight = false,
    now = Date.now(),
    lastAttempt = 0,
    minInterval = 2500,
    reason = 'entry',
  } = {}) {
    if (!hasClient || !hasUser || offlineMode || documentHidden || hasLocalChanges) {
      return { shouldRefresh: false, delay: 0, nextLastAttempt: lastAttempt };
    }
    if (inFlight || Number(now || 0) - Number(lastAttempt || 0) < minInterval) {
      return { shouldRefresh: false, delay: 0, nextLastAttempt: lastAttempt };
    }
    return {
      shouldRefresh: true,
      delay: reason === 'pageshow' ? 250 : 0,
      nextLastAttempt: Number(now || 0),
    };
  }

  function signInSyncToast({ previousCount = 0, newCount = 0, threshold = 2 } = {}) {
    const delta = Number(newCount || 0) - Number(previousCount || 0);
    if (delta >= threshold) {
      return `Synced — ${delta} new title${delta === 1 ? '' : 's'} from another device`;
    }
    if (delta <= -threshold) {
      const removed = Math.abs(delta);
      return `Synced — ${removed} title${removed === 1 ? '' : 's'} removed since this device last synced`;
    }
    return '';
  }

  function signInLoadPlan({ hasLocalChanges = false } = {}) {
    return hasLocalChanges
      ? { saveFirst: true, loadOptions: { onlyIfNewer: true }, savingMessage: 'Saving local changes before cloud load' }
      : { saveFirst: false, loadOptions: {}, savingMessage: '' };
  }

  function failedSaveLoadResult(saved = {}) {
    return { ok: false, error: saved?.error || 'Cloud save failed' };
  }

  function signOutCleanupPlan({
    storageKey = '',
    sharingKey = 'cinetrack_sharing',
  } = {}) {
    return {
      backupReason: 'before-sign-out-clear',
      reset: {
        currentUser: null,
        currentUsername: null,
        sharingEnabled: false,
        initialLibrarySyncPending: false,
        lastCloudUpdatedAt: null,
        lastCloudItemCount: null,
        localChangeVersion: 0,
        lastSavedLocalVersion: 0,
      },
      clearStorageKeys: [storageKey, sharingKey].filter(Boolean),
      nextAuthMode: 'form',
    };
  }

  function authStateChangePlan({
    event = '',
    session = null,
    currentAccessToken = '',
  } = {}) {
    const nextAccessToken = session?.access_token || currentAccessToken || '';
    if (event === 'SIGNED_IN' && session?.user) {
      return {
        type: 'sign-in',
        currentAccessToken: nextAccessToken,
        user: session.user,
        accessToken: session.access_token || '',
      };
    }
    if (event === 'SIGNED_OUT') {
      return {
        type: 'sign-out',
        currentAccessToken: '',
        reset: {
          userDataFetched: false,
          currentUser: null,
          initialLibrarySyncPending: false,
        },
        stopCloudPolling: true,
        updateMutationLock: true,
        updateUserMenu: true,
      };
    }
    return { type: 'ignore', currentAccessToken: nextAccessToken };
  }

  function initialSessionPlan({ session = null } = {}) {
    if (session?.user) {
      return {
        type: 'sign-in',
        user: session.user,
        accessToken: session.access_token || '',
      };
    }
    return { type: 'show-auth', authMode: 'form' };
  }

  function initialSessionErrorPlan({
    hasCurrentUser = false,
    hasMovies = false,
    errorMessage = '',
  } = {}) {
    if (hasCurrentUser) {
      return {
        type: 'keep-current-user',
        hideAuthOverlay: true,
        updateCountryDropdown: true,
        render: true,
        startCloudPolling: true,
      };
    }
    return {
      type: 'local-mode',
      offlineMode: true,
      hideAuthOverlay: true,
      syncState: { state: 'error', message: errorMessage || 'Session load failed' },
      seedData: !hasMovies,
      updateCountryDropdown: true,
      render: true,
      toast: { message: 'Cloud session timed out. Opened in local mode.', isError: true },
    };
  }

  function reloadFromCloudPlan() {
    return {
      hideUserDropdown: true,
      clearPendingSave: true,
      button: {
        busyText: '\u21bb Loading\u2026',
        idleText: '\u21bb Reload from cloud',
      },
      loadOptions: { force: true },
      successToast: 'Reloaded from cloud \u2713',
    };
  }

  function reloadFromCloudResultPlan(result = {}) {
    return result?.ok ? { toast: reloadFromCloudPlan().successToast } : { toast: '' };
  }

  function manualSyncStartPlan({
    offlineMode = false,
    hasCurrentUser = false,
  } = {}) {
    if (offlineMode || !hasCurrentUser) {
      return {
        canSync: false,
        hideUserDropdown: true,
        toast: { message: 'Sync unavailable in offline mode.', isError: true },
      };
    }
    return {
      canSync: true,
      hideUserDropdown: true,
      clearPendingSave: true,
      button: {
        busyText: '\u21bb Syncing\u2026',
        idleText: '\u21bb Sync now',
      },
    };
  }

  function manualSyncWorkPlan({ hasLocalChanges = false } = {}) {
    return {
      saveFirst: Boolean(hasLocalChanges),
      loadOptions: { force: true },
      saveError: 'Cloud save failed',
      loadError: 'Cloud reload failed',
      successToast: 'Synced \u2713',
    };
  }

  function manualSyncErrorToast(error = {}) {
    return { message: 'Sync failed: ' + (error?.message || 'unknown error'), isError: true };
  }

  root.sync = {
    hasUnsyncedLocalChanges,
    shouldSkipCloudLoad,
    didEditDuringLoad,
    shouldUseLoadedRow,
    buildSavePayload,
    normaliseUserDataRow,
    assertApiLoadResponse,
    assertApiSaveResponse,
    cloudRefreshDecision,
    signInSyncToast,
    signInLoadPlan,
    failedSaveLoadResult,
    signOutCleanupPlan,
    authStateChangePlan,
    initialSessionPlan,
    initialSessionErrorPlan,
    reloadFromCloudPlan,
    reloadFromCloudResultPlan,
    manualSyncStartPlan,
    manualSyncWorkPlan,
    manualSyncErrorToast,
  };
})();
