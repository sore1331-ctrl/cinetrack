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

  root.sync = {
    hasUnsyncedLocalChanges,
    shouldSkipCloudLoad,
    didEditDuringLoad,
    shouldUseLoadedRow,
    buildSavePayload,
    normaliseUserDataRow,
    assertApiLoadResponse,
    assertApiSaveResponse,
  };
})();
