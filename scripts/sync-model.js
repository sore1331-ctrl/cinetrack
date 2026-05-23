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

  root.sync = {
    hasUnsyncedLocalChanges,
    shouldSkipCloudLoad,
    didEditDuringLoad,
    shouldUseLoadedRow,
    buildSavePayload,
  };
})();
