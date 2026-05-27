(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createCloudControlsController(options = {}) {
    const {
      documentRef = document,
      syncModel,
      getSupabase = () => null,
      getStorageKey = () => '',
      getMovies = () => [],
      getOfflineMode = () => false,
      getCurrentUser = () => null,
      hasUnsyncedLocalChanges = () => false,
      loadUserData = async () => ({ ok: true }),
      saveUserData = async () => ({ ok: true }),
      signOut = async () => {},
      stopCloudPolling = () => {},
      writeLocalLibraryBackup = () => {},
      applySignOutReset = () => {},
      clearPendingSyncMarker = () => {},
      clearPendingSave = () => {},
      updateUserMenu = () => {},
      updateMutationLockUI = () => {},
      showAuthOverlay = () => {},
      showToast = () => {},
      logAppError = () => {},
    } = options;

    const reloadCloudBtn = documentRef.getElementById('reload-cloud-btn');
    const syncNowBtn = documentRef.getElementById('sync-now-btn');
    const signoutBtn = documentRef.getElementById('signout-btn');
    const userDropdown = documentRef.getElementById('user-dropdown');

    function hideUserDropdown() {
      userDropdown?.classList.add('hidden');
    }

    reloadCloudBtn?.addEventListener('click', async () => {
      const reloadPlan = syncModel.reloadFromCloudPlan({ hasLocalChanges: hasUnsyncedLocalChanges() });
      if (reloadPlan.hideUserDropdown) hideUserDropdown();
      if (reloadPlan.clearPendingSave) clearPendingSave();
      reloadCloudBtn.disabled = true;
      reloadCloudBtn.textContent = reloadPlan.button.busyText;
      try {
        if (reloadPlan.saveFirst) {
          const saveResult = await saveUserData();
          if (!saveResult?.ok) throw new Error(saveResult?.error || reloadPlan.saveError);
        }
        const result = await loadUserData(reloadPlan.loadOptions);
        if (!result?.ok) throw new Error(result?.error || reloadPlan.loadError);
        const resultPlan = syncModel.reloadFromCloudResultPlan(result);
        if (resultPlan.toast) showToast(resultPlan.toast);
      } catch (e) {
        logAppError('sync.reload', e);
        const errorToast = syncModel.manualSyncErrorToast(e);
        showToast(errorToast.message, errorToast.isError);
      }
      reloadCloudBtn.disabled = false;
      reloadCloudBtn.textContent = reloadPlan.button.idleText;
    });

    syncNowBtn?.addEventListener('click', async () => {
      const syncStartPlan = syncModel.manualSyncStartPlan({
        offlineMode: getOfflineMode(),
        hasCurrentUser: Boolean(getCurrentUser()),
      });
      if (syncStartPlan.hideUserDropdown) hideUserDropdown();
      if (!syncStartPlan.canSync) {
        showToast(syncStartPlan.toast.message, syncStartPlan.toast.isError);
        return;
      }
      syncNowBtn.disabled = true;
      syncNowBtn.textContent = syncStartPlan.button.busyText;
      if (syncStartPlan.clearPendingSave) clearPendingSave();
      try {
        const syncWorkPlan = syncModel.manualSyncWorkPlan({ hasLocalChanges: hasUnsyncedLocalChanges() });
        if (syncWorkPlan.saveFirst) {
          const saveResult = await saveUserData();
          if (!saveResult?.ok) throw new Error(saveResult?.error || syncWorkPlan.saveError);
        }
        const loadResult = await loadUserData(syncWorkPlan.loadOptions);
        if (!loadResult?.ok) throw new Error(loadResult?.error || syncWorkPlan.loadError);
        showToast(syncWorkPlan.successToast);
      } catch (e) {
        logAppError('sync.manual', e);
        const errorToast = syncModel.manualSyncErrorToast(e);
        showToast(errorToast.message, errorToast.isError);
      }
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = syncStartPlan.button.idleText;
    });

    signoutBtn?.addEventListener('click', async () => {
      try {
        if (getSupabase()) await signOut();
      } catch {}
      const signOutPlan = syncModel.signOutCleanupPlan({ storageKey: getStorageKey() });
      stopCloudPolling();
      writeLocalLibraryBackup(signOutPlan.backupReason, getMovies());
      applySignOutReset(signOutPlan.reset);
      updateMutationLockUI();
      signOutPlan.clearStorageKeys.forEach(key => localStorage.removeItem(key));
      clearPendingSyncMarker();
      hideUserDropdown();
      updateUserMenu();
      showAuthOverlay(signOutPlan.nextAuthMode);
    });

    return {
      hideUserDropdown,
    };
  }

  root.syncController = { createCloudControlsController };
})();
