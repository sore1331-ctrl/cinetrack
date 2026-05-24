// ── Theme ───────────────────────────────────────────────
const CINETRACK_BUILD = 'selection-filter-state-20260510-1';
console.info(`[CineTrack] Build ${CINETRACK_BUILD}`);

const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  themeToggle.dataset.theme = theme;
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to night mode' : 'Switch to day mode');
  themeToggle.title = theme === 'light' ? 'Switch to night mode' : 'Switch to day mode';
  document.querySelectorAll('.theme-aware-img').forEach(img => {
    const nextSrc = theme === 'light' ? img.dataset.lightSrc : img.dataset.darkSrc;
    if (nextSrc && img.getAttribute('src') !== nextSrc) img.setAttribute('src', nextSrc);
  });
}

const savedTheme = localStorage.getItem('cinetrack_theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
  localStorage.removeItem('cinetrack_theme_preset');
  localStorage.setItem('cinetrack_theme', next);
  applyTheme(next);
  if (typeof scheduleSavePrefs === 'function') scheduleSavePrefs();
});

// ── Background preset ───────────────────────────────────
const BG_PRESETS = [
  'default',
  'aurora',
  'sunset',
  'ocean',
  'midnight',
  'forest',
  'rose',
  'ember',
  'cyber',
  'lavender',
  'cinema',
  'mono',
];
function applyBgPreset(name) {
  const safe = BG_PRESETS.includes(name) ? name : 'default';
  if (safe === 'default') document.documentElement.removeAttribute('data-bg');
  else document.documentElement.setAttribute('data-bg', safe);
}
applyBgPreset(localStorage.getItem('cinetrack_bg') || 'default');

// ── Appearance: glass / accent / orbs / density / motion ─
const GLASS_PRESETS   = ['subtle', 'medium', 'vivid', 'ultra'];
const GLASS_LABELS    = { subtle: 'Subtle', medium: 'Balanced', vivid: 'Strong', ultra: 'Ultra' };
const ACCENT_PRESETS  = ['default', 'blue', 'green', 'purple', 'amber', 'cyan'];
const ORBS_OPTIONS    = ['static', 'animated'];
const DENSITY_OPTIONS = ['comfortable', 'compact'];
const MOTION_OPTIONS  = ['full', 'reduced'];
const POSTERS_OPTIONS = ['shown', 'hidden'];
const NOTIF_OPTIONS   = ['off', 'on'];
const THEME_PRESETS = {
  cinema:    { label: 'Cinema',    theme: 'dark',  bg: 'default',  glass: 'medium', accent: 'default', orbs: 'static',   density: 'comfortable', motion: 'full' },
  neon:      { label: 'Neon',      theme: 'dark',  bg: 'cyber',    glass: 'vivid',  accent: 'cyan',    orbs: 'animated', density: 'comfortable', motion: 'full' },
  minimal:   { label: 'Minimal',   theme: 'dark',  bg: 'mono',     glass: 'subtle', accent: 'default', orbs: 'static',   density: 'compact',     motion: 'reduced' },
  midnight:  { label: 'Midnight',  theme: 'dark',  bg: 'midnight', glass: 'medium', accent: 'purple',  orbs: 'static',   density: 'comfortable', motion: 'full' },
  softLight: { label: 'Soft Light', theme: 'light', bg: 'lavender', glass: 'medium', accent: 'blue',    orbs: 'static',   density: 'comfortable', motion: 'reduced' },
};

function applyAttrPreset(attr, value, defaultValue, allowed) {
  const safe = allowed.includes(value) ? value : defaultValue;
  if (safe === defaultValue) document.documentElement.removeAttribute(attr);
  else document.documentElement.setAttribute(attr, safe);
}
function applyGlass(v)   { applyAttrPreset('data-glass',   v, 'vivid',       GLASS_PRESETS); }
function applyAccent(v)  { applyAttrPreset('data-accent',  v, 'default',     ACCENT_PRESETS); }
function applyOrbs(v)    { applyAttrPreset('data-orbs',    v, 'static',      ORBS_OPTIONS); }
function applyDensity(v) { applyAttrPreset('data-density', v, 'comfortable', DENSITY_OPTIONS); }
function applyMotion(v)  { applyAttrPreset('data-motion',  v, 'full',        MOTION_OPTIONS); }
function applyPosters(v) { applyAttrPreset('data-posters', v, 'shown',       POSTERS_OPTIONS); }
function applyEpisodeNotif(v) { applyAttrPreset('data-notif', v, 'off', NOTIF_OPTIONS); }
function applyThemePreset(name) {
  const preset = THEME_PRESETS[name];
  if (!preset) return false;
  localStorage.setItem('cinetrack_theme_preset', name);
  localStorage.setItem('cinetrack_theme', preset.theme);
  localStorage.setItem('cinetrack_bg', preset.bg);
  localStorage.setItem('cinetrack_glass', preset.glass);
  localStorage.setItem('cinetrack_accent', preset.accent);
  localStorage.setItem('cinetrack_orbs', preset.orbs);
  localStorage.setItem('cinetrack_density', preset.density);
  localStorage.setItem('cinetrack_motion', preset.motion);
  applyAllAppearance();
  return true;
}

applyGlass(localStorage.getItem('cinetrack_glass')   || 'medium');
applyAccent(localStorage.getItem('cinetrack_accent') || 'default');
applyOrbs(localStorage.getItem('cinetrack_orbs')     || 'static');
applyDensity(localStorage.getItem('cinetrack_density') || 'comfortable');
applyMotion(localStorage.getItem('cinetrack_motion') || 'full');
applyPosters(localStorage.getItem('cinetrack_posters') || 'shown');
applyEpisodeNotif(localStorage.getItem('cinetrack_notif') || 'off');

// ── Cross-device preference sync ────────────────────────
// Keys that should follow the user across devices. Saved to
// profiles.preferences (jsonb) on change; read on sign-in and
// applied to localStorage + the live UI.
const SYNC_PREF_KEYS = [
  'cinetrack_theme',
  'cinetrack_theme_preset',
  'cinetrack_bg',
  'cinetrack_glass',
  'cinetrack_accent',
  'cinetrack_orbs',
  'cinetrack_density',
  'cinetrack_motion',
  'cinetrack_posters',
  'cinetrack_notif',
  'cinetrack_appearance_open',
  'cinetrack_provider_region',
  'cinetrack_grid',
  'cinetrack_pagesize',
  'cinetrack_sort',
  'cinetrack_calendar_mode',
  'cinetrack_discover_region',
  'cinetrack_discover_type',
  'cinetrack_time_spent_format',
];
const CALENDAR_DAILY_REFRESH_PREF = 'cinetrack_calendar_last_daily_refresh';
let prefSaveTimer = null;
let prefMigrationWarned = false;

async function readProfilePreferences() {
  if (!sb || !currentUser || offlineMode) return {};
  const { data, error } = await sb.from('profiles')
    .select('preferences')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return data?.preferences && typeof data.preferences === 'object' ? data.preferences : {};
}

async function mergeProfilePreferences(patch) {
  if (!sb || !currentUser || offlineMode) return false;
  const existing = await readProfilePreferences();
  const { error } = await sb.from('profiles').upsert({
    user_id: currentUser.id,
    preferences: { ...existing, ...patch },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return true;
}

function scheduleSavePrefs() {
  clearTimeout(prefSaveTimer);
  prefSaveTimer = setTimeout(savePreferences, 800);
}

async function savePreferences() {
  if (!sb || !currentUser || offlineMode) return;
  const prefs = {};
  for (const k of SYNC_PREF_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) prefs[k] = v;
  }
  try {
    await mergeProfilePreferences(prefs);
  } catch (e) {
    const msg = (e?.message || '').toLowerCase();
    const looksLikeMissingColumn = msg.includes('preferences') ||
      msg.includes('column') || e?.code === 'PGRST204' || e?.code === '42703';
    if (looksLikeMissingColumn && !prefMigrationWarned) {
      prefMigrationWarned = true;
      console.warn(
        "[cinetrack] To sync appearance settings across devices, run this in your Supabase SQL editor:\n" +
        "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;"
      );
      try { showToast("Cross-device sync needs a one-line SQL update — see console.", true); } catch {}
    }
  }
}

async function loadPreferences() {
  if (!sb || !currentUser || offlineMode) return;
  try {
    let prefs;
    try {
      prefs = await readProfilePreferences();
    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('preferences') || msg.includes('column') || error?.code === '42703') {
        // Column missing — first-time setup. Silent here; will warn on save.
        return;
      }
      throw error;
    }
    if (!prefs || typeof prefs !== 'object') return;

    for (const k of SYNC_PREF_KEYS) {
      if (prefs[k] != null) localStorage.setItem(k, String(prefs[k]));
    }
    if (prefs[CALENDAR_DAILY_REFRESH_PREF] != null) {
      localStorage.setItem(CALENDAR_DAILY_REFRESH_PREF, String(prefs[CALENDAR_DAILY_REFRESH_PREF]));
    }
    timeSpentFormat = localStorage.getItem('cinetrack_time_spent_format') === 'calendar' ? 'calendar' : 'runtime';
    applyAllAppearance();
    refreshCurrentView();
  } catch (e) {
    logAppError('preferences.load', e, {}, 'warn');
  }
}

function applyAllAppearance() {
  applyTheme(localStorage.getItem('cinetrack_theme') || 'dark');
  applyBgPreset(localStorage.getItem('cinetrack_bg')   || 'default');
  applyGlass(localStorage.getItem('cinetrack_glass')   || 'medium');
  applyAccent(localStorage.getItem('cinetrack_accent') || 'default');
  applyOrbs(localStorage.getItem('cinetrack_orbs')     || 'static');
  applyDensity(localStorage.getItem('cinetrack_density') || 'comfortable');
  applyMotion(localStorage.getItem('cinetrack_motion') || 'full');
  applyPosters(localStorage.getItem('cinetrack_posters') || 'shown');
  applyEpisodeNotif(localStorage.getItem('cinetrack_notif') || 'off');
}

// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'cinetrack_movies';
const LOCAL_SCHEMA_KEY = 'cinetrack_library_schema_version';
const CURRENT_LIBRARY_SCHEMA_VERSION = 1;
const PENDING_SYNC_KEY = 'cinetrack_pending_sync';
const LOCAL_BACKUPS_KEY = 'cinetrack_library_backups_v1';
const MAX_LOCAL_BACKUPS = 2;
const LOCAL_STORAGE_PRESSURE_BYTES = 4_500_000;
const LOCAL_STORAGE_TARGET_BYTES = 3_800_000;
const VOLATILE_STORAGE_KEYS = [
  'cinetrack_upcoming_cache_v2',
  'cinetrack_discover_cache_v1',
  'cinetrack_recs_cache_v2',
  'cinetrack_notif_dedupe_v1',
];
const POSTER_BASE = 'https://image.tmdb.org/t/p/w200';
const SESSION_TIMEOUT_MS = 20000;
const CLOUD_TIMEOUT_MS = 30000;
const storageModel = window.CineTrack?.storage;
const sourceModel = window.CineTrack?.sources;
const progressModel = window.CineTrack?.progress;
const recommendationModel = window.CineTrack?.recommendations;
const formatModel = window.CineTrack?.format;
const networkModel = window.CineTrack?.network;
const csvModel = window.CineTrack?.csv;
const libraryModel = window.CineTrack?.library;
const profileModel = window.CineTrack?.profile;
const calendarModel = window.CineTrack?.calendar;
const statsModel = window.CineTrack?.stats;
const cardModel = window.CineTrack?.cards;
const filterModel = window.CineTrack?.filters;
const paginationModel = window.CineTrack?.pagination;
const randomPickerModel = window.CineTrack?.randomPicker;
const modalModel = window.CineTrack?.modal;
const errorLog = window.CineTrack?.errors;
const syncModel = window.CineTrack?.sync;

function logAppError(area, error, meta = {}, severity = 'error') {
  const entry = errorLog?.record({ area, error, meta, severity });
  const method = severity === 'warn' ? 'warn' : 'error';
  console[method](`[cinetrack] ${area}:`, error?.message || error || entry?.message || 'Unknown error');
  return entry;
}

function readStoredArray(key) {
  return storageModel.readArray(key);
}

function migrateStoredLibrary() {
  return storageModel.migrateLibraryStorage({
    storageKey: STORAGE_KEY,
    schemaKey: LOCAL_SCHEMA_KEY,
    currentVersion: CURRENT_LIBRARY_SCHEMA_VERSION,
    backupKey: LOCAL_BACKUPS_KEY,
    maxBackups: MAX_LOCAL_BACKUPS,
    sanitise: entries => libraryModel.sanitiseLibrary(entries, { idFactory: genId, now: Date.now }),
  });
}

function writeLocalLibraryBackup(reason, sourceMovies = movies) {
  return storageModel.writeLibraryBackup({
    key: LOCAL_BACKUPS_KEY,
    reason,
    movies: sourceMovies,
    cloudUpdatedAt: lastCloudUpdatedAt || null,
    cloudVersion: lastCloudVersion || 0,
    maxBackups: MAX_LOCAL_BACKUPS,
  });
}

function trimLocalStoragePressure() {
  return storageModel.trimStorage?.({
    volatileKeys: VOLATILE_STORAGE_KEYS,
    backupKey: LOCAL_BACKUPS_KEY,
    maxBackups: MAX_LOCAL_BACKUPS,
    pressureBytes: LOCAL_STORAGE_PRESSURE_BYTES,
    targetBytes: LOCAL_STORAGE_TARGET_BYTES,
    storage: localStorage,
  });
}

const libraryMigration = migrateStoredLibrary();
let movies          = libraryMigration.movies;
trimLocalStoragePressure();
let activeType      = 'movie';   // 'movie' | 'tv' | 'anime'
let activeView      = 'content'; // 'content' | 'stats' | 'community'
let activeStatus    = 'all';
let searchQuery     = '';
let countryFilter   = '';
let genreFilter     = '';
let seriesStatusFilter = '';
let yearMinFilter   = '';
let yearMaxFilter   = '';
let ratingMinFilter = '';
let ratingMaxFilter = '';
let sortOrder       = localStorage.getItem('cinetrack_sort') || 'added';
let statsTypeFilter = 'all';   // 'all' | 'movie' | 'tv' | 'anime'
let gridSize        = localStorage.getItem('cinetrack_grid') || 'md';
let editingId       = null;
let pendingDeleteId = null;
let selectedRating  = 0;
let tmdbSelection   = null;
let activeMediaType = 'movie';
let searchTimer     = null;
let currentPage     = 0;
let pageSize        = filterModel.pageSize(localStorage.getItem('cinetrack_pagesize'));
let selectMode      = false;
let cloudSyncTimer  = null;
let cloudPollTimer  = null;
let cloudRefreshInFlight = false;
let lastCloudRefreshAttempt = 0;
let lastCloudUpdatedAt = null;
let lastCloudVersion = 0;
let lastCloudItemCount = null;
let localChangeVersion = 0;
let lastSavedLocalVersion = 0;
let applyingRemoteData = false;
let initialLibrarySyncPending = false;
let mutationLockToastAt = 0;

// Supabase
let sb              = null;
let currentUser     = null;
let currentAccessToken = '';
let offlineMode     = false;
let currentUsername = null;
let sharingEnabled  = localStorage.getItem('cinetrack_sharing') === 'true';

function usernameStorageKey() {
  return currentUser?.id ? `cinetrack_username_${currentUser.id}` : null;
}

function getStoredUsername() {
  const key = usernameStorageKey();
  return key ? (localStorage.getItem(key) || null) : null;
}

function setStoredUsername(value) {
  const key = usernameStorageKey();
  if (!key) return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

function currentUserDisplayName() {
  return currentUsername || currentUser?.email?.split('@')[0] || 'You';
}

function userInitial(name = currentUserDisplayName()) {
  const first = String(name || 'You').trim()[0] || 'Y';
  return first.toUpperCase();
}

// ── Sync indicator ──────────────────────────────────────
let currentSyncState = 'loading';
let currentSyncTitle = 'Loading…';

function setSyncState(state, detail = '') {
  currentSyncState = state;
  currentSyncTitle = { loading: 'Loading…', saving: 'Saving…', saved: 'Synced ✓', error: detail || 'Offline — saved locally' }[state] || '';
  const el = document.getElementById('sync-indicator');
  if (el) {
    el.dataset.state = state;
    el.title = currentSyncTitle;
  }
  updateSyncDetails();
}

function formatSyncDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function updateSyncDetails() {
  const statusEl = document.getElementById('sync-status-text');
  const countEl = document.getElementById('sync-item-count');
  const updatedEl = document.getElementById('sync-updated-at');
  if (statusEl) statusEl.textContent = currentSyncTitle || '-';
  if (countEl) countEl.textContent = lastCloudItemCount == null ? '-' : String(lastCloudItemCount);
  if (updatedEl) updatedEl.textContent = formatSyncDate(lastCloudUpdatedAt);
}

// ── Supabase init ───────────────────────────────────────
function withTimeout(promise, label = 'Operation', timeoutMs = 10000) {
  return networkModel.withTimeout(promise, label, timeoutMs);
}

async function initSupabase() {
  try {
    const r = await withTimeout(fetch('/api/config', { cache: 'no-store' }), 'Supabase config load', 15000);
    if (!r.ok) throw new Error(`Config failed (${r.status})`);
    const { supabaseUrl, supabaseKey } = await withTimeout(r.json(), 'Supabase config parse', 3000);
    if (!supabaseUrl || !supabaseKey) throw new Error();
    sb = window.supabase.createClient(supabaseUrl, supabaseKey);
    return true;
  } catch {
    return false;
  }
}

// ── Profile load / save ─────────────────────────────────
async function loadProfile() {
  if (!sb || !currentUser) return;
  const userId = currentUser.id;
  const localUsername = getStoredUsername();
  if (localUsername && !currentUsername) {
    currentUsername = localUsername;
    updateUserMenu();
  }
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('username, sharing_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!currentUser || currentUser.id !== userId) return;
    if (data) {
      currentUsername = data.username || localUsername || null;
      setStoredUsername(currentUsername);
      sharingEnabled  = !!data.sharing_enabled;
      localStorage.setItem('cinetrack_sharing', sharingEnabled);
    }
    updateUserMenu();
    if (activeView === 'profile') renderProfile();
  } catch (e) {
    logAppError('profile.load', e, {}, 'warn');
  }
}

async function saveProfile(updates) {
  if (!sb || !currentUser) return { ok: false, error: 'Not signed in' };
  try {
    const { data, error } = await sb.from('profiles')
      .upsert({
        user_id: currentUser.id,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('username, sharing_enabled')
      .single();
    if (error) throw error;
    if (Object.prototype.hasOwnProperty.call(updates, 'username')) {
      const savedUsername = data?.username || updates.username || null;
      currentUsername = savedUsername;
      setStoredUsername(savedUsername);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'sharing_enabled') && data) {
      sharingEnabled = !!data.sharing_enabled;
      localStorage.setItem('cinetrack_sharing', sharingEnabled);
    }
    return { ok: true, data };
  } catch (e) {
    logAppError('profile.save', e);
    return { ok: false, error: e?.message || String(e) };
  }
}

// ── User data load / save ───────────────────────────────
function hasUnsyncedLocalChanges() {
  return syncModel.hasUnsyncedLocalChanges({
    cloudSyncTimer,
    localChangeVersion,
    lastSavedLocalVersion,
    pendingSync: readPendingSyncMarker(),
  });
}

function readPendingSyncMarker() {
  return storageModel.readPendingSyncMarker(PENDING_SYNC_KEY);
}

function markPendingSync(reason = 'local-change') {
  if (applyingRemoteData) return;
  storageModel.markPendingSync(PENDING_SYNC_KEY, {
    reason,
    itemCount: Array.isArray(movies) ? movies.length : 0,
  });
}

function clearPendingSyncMarker() {
  storageModel.clearPendingSyncMarker(PENDING_SYNC_KEY);
}

async function getSupabaseAccessToken() {
  if (currentAccessToken) return currentAccessToken;
  const { data: { session } } = await withTimeout(sb.auth.getSession(), 'Supabase session load', SESSION_TIMEOUT_MS);
  currentAccessToken = session?.access_token || '';
  return currentAccessToken;
}

async function fetchJsonWithTimeout(url, options = {}, label = 'Request', timeoutMs = CLOUD_TIMEOUT_MS) {
  return networkModel.fetchJsonWithTimeout(url, options, label, timeoutMs);
}

async function loadUserDataDirect() {
  const { data, error } = await withTimeout(
    sb
      .from('user_data')
      .select('movies,updated_at,version')
      .eq('user_id', currentUser.id)
      .maybeSingle(),
    'Direct cloud load',
    CLOUD_TIMEOUT_MS
  );
  if (error) throw error;
  return syncModel.normaliseUserDataRow(data);
}

async function loadUserDataViaApi() {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Missing Supabase session token. Sign out and sign in again.');

  const { response: r, data: row } = await fetchJsonWithTimeout(
    '/api/user-data',
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    },
    'Cloud load'
  );
  return syncModel.assertApiLoadResponse(r, row);
}

async function saveUserDataDirect(payload) {
  throw new Error('Direct cloud save is disabled so progress cannot bypass backup and merge protection.');
}

async function saveUserDataViaApi(payload) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Missing Supabase session token. Sign out and sign in again.');

  const { response: r, data: result } = await fetchJsonWithTimeout(
    '/api/user-data',
    {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Cloud save'
  );
  return syncModel.assertApiSaveResponse(r, result, payload);
}

async function loadUserDataWithFallback() {
  try {
    return currentAccessToken ? await loadUserDataViaApi() : await loadUserDataDirect();
  } catch (firstError) {
    logAppError('sync.load.primary', firstError, { fallback: true }, 'warn');
    if (currentAccessToken) {
      currentAccessToken = '';
      try {
        return await loadUserDataDirect();
      } catch (directError) {
        logAppError('sync.load.direct_fallback', directError, { fallback: true }, 'warn');
      }
    }
    return loadUserDataViaApi();
  }
}

async function saveUserDataWithFallback(payload) {
  try {
    return await saveUserDataViaApi(payload);
  } catch (firstError) {
    logAppError('sync.save.primary', firstError, { fallback: true }, 'warn');
    currentAccessToken = '';
    return saveUserDataViaApi(payload);
  }
}

async function loadUserData(options = {}) {
  const { silent = false, onlyIfNewer = false, force = false } = options;
  if (!sb || !currentUser) return { ok: false, error: 'Not signed in' };
  if (!silent) setSyncState('loading');
  // Snapshot the change counter so we can detect edits that happen
  // during the network round-trip without false-positiving on dirty
  // state the user explicitly chose to discard (force: true).
  const initialChangeVersion = localChangeVersion;
  const initialTimerSet      = Boolean(cloudSyncTimer);
  try {
    if (syncModel.shouldSkipCloudLoad({ force, hasLocalChanges: hasUnsyncedLocalChanges() })) {
      return { ok: false, pendingLocal: true, error: 'Skipped cloud load because this device has pending local changes.' };
    }
    const row = await loadUserDataWithFallback();

    if (onlyIfNewer) {
      if (!syncModel.shouldUseLoadedRow({ row, onlyIfNewer, lastCloudUpdatedAt })) {
        if (!silent) setSyncState('saved');
        return { ok: true, changed: false };
      }
    }

    // Re-check after the await — but only block on changes that actually
    // appeared DURING the await. We compare against the snapshot taken
    // at entry so force: true (Reload from cloud) still works as intended:
    // the user explicitly chose to discard their existing pending edits,
    // and only brand-new edits made during the load should preserve.
    const newEditsMidFlight = syncModel.didEditDuringLoad({
      initialChangeVersion,
      currentChangeVersion: localChangeVersion,
      initialTimerSet,
      currentTimerSet: Boolean(cloudSyncTimer),
    });
    if (newEditsMidFlight) {
      if (!silent) setSyncState('saved');
      return { ok: false, pendingLocal: true, error: 'Skipped cloud load because new local changes appeared during the load.' };
    }

    if (row?.exists && Array.isArray(row.movies)) {
      const backedUpLocal = writeLocalLibraryBackup(force ? 'before-force-cloud-load' : 'before-cloud-load', movies);
      if (!backedUpLocal && force) {
        throw new Error('Could not create a local safety backup before applying cloud data.');
      }
      if (!backedUpLocal) {
        logAppError('backup.local', 'Local safety backup could not be written; continuing with cloud refresh.', { force }, 'warn');
      }
      applyingRemoteData = true;
      replaceLibrary(row.movies);
      persistLocalLibrary();
      applyingRemoteData = false;
      lastCloudUpdatedAt = row.updated_at || lastCloudUpdatedAt;
      lastCloudVersion = Number(row.version || lastCloudVersion || 0);
      lastCloudItemCount = row.item_count ?? row.movies.length;
      updateSyncDetails();
      lastSavedLocalVersion = localChangeVersion;
      clearPendingSyncMarker();
    }
    if (!silent) setSyncState('saved');
    updateCountryDropdown();
    refreshCurrentView();
    checkEpisodeNotifications();
    warmUpcomingCacheForBadge();
    return { ok: true, changed: Boolean(row?.exists) };
  } catch (e) {
    applyingRemoteData = false;
    logAppError('sync.load', e);
    if (!silent) {
      setSyncState('error', e.message);
      showToast('Could not load your data from the cloud: ' + e.message, true);
    }
    updateCountryDropdown();
    refreshCurrentView();
    checkEpisodeNotifications();
    warmUpcomingCacheForBadge();
    return { ok: false, error: e?.message || String(e) };
  }
}

async function saveUserData() {
  if (!sb || !currentUser) return { ok: false, error: 'Not signed in' };
  if (!readPendingSyncMarker() && !hasUnsyncedLocalChanges()) return { ok: true, skipped: true };
  const saveVersion = localChangeVersion;
  try {
    writeLocalLibraryBackup('before-cloud-save', movies);
    const payload = syncModel.buildSavePayload({
      userId: currentUser.id,
      movies,
      lastCloudUpdatedAt,
      lastCloudVersion,
    });
    const result = await saveUserDataWithFallback(payload);

    lastCloudUpdatedAt = result.updated_at || payload.updated_at;
    lastCloudVersion = Number(result.version || lastCloudVersion || 0);
    lastCloudItemCount = result.item_count ?? movies.length;
    lastSavedLocalVersion = Math.max(lastSavedLocalVersion, saveVersion);
    clearPendingSyncMarker();
    setSyncState('saved');
    return { ok: true };
  } catch (e) {
    logAppError('sync.save', e);
    setSyncState('error', e.message);
    showToast('Cloud sync failed — your changes are saved locally only. (' + e.message + ')', true);
    return { ok: false, error: e?.message || String(e) };
  }
}

// ── Season-tracking helpers ─────────────────────────────
// Cascade rule: if any season has progress, all earlier seasons must be
// fully watched. Mutates the array in place.
function normaliseSeasons(seasons) {
  progressModel.normaliseSeasons(seasons);
}

// Recompute totalEpisodes / watchedEpisodes from seasons[] (kept as
// derived sums so stats / CSV / cloud-sync continue to work).
function recomputeShowProgress(m) {
  progressModel.recomputeShowProgress(m);
}

function applyWatchedCountAcrossSeasons(m, watchedCount) {
  return progressModel.applyWatchedCountAcrossSeasons(m, watchedCount);
}

function seasonTotal(seasons, field) {
  return progressModel.seasonTotal(seasons, field);
}

// First season with watched < total. Returns null if all caught up.
function activeSeason(m) {
  return progressModel.activeSeason(m);
}

// If a TV/anime entry is marked watched, every episode counts as watched.
// Applies at the season level too when seasons[] is present.
function syncEpisodeProgress() {
  progressModel.syncEpisodeProgress(movies);
}

// One-shot at startup to fix any legacy data missing the invariant.
syncEpisodeProgress();

function sanitiseLibrary(source = movies) {
  return libraryModel.sanitiseLibrary(source, { idFactory: genId, now: Date.now });
}

function replaceLibrary(nextMovies) {
  movies = sanitiseLibrary(nextMovies);
  syncEpisodeProgress();
  return movies;
}

function addLibraryEntry(entry, options = {}) {
  movies = libraryModel.addEntry(movies, entry, { idFactory: genId, now: Date.now, ...options });
  syncEpisodeProgress();
  return movies[0];
}

function updateLibraryEntry(id, patch, options = {}) {
  movies = libraryModel.updateEntry(movies, id, patch, { idFactory: genId, now: Date.now, ...options });
  syncEpisodeProgress();
  return movies.find(m => m.id === id) || null;
}

function removeLibraryEntry(id) {
  movies = libraryModel.removeEntry(movies, id);
}

function removeLibraryEntries(ids) {
  movies = libraryModel.removeEntries(movies, ids);
}

function changeLibraryStatus(ids, status) {
  movies = libraryModel.changeStatus(movies, ids, status, { idFactory: genId, now: Date.now });
  syncEpisodeProgress();
}

function compareLibraryBackup(snapshotMovies) {
  return libraryModel.compareSnapshot(movies, snapshotMovies);
}

function restoreLibraryFromBackup(snapshotMovies) {
  replaceLibrary(libraryModel.restoreFromSnapshot(movies, snapshotMovies));
  return movies;
}

function persistLocalLibrary() {
  const payload = JSON.stringify(movies);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (error) {
    const trimmed = trimLocalStoragePressure();
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      logAppError('storage.local', 'Local storage was full; cleared volatile caches and retried the library save.', {
        beforeBytes: trimmed?.beforeBytes,
        afterBytes: trimmed?.afterBytes,
      }, 'warn');
      return true;
    } catch (retryError) {
      logAppError('storage.local', retryError, { firstError: error?.message || String(error) });
      showToast('Local storage is full. Cloud sync may still protect this change, but local save failed.', true);
      return false;
    }
  }
}

function localLibraryBackups() {
  return profileModel.localLibraryBackups(storageModel, LOCAL_BACKUPS_KEY);
}

function save() {
  movies = sanitiseLibrary();
  syncEpisodeProgress();
  persistLocalLibrary();
  if (!applyingRemoteData) {
    localChangeVersion++;
    markPendingSync();
  }
  if (offlineMode || !currentUser) return;
  setSyncState('saving');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(async () => {
    cloudSyncTimer = null;
    await saveUserData();
  }, 300);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── DOM refs ────────────────────────────────────────────
const grid            = document.getElementById('movie-grid');
const emptyMsg        = document.getElementById('empty-msg');
const onboardingEmptyHTML = emptyMsg?.innerHTML || '';
const searchInput     = document.getElementById('search-input');
const countryFilterEl = document.getElementById('country-filter');
const genreFilterEl   = document.getElementById('genre-filter');
const seriesStatusFilterEl = document.getElementById('series-status-filter');
document.getElementById('rating-filter')?.closest('label')?.querySelector('span')?.replaceChildren('Rating');
const addBtn          = document.getElementById('add-btn');
const modal           = document.getElementById('modal');
const modalTitle      = document.getElementById('modal-title');
const form            = document.getElementById('movie-form');
const cancelBtn       = document.getElementById('cancel-btn');
const ratingLabel     = document.getElementById('rating-label');
const starRow         = document.getElementById('star-row');
const directorLabel   = document.getElementById('director-label');
const confirmModal    = document.getElementById('confirm-modal');
const confirmMsg      = document.getElementById('confirm-msg');
const confirmCancel   = document.getElementById('confirm-cancel');
const confirmOk       = document.getElementById('confirm-ok');
const statsBar        = document.getElementById('stats-bar');
const paginationEl    = document.getElementById('pagination');
const selectModeBtn   = document.getElementById('select-mode-btn');
const pageSizeSelect  = document.getElementById('page-size-select');

const tmdbQuery       = document.getElementById('tmdb-query');
const tmdbDropdown    = document.getElementById('tmdb-dropdown');
const tmdbSelected    = document.getElementById('tmdb-selected');
const tmdbPosterThumb = document.getElementById('tmdb-poster-thumb');
const tmdbSelTitle    = document.getElementById('tmdb-selected-title');
const tmdbSelYear     = document.getElementById('tmdb-selected-year');
const tmdbClear       = document.getElementById('tmdb-clear');
const tmdbSearching   = document.getElementById('tmdb-searching');
const tmdbError       = document.getElementById('tmdb-error');
const tmdbSearchLabel = document.getElementById('tmdb-search-label');
const modalTmdbRefreshBtn = document.getElementById('modal-tmdb-refresh-btn');

const NAV_ICONS = {
  movie: '<svg viewBox="0 0 24 24"><path d="M4 8h16v11H4z"/><path d="M4 8l2-4h16l-2 4"/><path d="M8 4 6 8M13 4l-2 4M18 4l-2 4"/><path d="m10 12 4 2.5-4 2.5z"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="11" rx="1.5"/><path d="M9 20h6M12 17v3M9 3l3 3 3-3"/></svg>',
  anime: '<span class="anime-glyph">&#12450;</span>',
  dropped: '<svg viewBox="0 0 24 24"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="m8 8 8 8M16 8l-8 8"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M8 3v4M16 3v4M4 9h16"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M5 20V11M11 20V5M17 20v-8M23 20V8"/></svg>',
  community: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M3 20v-1.5C3 15.5 5.5 14 9 14s6 1.5 6 4.5V20"/><path d="M14 15c3.6.2 6 1.7 6 4.5V20"/></svg>',
};

document.querySelectorAll('.type-tab').forEach(tab => {
  const icon = tab.querySelector('.tab-icon');
  const html = NAV_ICONS[tab.dataset.type];
  if (icon && html) {
    icon.innerHTML = html;
    icon.setAttribute('aria-hidden', 'true');
  }
});

document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
  const icon = btn.querySelector('span');
  const key = btn.dataset.mobileView;
  const html = NAV_ICONS[key];
  if (icon && html) {
    icon.classList.add('mobile-nav-icon');
    icon.innerHTML = html;
    icon.setAttribute('aria-hidden', 'true');
  }
});

function isLibraryMutationLocked() {
  return Boolean(currentUser && !offlineMode && initialLibrarySyncPending);
}

function showMutationLockToast() {
  const now = Date.now();
  if (now - mutationLockToastAt < 2000) return;
  mutationLockToastAt = now;
  showToast('Finishing cloud sync first - editing will unlock in a moment.');
}

function updateMutationLockUI() {
  const locked = isLibraryMutationLocked();
  document.body.classList.toggle('library-sync-readonly', locked);
  [
    addBtn,
    selectModeBtn,
    document.getElementById('bulk-mark-watched'),
    document.getElementById('bulk-mark-in-progress'),
    document.getElementById('bulk-mark-watchlist'),
    document.getElementById('bulk-delete'),
    document.getElementById('tmdb-refresh-btn'),
    document.getElementById('profile-import-btn'),
  ].filter(Boolean).forEach(btn => { btn.disabled = locked; });
}

const LOCKED_MUTATION_SELECTOR = [
  '#add-btn',
  '#select-mode-btn',
  '#bulk-mark-watched',
  '#bulk-mark-in-progress',
  '#bulk-mark-watchlist',
  '#bulk-delete',
  '#tmdb-refresh-btn',
  '#profile-import-btn',
  '#modal-tmdb-refresh-btn',
  '[data-edit]',
  '[data-toggle]',
  '[data-delete]',
  '[data-ep-inc]',
  '[data-check]',
  '.card-poster',
  '.rec-add-btn',
].join(',');

document.addEventListener('click', e => {
  if (!isLibraryMutationLocked()) return;
  if (!e.target.closest(LOCKED_MUTATION_SELECTOR)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  showMutationLockToast();
}, true);

document.addEventListener('change', e => {
  if (!isLibraryMutationLocked()) return;
  if (!e.target.closest('[data-check], #csv-input')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.target.type === 'checkbox') e.target.checked = !e.target.checked;
  showMutationLockToast();
}, true);

// ── View switching ──────────────────────────────────────
function refreshCurrentView() {
  if (activeView === 'stats') renderStats();
  else if (activeView === 'profile') renderProfile();
  else if (activeView === 'community') { /* don't auto-reload community */ }
  else if (activeView === 'calendar') renderCalendar();
  else render();
}

function updateMobileNav() {
  const activeKey = activeView === 'content' ? activeType : activeView;
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mobileView === activeKey);
  });
}

function switchView(view, type) {
  activeView = view;
  if (type && view === 'content') {
    activeType      = type;
    activeMediaType = type;
    activeStatus    = 'all';
    genreFilter     = '';
    genreFilterEl.value = '';
    if (type === 'movie' || type === 'dropped') {
      seriesStatusFilter = '';
      if (seriesStatusFilterEl) seriesStatusFilterEl.value = '';
    }
  }

  const isContent   = view === 'content';
  const isStats     = view === 'stats';
  const isCommunity = view === 'community';
  const isProfile   = view === 'profile';
  const isCalendar  = view === 'calendar';

  // Sync header profile button active state
  document.getElementById('header-profile-btn')?.classList.toggle('active', isProfile);
  updateMobileNav();

  document.querySelector('.controls').classList.toggle('hidden', !isContent);
  syncMoreFiltersVisibility(isContent);
  if (!isContent) document.getElementById('more-filters-btn')?.classList.remove('active');
  statsBar.classList.toggle('hidden', !isContent);
  grid.classList.toggle('hidden', !isContent);
  emptyMsg.classList.add('hidden');
  paginationEl.classList.add('hidden');
  pageSizeSelect.classList.add('hidden');
  document.getElementById('bulk-bar').classList.add('hidden');
  document.getElementById('stats-panel').classList.toggle('hidden', !isStats);
  document.getElementById('community-panel').classList.toggle('hidden', !isCommunity);
  document.getElementById('profile-panel').classList.toggle('hidden', !isProfile);
  document.getElementById('calendar-panel').classList.toggle('hidden', !isCalendar);

  if (isContent) {
    selectMode = false;
    selectModeBtn.classList.remove('active');
    selectedIds.clear();
    updateCountryDropdown();
    render();
  } else if (isStats) {
    renderStats();
  } else if (isCommunity) {
    renderCommunity();
  } else if (isProfile) {
    renderProfile();
  } else if (isCalendar) {
    renderCalendar();
  }
}

// ── Grid size ───────────────────────────────────────────
function applyGridSize(size) {
  gridSize = size;
  grid.className = `movie-grid grid-${size}` + (selectMode ? ' select-mode' : '');
  document.querySelectorAll('.size-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.size === size)
  );
  localStorage.setItem('cinetrack_grid', size);
  if (typeof scheduleSavePrefs === 'function') scheduleSavePrefs();
}

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => applyGridSize(btn.dataset.size));
});

// ── Type tab nav ────────────────────────────────────────
document.querySelectorAll('.type-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.type;
    currentPage = 0;
    if (t === 'stats') {
      switchView('stats');
    } else if (t === 'community') {
      switchView('community');
    } else if (t === 'profile') {
      switchView('profile');
    } else if (t === 'calendar') {
      switchView('calendar');
    } else {
      switchView('content', t);
    }
  });
});

// Clicking the CineTrack logo navigates to Profile
document.getElementById('logo').addEventListener('click', () => {
  document.querySelectorAll('.type-tab').forEach(b => b.classList.remove('active'));
  switchView('profile');
});

// Header profile button
document.getElementById('header-profile-btn').addEventListener('click', () => {
  document.querySelectorAll('.type-tab').forEach(b => b.classList.remove('active'));
  switchView('profile');
});

// ── Status filter via stats bar ──────────────────────────
statsBar.addEventListener('click', e => {
  const btn = e.target.closest('[data-filter-status]');
  if (!btn) return;
  const s = btn.dataset.filterStatus;
  activeStatus = (activeStatus === s) ? 'all' : s;
  currentPage = 0;
  render();
});

// ── Select mode ─────────────────────────────────────────
selectModeBtn.addEventListener('click', () => {
  selectMode = !selectMode;
  selectModeBtn.classList.toggle('active', selectMode);
  render();
});

// ── Clear filters ───────────────────────────────────────
const clearFiltersBtn = document.getElementById('clear-filters-btn');

function currentFilterState() {
  return {
    activeType,
    activeStatus,
    searchQuery,
    countryFilter,
    genreFilter,
    seriesStatusFilter,
    yearMinFilter,
    yearMaxFilter,
    ratingMinFilter,
    ratingMaxFilter,
    sortOrder,
  };
}

function hasActiveFilters() {
  return filterModel.hasActiveFilters(currentFilterState());
}

// Count of filters that live behind the "⚙ Filters" popover. Excludes
// search and the status-tab row since those have their own UI affordances.
function countMoreFilters() {
  return filterModel.countMoreFilters(currentFilterState());
}

function updateClearFiltersBtn() {
  const active = hasActiveFilters();
  if (active && selectMode) {
    selectMode = false;
    selectedIds.clear();
    selectModeBtn.classList.remove('active');
    updateBulkBar();
  }
  clearFiltersBtn.classList.toggle('hidden', !active);
  selectModeBtn.classList.toggle('hidden', active);

  // Filter badge on the "⚙ Filters" button
  const badge = document.getElementById('more-filters-count');
  if (badge) {
    const n = countMoreFilters();
    if (n > 0) { badge.textContent = String(n); badge.classList.remove('hidden'); }
    else       { badge.textContent = '';         badge.classList.add('hidden'); }
  }
  syncMoreFiltersVisibility(activeView === 'content');
}

function clearAllFilters() {
  searchQuery   = '';
  genreFilter   = '';
  countryFilter = '';
  activeStatus  = 'all';
  seriesStatusFilter = '';
  sortOrder = 'added';
  yearMinFilter = '';
  yearMaxFilter = '';
  ratingMinFilter = '';
  ratingMaxFilter = '';
  searchInput.value     = '';
  genreFilterEl.value   = '';
  countryFilterEl.value = '';
  if (seriesStatusFilterEl) seriesStatusFilterEl.value = '';
  const sortEl = document.getElementById('sort-order'); if (sortEl) sortEl.value = 'added';
  if (yearFilterEl) yearFilterEl.value = '';
  if (ratingFilterEl) ratingFilterEl.value = '';
  localStorage.setItem('cinetrack_sort', sortOrder);
  syncAllCustomFilterSelects();
  closeMoreFiltersPanel();
  currentPage = 0;
  render();
}

clearFiltersBtn.addEventListener('click', clearAllFilters);

// ── More filters (year / rating) ────────────────────────
const moreFiltersBtn   = document.getElementById('more-filters-btn');
const moreFiltersPanel = document.getElementById('more-filters');
const moreFiltersClear = document.getElementById('more-filters-clear');
const yearFilterEl  = document.getElementById('year-filter');
const ratingFilterEl = document.getElementById('rating-filter');
let filtersPanelOpen = false;
const filterSelectIds = ['genre-filter', 'country-filter', 'sort-order', 'year-filter', 'rating-filter'];
const customFilterSelects = new Map();

if (moreFiltersBtn && moreFiltersPanel) {
  moreFiltersBtn.addEventListener('click', () => {
    filtersPanelOpen = moreFiltersPanel.classList.contains('hidden');
    syncMoreFiltersVisibility();
  });
}

function syncMoreFiltersVisibility(isContent = activeView === 'content') {
  if (!moreFiltersPanel || !moreFiltersBtn) return;
  if (!isContent) {
    filtersPanelOpen = false;
    moreFiltersPanel.classList.add('hidden');
    moreFiltersBtn.classList.remove('active');
    return;
  }
  moreFiltersPanel.classList.toggle('hidden', !filtersPanelOpen);
  moreFiltersBtn.classList.toggle('active', filtersPanelOpen);
}

function closeMoreFiltersPanel() {
  filtersPanelOpen = false;
  syncMoreFiltersVisibility();
}

function syncSeriesStatusFilterVisibility() {
  const field = document.getElementById('series-status-field');
  if (!field || !seriesStatusFilterEl) return;
  const applies = activeView === 'content' && (activeType === 'tv' || activeType === 'anime');
  field.classList.toggle('hidden', !applies);
  if (!applies && seriesStatusFilter) {
    seriesStatusFilter = '';
    seriesStatusFilterEl.value = '';
    syncCustomFilterSelect(seriesStatusFilterEl);
  }
}

function applyYearFilterPreset(value) {
  ({ yearMinFilter, yearMaxFilter } = filterModel.yearPreset(value));
}

function applyRatingFilterPreset(value) {
  ({ ratingMinFilter, ratingMaxFilter } = filterModel.ratingPreset(value));
}

function selectedOptionText(select) {
  return select?.selectedOptions?.[0]?.textContent?.trim() || select?.options?.[0]?.textContent?.trim() || '';
}

function syncCustomFilterSelect(select) {
  const custom = customFilterSelects.get(select?.id);
  if (!custom) return;
  custom.button.textContent = selectedOptionText(select);
  custom.menu.innerHTML = Array.from(select.options).map(option => `
    <button type="button"
      class="filter-select-option${option.value === select.value ? ' selected' : ''}"
      data-value="${esc(option.value)}">
      ${esc(option.textContent)}
    </button>
  `).join('');
}

function syncAllCustomFilterSelects() {
  filterSelectIds.forEach(id => syncCustomFilterSelect(document.getElementById(id)));
}

function closeCustomFilterSelects(except = null) {
  customFilterSelects.forEach(custom => {
    if (custom.root === except) return;
    custom.root.classList.remove('open');
    custom.button.setAttribute('aria-expanded', 'false');
  });
}

function enhanceFilterSelect(select) {
  if (!select || customFilterSelects.has(select.id)) return;
  const root = document.createElement('div');
  root.className = 'filter-select';
  root.dataset.selectFor = select.id;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'filter-select-button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div');
  menu.className = 'filter-select-menu';
  menu.setAttribute('role', 'listbox');
  root.append(button, menu);
  select.classList.add('native-filter-select');
  select.insertAdjacentElement('afterend', root);
  customFilterSelects.set(select.id, { root, button, menu });

  button.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !root.classList.contains('open');
    closeCustomFilterSelects(root);
    root.classList.toggle('open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  });

  menu.addEventListener('click', e => {
    const option = e.target.closest('.filter-select-option');
    if (!option) return;
    select.value = option.dataset.value || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncCustomFilterSelect(select);
    closeCustomFilterSelects();
  });

  new MutationObserver(() => syncCustomFilterSelect(select)).observe(select, { childList: true, subtree: true });
  syncCustomFilterSelect(select);
}

function initCustomFilterSelects() {
  const useNativeSelects = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches;
  if (useNativeSelects) return;
  filterSelectIds.forEach(id => enhanceFilterSelect(document.getElementById(id)));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.filter-select')) closeCustomFilterSelects();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCustomFilterSelects();
});

yearFilterEl?.addEventListener('change', () => { applyYearFilterPreset(yearFilterEl.value); currentPage = 0; render(); });
ratingFilterEl?.addEventListener('change', () => { applyRatingFilterPreset(ratingFilterEl.value); currentPage = 0; render(); });
seriesStatusFilterEl?.addEventListener('change', () => { seriesStatusFilter = seriesStatusFilterEl.value; currentPage = 0; render(); });
moreFiltersClear?.addEventListener('click', () => {
  // Reset every filter that lives inside this popover (genre, country,
  // sort, year-range, rating-range). Search and the status tabs sit
  // outside the popover and are unaffected — use the floating
  // "✕ Clear filters" button to reset those too.
  genreFilter   = '';
  countryFilter = '';
  seriesStatusFilter = '';
  sortOrder     = 'added';
  yearMinFilter = ''; yearMaxFilter = '';
  ratingMinFilter = ''; ratingMaxFilter = '';
  if (genreFilterEl)   genreFilterEl.value   = '';
  if (countryFilterEl) countryFilterEl.value = '';
  if (seriesStatusFilterEl) seriesStatusFilterEl.value = '';
  const sortEl = document.getElementById('sort-order');
  if (sortEl) sortEl.value = 'added';
  if (yearFilterEl) yearFilterEl.value = '';
  if (ratingFilterEl) ratingFilterEl.value = '';
  localStorage.setItem('cinetrack_sort', sortOrder);
  syncAllCustomFilterSelects();
  scheduleSavePrefs();
  closeMoreFiltersPanel();
  currentPage = 0;
  render();
});

document.addEventListener('click', e => {
  if (!filtersPanelOpen || activeView !== 'content') return;
  if (e.target.closest('#more-filters') || e.target.closest('#more-filters-btn')) return;
  closeMoreFiltersPanel();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && filtersPanelOpen) closeMoreFiltersPanel();
});

// ── Random picker ───────────────────────────────────────
const randomPickBtn   = document.getElementById('random-pick-btn');
const randomPickModal = document.getElementById('random-pick-modal');
const randomPickBody  = document.getElementById('random-pick-body');

function showRandomPick() {
  if (!randomPickModal || !randomPickBody) return;
  // The picker is intended to answer "what should I watch next?" — only
  // surface titles you haven't started yet. We respect the rest of the
  // active filters (type tab, search, genre, country, year, rating) but
  // always restrict to status === 'watchlist'.
  const randomPick = randomPickerModel.view(filtered());
  if (randomPick.empty) {
    randomPickBody.innerHTML = '<p class="random-pick-empty">Nothing on your watchlist matches the current filters.</p>';
    randomPickModal.classList.remove('hidden');
    return;
  }
  const pickMeta = randomPick.meta;
  randomPickBody.innerHTML = `
    <h2>🎲 How about…</h2>
    ${pickMeta.posterUrl
      ? `<img class="random-pick-poster" src="${esc(pickMeta.posterUrl)}" alt="${esc(pickMeta.title)}" />`
      : `<div class="random-pick-poster-emoji">${pickMeta.fallbackEmoji}</div>`}
    <div class="random-pick-title">${esc(pickMeta.title)}</div>
    <div class="random-pick-meta">${esc(pickMeta.metaText)}</div>
    <div class="random-pick-actions">
      <button type="button" data-pick-action="another">🎲 Pick another</button>
      <button type="button" data-pick-action="open" data-id="${pickMeta.id}" class="primary">Open</button>
    </div>
  `;
  randomPickModal.classList.remove('hidden');
}

randomPickBtn?.addEventListener('click', showRandomPick);
document.getElementById('random-pick-close')?.addEventListener('click', () => {
  randomPickModal?.classList.add('hidden');
});
randomPickModal?.addEventListener('click', e => {
  if (e.target.id === 'random-pick-modal') randomPickModal.classList.add('hidden');
  const action = e.target.closest('[data-pick-action]')?.dataset.pickAction;
  if (action === 'another') showRandomPick();
  if (action === 'open') {
    const id = e.target.closest('[data-pick-action]')?.dataset.id;
    const m = movies.find(x => x.id === id);
    randomPickModal.classList.add('hidden');
    if (m) openModal(m);
  }
});

// ── Sort order init ─────────────────────────────────────
document.getElementById('sort-order').value = sortOrder;
initCustomFilterSelects();

// ── Page size ───────────────────────────────────────────
pageSizeSelect.value = String(pageSize);
pageSizeSelect.addEventListener('change', () => {
  pageSize = filterModel.pageSize(pageSizeSelect.value, pageSize);
  localStorage.setItem('cinetrack_pagesize', pageSize);
  currentPage = 0;
  render();
  scheduleSavePrefs();
});

// ── TMDB API ────────────────────────────────────────────
async function searchTMDB(q, type) {
  let r;
  try {
    r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
  } catch {
    throw new Error('Network error — TMDB search requires Vercel deployment.');
  }
  if (r.status === 401 || r.status === 403) throw new Error('Invalid TMDB API key — check TMDB_API_KEY in Vercel.');
  if (r.status === 404) throw new Error('API route not found — only works when deployed to Vercel.');
  if (!r.ok) throw new Error(`TMDB request failed (${r.status}). Fill in details manually.`);
  return r.json();
}

async function fetchTMDBDetails(id, type) {
  let r;
  try {
    r = await fetch(`/api/movie?id=${id}&type=${type}`);
  } catch {
    throw new Error('Network error fetching details.');
  }
  if (!r.ok) throw new Error(`Could not load details (${r.status}).`);
  return r.json();
}

function countryNameFromCode(code) {
  const map = {
    JP: 'Japan', KR: 'South Korea', CN: 'China', US: 'United States of America',
    GB: 'United Kingdom', CA: 'Canada', FR: 'France', DE: 'Germany',
    ES: 'Spain', IT: 'Italy', PL: 'Poland',
  };
  return map[String(code || '').toUpperCase()] || code || '';
}

function externalPosterUrl(path) {
  return sourceModel.posterUrl(path, POSTER_BASE);
}

async function searchExternalTitle(q, type) {
  if (type === 'anime') {
    const r = await fetch(`/api/external?provider=anilist&action=search&q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(`AniList request failed (${r.status}). Fill in details manually.`);
    const data = await r.json();
    return {
      results: (data.results || []).map(media => ({
        id: media.id,
        source: 'anilist',
        media_type: 'anime',
        title: media.title,
        year: media.year || media.seasonYear || '',
        poster_path: media.coverImage || '',
        summary: media.description || '',
        raw: media,
      })),
    };
  }

  return searchTMDB(q, type);
}

async function fetchExternalDetails(id, type, rowData = null) {
  if (type === 'tv' && rowData?.source === 'tvmaze') {
    const show = rowData?.raw || {};
    const r = await fetch(`/api/external?provider=tvmaze&action=episodes&id=${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error(`Could not load TVmaze episodes (${r.status}).`);
    const data = await r.json();
    const episodes = data.episodes || [];
    const seasonMap = new Map();
    for (const ep of episodes) {
      if (!ep.season) continue;
      const curr = seasonMap.get(ep.season) || { number: ep.season, total: 0, watched: 0, name: `Season ${ep.season}` };
      curr.total += 1;
      seasonMap.set(ep.season, curr);
    }
    return {
      id,
      externalId: id,
      source: 'tvmaze',
      source_status: show.status || '',
      media_type: 'tv',
      title: show.title || rowData?.title || '',
      year: show.year || rowData?.year || '',
      genre: (show.genres || []).join(', '),
      director: show.network || '',
      country: show.country || '',
      runtime: show.runtime || 0,
      overview: show.summary || rowData?.summary || '',
      poster_path: show.image || rowData?.poster_path || '',
      total_episodes: episodes.length || 0,
      seasons: [...seasonMap.values()].sort((a, b) => a.number - b.number),
      providers: null,
    };
  }

  if (type === 'anime') {
    const r = await fetch(`/api/external?provider=anilist&action=details&id=${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error(`Could not load AniList details (${r.status}).`);
    const data = await r.json();
    const media = data.media || rowData?.raw || {};
    return {
      id,
      externalId: id,
      source: 'anilist',
      source_status: media.status || '',
      media_type: 'anime',
      title: media.title || rowData?.title || '',
      year: media.year || media.seasonYear || rowData?.year || '',
      genre: (media.genres || []).join(', '),
      director: (media.studios || []).join(', '),
      country: countryNameFromCode(media.country),
      runtime: media.duration || 0,
      overview: media.description || rowData?.summary || '',
      poster_path: media.coverImage || rowData?.poster_path || '',
      total_episodes: media.episodes || 0,
      seasons: media.episodes ? [{ number: 1, total: media.episodes, watched: 0, name: 'Season 1' }] : [],
      providers: null,
    };
  }

  return fetchTMDBDetails(id, type);
}

function sourceForEntry(movie) {
  return sourceModel.sourceForEntry(movie);
}

function infoUrlForEntry(movie) {
  return sourceModel.infoUrlForEntry(movie);
}

function metadataRefreshLabel(movie) {
  return sourceModel.metadataRefreshLabel(movie);
}

async function matchEntryWithTMDB(movie) {
  const mediaType = movie?.mediaType === 'anime' ? 'anime' : (movie?.mediaType === 'tv' ? 'tv' : 'movie');
  const params = new URLSearchParams({ title: movie?.title || '', type: mediaType });
  if (movie?.year) params.set('year', movie.year);
  const r = await fetch(`/api/match?${params}`);
  if (!r.ok) return null;
  const data = await r.json();
  return data?.matched && data.tmdbId ? data : null;
}

async function fetchDetailsForEntry(movie) {
  const source = sourceForEntry(movie);
  if (source === 'tvmaze' && movie?.mediaType === 'tv') {
    const tmdb = await matchEntryWithTMDB(movie);
    if (tmdb) {
      movie.tmdbId = tmdb.tmdbId;
      movie.externalSource = 'tmdb';
      movie.externalId = String(tmdb.tmdbId);
      return tmdb;
    }
  }
  if (source === 'anilist') return fetchExternalDetails(movie.externalId, 'anime');
  if (source === 'tmdb') {
    const fetchType = movie.mediaType === 'anime' ? 'tv' : (movie.mediaType || 'movie');
    return fetchTMDBDetails(movie.tmdbId, fetchType);
  }
  throw new Error('No metadata source saved for this title.');
}

function applyMetadataRefresh(movie, details) {
  if (!movie || !details) return { demoted: false };
  const wasShow = movie.mediaType === 'tv' || movie.mediaType === 'anime';
  const previousTotal = wasShow
    ? Math.max(0, movie.totalEpisodes || 0, seasonTotal(movie.seasons, 'total'))
    : 0;
  const detailsTotal = wasShow
    ? Math.max(0, details.total_episodes || 0, seasonTotal(details.seasons, 'total'))
    : 0;
  const previousWatched = wasShow
    ? Math.max(
        0,
        movie.watchedEpisodes || 0,
        seasonTotal(movie.seasons, 'watched'),
        movie.status === 'watched' ? previousTotal : 0,
        movie.status === 'watched' ? detailsTotal : 0
      )
    : 0;
  const previousStatus  = movie.status;
  if (details.title)    movie.title    = details.title;
  if (details.year)     movie.year     = details.year;
  if (details.genre)    movie.genre    = details.genre;
  if (details.director) movie.director = details.director;
  if (details.country)  movie.country  = details.country;
  if (details.runtime)  movie.runtime  = details.runtime;
  if (details.source_status != null) movie.sourceStatus = details.source_status || '';
  if (details.overview && !movie.notes) movie.notes = details.overview;
  if (details.poster_path) movie.posterUrl = externalPosterUrl(details.poster_path);

  if (movie.mediaType === 'tv' || movie.mediaType === 'anime') {
    if (Array.isArray(details.seasons) && details.seasons.length) {
      movie.seasons = details.seasons.map(s => ({
        number:  s.number,
        total:   s.total,
        watched: 0,
        name:    s.name,
      }));
      applyWatchedCountAcrossSeasons(movie, previousWatched);
    } else if (details.total_episodes) {
      movie.totalEpisodes = details.total_episodes;
      movie.watchedEpisodes = Math.max(previousWatched, movie.watchedEpisodes || 0);
    }
    if (previousStatus === 'watched' && (movie.totalEpisodes || 0) > 0) {
      movie.status = 'watched';
      applyWatchedCountAcrossSeasons(movie, movie.totalEpisodes);
      movie.watchedEpisodes = movie.totalEpisodes;
    } else if (movie.status === 'watched' && (movie.totalEpisodes || 0) > 0 && movie.watchedEpisodes < movie.totalEpisodes) {
      movie.status = 'in_progress';
    }
  }
  return { demoted: previousStatus === 'watched' && movie.status === 'in_progress' };
}

// ── Media type toggle (modal) ───────────────────────────
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMediaType = btn.dataset.type;
    updateModalForType();
    resetTMDBUI();
  });
});

function updateModalForType() {
  const isTV    = activeMediaType === 'tv';
  const isAnime = activeMediaType === 'anime';
  const labels  = { movie: 'Search TMDB', tv: 'Search TMDB (TV)', anime: 'Search AniList' };
  const placeholders = { movie: 'Type a movie title...', tv: 'Type a show title...', anime: 'Type an anime title...' };
  tmdbSearchLabel.childNodes[0].textContent = labels[activeMediaType] || 'Search TMDB';
  tmdbQuery.placeholder = placeholders[activeMediaType] || 'Type a title...';
  directorLabel.childNodes[0].textContent = (isTV || isAnime) ? 'Creator / Director' : 'Director';
  document.getElementById('f-director').placeholder = isAnime ? 'e.g. Hayao Miyazaki' : isTV ? 'e.g. Vince Gilligan' : 'e.g. Christopher Nolan';
  document.getElementById('ep-fields').classList.toggle('hidden', !(isTV || isAnime));
}

// ── TMDB search UI ──────────────────────────────────────
tmdbQuery.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = tmdbQuery.value.trim();
  if (!q) { hideDropdown(); return; }
  tmdbSearching.textContent = 'Searching…';
  tmdbSearching.classList.remove('hidden');
  tmdbError.classList.add('hidden');
  searchTimer = setTimeout(() => runSearch(q), 400);
});

async function runSearch(q) {
  try {
    const data = await searchExternalTitle(q, activeMediaType);
    tmdbSearching.classList.add('hidden');
    renderDropdown(data.results || []);
  } catch (err) {
    logAppError('search.external', err, { query: q, type: activeMediaType }, 'warn');
    tmdbSearching.classList.add('hidden');
    tmdbError.textContent = err.message;
    tmdbError.classList.remove('hidden');
  }
}

function renderDropdown(results) {
  if (!results.length) {
    tmdbDropdown.innerHTML = '<div class="tmdb-no-results">No results found</div>';
    tmdbDropdown.classList.remove('hidden');
    return;
  }
  tmdbDropdown.innerHTML = results.map(m => `
    <div class="tmdb-result" data-id="${m.id}" data-source="${m.source || 'tmdb'}" data-media-type="${m.media_type}">
      <img class="tmdb-result-poster"
           src="${externalPosterUrl(m.poster_path)}"
           alt="" onerror="this.style.display='none'" />
      <div class="tmdb-result-info">
        <span class="tmdb-result-title">${esc(m.title)}</span>
        <span class="tmdb-result-year">${m.year || '—'}${activeMediaType === 'anime' ? ` · ${m.media_type}` : ''}</span>
      </div>
    </div>
  `).join('');
  tmdbDropdown.querySelectorAll('.tmdb-result').forEach((row, idx) => {
    row._result = results[idx];
  });
  tmdbDropdown.classList.remove('hidden');
}

function hideDropdown() {
  tmdbDropdown.classList.add('hidden');
  tmdbDropdown.innerHTML = '';
}

tmdbDropdown.addEventListener('click', async e => {
  const row = e.target.closest('.tmdb-result');
  if (!row) return;
  const id = row.dataset.id;
  const rowData = row._result || null;
  const fetchType = activeMediaType === 'anime' && row.dataset.source === 'tmdb'
    ? (row.dataset.mediaType || 'tv')
    : activeMediaType;
  hideDropdown();
  tmdbSearching.textContent = 'Loading details…';
  tmdbSearching.classList.remove('hidden');
  tmdbQuery.value = '';

  try {
    const details = await fetchExternalDetails(id, fetchType, rowData);
    tmdbSearching.classList.add('hidden');
    applyTMDBSelection(details);
  } catch (err) {
    logAppError('metadata.selection', err, { id, type: fetchType }, 'warn');
    tmdbSearching.classList.add('hidden');
    tmdbError.textContent = err.message;
    tmdbError.classList.remove('hidden');
  }
});

function applyTMDBSelection(details) {
  tmdbSelection = details;
  tmdbPosterThumb.src = externalPosterUrl(details.poster_path);
  tmdbPosterThumb.style.display = details.poster_path ? 'block' : 'none';
  tmdbSelTitle.textContent = details.title;
  tmdbSelYear.textContent  = [details.year, details.source === 'anilist' ? 'AniList' : details.source === 'tvmaze' ? 'TVmaze' : 'TMDB'].filter(Boolean).join(' · ');
  tmdbSelected.classList.remove('hidden');
  tmdbQuery.disabled = true;

  document.getElementById('f-title').value    = details.title    || '';
  populateYearSelect(details.year || '');
  document.getElementById('f-year').value     = details.year     || '';
  document.getElementById('f-genre').value    = details.genre    || '';
  document.getElementById('f-director').value = details.director || '';
  document.getElementById('f-country').value  = details.country  || '';
  if (details.runtime) document.getElementById('f-runtime').value = details.runtime;

  // If TMDB returned per-season data, populate the season buffer (preserving
  // any watched counts the user already had, even if season numbers changed).
  if (Array.isArray(details.seasons) && details.seasons.length) {
    const previousTotal = Math.max(0, seasonTotal(editingSeasons, 'total'), parseInt(epTotalInput.value) || 0);
    const detailsTotal = seasonTotal(details.seasons, 'total');
    const selectedStatus = document.getElementById('f-status')?.value || '';
    const previousWatched = Math.max(
      0,
      seasonTotal(editingSeasons, 'watched'),
      parseInt(epWatchedInput.value) || 0,
      selectedStatus === 'watched' ? previousTotal : 0,
      selectedStatus === 'watched' ? detailsTotal : 0
    );
    editingSeasons = details.seasons.map(s => ({
      number:  s.number,
      total:   s.total,
      watched: 0,
      name:    s.name,
    }));
    let remaining = previousWatched;
    editingSeasons
      .slice()
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .forEach(season => {
        const total = Math.max(0, Number(season.total) || 0);
        season.watched = Math.max(season.watched || 0, Math.min(total, remaining));
        remaining -= Math.min(total, remaining);
      });
    const unfinished = editingSeasons.findIndex(s => (s.watched || 0) < (s.total || 0));
    editingSeasonIdx = unfinished === -1 ? 0 : unfinished;
    rebuildSeasonDropdown();
    loadSeasonIntoInputs(editingSeasonIdx);
  } else if (details.total_episodes && !epTotalInput.value) {
    epTotalInput.value = details.total_episodes;
  }
  if (!document.getElementById('f-notes').value)
    document.getElementById('f-notes').value  = details.overview || '';

  renderProviders(details.providers);
  checkDuplicateForSelection(details);
}

function normaliseDuplicateTitle(value) {
  return formatModel.normaliseTitle(value);
}

function normaliseDuplicateYear(value) {
  return formatModel.normaliseYear(value);
}

function findDuplicateTitle({ title, year, mediaType, source, externalId }) {
  const selectedSource = source || 'tmdb';
  const selectedExternalId = String(externalId || '');
  const wantedType = mediaType || activeMediaType;
  const wantedTitle = normaliseDuplicateTitle(title);
  const wantedYear = normaliseDuplicateYear(year);

  return movies.find(m => {
    if (m.id === editingId) return false;

    if (selectedExternalId) {
      if (selectedSource === 'tmdb' && Number(m.tmdbId) === Number(selectedExternalId)) return true;
      if (m.externalSource === selectedSource && String(m.externalId || '') === selectedExternalId) return true;
    }

    if (!wantedTitle || m.mediaType !== wantedType) return false;
    const existingTitle = normaliseDuplicateTitle(m.title);
    if (existingTitle !== wantedTitle) return false;

    const existingYear = normaliseDuplicateYear(m.year);
    if (wantedYear && existingYear) return wantedYear === existingYear;

    // If one side is missing a year, only trust longer exact-normalised titles.
    return wantedTitle.length >= 8;
  });
}

// Show a warning + 'Open existing' button when the picked external id/title is
// already tracked in the user's library, even if it came from another API.
function checkDuplicateForSelection(selection) {
  const banner = document.getElementById('duplicate-warning');
  const detail = document.getElementById('duplicate-warning-detail');
  const btn    = document.getElementById('duplicate-edit-btn');
  const source = selection?.source || 'tmdb';
  const externalId = String(selection?.externalId || selection?.id || '');
  if (!banner) return;

  const existing = findDuplicateTitle({
    title: selection?.title,
    year: selection?.year,
    mediaType: activeMediaType,
    source,
    externalId,
  });
  if (!existing) { banner.classList.add('hidden'); return; }

  const statusLabel = existing.status === 'watched'     ? '✓ Watched'
                    : existing.status === 'in_progress' ? '▶ In Progress'
                    : existing.status === 'dropped'     ? '📛 Dropped'
                                                        : '⏳ Watchlist';
  if (detail) detail.textContent = `as “${existing.title}” · ${statusLabel}`;
  banner.classList.remove('hidden');
  if (btn) {
    btn.onclick = () => {
      closeModal();
      openModal(existing);
    };
  }
}

const PROVIDER_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';
function renderProviders(providers) {
  const el = document.getElementById('modal-providers');
  if (!el) return;
  if (!providers || typeof providers !== 'object') {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  const region = localStorage.getItem('cinetrack_provider_region') || 'US';
  const data = providers[region] || providers['US'] || providers[Object.keys(providers)[0]];
  if (!data) { el.classList.add('hidden'); el.innerHTML = ''; return; }

  const logos = ps => ps.slice(0, 6).map(p =>
    `<img class="provider-logo" src="${PROVIDER_LOGO_BASE}${p.logo}" alt="${esc(p.name)}" title="${esc(p.name)}" loading="lazy" />`
  ).join('');

  const sections = [];
  if (data.flatrate?.length) sections.push(`<div class="provider-row"><span class="provider-row-label">Stream</span><div class="provider-logos">${logos(data.flatrate)}</div></div>`);
  if (data.rent?.length)     sections.push(`<div class="provider-row"><span class="provider-row-label">Rent</span><div class="provider-logos">${logos(data.rent)}</div></div>`);
  if (data.buy?.length)      sections.push(`<div class="provider-row"><span class="provider-row-label">Buy</span><div class="provider-logos">${logos(data.buy)}</div></div>`);

  if (!sections.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }

  const regionLabel = region;
  el.innerHTML = `
    <div class="modal-providers-header">
      <span>📺 Where to watch</span>
      <select class="provider-region-select" id="provider-region-select">
        ${Object.keys(providers).map(r =>
          `<option value="${r}"${r === regionLabel ? ' selected' : ''}>${r}</option>`
        ).join('')}
      </select>
    </div>
    ${sections.join('')}
    ${data.link ? `<a class="provider-link" href="${esc(data.link)}" target="_blank" rel="noopener noreferrer">View on JustWatch ↗</a>` : ''}
  `;
  el.classList.remove('hidden');

  el.querySelector('#provider-region-select')?.addEventListener('change', e => {
    localStorage.setItem('cinetrack_provider_region', e.target.value);
    scheduleSavePrefs();
    renderProviders(providers);
  });
}

function resetTMDBUI() {
  tmdbSelection = null;
  tmdbSelected.classList.add('hidden');
  tmdbQuery.disabled = false;
  tmdbQuery.value = '';
  hideDropdown();
  tmdbError.classList.add('hidden');
  tmdbSearching.classList.add('hidden');
  const provEl = document.getElementById('modal-providers');
  if (provEl) { provEl.classList.add('hidden'); provEl.innerHTML = ''; }
  document.getElementById('duplicate-warning')?.classList.add('hidden');
}

tmdbClear.addEventListener('click', () => {
  resetTMDBUI();
  ['f-title','f-year','f-genre','f-director','f-country','f-runtime'].forEach(id =>
    document.getElementById(id).value = ''
  );
  tmdbQuery.focus();
});

document.addEventListener('click', e => {
  if (!e.target.closest('#tmdb-search-wrap')) hideDropdown();
});

// ── Star rating ─────────────────────────────────────────
function buildStars() {
  starRow.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const s = document.createElement('span');
    s.className = 'star' + (i <= selectedRating ? ' lit' : '');
    s.textContent = '★';
    s.addEventListener('click', () => setRating(i));
    s.addEventListener('mouseenter', () => hoverStars(i));
    s.addEventListener('mouseleave', () => hoverStars(selectedRating));
    starRow.appendChild(s);
  }
}

function setRating(val) { selectedRating = val; hoverStars(val); }
function hoverStars(val) {
  starRow.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('lit', i < val));
}

// ── Country dropdown ────────────────────────────────────
function updateCountryDropdown() {
  const sourceFilter = activeType === 'dropped'
    ? (m => m.status === 'dropped')
    : (m => m.mediaType === activeType && m.status !== 'dropped');
  const countries = [...new Set(
    movies.filter(sourceFilter).map(m => m.country).filter(Boolean)
  )].sort();

  const current = countryFilter || countryFilterEl.value;
  if (current && !countries.includes(current)) {
    countryFilter = '';
    countryFilterEl.value = '';
  }
  countryFilterEl.innerHTML = '<option value="">All Countries</option>' +
    countries.map(c => `<option value="${esc(c)}"${c === countryFilter ? ' selected' : ''}>${esc(c)}</option>`).join('');

  updateGenreDropdown();
}

// ── Genre dropdown ───────────────────────────────────────
function updateGenreDropdown() {
  const sourceFilter = activeType === 'dropped'
    ? (m => m.status === 'dropped')
    : (m => m.mediaType === activeType && m.status !== 'dropped');
  const genres = [...new Set(
    movies
      .filter(sourceFilter)
      .flatMap(m => (m.genre || '').split(',').map(g => g.trim()).filter(Boolean))
  )].sort();

  const current = genreFilter || genreFilterEl.value;
  if (current && !genres.includes(current)) {
    genreFilter = '';
    genreFilterEl.value = '';
  }
  genreFilterEl.innerHTML = '<option value="">All Genres</option>' +
    genres.map(g => `<option value="${esc(g)}"${g === genreFilter ? ' selected' : ''}>${esc(g)}</option>`).join('');
  syncAllCustomFilterSelects();
}

// ── Filtering ───────────────────────────────────────────
function seriesStatusBucket(m) {
  const raw = String(m.sourceStatus || m.source_status || '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (['ended', 'canceled', 'cancelled', 'finished'].includes(raw)) return 'ended';
  if (['returning series', 'in production', 'planned', 'pilot', 'releasing', 'not_yet_released', 'not yet released'].includes(raw)) return 'ongoing';
  return 'unknown';
}

function filtered() {
  return filterModel.apply(movies, currentFilterState(), { seriesStatusBucket, isAiringToday });
}

// ── Helpers ─────────────────────────────────────────────
function posterEmoji(title) {
  return formatModel.posterEmoji(title);
}

function starsHTML(rating) {
  return formatModel.starsHtml(rating);
}

function esc(str) {
  return formatModel.escapeHtml(str);
}

function formatRuntime(mins) {
  return formatModel.runtime(mins);
}

function actualWatchedMinutes(m) {
  return statsModel.actualWatchedMinutes(m);
}

let timeSpentFormat = localStorage.getItem('cinetrack_time_spent_format') === 'calendar' ? 'calendar' : 'runtime';

function formatCalendarDuration(mins) {
  return formatModel.calendarDuration(mins);
}

function formatTimeSpent(mins) {
  return timeSpentFormat === 'calendar' ? formatCalendarDuration(mins) : formatRuntime(mins);
}

function toggleTimeSpentFormat() {
  timeSpentFormat = timeSpentFormat === 'calendar' ? 'runtime' : 'calendar';
  localStorage.setItem('cinetrack_time_spent_format', timeSpentFormat);
  if (typeof scheduleSavePrefs === 'function') scheduleSavePrefs();
  refreshCurrentView();
}

// ── Stats bar ───────────────────────────────────────────
function updateStats() {
  const isDroppedView = activeType === 'dropped';
  const allOfType     = isDroppedView
    ? movies.filter(m => m.status === 'dropped')
    : movies.filter(m => m.mediaType === activeType && m.status !== 'dropped');
  const watchedCnt    = isDroppedView ? 0 : allOfType.filter(m => m.status === 'watched').length;
  const inProgressCnt = isDroppedView ? 0 : allOfType.filter(m => m.status === 'in_progress').length;
  const watchlistCnt  = isDroppedView ? 0 : allOfType.filter(m => m.status === 'watchlist').length;

  const a = s => activeStatus === s ? ' stat-active' : '';

  let countryHTML = '';
  if (countryFilter) {
    const byCountry   = allOfType.filter(m => m.country === countryFilter);
    const cWatched    = byCountry.filter(m => m.status === 'watched').length;
    const cInProgress = byCountry.filter(m => m.status === 'in_progress').length;
    const cWatchlist  = byCountry.filter(m => m.status === 'watchlist').length;
    countryHTML = isDroppedView
      ? `<span class="country-stats">🌍 <strong>${esc(countryFilter)}</strong><span class="stat-sep">·</span><span class="cs-dropped">📛 ${byCountry.length}</span></span>`
      : `<span class="country-stats">` +
        `🌍 <strong>${esc(countryFilter)}</strong>` +
        `<span class="stat-sep">·</span><span class="cs-watched">✓ ${cWatched}</span>` +
        (cInProgress ? `<span class="stat-sep">·</span><span class="cs-progress">▶ ${cInProgress}</span>` : '') +
        (cWatchlist  ? `<span class="stat-sep">·</span><span class="cs-watchlist">⏳ ${cWatchlist}</span>` : '') +
        `</span>`;
  }

  statsBar.innerHTML = isDroppedView
    ? `<button class="stat-item stat-active" data-filter-status="all">📛 <strong>${allOfType.length}</strong> dropped</button>` + countryHTML
    : `<button class="stat-item stat-watched${a('watched')}" data-filter-status="watched">✓ <strong>${watchedCnt}</strong> watched</button>` +
      `<span class="stat-sep">·</span>` +
      `<button class="stat-item stat-in-progress${a('in_progress')}" data-filter-status="in_progress">▶ <strong>${inProgressCnt}</strong> in progress</button>` +
      `<span class="stat-sep">·</span>` +
      `<button class="stat-item stat-watchlist${a('watchlist')}" data-filter-status="watchlist">⏳ <strong>${watchlistCnt}</strong> on watchlist</button>` +
      countryHTML;
}

// ── Stats panel ─────────────────────────────────────────
function renderStats() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;

  const scoped = statsTypeFilter === 'all'
    ? movies
    : movies.filter(m => m.mediaType === statsTypeFilter);

  const watched      = scoped.filter(m => m.status === 'watched');
  const inProgress   = scoped.filter(m => m.status === 'in_progress');
  const inProgressN  = inProgress.length;
  const watchlistN   = scoped.filter(m => m.status === 'watchlist').length;
  const watchedN     = watched.length;

  const totalMin = scoped.reduce((s, m) => s + actualWatchedMinutes(m), 0);

  // Episode tally across TV/anime entries (within the active type filter)
  const showsWithEps = scoped.filter(m =>
    (m.mediaType === 'tv' || m.mediaType === 'anime') && (m.totalEpisodes || 0) > 0
  );
  const epsWatched = showsWithEps.reduce((s, m) => s + Math.min(m.watchedEpisodes || 0, m.totalEpisodes), 0);
  const epsTotal   = showsWithEps.reduce((s, m) => s + m.totalEpisodes, 0);

  const ratings  = watched.filter(m => m.rating > 0).map(m => m.rating);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;

  // Genres
  const genreCounts = {};
  watched.forEach(m => {
    (m.genre || '').split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  // Decades (groups of 10)
  const decadeCounts = {};
  watched.forEach(m => {
    const y = parseInt(m.year);
    if (!y || y < 1900 || y > 2100) return;
    const d = Math.floor(y / 10) * 10;
    decadeCounts[d] = (decadeCounts[d] || 0) + 1;
  });
  const decadeEntries = Object.entries(decadeCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([d, c]) => [`${d}s`, c]);

  // Countries
  const countryCounts = {};
  watched.forEach(m => {
    if (!m.country) return;
    countryCounts[m.country] = (countryCounts[m.country] || 0) + 1;
  });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Directors
  const directorCounts = {};
  watched.forEach(m => {
    if (!m.director) return;
    directorCounts[m.director] = (directorCounts[m.director] || 0) + 1;
  });
  const topDirectors = Object.entries(directorCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Rating distribution (1-10)
  const ratingBuckets = Array.from({length: 10}, (_, i) => [String(i + 1), 0]);
  ratings.forEach(r => { if (r >= 1 && r <= 10) ratingBuckets[r - 1][1]++; });
  const hasRatings = ratings.length > 0;

  // Top rated titles (by rating, then by recency)
  const topRated = watched
    .filter(m => m.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, 8);

  // Type breakdown — only when "all" is active
  const typeEntries = statsTypeFilter === 'all' ? [
    ['🎬 Films',    movies.filter(m => m.mediaType === 'movie' && m.status === 'watched').length],
    ['📺 TV Shows', movies.filter(m => m.mediaType === 'tv'    && m.status === 'watched').length],
    ['🎌 Anime',    movies.filter(m => m.mediaType === 'anime' && m.status === 'watched').length],
  ].filter(e => e[1] > 0) : [];

  // Currently watching — TV/anime in_progress entries with a known total,
  // sorted closest-to-done first. Hidden when filter is 'movie'.
  const currentlyWatching = statsTypeFilter === 'movie' ? [] : inProgress
    .filter(m => (m.mediaType === 'tv' || m.mediaType === 'anime') && (m.totalEpisodes || 0) > 0)
    .map(m => ({
      m,
      pct: Math.round((Math.min(m.watchedEpisodes || 0, m.totalEpisodes) / m.totalEpisodes) * 100),
      remaining: m.totalEpisodes - Math.min(m.watchedEpisodes || 0, m.totalEpisodes),
    }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 8);

  const maxOf = arr => arr.length ? Math.max(...arr.map(e => e[1])) : 1;

  const filterTabs = ['all', 'movie', 'tv', 'anime'].map(t => {
    const labels = { all: 'All', movie: '🎬 Films', tv: '📺 TV', anime: '🎌 Anime' };
    return `<button class="stats-type-tab${statsTypeFilter === t ? ' active' : ''}" data-stats-type="${t}">${labels[t]}</button>`;
  }).join('');

  const topGenreName = topGenres[0]?.[0] || 'No genre yet';
  const topCountryName = topCountries[0]?.[0] || 'No country yet';

  const topRatedHTML = topRated.length ? `
    <div class="chart-section chart-section-wide">
      <h3>Your Top Rated</h3>
      <div class="top-rated-grid">
        ${topRated.map(m => {
          const url = infoUrlForEntry(m);
          const poster = m.posterUrl
            ? `<img src="${m.posterUrl}" alt="${esc(m.title)}" loading="lazy" />`
            : `<div class="tr-poster-emoji">${m.mediaType === 'anime' ? '🎌' : m.mediaType === 'tv' ? '📺' : posterEmoji(m.title)}</div>`;
          const wrap = url
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="top-rated-card">`
            : `<div class="top-rated-card">`;
          const close = url ? `</a>` : `</div>`;
          return `${wrap}
            <div class="tr-poster">${poster}<span class="tr-rating">★ ${m.rating}</span></div>
            <div class="tr-title">${esc(m.title)}</div>
            ${m.year ? `<div class="tr-year">${m.year}</div>` : ''}
          ${close}`;
        }).join('')}
      </div>
    </div>
  ` : '';

  panel.innerHTML = `
    <div class="stats-page-head">
      <div>
        <h2>Stats</h2>
        <p>${watchedN.toLocaleString()} watched across ${scoped.length.toLocaleString()} tracked title${scoped.length === 1 ? '' : 's'}.</p>
      </div>
      <div class="stats-type-tabs">${filterTabs}</div>
    </div>

    <div class="stats-hero-summary">
      <div>
        <span class="stats-hero-label">Time watched</span>
        <strong data-time-spent-toggle>${formatTimeSpent(totalMin) || '—'}</strong>
      </div>
      <div>
        <span class="stats-hero-label">Top genre</span>
        <strong>${esc(topGenreName)}</strong>
      </div>
      <div>
        <span class="stats-hero-label">Top country</span>
        <strong>${esc(topCountryName)}</strong>
      </div>
      <div>
        <span class="stats-hero-label">Average rating</span>
        <strong>${avgRating ? '★ ' + avgRating : '—'}</strong>
      </div>
    </div>

    <div class="stats-overview stats-overview-primary">
      <div class="stat-card stat-card-clickable" data-stat-action="watched">
        <div class="stat-card-value">${watchedN}</div>
        <div class="stat-card-label">Watched</div>
      </div>
      <div class="stat-card stat-card-clickable" data-stat-action="in_progress">
        <div class="stat-card-value">${inProgressN}</div>
        <div class="stat-card-label">In Progress</div>
      </div>
      <div class="stat-card stat-card-clickable" data-stat-action="watchlist">
        <div class="stat-card-value">${watchlistN}</div>
        <div class="stat-card-label">On Watchlist</div>
      </div>
      ${epsTotal > 0 ? `
      <div class="stat-card" title="Episodes watched across all TV shows and anime series">
        <div class="stat-card-value">${epsWatched.toLocaleString()}<span class="stat-card-sub">/ ${epsTotal.toLocaleString()}</span></div>
        <div class="stat-card-label">Episodes</div>
      </div>` : ''}
      <div class="stat-card" data-time-spent-toggle title="Total runtime, prorated by your progress on each series">
        <div class="stat-card-value">${formatTimeSpent(totalMin) || '—'}</div>
        <div class="stat-card-label">Time Spent</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgRating ? '★ ' + avgRating : '—'}</div>
        <div class="stat-card-label">Avg Rating</div>
      </div>
    </div>

    ${topRatedHTML}

    <div class="stats-charts">
      ${topGenres.length ? `
      <div class="chart-section">
        <h3>Top Genres <span class="chart-hint">click to filter</span></h3>
        <div class="chart-bars">${renderBarChart(topGenres, maxOf(topGenres), '#e2405a', 'genre')}</div>
      </div>` : ''}

      ${topCountries.length ? `
      <div class="chart-section">
        <h3>Top Countries <span class="chart-hint">click to filter</span></h3>
        <div class="chart-bars">${renderBarChart(topCountries, maxOf(topCountries), '#3b9eff', 'country')}</div>
      </div>` : ''}

      ${topDirectors.length ? `
      <div class="chart-section">
        <h3>Top Directors <span class="chart-hint">click to search</span></h3>
        <div class="chart-bars">${renderBarChart(topDirectors, maxOf(topDirectors), '#a855f7', 'director')}</div>
      </div>` : ''}

      ${decadeEntries.length ? `
      <div class="chart-section">
        <h3>By Decade</h3>
        <div class="chart-bars">${renderBarChart(decadeEntries, maxOf(decadeEntries), '#f5a623')}</div>
      </div>` : ''}

      ${hasRatings ? `
      <div class="chart-section">
        <h3>Rating Distribution</h3>
        <div class="rating-dist">${renderRatingDist(ratingBuckets)}</div>
      </div>` : ''}

      ${currentlyWatching.length ? `
      <div class="chart-section chart-section-sm">
        <h3>Currently Watching</h3>
        <div class="chart-bars">${currentlyWatching.map(({ m, pct, remaining }) => `
          <div class="watching-row" title="${esc(m.title)} — ${m.watchedEpisodes || 0}/${m.totalEpisodes} episodes">
            <div class="watching-label">${esc(m.title)}</div>
            <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${pct}%"></div></div>
            <div class="watching-count">${m.watchedEpisodes || 0}/${m.totalEpisodes}<span class="watching-remaining">${remaining ? ` · ${remaining} left` : ''}</span></div>
          </div>
        `).join('')}</div>
      </div>` : ''}

      ${typeEntries.length ? `
      <div class="chart-section chart-section-sm">
        <h3>By Type</h3>
        <div class="chart-bars">${renderBarChart(typeEntries, maxOf(typeEntries), '#4caf82')}</div>
      </div>` : ''}
    </div>

    <div id="recs-section" class="recs-section">
      <div class="recs-loading"><span class="recs-spinner"></span> Loading recommendations…</div>
    </div>
  `;

  // Wire up interactions
  panel.querySelectorAll('.stats-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      statsTypeFilter = btn.dataset.statsType;
      renderStats();
    });
  });

  panel.querySelectorAll('[data-stat-action]').forEach(el => {
    el.addEventListener('click', () => {
      const targetType = statsTypeFilter === 'all' ? 'movie' : statsTypeFilter;
      jumpToContent(targetType, { status: el.dataset.statAction });
    });
  });

  panel.querySelectorAll('[data-time-spent-toggle]').forEach(el => {
    el.addEventListener('click', toggleTimeSpentFormat);
  });

  panel.querySelectorAll('[data-bar-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.barAction;
      const value  = el.dataset.barValue;
      const targetType = statsTypeFilter === 'all' ? 'movie' : statsTypeFilter;
      const opts = { status: 'watched' };
      if (action === 'genre')    opts.genre = value;
      if (action === 'country')  opts.country = value;
      if (action === 'director') opts.search = value;
      jumpToContent(targetType, opts);
    });
  });

  loadRecommendations();
}

function jumpToContent(type, opts = {}) {
  document.querySelectorAll('.type-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  switchView('content', type);
  // switchView resets filters — apply desired ones now
  genreFilter   = opts.genre   || '';
  countryFilter = opts.country || '';
  searchQuery   = opts.search  || '';
  activeStatus  = opts.status  || 'all';
  genreFilterEl.value   = genreFilter;
  countryFilterEl.value = countryFilter;
  syncAllCustomFilterSelects();
  searchInput.value     = searchQuery;
  currentPage = 0;
  render();
  window.scrollTo(0, 0);
}

function renderEmptyState(isFiltered) {
  if (!emptyMsg) return;
  emptyMsg.classList.toggle('empty-filtered', isFiltered);
  if (!isFiltered) {
    emptyMsg.innerHTML = onboardingEmptyHTML;
    return;
  }

  emptyMsg.innerHTML = `
    <div class="onboarding-card filtered-empty-card">
      <div class="onboarding-icon">⌕</div>
      <h2 class="onboarding-title">No matching titles</h2>
      <p class="onboarding-subtitle">Nothing in this tab matches the current filters.</p>
      <button type="button" class="filtered-empty-clear" data-empty-clear-filters>Clear filters</button>
    </div>
  `;
  emptyMsg.querySelector('[data-empty-clear-filters]')?.addEventListener('click', clearAllFilters);
}

function renderRatingDist(buckets) {
  const max = Math.max(...buckets.map(b => b[1]), 1);
  return `<div class="rd-bars">` +
    buckets.map(([rating, count]) => `
      <div class="rd-col" title="${count} title${count !== 1 ? 's' : ''} rated ${rating}">
        <div class="rd-bar-wrap">
          <div class="rd-bar" style="height:${count ? Math.max(4, (count / max) * 100) : 0}%"></div>
        </div>
        <div class="rd-count">${count || ''}</div>
        <div class="rd-rating">${rating}</div>
      </div>
    `).join('') +
    `</div>`;
}

// ── Calendar (upcoming episodes + movie release dates) ──
// Cache key bumped (v2) when the entry shape changed to {type, ...}.
const UPCOMING_CACHE_KEY    = 'cinetrack_upcoming_cache_v2';
const UPCOMING_TTL_MS       = 6 * 60 * 60 * 1000;  // 6 hours
const UPCOMING_HORIZON_DAYS = 14;   // for TV episodes
const MOVIE_HORIZON_DAYS    = 60;   // for theatrical releases

// Discover-mode cache: key by `${type}:${region}:${page}`. 24h TTL.
const DISCOVER_CACHE_KEY = 'cinetrack_discover_cache_v1';
const DISCOVER_TTL_MS    = 24 * 60 * 60 * 1000;

// Common 2-letter regions matching what the where-to-watch endpoint uses.
const DISCOVER_REGIONS = ['US','GB','CA','AU','DE','FR','JP','BR','MX','IN','NL','ES','IT','PL','SE','NO','DK','FI','IE','NZ'];

function autoDetectRegion() {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  const tail = lang.split('-')[1];
  return /^[A-Z]{2}$/.test((tail || '').toUpperCase()) ? tail.toUpperCase() : 'US';
}

const DISCOVER_TYPES = ['movie', 'tv', 'anime'];
let calendarMode   = localStorage.getItem('cinetrack_calendar_mode') || 'tracked';
let discoverRegion = localStorage.getItem('cinetrack_discover_region') || autoDetectRegion();
let discoverType   = (() => {
  const v = localStorage.getItem('cinetrack_discover_type');
  return DISCOVER_TYPES.includes(v) ? v : 'movie';
})();

function readUpcomingCache() {
  try { return JSON.parse(localStorage.getItem(UPCOMING_CACHE_KEY) || 'null'); }
  catch { return null; }
}

function writeUpcomingCache(cache) {
  localStorage.setItem(UPCOMING_CACHE_KEY, JSON.stringify(cache));
}

function mergeUpcomingCache(items = []) {
  if (!Array.isArray(items) || !items.length) return;
  const cache = readUpcomingCache() || { fetchedAt: Date.now(), byId: {} };
  const byId = cache.byId && typeof cache.byId === 'object' ? cache.byId : {};
  for (const item of items) {
    const key = item?.sourceKey || `${item?.type || 'tv'}:${item?.tmdbId || item?.externalId || ''}`;
    if (!key || key.endsWith(':')) continue;
    byId[key] = item;
  }
  writeUpcomingCache({ fetchedAt: Date.now(), byId });
}

// Caller passes ids as 'type:id' (e.g. 'tv:1399' or 'movie:823464').
// Bare numeric ids are tolerated and treated as TV.
async function fetchUpcoming(ids, { force = false } = {}) {
  if (!ids.length) return [];
  const keys = ids.map(id => String(id).includes(':') ? String(id) : `tv:${id}`);
  const cache = readUpcomingCache();
  const now   = Date.now();
  const fresh = cache && (now - cache.fetchedAt) < UPCOMING_TTL_MS;
  const allCached = fresh && keys.every(k => cache.byId[k] !== undefined);
  if (!force && fresh && allCached) {
    return keys.map(k => cache.byId[k]).filter(Boolean);
  }
  const r = await fetch(`/api/upcoming?ids=${encodeURIComponent(keys.join(','))}`);
  if (!r.ok) throw new Error(`Upcoming fetch failed (${r.status})`);
  const data = await r.json();
  const byId = Object.fromEntries(
    (data.results || []).map(s => [`${s.type || 'tv'}:${s.tmdbId}`, s])
  );
  // Mark keys that returned nothing (ended/canceled/no-date) as null so we don't re-hit them
  keys.forEach(k => { if (!(k in byId)) byId[k] = null; });
  writeUpcomingCache({ fetchedAt: now, byId });
  return keys.map(k => byId[k]).filter(Boolean);
}

function calendarKeyForEntry(m) {
  return calendarModel.keyForEntry(m);
}

async function fetchExternalUpcomingForEntries(entries) {
  const todayStr = todayDateString();
  const tvHorizonStr = calendarModel.addDaysString(UPCOMING_HORIZON_DAYS);

  const tasks = entries.map(async m => {
    const key = calendarKeyForEntry(m);
    if (m.externalSource === 'anilist') {
      const r = await fetch(`/api/external?provider=anilist&action=details&id=${encodeURIComponent(m.externalId)}`);
      if (!r.ok) return null;
      const data = await r.json();
      const airing = data.media?.nextAiringEpisode;
      if (!airing?.airingAt) return null;
      const airDate = new Date(airing.airingAt * 1000);
      const airDateStr = `${airDate.getFullYear()}-${String(airDate.getMonth()+1).padStart(2,'0')}-${String(airDate.getDate()).padStart(2,'0')}`;
      return {
        type: 'tv',
        sourceKey: key,
        title: m.title || data.media?.title || '',
        poster_url: m.posterUrl || data.media?.coverImage || '',
        externalUrl: data.media?.siteUrl || `https://anilist.co/anime/${m.externalId}`,
        nextEpisode: {
          season: 1,
          episode: airing.episode,
          name: '',
          airDate: airDateStr,
          overview: '',
        },
      };
    }

    return null;
  });

  return (await Promise.all(tasks)).filter(Boolean);
}

async function fetchTvmazeCalendarForEntries(entries, { force = false } = {}) {
  const tvEntries = entries.filter(m =>
    m &&
    m.mediaType === 'tv' &&
    calendarKeyForEntry(m) &&
    (m.status === 'in_progress' || m.status === 'watchlist')
  );
  if (!tvEntries.length) return [];

  const todayStr = todayDateString();
  const tvHorizonStr = calendarModel.addDaysString(UPCOMING_HORIZON_DAYS);

  const cache = readUpcomingCache();
  const now = Date.now();
  const fresh = cache && (now - cache.fetchedAt) < UPCOMING_TTL_MS;
  const keys = tvEntries.map(calendarKeyForEntry);
  const cached = fresh && !force && keys.every(key => cache.byId?.[key]?.source === 'tvmaze');
  if (cached) return keys.map(key => cache.byId[key]).filter(item => item?.source === 'tvmaze');

  const r = await fetch('/api/tvmaze-calendar', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      today: todayStr,
      horizon: tvHorizonStr,
      entries: tvEntries.map(m => ({
        sourceKey: calendarKeyForEntry(m),
        title: m.title || '',
        year: m.year || '',
        tmdbId: m.tmdbId || null,
        externalSource: m.externalSource || null,
        externalId: m.externalId || null,
        posterUrl: m.posterUrl || '',
      })),
    }),
  });
  if (!r.ok) throw new Error(`TVMaze calendar lookup failed (${r.status})`);
  const data = await r.json();
  const results = data.results || [];
  mergeUpcomingCache(results);
  return results;
}

// ── Episode-air-today notifications ─────────────────────
const NOTIF_DEDUPE_KEY = 'cinetrack_notified_episodes';

function todayDateString() {
  return calendarModel.dateString();
}

function episodeOrdinalForProgress(m, episode) {
  return calendarModel.episodeOrdinalForProgress(m, episode);
}

function hasUnwatchedAiringEpisodeToday(m, episode, todayStr = todayDateString()) {
  return calendarModel.hasUnwatchedAiringEpisodeToday(m, episode, todayStr);
}

function getAiringTodaySignal(m, todayStr = todayDateString()) {
  return calendarModel.airingTodaySignal(m, readUpcomingCache(), todayStr);
}

// True when the given local entry has something happening today according
// to the upcoming cache (next episode airing, or theatrical release).
// Returns false if the cache is missing — we fail closed.
function isAiringToday(m) {
  return Boolean(getAiringTodaySignal(m));
}

// Updates the small "airing today" indicator on the Calendar nav tab.
// Reads from the upcoming cache only (no network call) — refreshed
// elsewhere whenever the cache is populated.
function updateCalendarAiringBadge() {
  const tab = document.querySelector('.type-tab[data-type="calendar"]');
  if (!tab) return;
  const todayStr = todayDateString();
  const cache = readUpcomingCache();
  let count = 0;
  if (cache?.byId) {
    for (const m of movies) {
      if (!m.tmdbId) continue;
      const isShow  = m.mediaType === 'tv' || m.mediaType === 'anime';
      const isMovie = m.mediaType === 'movie';
      if ((isShow || isMovie) && getAiringTodaySignal(m, todayStr)) count += 1;
    }
  }
  tab.classList.toggle('has-airing', count > 0);
  if (count > 0) tab.dataset.airingCount = String(count);
  else delete tab.dataset.airingCount;
}

async function checkEpisodeNotifications() {
  if (localStorage.getItem('cinetrack_notif') !== 'on') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const tracked = movies.filter(m =>
    (m.mediaType === 'tv' || m.mediaType === 'anime') &&
    m.status === 'in_progress' &&
    m.tmdbId
  );
  if (!tracked.length) return;

  let upcoming;
  try {
    upcoming = await fetchUpcoming(tracked.map(m => `tv:${m.tmdbId}`));
  } catch { return; }

  const todayStr = todayDateString();
  let notified;
  try { notified = new Set(JSON.parse(localStorage.getItem(NOTIF_DEDUPE_KEY) || '[]')); }
  catch { notified = new Set(); }

  let firedAny = false;
  for (const item of upcoming) {
    if (item?.type !== 'tv') continue;
    const ne = item?.nextEpisode;
    if (!ne || ne.airDate !== todayStr) continue;
    const local = tracked.find(m => String(m.tmdbId) === String(item.tmdbId));
    if (local && !hasUnwatchedAiringEpisodeToday(local, ne, todayStr)) continue;
    const key = `${item.tmdbId}:s${ne.season}e${ne.episode}:${ne.airDate}`;
    if (notified.has(key)) continue;
    try {
      new Notification('📺 Episode airs today', {
        body: `${item.title} — ${ne.name || `S${ne.season} E${ne.episode}`}`,
        icon: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : undefined,
        tag: key,
      });
      notified.add(key);
      firedAny = true;
    } catch { /* notification creation failed */ }
  }

  if (firedAny) {
    // Cap to last 200 entries to avoid unbounded growth
    const arr = [...notified];
    const trimmed = arr.length > 200 ? arr.slice(-200) : arr;
    localStorage.setItem(NOTIF_DEDUPE_KEY, JSON.stringify(trimmed));
  }

  updateCalendarAiringBadge();
}

// Warm the upcoming cache so the Calendar tab can show its airing-today
// badge even if the user never opens the Calendar panel.
async function warmUpcomingCacheForBadge() {
  const ids = [];
  const tvEntries = [];
  for (const m of movies) {
    if (!m.tmdbId) continue;
    const isShow = m.mediaType === 'tv' || m.mediaType === 'anime';
    if (isShow && (m.status === 'in_progress' || m.status === 'watchlist')) {
      ids.push(`tv:${m.tmdbId}`);
      if (m.mediaType === 'tv') tvEntries.push(m);
    }
    else if (m.mediaType === 'movie' && m.status === 'watchlist') ids.push(`movie:${m.tmdbId}`);
  }
  if (!ids.length && !tvEntries.length) { updateCalendarAiringBadge(); return; }
  try { await fetchUpcoming(ids); } catch { /* offline-safe */ }
  try { await fetchTvmazeCalendarForEntries(tvEntries); } catch { /* offline-safe */ }
  updateCalendarAiringBadge();
  // Re-render the content grid so any "Today" highlights appear without
  // waiting for the next user interaction.
  if (activeView === 'content') render();
}

function trackedCalendarEntries() {
  return movies.filter(m => calendarKeyForEntry(m) && (
    ((m.mediaType === 'tv' || m.mediaType === 'anime') && (m.status === 'in_progress' || m.status === 'watchlist')) ||
    (m.mediaType === 'movie' && m.status === 'watchlist')
  ));
}

async function refreshTrackedCalendarSources({ force = false } = {}) {
  const tracked = trackedCalendarEntries();
  const ids = tracked.map(calendarKeyForEntry).filter(Boolean);
  if (!ids.length) return { tracked, upcoming: [] };

  const tmdbIds = ids.filter(id => id.startsWith('tv:') || id.startsWith('movie:'));
  const externalEntries = tracked.filter(m => {
    const key = calendarKeyForEntry(m);
    return key.startsWith('anilist:');
  });

  const [tmdbUpcoming, externalUpcoming] = await Promise.all([
    fetchUpcoming(tmdbIds, { force }),
    fetchExternalUpcomingForEntries(externalEntries),
  ]);
  let tvmazeUpcoming = [];
  try {
    tvmazeUpcoming = await fetchTvmazeCalendarForEntries(tracked, { force });
  } catch (e) {
    logAppError('calendar.tvmaze', e, { force }, 'warn');
  }
  return { tracked, upcoming: [...tmdbUpcoming, ...externalUpcoming, ...tvmazeUpcoming] };
}

async function maybeRefreshCalendarOncePerAccountToday() {
  if (!sb || !currentUser || offlineMode) return;
  const today = todayDateString();
  const localLast = localStorage.getItem(CALENDAR_DAILY_REFRESH_PREF);
  if (localLast === today) return;

  let prefs = {};
  try {
    prefs = await readProfilePreferences();
  } catch (e) {
    logAppError('calendar.daily_marker', e, {}, 'warn');
  }
  if (prefs?.[CALENDAR_DAILY_REFRESH_PREF] === today) {
    localStorage.setItem(CALENDAR_DAILY_REFRESH_PREF, today);
    return;
  }

  try {
    await refreshTrackedCalendarSources({ force: true });
    await mergeProfilePreferences({ [CALENDAR_DAILY_REFRESH_PREF]: today });
    localStorage.setItem(CALENDAR_DAILY_REFRESH_PREF, today);
    updateCalendarAiringBadge();
    if (activeView === 'calendar') renderCalendar();
  } catch (e) {
    logAppError('calendar.daily_refresh', e, {}, 'warn');
  }
}

async function setEpisodeNotifPref(value) {
  if (value === 'on') {
    if (typeof Notification === 'undefined') {
      showToast('Your browser does not support notifications', true);
      return false;
    }
    if (Notification.permission === 'denied') {
      showToast('Notifications are blocked. Enable them in your browser settings.', true);
      return false;
    }
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        showToast('Notifications not enabled', true);
        return false;
      }
    }
  }
  localStorage.setItem('cinetrack_notif', value);
  applyEpisodeNotif(value);
  scheduleSavePrefs();
  if (value === 'on') checkEpisodeNotifications();
  return true;
}

function relativeDayLabel(dateStr) {
  return calendarModel.relativeDayLabel(dateStr);
}

async function renderCalendar({ force = false } = {}) {
  const panel = document.getElementById('calendar-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="calendar-header">
      <div class="calendar-title-block">
        <span class="calendar-kicker">Schedule</span>
        <h2>📅 Calendar</h2>
        <p>Upcoming episodes and watchlist film releases from your connected sources.</p>
      </div>
      <div class="cal-mode-toggle pill-group">
        <button type="button" class="pill-btn ${calendarMode === 'tracked' ? 'active' : ''}" data-mode="tracked">📅 Tracked</button>
        <button type="button" class="pill-btn ${calendarMode === 'discover' ? 'active' : ''}" data-mode="discover">✨ Discover</button>
      </div>
    </div>
    <div class="calendar-body"></div>
  `;
  panel.querySelectorAll('.cal-mode-toggle .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode;
      if (next === calendarMode) return;
      calendarMode = next;
      localStorage.setItem('cinetrack_calendar_mode', calendarMode);
      scheduleSavePrefs();
      renderCalendar();
    });
  });

  const body = panel.querySelector('.calendar-body');
  if (calendarMode === 'discover') return renderCalendarDiscover(body, { force });
  return renderCalendarTracked(body, { force });
}

async function renderCalendarTracked(body, { force = false } = {}) {
  // What we track: in-progress + watchlist TV/anime (next episode air date)
  // and watchlist movies (theatrical release). Each entry is keyed as
  // `${type}:${tmdbId}`.
  const tracked = trackedCalendarEntries();

  const ids = tracked.map(calendarKeyForEntry).filter(Boolean);

  if (!ids.length) {
    body.innerHTML = `<p class="recs-empty">Add a TV show or anime to your <em>Watchlist</em> or mark it <em>In Progress</em>, or add a movie to your <em>Watchlist</em>, to see what's coming up.</p>`;
    return;
  }

  body.innerHTML = `
    <div class="cal-subheader">
      <span class="cal-window">Episodes: next ${UPCOMING_HORIZON_DAYS} days</span>
      <span class="cal-window">Films: next ${MOVIE_HORIZON_DAYS} days</span>
      <button id="calendar-refresh-btn" class="cal-refresh-btn" title="Re-fetch upcoming dates from available sources">↻ Refresh</button>
    </div>
    <div class="calendar-list"><div class="recs-loading"><span class="recs-spinner"></span> Loading…</div></div>
  `;
  body.querySelector('#calendar-refresh-btn').addEventListener('click', () => renderCalendar({ force: true }));

  const todayStr = todayDateString();
  const tvHorizonStr    = calendarModel.addDaysString(UPCOMING_HORIZON_DAYS);
  const movieHorizonStr = calendarModel.addDaysString(MOVIE_HORIZON_DAYS);

  let upcoming;
  try {
    ({ upcoming } = await refreshTrackedCalendarSources({ force }));
  } catch (e) {
    return showCalendarError(e);
  }

  try {
    // Index local entries so we can read user posters / titles back
    const localByKey = new Map(tracked.map(m => [calendarKeyForEntry(m), m]));

    // Normalize each upcoming entry into a unified row descriptor. Tracked
    // Calendar only shows confirmed future dates; undated shows belong in
    // library health/status checks, not the schedule.
    const dated   = [];
    const calendarRowKeys = new Set();

  function addCalendarRow(row) {
    if (!row.date) return;
    const key = `${row.kind}:${row.tmdbId || row.title}:${row.date}`;
    if (calendarRowKeys.has(key)) return;
    calendarRowKeys.add(key);
    dated.push(row);
  }

  for (const u of upcoming) {
    const key   = u.sourceKey || `${u.type}:${u.tmdbId}`;
    const local = localByKey.get(key);

    if (u.type === 'movie') {
      const rd = u.releaseDate;
      if (rd && rd >= todayStr && rd <= movieHorizonStr) {
        addCalendarRow({
          date: rd,
          kind: 'movie',
          tmdbId: u.tmdbId,
          title:   local?.title || u.title,
          poster:  local?.posterUrl || u.poster_url || (u.poster_path ? POSTER_BASE + u.poster_path : ''),
          sublabel: '🎬 Theatrical release',
          tmdbUrl:  u.externalUrl || `https://www.themoviedb.org/movie/${u.tmdbId}`,
        });
      }
      continue;
    }

    // TV / anime
    const ne = u.nextEpisode;
    if (ne && ne.airDate && ne.airDate >= todayStr && ne.airDate <= tvHorizonStr) {
      addCalendarRow({
        date: ne.airDate,
        kind: local?.mediaType === 'anime' ? 'anime' : 'tv',
        tmdbId: u.tmdbId || u.externalId || '',
        title:  local?.title || u.title,
        poster: local?.posterUrl || u.poster_url || (u.poster_path ? POSTER_BASE + u.poster_path : ''),
        sublabel: `S${ne.season}E${ne.episode}${ne.name ? ` · ${esc(ne.name)}` : ''}`,
        tmdbUrl:  u.externalUrl || `https://www.themoviedb.org/tv/${u.tmdbId}`,
      });
    }
  }

  // Keep the Calendar consistent with library card highlights. If a card is
  // pinned/highlighted because a new episode is available today, Calendar
  // should always show that same title under Today.
  for (const local of tracked) {
    const signal = getAiringTodaySignal(local, todayStr);
    if (!signal) continue;
    if (signal.type === 'episode') {
      const ne = signal.episode;
      addCalendarRow({
        date: todayStr,
        kind: local.mediaType === 'anime' ? 'anime' : 'tv',
        tmdbId: local.tmdbId || local.externalId || '',
        title: local.title,
        poster: local.posterUrl || '',
        sublabel: `S${ne.season}E${ne.episode}${ne.name ? ` · ${esc(ne.name)}` : ''}`,
        tmdbUrl: infoUrlForEntry(local),
      });
    } else if (signal.type === 'movie') {
      addCalendarRow({
        date: todayStr,
        kind: 'movie',
        tmdbId: local.tmdbId || '',
        title: local.title,
        poster: local.posterUrl || '',
        sublabel: '🎬 Theatrical release',
        tmdbUrl: infoUrlForEntry(local),
      });
    }
  }

  if (!dated.length) {
    body.querySelector('.calendar-list').innerHTML =
      `<p class="recs-empty">Nothing confirmed on the horizon. Calendar only shows titles with a future episode or release date from connected sources.</p>`;
    return;
  }

  // Group by date
  dated.sort((a, b) => a.date.localeCompare(b.date));
  const groups = {};
  for (const r of dated) (groups[r.date] ||= []).push(r);

  const groupHTML = Object.keys(groups).sort().map(date => {
    const isToday = date === todayStr;
    const rows = groups[date].map(r => calRow(r, { airingToday: isToday })).join('');
    const count = groups[date].length;
    return `
      <div class="cal-group${isToday ? ' cal-group-today' : ''}">
        <div class="cal-group-head">
          <h3 class="cal-group-date">${esc(relativeDayLabel(date))}</h3>
          <span class="cal-count">${count} ${count === 1 ? 'item' : 'items'}</span>
          ${isToday ? '<span class="cal-airing-pill">● Today</span>' : ''}
        </div>
        ${rows}
      </div>
    `;
  }).join('');

  body.querySelector('.calendar-list').innerHTML = groupHTML;

  // Refresh the nav-tab dot using the freshly-fetched cache
    updateCalendarAiringBadge();
  } catch (e) {
    showCalendarError(e);
  }

  function calRow(r, opts = {}) {
    const fallback = r.kind === 'movie' ? '🎬' : r.kind === 'anime' ? '🎌' : '📺';
    const poster = r.poster
      ? `<img class="cal-poster" src="${r.poster}" alt="${esc(r.title)}" loading="lazy" />`
      : `<div class="cal-poster cal-poster-emoji">${fallback}</div>`;
    const sub = r.sublabel;
    const kindLabel = r.kind === 'movie' ? 'Film' : r.kind === 'anime' ? 'Anime' : 'TV';
    return `
      <a class="cal-row${opts.airingToday ? ' cal-row-today' : ''}" href="${r.tmdbUrl}" target="_blank" rel="noopener noreferrer" title="View on TMDB">
        ${poster}
        <div class="cal-info">
          <div class="cal-title">${esc(r.title)}</div>
          <div class="cal-ep">${sub}</div>
        </div>
        <span class="cal-kind cal-kind-${r.kind}">${kindLabel}</span>
        ${opts.airingToday ? '<span class="cal-row-pill">● Today</span>' : ''}
      </a>
    `;
  }

  function showCalendarError(e) {
    const list = body.querySelector('.calendar-list');
    if (!list) return;
    list.innerHTML = `<p class="recs-empty">Couldn't load upcoming dates: ${esc(e?.message || e || 'Unknown error')}</p>`;
  }
}

// ── Discover-mode helpers ───────────────────────────────
function readDiscoverCache() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function writeDiscoverCache(c) {
  try { localStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(c)); } catch {}
}

async function fetchDiscoverUpcoming({ type, region, page = 1, force = false }) {
  const key = `${type}:${region}:${page}`;
  const cache = readDiscoverCache();
  const now = Date.now();
  const entry = cache[key];
  if (!force && entry && (now - entry.fetchedAt) < DISCOVER_TTL_MS) return entry.data;

  const r = await fetch(`/api/discover-upcoming?type=${type}&region=${region}&page=${page}`);
  if (!r.ok) throw new Error(`Discover fetch failed (${r.status})`);
  const data = await r.json();
  cache[key] = { fetchedAt: now, data };
  writeDiscoverCache(cache);
  return data;
}

async function renderCalendarDiscover(body, { force = false } = {}) {
  const typeLabels = { movie: '🎬 Films', tv: '📺 TV', anime: '🎌 Anime' };
  const typeFallbackEmoji = { movie: '🎬', tv: '📺', anime: '🎌' };
  const isMovie = discoverType === 'movie';

  body.innerHTML = `
    <div class="cal-subheader">
      <span class="cal-discover-label">Upcoming releases</span>
      <div class="cal-discover-types pill-group">
        ${DISCOVER_TYPES.map(t =>
          `<button type="button" class="pill-btn ${t === discoverType ? 'active' : ''}" data-disc-type="${t}">${typeLabels[t]}</button>`
        ).join('')}
      </div>
      ${isMovie ? `
      <select id="cal-region-select" class="cal-region-select" aria-label="Region" title="Region">
        ${DISCOVER_REGIONS.map(r =>
          `<option value="${r}"${r === discoverRegion ? ' selected' : ''}>🌍 ${r}</option>`
        ).join('')}
      </select>` : ''}
      <button id="cal-discover-refresh" class="cal-refresh-btn" title="Re-fetch from TMDB now (bypasses 24h cache)">↻ Refresh</button>
    </div>
    <div id="cal-discover-grid" class="discover-grid"><div class="recs-loading"><span class="recs-spinner"></span> Loading…</div></div>
  `;

  body.querySelectorAll('.cal-discover-types .pill-btn[data-disc-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.discType;
      if (next === discoverType) return;
      discoverType = next;
      localStorage.setItem('cinetrack_discover_type', discoverType);
      scheduleSavePrefs();
      renderCalendar();
    });
  });
  body.querySelector('#cal-region-select')?.addEventListener('change', e => {
    discoverRegion = e.target.value;
    localStorage.setItem('cinetrack_discover_region', discoverRegion);
    scheduleSavePrefs();
    renderCalendar();
  });
  body.querySelector('#cal-discover-refresh').addEventListener('click', () => renderCalendar({ force: true }));

  let data;
  try {
    data = await fetchDiscoverUpcoming({
      type:   discoverType,
      region: isMovie ? discoverRegion : 'US',
      page:   1,
      force,
    });
  } catch (e) {
    body.querySelector('#cal-discover-grid').innerHTML =
      `<p class="recs-empty">Couldn't load upcoming ${esc(typeLabels[discoverType] || discoverType)}: ${esc(e.message)}</p>`;
    return;
  }

  const items = (data.results || []).slice(0, 24);
  if (!items.length) {
    const more = isMovie
      ? `No upcoming films found for ${esc(discoverRegion)}. Try a different region.`
      : 'No upcoming titles found right now. Check back later.';
    body.querySelector('#cal-discover-grid').innerHTML = `<p class="recs-empty">${more}</p>`;
    return;
  }

  const tracked = new Set(movies.filter(m => m.tmdbId).map(m => String(m.tmdbId)));
  const tmdbPath = isMovie ? 'movie' : 'tv';
  const fallback = typeFallbackEmoji[discoverType];

  const cards = items.map(item => {
    const idStr   = String(item.tmdbId);
    const isAdded = tracked.has(idStr);
    const poster  = item.poster_path
      ? `<img class="discover-poster" src="${POSTER_BASE}${item.poster_path}" alt="${esc(item.title)}" loading="lazy" />`
      : `<div class="discover-poster discover-poster-emoji">${fallback}</div>`;
    const dateLabel = relativeDayLabel(item.releaseDate);
    return `
      <div class="discover-card" data-discover-id="${idStr}">
        <a class="discover-poster-wrap" href="https://www.themoviedb.org/${tmdbPath}/${idStr}" target="_blank" rel="noopener noreferrer" title="View on TMDB">
          ${poster}
        </a>
        <div class="discover-meta">
          <div class="discover-title" title="${esc(item.title)}">${esc(item.title)}</div>
          <div class="discover-date">${esc(dateLabel)}</div>
          <button type="button"
            class="discover-add-btn ${isAdded ? 'added' : ''}"
            data-add-id="${idStr}"
            data-add-type="${discoverType}"
            data-add-title="${esc(item.title)}"
            data-add-year="${esc(item.year || '')}"
            data-add-poster="${esc(item.poster_path || '')}"
            ${isAdded ? 'disabled' : ''}>${isAdded ? '✓ Added' : '+ Watchlist'}</button>
        </div>
      </div>
    `;
  }).join('');

  const grid = body.querySelector('#cal-discover-grid');
  grid.innerHTML = cards;

  grid.addEventListener('click', e => {
    const btn = e.target.closest('.discover-add-btn[data-add-id]');
    if (!btn || btn.disabled) return;
    addFromDiscover({
      tmdbId: btn.dataset.addId,
      type:   btn.dataset.addType,
      title:  btn.dataset.addTitle,
      year:   btn.dataset.addYear,
      posterPath: btn.dataset.addPoster,
    }, btn);
  });
}

function addFromDiscover({ tmdbId, type, title, year, posterPath }, btn) {
  const idStr = String(tmdbId);
  if (movies.some(m => String(m.tmdbId) === idStr)) {
    btn.textContent = '✓ Added';
    btn.classList.add('added');
    btn.disabled = true;
    return;
  }
  const safeMediaType = type === 'anime' ? 'anime' : (type === 'tv' ? 'tv' : 'movie');
  const fetchType     = safeMediaType === 'movie' ? 'movie' : 'tv';
  const added = addLibraryEntry({
    addedAt:   Date.now(),
    title:     title || '',
    year:      year || '',
    status:    'watchlist',
    rating:    0,
    mediaType: safeMediaType,
    tmdbId:    Number(tmdbId),
    posterUrl: posterPath ? POSTER_BASE + posterPath : '',
    genre: '', director: '', country: '', notes: '', runtime: 0,
  });
  const newId = added.id;
  save();
  updateCountryDropdown();
  btn.textContent = '✓ Added';
  btn.classList.add('added');
  btn.disabled = true;

  // Background-enrich with full TMDB metadata (matches the rec-add flow).
  (async () => {
    try {
      const details = await fetchTMDBDetails(tmdbId, fetchType);
      const m = movies.find(m => m.id === newId);
      if (!m) return;
      const patch = {};
      if (details.title)    patch.title    = details.title;
      if (details.year)     patch.year     = details.year;
      if (details.genre)    patch.genre    = details.genre;
      if (details.director) patch.director = details.director;
      if (details.country)  patch.country  = details.country;
      if (details.runtime)  patch.runtime  = details.runtime;
      if (details.overview && !m.notes) patch.notes = details.overview;
      if (details.poster_path && !m.posterUrl) patch.posterUrl = POSTER_BASE + details.poster_path;
      if (Array.isArray(details.seasons) && details.seasons.length) {
        patch.seasons = details.seasons.map(s => ({
          number: s.number, total: s.total, watched: 0, name: s.name,
        }));
        patch.totalEpisodes = patch.seasons.reduce((sum, x) => sum + (x.total || 0), 0);
        patch.watchedEpisodes = 0;
      } else if (details.total_episodes) {
        patch.totalEpisodes = details.total_episodes;
      }
      updateLibraryEntry(newId, patch, { allowDowngrade: false });
      save();
      updateCountryDropdown();
      if (activeView === 'content') render();
      warmUpcomingCacheForBadge();
    } catch {}
  })();
}

const DISMISSED_RECS_KEY = 'cinetrack_dismissed_recs';
const RECS_CACHE_KEY     = 'cinetrack_recs_cache_v2';
const RECS_REFRESH_KEY   = 'cinetrack_recs_refresh_index';
const RECS_VISIBLE_LIMIT = 10;
const RECS_TTL_MS        = 24 * 60 * 60 * 1000;  // 24 hours

function getDismissedRecs() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_RECS_KEY) || '[]').map(String)); }
  catch { return new Set(); }
}
function dismissRec(id) {
  const set = getDismissedRecs();
  set.add(String(id));
  localStorage.setItem(DISMISSED_RECS_KEY, JSON.stringify([...set]));
}

function readRecsCache() {
  try { return JSON.parse(localStorage.getItem(RECS_CACHE_KEY) || 'null'); }
  catch { return null; }
}
function writeRecsCache(cache) {
  localStorage.setItem(RECS_CACHE_KEY, JSON.stringify(cache));
}

function dismissedRecProfile() {
  const dismissed = getDismissedRecs();
  const cache = readRecsCache();
  const results = Array.isArray(cache?.results) ? cache.results : [];
  const profile = { genres: {}, mediaTypes: {} };
  for (const rec of results) {
    if (!dismissed.has(String(rec.id))) continue;
    const type = recMediaType(rec);
    if (type) profile.mediaTypes[type] = (profile.mediaTypes[type] || 0) + 1;
    String(rec.genre || '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean)
      .forEach(g => { profile.genres[g] = (profile.genres[g] || 0) + 1; });
  }
  return profile;
}

function recommendationScopeType() {
  return ['movie', 'tv', 'anime'].includes(statsTypeFilter) ? statsTypeFilter : 'all';
}

function recIdentity({ title, year, media_type }) {
  return `${normaliseDuplicateTitle(title)}:${normaliseDuplicateYear(year)}:${media_type || ''}`;
}

function recMediaType(rec) {
  return recommendationModel.mediaType(rec);
}

function compatibleRecTypes(a, b) {
  return recommendationModel.compatibleTypes(a, b);
}

function normaliseRecommendationForScope(rec, scope = 'all') {
  return recommendationModel.normaliseForScope(rec, scope);
}

function recommendationSourceKey(rec) {
  return recommendationModel.sourceKey(rec);
}

function findTrackedRecommendationMatch(rec) {
  if (!rec) return null;
  const source = rec.source || 'tmdb';
  const recType = recMediaType(rec);
  const recId = rec.id == null ? '' : String(rec.id);
  const recSourceKey = recommendationSourceKey(rec);
  const recTitle = normaliseDuplicateTitle(rec.title);
  const recYear = normaliseDuplicateYear(rec.year);

  return movies.find(m => {
    const movieType = m.mediaType || '';
    if (!compatibleRecTypes(movieType, recType)) return false;

    if (source === 'tmdb' && recId && m.tmdbId && String(m.tmdbId) === recId) return true;
    if (recSourceKey && m.externalSource && m.externalId && `${m.externalSource}:${m.externalId}` === recSourceKey) return true;

    const movieTitle = normaliseDuplicateTitle(m.title);
    if (!movieTitle || !recTitle || movieTitle !== recTitle) return false;

    const movieYear = normaliseDuplicateYear(m.year);
    if (movieYear && recYear) return movieYear === recYear;

    return recTitle.length >= 8;
  }) || null;
}

function recommendationInfoUrl(rec) {
  return recommendationModel.infoUrl(rec);
}

async function resolveRecommendationSeed(movie) {
  if (movie.mediaType === 'anime' && movie.externalSource === 'anilist' && movie.externalId) {
    return { ...movie, _recAnilistId: movie.externalId };
  }
  if (movie.mediaType === 'anime') {
    try {
      const params = new URLSearchParams({
        provider: 'anilist',
        action: 'match',
        q: movie.title || '',
      });
      if (movie.year) params.set('year', movie.year);
      const r = await fetch(`/api/external?${params}`);
      if (r.ok) {
        const data = await r.json();
        const id = data?.media?.id;
        if (data?.matched && id) {
          return { ...movie, _recAnilistId: id, _recTmdbId: movie.tmdbId || null };
        }
      }
    } catch {
      // TMDB fallback below still gives older TMDB-only anime a chance.
    }
  }
  if (movie.tmdbId) return { ...movie, _recTmdbId: movie.tmdbId };
  if (movie.externalSource !== 'tvmaze' || movie.mediaType !== 'tv' || !movie.externalId) return null;

  try {
    const params = new URLSearchParams({ title: movie.title || '', type: 'tv' });
    if (movie.year) params.set('year', movie.year);
    const r = await fetch(`/api/match?${params}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.matched || !data.tmdbId) return null;
    return { ...movie, _recTmdbId: data.tmdbId };
  } catch {
    return null;
  }
}

function normaliseAnilistRecommendation(media) {
  return recommendationModel.normaliseAnilist(media);
}

function seedKeyForMovie(movie) {
  return recommendationModel.seedKey(movie);
}

function recommendationRefreshIndex(scope, force = false) {
  const key = `${RECS_REFRESH_KEY}:${scope}`;
  const current = Number(localStorage.getItem(key) || 0);
  if (!force) return current;
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function rotateList(items, offset) {
  return recommendationModel.rotateList(items, offset);
}

function selectRecommendationSeeds(scored, limit = 8, rotationIndex = 0, force = false) {
  return recommendationModel.selectSeeds(scored, limit, rotationIndex, force);
}

async function fetchAnilistRecommendationResults(seededPool, { force = false } = {}) {
  const anilistIds = seededPool
    .filter(m => m._recAnilistId)
    .map(m => String(m._recAnilistId))
    .slice(0, 8);
  if (!anilistIds.length) return [];

  const params = new URLSearchParams({
    provider: 'anilist',
    action: 'recommendations',
    ids: anilistIds.join(','),
  });
  if (force) params.set('_', String(Date.now()));
  const r = await fetch(`/api/external?${params}`, { cache: force ? 'no-store' : 'default' });
  if (!r.ok) return [];
  const anilistData = await r.json();
  return (anilistData.results || []).map(normaliseAnilistRecommendation);
}

// Fisher–Yates partial shuffle: take n items at random from arr.
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function scoreRecommendation(rec, { genreCounts = {}, dismissedProfile = {}, scope = 'all' } = {}) {
  return recommendationModel.score(rec, { genreCounts, dismissedProfile, scope });
}

function rankRecommendationResults(results, context) {
  return recommendationModel.rank(results, context);
}

function rotateForcedRecommendations(results, refreshIndex, force) {
  return recommendationModel.rotateForced(results, refreshIndex, force, RECS_VISIBLE_LIMIT);
}

function visibleRecommendationCount(results, scope) {
  const dismissed = getDismissedRecs();
  const seen = new Set();
  let count = 0;
  for (const rawRec of results || []) {
    const rec = normaliseRecommendationForScope(rawRec, scope);
    const key = recIdentity(rec);
    if (scope !== 'all' && rec.media_type !== scope) continue;
    if (dismissed.has(String(rec.id)) || findTrackedRecommendationMatch(rec) || seen.has(key)) continue;
    seen.add(key);
    count += 1;
  }
  return count;
}

async function loadRecommendations({ force = false } = {}) {
  const section = document.getElementById('recs-section');
  if (!section) return;
  const scope = recommendationScopeType();

  // Pool: watched + in_progress titles with tmdbId. In-progress shows
  // reflect what you're currently watching → reasonable to seed from.
  const pool = movies.filter(m =>
    (m.status === 'watched' || m.status === 'in_progress') &&
    (scope === 'all' || m.mediaType === scope) &&
    (m.tmdbId ||
      (m.externalSource === 'tvmaze' && m.externalId && m.mediaType === 'tv') ||
      (m.externalSource === 'anilist' && m.externalId && m.mediaType === 'anime'))
  );

  if (!pool.length) {
    section.innerHTML = '<p class="recs-empty">Mark some titles as watched in this view to get personalised recommendations.</p>';
    return;
  }

  // Genre profile (only watched titles count toward the genre weights).
  const watched = movies.filter(m => m.status === 'watched' && (scope === 'all' || m.mediaType === scope));
  const genreCounts = {};
  watched.forEach(m => {
    if (!m.genre) return;
    m.genre.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  // Score each pool entry:
  //   ratingMul  = (rating || 5) / 5  → unrated = 1.0, 10/10 = 2.0, 1/10 = 0.2
  //   genreScore = avg of its genres' frequencies
  //   final      = ratingMul * (genreScore + 1)   (+1 so genre-less still counts)
  const scored = pool.map(m => {
    const genres = (m.genre || '').split(',').map(g => g.trim()).filter(Boolean);
    const genreScore = genres.length
      ? genres.reduce((s, g) => s + (genreCounts[g] || 0), 0) / genres.length
      : 0;
    const ratingMul = (m.rating || 5) / 5;
    return { ...m, _score: ratingMul * (genreScore + 1) };
  }).sort((a, b) => b._score - a._score || (b.addedAt || 0) - (a.addedAt || 0));

  // Top 20 → random sample 8. Sampling gives variety on refresh while
  // keeping seeds grounded in your strongest signals.
  const topPool = scored.slice(0, 20);
  const refreshIndex = recommendationRefreshIndex(scope, force);
  const poolKey = `${scope}:` + topPool.map(m =>
    seedKeyForMovie(m)
  ).sort().join(',');

  // Cache check (skip when forced)
  if (!force) {
    const cache = readRecsCache();
    if (cache && cache.poolKey === poolKey && (Date.now() - cache.fetchedAt) < RECS_TTL_MS) {
      if (visibleRecommendationCount(cache.results, scope) >= 6) {
        const ranked = rankRecommendationResults(cache.results, {
          genreCounts,
          dismissedProfile: dismissedRecProfile(),
          scope,
        });
        renderRecsCards(section, ranked, genreCounts, scope);
        return;
      }
    }
  }

  const selectedPool = selectRecommendationSeeds(topPool, Math.min(8, topPool.length), refreshIndex, force);
  const seededPool = (await Promise.all(selectedPool.map(resolveRecommendationSeed))).filter(Boolean);
  if (!seededPool.length) {
    section.innerHTML = '<p class="recs-empty">Could not match your watched titles to recommendation sources yet. Try refreshing after adding a few more watched titles.</p>';
    return;
  }

  if (scope === 'anime') {
    let anilistResults = [];
    try {
      anilistResults = await fetchAnilistRecommendationResults(seededPool, { force });
    } catch {
      anilistResults = [];
    }
    if (anilistResults.length >= 12) {
      anilistResults = rankRecommendationResults(anilistResults, {
        genreCounts,
        dismissedProfile: dismissedRecProfile(),
        scope,
      });
      anilistResults = rotateForcedRecommendations(anilistResults, refreshIndex, force);
      writeRecsCache({ fetchedAt: Date.now(), poolKey, results: anilistResults, source: 'anilist' });
      renderRecsCards(section, anilistResults, genreCounts, scope);
      return;
    }
  }

  const tmdbSeededPool = seededPool.filter(m => m._recTmdbId);
  if (!tmdbSeededPool.length) {
    section.innerHTML = `<p class="recs-empty">No ${scope === 'anime' ? 'anime ' : ''}recommendations found yet. Try marking a few more titles as watched or in progress.</p>`;
    return;
  }

  const sample = selectRecommendationSeeds(tmdbSeededPool, Math.min(8, tmdbSeededPool.length), refreshIndex, force);
  const idParam = sample.map(m => `${m._recTmdbId}:${m.mediaType}`).join(',');

  let data;
  try {
    const params = new URLSearchParams({ ids: idParam });
    if (scope !== 'all') params.set('type', scope);
    if (force) params.set('_', String(Date.now()));
    const r = await fetch(`/api/recommend?${params}`, { cache: force ? 'no-store' : 'default' });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch {
    section.innerHTML = '<p class="recs-empty">Recommendations require Vercel deployment with a TMDB API key.</p>';
    return;
  }

  let results = data.results || [];
  if (scope === 'anime') {
    try {
      const anilistResults = await fetchAnilistRecommendationResults(seededPool, { force });
      const seenAnime = new Set(anilistResults.map(rec => recommendationSourceKey(rec) || recIdentity(rec)));
      const tmdbFallback = results
        .map(rec => normaliseRecommendationForScope(rec, scope))
        .filter(rec => !seenAnime.has(recommendationSourceKey(rec) || recIdentity(rec)))
        .slice(0, Math.max(0, RECS_VISIBLE_LIMIT - anilistResults.length));
      results = [...anilistResults, ...tmdbFallback];
    } catch {
      results = results.map(rec => normaliseRecommendationForScope(rec, scope));
    }
  }
  results = rankRecommendationResults(results, {
    genreCounts,
    dismissedProfile: dismissedRecProfile(),
    scope,
  });
  results = rotateForcedRecommendations(results, refreshIndex, force);
  writeRecsCache({ fetchedAt: Date.now(), poolKey, results, source: scope === 'anime' ? 'anilist-first' : 'tmdb' });
  renderRecsCards(section, results, genreCounts, scope);
}

function renderRecsCards(section, results, genreCounts, scope = 'all') {
  const dismissed      = getDismissedRecs();
  const seen = new Set();
  const recs = [];
  for (const rawRec of results) {
    const r = normaliseRecommendationForScope(rawRec, scope);
    const key = recIdentity(r);
    if (scope !== 'all' && r.media_type !== scope) continue;
    if (
      dismissed.has(String(r.id)) ||
      findTrackedRecommendationMatch(r) ||
      seen.has(key)
    ) continue;
    seen.add(key);
    recs.push(r);
    if (recs.length >= RECS_VISIBLE_LIMIT) break;
  }

  if (!recs.length) {
    section.innerHTML = `
      <div class="recs-heading-row">
        <h3 class="recs-heading">✨ Recommended For You</h3>
        <button class="recs-refresh-btn" id="recs-refresh-btn" title="Re-sample your seeds and re-fetch from TMDB">↻ Refresh</button>
      </div>
      <p class="recs-empty">No new recommendations found — try watching more titles!</p>
    `;
    document.getElementById('recs-refresh-btn').addEventListener('click', () => {
      section.innerHTML = '<div class="recs-loading"><span class="recs-spinner"></span> Re-sampling and fetching…</div>';
      loadRecommendations({ force: true });
    });
    return;
  }

  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  const genreLabel = topGenres.length ? topGenres.join(', ') : 'your watch history';
  const scopeLabel = scope === 'movie' ? 'films' : scope === 'tv' ? 'TV shows' : scope === 'anime' ? 'anime' : 'what';

  section.innerHTML = `
    <div class="recs-heading-row">
      <h3 class="recs-heading">✨ Recommended For You</h3>
      <button class="recs-refresh-btn" id="recs-refresh-btn" title="Re-sample your seeds and re-fetch from TMDB">↻ Refresh</button>
    </div>
    <p class="recs-sub">Based on ${esc(scopeLabel)} you've watched · favouring ${esc(genreLabel)}</p>
    <div class="recs-grid">
      ${recs.map(r => {
        const infoUrl = recommendationInfoUrl(r);
        const posterContent = r.poster_path
          ? `<img src="${externalPosterUrl(r.poster_path)}" alt="${esc(r.title)}" loading="lazy" />`
          : `<div class="rec-poster-placeholder">${r.media_type === 'anime' ? '🎌' : r.media_type === 'tv' ? '📺' : '🎬'}</div>`;
        const poster = infoUrl
          ? `<a class="rec-poster rec-source-link" href="${infoUrl}" target="_blank" rel="noopener noreferrer" title="View details">${posterContent}</a>`
          : `<div class="rec-poster">${posterContent}</div>`;
        const title = infoUrl
          ? `<a class="rec-title rec-source-link" href="${infoUrl}" target="_blank" rel="noopener noreferrer" title="View details">${esc(r.title)}</a>`
          : `<div class="rec-title">${esc(r.title)}</div>`;
        return `
        <div class="rec-card" data-rec-card="${r.id}">
          <button class="rec-dismiss-btn" data-rec-dismiss="${r.id}" title="Not interested">✕</button>
          ${poster}
          <div class="rec-info">
            ${title}
            ${r.year ? `<div class="rec-year">${r.year}</div>` : ''}
            ${r.overview ? `<div class="rec-overview" title="Tap to expand">${esc(r.overview)}</div>` : ''}
          </div>
          <button class="rec-add-btn" data-rec-id="${r.id}" data-rec-source="${r.source || 'tmdb'}" data-rec-type="${r.media_type}"
            data-rec-title="${esc(r.title)}" data-rec-year="${r.year || ''}"
            data-rec-poster="${r.poster_path || ''}" title="Add to Watchlist">＋ Watchlist</button>
        </div>
      `}).join('')}
    </div>
  `;

  document.getElementById('recs-refresh-btn').addEventListener('click', () => {
    section.innerHTML = '<div class="recs-loading"><span class="recs-spinner"></span> Re-sampling and fetching…</div>';
    loadRecommendations({ force: true });
  });

  // Replace (not add) the section click handler — guards against the
  // duplicate-listener leak when renderStats is opened repeatedly.
  section.onclick = e => {
    if (e.target.closest('#recs-refresh-btn')) return;  // refresh button has its own handler

    const overview = e.target.closest('.rec-overview');
    if (overview) {
      overview.closest('.rec-card')?.classList.toggle('expanded');
      return;
    }

    const dismissBtn = e.target.closest('.rec-dismiss-btn');
    if (dismissBtn) {
      const id = dismissBtn.dataset.recDismiss;
      dismissRec(id);
      const card = section.querySelector(`.rec-card[data-rec-card="${id}"]`);
      if (card) {
        card.classList.add('rec-card-removing');
        setTimeout(() => {
          card.remove();
          if (!section.querySelector('.rec-card')) {
            section.querySelector('.recs-grid')?.remove();
            section.querySelector('.recs-sub')?.remove();
            section.insertAdjacentHTML('beforeend',
              '<p class="recs-empty">All caught up — dismissed everything for now. Hit ↻ Refresh for a fresh batch.</p>');
          }
        }, 200);
      }
      return;
    }

    const btn = e.target.closest('.rec-add-btn');
    if (!btn) return;
    const recId     = btn.dataset.recId;
    const recSource = btn.dataset.recSource || 'tmdb';
    const recType   = btn.dataset.recType;
    const recTitle  = btn.dataset.recTitle;
    const recYear   = btn.dataset.recYear;
    const recPoster = btn.dataset.recPoster;
    const recCandidate = { id: recId, source: recSource, externalId: recId, media_type: recType, title: recTitle, year: recYear };
    if (findTrackedRecommendationMatch(recCandidate)) {
      btn.textContent = '✓ Added';
      btn.disabled = true;
      return;
    }
    const added = addLibraryEntry({
      addedAt:   Date.now(),
      title:     recTitle,
      year:      recYear,
      status:    'watchlist',
      rating:    0,
      mediaType: recType === 'anime' ? 'anime' : (recType === 'tv' ? 'tv' : 'movie'),
      tmdbId:    recSource === 'tmdb' ? Number(recId) : null,
      externalSource: recSource,
      externalId: recSource === 'tmdb' ? String(recId) : recId,
      posterUrl: recPoster ? externalPosterUrl(recPoster) : '',
      genre: '', director: '', country: '', notes: '', runtime: 0,
    });
    const newId = added.id;
    save(); updateCountryDropdown();
    btn.textContent = '✓ Added';
    btn.disabled = true;
    // Enrich with full metadata in the background.
    (async () => {
      try {
        const details = recSource === 'anilist'
          ? await fetchExternalDetails(recId, 'anime')
          : await fetchTMDBDetails(recId, recType === 'anime' ? 'tv' : (recType === 'tv' ? 'tv' : 'movie'));
        const m = movies.find(m => m.id === newId);
        if (!m) return;
        const before = libraryModel.clone(m);
        applyMetadataRefresh(m, details);
        updateLibraryEntry(newId, libraryModel.protectProgress(before, m), { allowDowngrade: false });
        save();
        updateCountryDropdown();
        if (activeView === 'content') render();
      } catch {}
    })();
  };
}

function renderBarChart(entries, maxVal, color, action = null) {
  if (!entries.length || !maxVal) return '<p class="chart-empty">No data yet</p>';
  return entries.map(([label, count]) => {
    const labelStr = String(label);
    const attrs = action
      ? `class="chart-row chart-row-clickable" data-bar-action="${action}" data-bar-value="${esc(labelStr)}"`
      : `class="chart-row"`;
    return `
    <div ${attrs}>
      <div class="chart-label" title="${esc(labelStr)}">${esc(labelStr)}</div>
      <div class="chart-track">
        <div class="chart-fill" style="width:${Math.max(3, Math.round((count / maxVal) * 100))}%;background:${color}"></div>
      </div>
      <div class="chart-count">${count}</div>
    </div>
  `;
  }).join('');
}

// ── Community: compatibility score ──────────────────────
function computeCompatibility(myMovies, theirMovies) {
  const keyOf = m => m.tmdbId ? `${m.tmdbId}:${m.mediaType}` : null;
  const myWatched = new Map();
  const theirWatched = new Map();
  myMovies.forEach(m => { if (m.status === 'watched' && keyOf(m)) myWatched.set(keyOf(m), m); });
  theirMovies.forEach(m => { if (m.status === 'watched' && keyOf(m)) theirWatched.set(keyOf(m), m); });
  if (!myWatched.size || !theirWatched.size) {
    return { overlap: 0, ratingMatch: null, combined: null, sharedCount: 0 };
  }
  const sharedKeys = [...myWatched.keys()].filter(k => theirWatched.has(k));
  const minSize = Math.min(myWatched.size, theirWatched.size);
  const overlap = Math.round((sharedKeys.length / minSize) * 100);

  let ratingMatch = null;
  const bothRated = sharedKeys.filter(k => (myWatched.get(k).rating || 0) > 0 && (theirWatched.get(k).rating || 0) > 0);
  if (bothRated.length) {
    const avgDiff = bothRated.reduce(
      (s, k) => s + Math.abs((myWatched.get(k).rating || 0) - (theirWatched.get(k).rating || 0)), 0
    ) / bothRated.length;
    ratingMatch = Math.round((1 - avgDiff / 10) * 100);
  }

  const combined = ratingMatch != null
    ? Math.round(overlap * 0.4 + ratingMatch * 0.6)
    : overlap;
  return { overlap, ratingMatch, combined, sharedCount: sharedKeys.length };
}

// ── Community: profile modal ────────────────────────────
function openCommunityProfile(profile, userMovies) {
  const body  = document.getElementById('community-profile-body');
  const modal = document.getElementById('community-profile-modal');
  if (!body || !modal) return;

  const username = profile.username || 'Anonymous';
  const initial  = username[0].toUpperCase();

  const watched    = userMovies.filter(m => m.status === 'watched');
  const inProgress = userMovies.filter(m => m.status === 'in_progress');
  const watchlist  = userMovies.filter(m => m.status === 'watchlist');

  const totalMins = userMovies.reduce((s, m) => s + actualWatchedMinutes(m), 0);

  const ratings = watched.filter(m => m.rating > 0).map(m => m.rating);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;

  const compat = computeCompatibility(movies, userMovies);

  // Top 4 favourites: highest-rated watched, tiebreak by recency.
  const favourites = watched
    .filter(m => (m.rating || 0) >= 1)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, 4);

  // Currently watching: TV/anime in_progress with known totals, closest-to-done first.
  const currentlyWatching = inProgress
    .filter(m => (m.mediaType === 'tv' || m.mediaType === 'anime') && (m.totalEpisodes || 0) > 0)
    .map(m => ({
      m,
      pct: Math.round((Math.min(m.watchedEpisodes || 0, m.totalEpisodes) / m.totalEpisodes) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  // By type
  const byType = ['movie', 'tv', 'anime'].map(t => ({
    label: t === 'movie' ? '🎬 Films' : t === 'tv' ? '📺 TV Shows' : '🎌 Anime',
    watched:    userMovies.filter(m => m.mediaType === t && m.status === 'watched').length,
    inProgress: userMovies.filter(m => m.mediaType === t && m.status === 'in_progress').length,
    watchlist:  userMovies.filter(m => m.mediaType === t && m.status === 'watchlist').length,
  })).filter(t => t.watched + t.inProgress + t.watchlist > 0);

  // Top genres / countries / rating dist
  const genreCounts = {};
  watched.forEach(m => (m.genre || '').split(',').map(g => g.trim()).filter(Boolean)
    .forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const countryCounts = {};
  watched.forEach(m => { if (m.country) countryCounts[m.country] = (countryCounts[m.country] || 0) + 1; });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const ratingDist = Array.from({ length: 10 }, (_, i) => {
    const star = 10 - i;
    return [star, ratings.filter(r => r === star).length];
  }).filter(([, c]) => c > 0);

  const recent = [...userMovies].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 8);

  const maxGenre   = topGenres[0]?.[1]   || 1;
  const maxCountry = topCountries[0]?.[1] || 1;
  const maxRating  = ratingDist[0]?.[1]   || 1;

  body.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-lg">${esc(initial)}</div>
      <div class="profile-hero-info">
        <div class="profile-display-name">${esc(username)}</div>
        ${compat.combined != null ? `
          <div class="compat-row">
            <span class="compat-badge">🎯 ${compat.combined}% match</span>
            <span class="compat-detail">${compat.sharedCount} shared title${compat.sharedCount === 1 ? '' : 's'}${compat.ratingMatch != null ? ` · ${compat.ratingMatch}% rating similarity` : ''}</span>
          </div>` : `<div class="compat-row"><span class="compat-detail">No shared titles yet</span></div>`}
      </div>
    </div>

    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-card-value">${watched.length}</div>
        <div class="stat-card-label">Watched</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${watchlist.length}</div>
        <div class="stat-card-label">Watchlist</div>
      </div>
      <div class="stat-card" title="Total runtime, prorated by progress on each series">
        <div class="stat-card-value">${formatTimeSpent(totalMins) || '—'}</div>
        <div class="stat-card-label">Time Spent</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgRating ? '★ ' + avgRating : '—'}</div>
        <div class="stat-card-label">Avg Rating</div>
      </div>
    </div>

    ${favourites.length ? `
    <div class="profile-section">
      <h3>Top Favourites</h3>
      <div class="fav-grid">
        ${favourites.map(m => `
          <div class="fav-card" title="${esc(m.title)}${m.rating ? ' · ★ ' + m.rating : ''}">
            ${m.posterUrl
              ? `<img class="fav-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" />`
              : `<div class="fav-poster fav-poster-emoji">${m.mediaType === 'anime' ? '🎌' : m.mediaType === 'tv' ? '📺' : '🎬'}</div>`}
            <div class="fav-meta">
              <div class="fav-title">${esc(m.title)}</div>
              ${m.rating ? `<div class="fav-rating">★ ${m.rating}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${currentlyWatching.length ? `
    <div class="profile-section">
      <h3>Currently Watching</h3>
      <div class="curr-watching-list">
        ${currentlyWatching.map(({ m, pct }) => `
          <div class="curr-watching-row">
            ${m.posterUrl
              ? `<img class="curr-watching-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" />`
              : `<div class="curr-watching-poster curr-watching-emoji">${m.mediaType === 'anime' ? '🎌' : '📺'}</div>`}
            <div class="curr-watching-info">
              <div class="curr-watching-title">${esc(m.title)}</div>
              <div class="curr-watching-progress">
                <div class="curr-watching-bar"><div class="curr-watching-bar-fill" style="width:${pct}%"></div></div>
                <span class="curr-watching-pct">${m.watchedEpisodes || 0} / ${m.totalEpisodes} eps · ${pct}%</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${byType.length ? `
    <div class="profile-section">
      <h3>By Type</h3>
      <div class="profile-type-grid">
        ${byType.map(t => `
          <div class="profile-type-card">
            <div class="profile-type-label">${t.label}</div>
            <div class="profile-type-stats">
              <span>✓ ${t.watched} watched</span>
              ${t.inProgress ? `<span>▶ ${t.inProgress} in progress</span>` : ''}
              <span>⏳ ${t.watchlist} on list</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="stats-charts">
      ${topGenres.length ? `
      <div class="chart-section">
        <h3>Top Genres</h3>
        <div class="chart-bars">${renderBarChart(topGenres, maxGenre, '#e2405a')}</div>
      </div>` : ''}
      ${topCountries.length ? `
      <div class="chart-section">
        <h3>Top Countries</h3>
        <div class="chart-bars">${renderBarChart(topCountries, maxCountry, '#3b9eff')}</div>
      </div>` : ''}
      ${ratingDist.length ? `
      <div class="chart-section chart-section-sm">
        <h3>Ratings</h3>
        <div class="chart-bars">${renderBarChart(ratingDist.map(([s, c]) => ['★'.repeat(s), c]), maxRating, '#f5a623')}</div>
      </div>` : ''}
    </div>

    ${recent.length ? `
    <div class="profile-section">
      <h3>Recently Added</h3>
      <div class="profile-recent">
        ${recent.map(m => `
          <div class="profile-recent-card" title="${esc(m.title)}">
            ${m.posterUrl
              ? `<img class="profile-recent-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" />`
              : `<div class="profile-recent-poster profile-recent-emoji">${m.mediaType === 'anime' ? '🎌' : m.mediaType === 'tv' ? '📺' : '🎬'}</div>`}
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;

  modal.classList.remove('hidden');
}

document.getElementById('community-profile-close')?.addEventListener('click', () => {
  document.getElementById('community-profile-modal')?.classList.add('hidden');
});
document.getElementById('community-profile-modal')?.addEventListener('click', e => {
  if (e.target.id === 'community-profile-modal') {
    e.currentTarget.classList.add('hidden');
  }
});

// ── Community panel ─────────────────────────────────────
async function renderCommunity() {
  const sharingToggle = document.getElementById('sharing-toggle');
  if (sharingToggle) sharingToggle.checked = sharingEnabled;

  const communityGrid = document.getElementById('community-grid');
  if (!communityGrid) return;

  if (!currentUser || offlineMode) {
    communityGrid.innerHTML = '<p class="community-empty">Sign in to see the community.</p>';
    return;
  }

  communityGrid.innerHTML = '<p class="community-loading">Loading community…</p>';

  const SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  sharing_enabled boolean DEFAULT false,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sharing_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  movies jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS movies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "user_data_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_shared" ON public.user_data;
DROP POLICY IF EXISTS "Community read shared data" ON public.user_data;
DROP POLICY IF EXISTS "Users manage their own data" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_insert_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_update_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_delete_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_shared" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_authenticated" ON public.user_data;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "user_data_select_authenticated" ON public.user_data FOR SELECT TO authenticated USING (
  ((select auth.uid()) = user_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_data.user_id
      AND p.sharing_enabled = true
  )
);
CREATE POLICY "user_data_insert_own" ON public.user_data FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_data_update_own" ON public.user_data FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_data_delete_own" ON public.user_data FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;`;

  // Slow-query hint only. Do not replace the community panel with setup SQL
  // unless the actual Supabase request fails below.
  const slowTimer = setTimeout(() => {
    if (!communityGrid.textContent.includes('Loading community')) return;
    communityGrid.innerHTML = '<p class="community-loading">Still connecting to Supabase… this can take a moment on a cold project.</p>';
  }, 8000);

  try {
    const token = await getSupabaseAccessToken();
    if (!token) throw new Error('Missing Supabase session token. Sign out and sign in again.');

    const { response: communityRes, data: community } = await fetchJsonWithTimeout(
      `/api/community?currentUserId=${encodeURIComponent(currentUser.id)}`,
      {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      },
      'Community load'
    );
    if (!communityRes.ok) throw new Error(community?.error || `Community API failed (${communityRes.status})`);

    const sharingProfiles = community.profiles || [];

    if (!sharingProfiles?.length) {
      communityGrid.innerHTML = `
        <div class="community-empty-state">
          <div class="community-empty-icon">👥</div>
          <p>No one is sharing their watchlist yet.</p>
          <p class="community-empty-hint">Enable sharing above to let others see what you're watching!</p>
        </div>`;
      return;
    }

    const sharedData = community.sharedData || [];

    const dataMap = Object.fromEntries(
      (sharedData || []).map(d => [d.user_id, Array.isArray(d.movies) ? d.movies : []])
    );

    // Pre-compute a card descriptor for each profile (for search/sort).
    const cardData = sharingProfiles.map(profile => {
      const userMovies = dataMap[profile.user_id] || [];
      const watched    = userMovies.filter(m => m.status === 'watched');
      const inProgress = userMovies.filter(m => m.status === 'in_progress');
      const watchlist  = userMovies.filter(m => m.status === 'watchlist');
      const lastActive = userMovies.reduce((mx, m) => Math.max(mx, m.addedAt || 0), 0);
      return {
        userId: profile.user_id,
        username: profile.username || 'Anonymous',
        watched, inProgress, watchlist,
        lastActive,
        compat: computeCompatibility(movies, userMovies).combined,
      };
    });

    const controlsEl = document.getElementById('community-controls');
    if (controlsEl) controlsEl.classList.remove('hidden');

    const renderCards = () => {
      const q    = (document.getElementById('community-search')?.value || '').trim().toLowerCase();
      const sort = document.getElementById('community-sort')?.value || 'recent';
      let list = cardData.slice();
      if (q) list = list.filter(c => c.username.toLowerCase().includes(q));
      list.sort((a, b) => {
        switch (sort) {
          case 'watched': return b.watched.length - a.watched.length;
          case 'alpha':   return a.username.localeCompare(b.username);
          case 'compat':  return (b.compat || 0) - (a.compat || 0);
          default:        return b.lastActive - a.lastActive;
        }
      });
      if (!list.length) {
        communityGrid.innerHTML = '<p class="community-empty">No matching users.</p>';
        return;
      }
      communityGrid.innerHTML = list.map(c => {
        const initial = c.username[0].toUpperCase();
        const topGenres = (() => {
          const gc = {};
          c.watched.forEach(m => (m.genre || '').split(',').map(g => g.trim()).filter(Boolean).forEach(g => { gc[g] = (gc[g] || 0) + 1; }));
          return Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]).join(', ');
        })();
        const posters = c.watched
          .filter(m => m.posterUrl)
          .slice(0, 6)
          .map(m => `<img class="community-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" title="${esc(m.title)}" loading="lazy" />`)
          .join('');
        const compatBadge = c.compat != null
          ? `<span class="community-compat" title="Compatibility based on shared titles + rating similarity">🎯 ${c.compat}%</span>`
          : '';
        return `
          <div class="community-card" data-user-id="${esc(c.userId)}">
            <div class="community-card-header">
              <div class="community-avatar">${esc(initial)}</div>
              <div class="community-card-info">
                <div class="community-username">${esc(c.username)} ${compatBadge}</div>
                <div class="community-stats-mini">
                  <span>✓ ${c.watched.length} watched</span>
                  ${c.inProgress.length ? `<span>▶ ${c.inProgress.length} in progress</span>` : ''}
                  <span>⏳ ${c.watchlist.length} on list</span>
                </div>
                ${topGenres ? `<div class="community-genres">${esc(topGenres)}</div>` : ''}
              </div>
            </div>
            ${posters ? `<div class="community-posters">${posters}</div>` : ''}
          </div>
        `;
      }).join('');
    };

    renderCards();

    // Wire up search/sort (idempotent — replace handlers on each render).
    const searchEl = document.getElementById('community-search');
    const sortEl   = document.getElementById('community-sort');
    if (searchEl) searchEl.oninput = renderCards;
    if (sortEl)   sortEl.onchange  = renderCards;

    // Wire click → open profile modal (replace handler).
    communityGrid.onclick = e => {
      const card = e.target.closest('.community-card[data-user-id]');
      if (!card) return;
      const userId  = card.dataset.userId;
      const profile = sharingProfiles.find(p => p.user_id === userId);
      const userMovies = dataMap[userId] || [];
      if (profile) openCommunityProfile(profile, userMovies);
    };

  } catch (e) {
    logAppError('community.load', e);
    let diagnosis = '';
    try {
      const hr = await fetch('/api/supabase-health', { cache: 'no-store' });
      const health = await hr.json();
      if (!health.env?.hasUrl || !health.env?.hasAnonKey) {
        diagnosis = '<p class="setup-error-body"><strong>Diagnosis:</strong> Vercel is missing <code>SUPABASE_URL</code> or <code>SUPABASE_ANON_KEY</code>.</p>';
      } else if (health.reachable) {
        diagnosis = '<p class="setup-error-body"><strong>Diagnosis:</strong> Supabase config is present and reachable. The failed query above is probably table/RLS related.</p>';
      } else {
        diagnosis = `<p class="setup-error-body"><strong>Diagnosis:</strong> Supabase config exists, but the server could not reach Supabase${health.error ? ` (${esc(health.error)})` : ''}.</p>`;
      }
    } catch {}
    communityGrid.innerHTML = `
      <div class="supabase-setup-error">
        <p class="setup-error-title">⚠️ Community failed to load</p>
        <p class="setup-error-body"><strong>Error:</strong> ${esc(String(e?.message || e))}</p>
        ${diagnosis}
        <p class="setup-error-body">If this mentions RLS or missing tables, run the SQL below in Supabase → SQL Editor.</p>
        <pre class="setup-sql-block" id="setup-sql-pre">${esc(SETUP_SQL)}</pre>
        <button class="setup-copy-btn" id="setup-copy-btn">Copy SQL</button>
      </div>`;
    document.getElementById('setup-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(SETUP_SQL).then(() => {
        const btn = document.getElementById('setup-copy-btn');
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy SQL'; }, 2000); }
      });
    });
  } finally {
    clearTimeout(slowTimer);
  }
}

// ── Profile panel ───────────────────────────────────────
function renderProfile() {
  const panel = document.getElementById('profile-panel');
  if (!panel) return;

  const profileStats = statsModel.profileSummary(movies);
  const watched = profileStats.watched;
  const watchlist = profileStats.watchlist;
  const totalMins = profileStats.totalMinutes;
  const avgRating = profileStats.avgRating;
  const ratings = profileStats.ratings;

  const byType = profileStats.byType;

  // Top genres across all types
  const genreCounts = {};
  watched.forEach(m => {
    (m.genre || '').split(',').map(g => g.trim()).filter(Boolean)
      .forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
  });
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Top countries
  const countryCounts = {};
  watched.forEach(m => {
    if (m.country) countryCounts[m.country] = (countryCounts[m.country] || 0) + 1;
  });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Rating distribution
  const ratingDist = Array.from({ length: 10 }, (_, i) => {
    const star = 10 - i;
    return [star, ratings.filter(r => r === star).length];
  }).filter(([, c]) => c > 0);
  const backups = localLibraryBackups();
  const health = window.CineTrack?.libraryHealth?.analyse(movies, { storage: localStorage });

  // Recently added (last 8 across all types)
  const recent = [...movies]
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, 8);

  const displayName = currentUserDisplayName();
  const initial     = userInitial(displayName);

  const maxGenre   = topGenres[0]?.[1]   || 1;
  const maxCountry = topCountries[0]?.[1] || 1;
  const maxRating  = ratingDist[0]?.[1]   || 1;

  panel.innerHTML = `
    <div class="profile-hero">
      <div class="profile-hero-orbit">
        <div class="profile-avatar-lg">${esc(initial)}</div>
      </div>
      <div class="profile-hero-info">
        <span class="profile-kicker">Profile</span>
        <div class="profile-display-name">
          ${esc(displayName)}
          <span id="sync-indicator" class="sync-indicator" data-state="${currentSyncState}" title="${currentSyncTitle}"></span>
        </div>
        ${currentUser ? `<div class="profile-email-sm">${esc(currentUser.email)}</div>` : ''}
        ${sharingEnabled ? '<div class="profile-sharing-badge">🌐 Sharing enabled</div>' : ''}
      </div>
    </div>

    <div class="stats-overview profile-summary-cards">
      <div class="stat-card">
        <div class="stat-card-value">${watched.length}</div>
        <div class="stat-card-label">Watched</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${watchlist.length}</div>
        <div class="stat-card-label">Watchlist</div>
      </div>
      <div class="stat-card" data-time-spent-toggle title="Total runtime, prorated by progress on each series">
        <div class="stat-card-value">${formatTimeSpent(totalMins) || '—'}</div>
        <div class="stat-card-label">Time Spent</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgRating ? '★ ' + avgRating : '—'}</div>
        <div class="stat-card-label">Avg Rating</div>
      </div>
    </div>

    ${byType.length ? `
    <div class="profile-section">
      <h3>By Type</h3>
      <div class="profile-type-grid">
        ${byType.map(t => `
          <div class="profile-type-card">
            <div class="profile-type-label">${t.label}</div>
            <div class="profile-type-stats">
              <span>✓ ${t.watched} watched</span>
              ${t.inProgress ? `<span>▶ ${t.inProgress} in progress</span>` : ''}
              <span>⏳ ${t.watchlist} on list</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="stats-charts profile-charts">
      ${topGenres.length ? `
      <div class="chart-section">
        <h3>Top Genres</h3>
        <div class="chart-bars">${renderBarChart(topGenres, maxGenre, '#e2405a')}</div>
      </div>` : ''}

      ${topCountries.length ? `
      <div class="chart-section">
        <h3>Top Countries</h3>
        <div class="chart-bars">${renderBarChart(topCountries, maxCountry, '#3b9eff')}</div>
      </div>` : ''}

      ${ratingDist.length ? `
      <div class="chart-section chart-section-sm">
        <h3>Ratings</h3>
        <div class="chart-bars">${renderBarChart(ratingDist.map(([s, c]) => ['★'.repeat(s), c]), maxRating, '#f5a623')}</div>
      </div>` : ''}
    </div>

    ${recent.length ? `
    <div class="profile-section">
      <h3>Recently Added</h3>
      <div class="profile-recent">
        ${recent.map(m => `
          <div class="profile-recent-card" data-edit="${m.id}" title="${esc(m.title)}">
            ${m.posterUrl
              ? `<img class="profile-recent-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" />`
              : `<div class="profile-recent-poster profile-recent-emoji">${m.mediaType === 'anime' ? '🎌' : m.mediaType === 'tv' ? '📺' : '🎬'}</div>`}
            <div class="profile-recent-title">${esc(m.title)}</div>
            <div class="profile-recent-year">${m.year || ''}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${movies.length === 0 ? '<p class="profile-empty">Add some titles to see your profile stats.</p>' : ''}

    <div class="profile-section library-health-section">
      <h3>Library Health</h3>
      <div class="library-health-card${health?.ok ? ' healthy' : ''}">
        <div class="library-health-status">
          <span class="library-health-dot" aria-hidden="true"></span>
          <span>${health?.ok ? 'No blocking issues detected' : 'Needs attention'}</span>
        </div>
        <div class="library-health-meta">${health ? `${health.storage.megabytes.toFixed(2)} MB stored locally` : 'Health model unavailable'}</div>
        ${health?.issues?.length ? `
          <div class="library-health-issues">
            ${health.issues.map(issue => `<span class="library-health-chip ${esc(issue.level)}">${esc(issue.label)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>

    <div class="profile-section appearance-section${localStorage.getItem('cinetrack_appearance_open') === '1' ? ' open' : ''}">
      <h3 class="appearance-toggle" role="button" tabindex="0" aria-expanded="${localStorage.getItem('cinetrack_appearance_open') === '1' ? 'true' : 'false'}">
        <span>Appearance</span>
        <span class="appearance-chevron" aria-hidden="true">▶</span>
      </h3>
      <div class="appearance-body">
        <div class="appearance-group appearance-group-wide">
          <div class="appearance-group-title">Theme presets</div>
          <div class="theme-preset-grid">
            ${Object.entries(THEME_PRESETS).map(([key, preset]) => {
              const current = localStorage.getItem('cinetrack_theme_preset') || '';
              return `<button type="button" class="theme-preset-btn ${key === current ? 'active' : ''}" data-theme-preset="${key}">
                <span class="theme-preset-preview theme-preset-preview-${key}" aria-hidden="true"></span>
                <span>${preset.label}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="appearance-group appearance-group-wide">
          <div class="appearance-group-title">Theme canvas</div>
          <div class="appearance-row">
            <div class="appearance-label">Background</div>
            <div class="bg-picker" id="bg-picker">
              ${BG_PRESETS.map(name => {
                const current = localStorage.getItem('cinetrack_bg') || 'default';
                const label = name[0].toUpperCase() + name.slice(1);
                return `<button type="button" class="bg-swatch ${name === current ? 'active' : ''}" data-bg="${name}" title="${label}"><span class="bg-swatch-label">${label}</span></button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="appearance-grid">
          <div class="appearance-group">
            <div class="appearance-group-title">Surface</div>
            <div class="appearance-row">
              <div class="appearance-label">Glass intensity</div>
              <div class="pill-group" data-pref="glass">
                ${GLASS_PRESETS.map(name => {
                  const current = localStorage.getItem('cinetrack_glass') || 'medium';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${GLASS_LABELS[name] || name}</button>`;
                }).join('')}
              </div>
            </div>
            <div class="appearance-row">
              <div class="appearance-label">Accent colour</div>
              <div class="accent-picker" data-pref="accent">
                ${ACCENT_PRESETS.map(name => {
                  const current = localStorage.getItem('cinetrack_accent') || 'default';
                  return `<button type="button" class="accent-swatch ${name === current ? 'active' : ''}" data-accent="${name}" title="${name[0].toUpperCase() + name.slice(1)}"></button>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="appearance-group">
            <div class="appearance-group-title">Library</div>
            <div class="appearance-row">
              <div class="appearance-label">Density</div>
              <div class="pill-group" data-pref="density">
                ${DENSITY_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_density') || 'comfortable';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${name[0].toUpperCase() + name.slice(1)}</button>`;
                }).join('')}
              </div>
            </div>
            <div class="appearance-row">
              <div class="appearance-label">Hide posters in library</div>
              <div class="pill-group" data-pref="posters">
                ${POSTERS_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_posters') || 'shown';
                  const label = name === 'shown' ? 'Off' : 'On';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${label}</button>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="appearance-group">
            <div class="appearance-group-title">Motion & alerts</div>
            <div class="appearance-row">
              <div class="appearance-label-row">
                <div class="appearance-label">Animated orbs</div>
                <button type="button" class="info-btn appearance-info-btn" aria-label="Animated orbs help" title="Adds moving colour glows behind the glass panels. Reduce motion / no blur turns this off.">?</button>
              </div>
              <div class="pill-group" data-pref="orbs">
                ${ORBS_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_orbs') || 'static';
                  const label = name === 'static' ? 'Off' : 'On';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${label}</button>`;
                }).join('')}
              </div>
            </div>
            <div class="appearance-row">
              <div class="appearance-label">Reduce motion / no blur</div>
              <div class="pill-group" data-pref="motion">
                ${MOTION_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_motion') || 'full';
                  const label = name === 'full' ? 'Off' : 'On';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${label}</button>`;
                }).join('')}
              </div>
            </div>
            <div class="appearance-row">
              <div class="appearance-label">Episode airing alerts</div>
              <div class="pill-group" data-pref="notif">
                ${NOTIF_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_notif') || 'off';
                  const label = name === 'off' ? 'Off' : 'On';
                  return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${label}</button>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-section profile-csv-section">
      <h3>
        Import / Export
        <button type="button" class="info-btn" id="csv-info-btn" aria-label="What is this?"
          title="Export your library as a CSV spreadsheet, or import one to bulk-add titles. Imported rows are matched against TMDB to fill in posters, runtimes, and genres automatically. Use the template link for the expected column format.">ⓘ</button>
      </h3>
      <p class="profile-csv-hint">Back up your library or move it between accounts.</p>
      <div class="profile-csv-actions">
        <button id="profile-import-btn" class="csv-action-btn" title="Import from CSV">⬆ Import CSV</button>
        <button id="profile-export-btn" class="csv-action-btn" title="Export to CSV">⬇ Export CSV</button>
        <a id="profile-csv-template" class="csv-template-link" href="#" download="cinetrack-template.csv">Download template</a>
      </div>
    </div>

    <div class="profile-section recovery-section">
      <h3>Recovery</h3>
      <p class="profile-csv-hint">Local safety snapshots are created before cloud loads, cloud saves, sign-out clears, and schema repairs.</p>
      ${backups.length ? `
        <div class="recovery-list">
          ${backups.map((backup, index) => {
            const compare = compareLibraryBackup(backup.movies);
            return `
              <div class="recovery-item">
                <div class="recovery-copy">
                  <div class="recovery-title">${esc(profileModel.formatBackupDate(backup.createdAt))}</div>
                  <div class="recovery-meta">${esc(backup.reason || 'snapshot')} &middot; ${Number(backup.itemCount || backup.movies.length)} titles</div>
                  <div class="recovery-impact${compare.hasIssues ? ' has-issues' : ''}">${esc(profileModel.backupImpactLabel(compare))}</div>
                </div>
                <button type="button" class="recovery-restore-btn" data-restore-backup="${index}">Restore</button>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<p class="recovery-empty">No local safety snapshots yet.</p>'}
    </div>
  `;

  applyTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');

  // Clicking a recent card opens the edit modal
  panel.querySelectorAll('.profile-recent-card[data-edit]').forEach(card => {
    card.addEventListener('click', () => openModal(movies.find(m => m.id === card.dataset.edit)));
  });

  // Wire CSV controls (re-rendered every renderProfile)
  panel.querySelector('#profile-import-btn')?.addEventListener('click', () => csvInput.click());
  panel.querySelector('#profile-export-btn')?.addEventListener('click', exportCSV);
  const tplLink = panel.querySelector('#profile-csv-template');
  if (tplLink) tplLink.href = TEMPLATE_URL;

  panel.querySelectorAll('[data-restore-backup]').forEach(btn => {
    btn.addEventListener('click', () => {
      const backup = localLibraryBackups()[Number(btn.dataset.restoreBackup)];
      if (!backup?.movies?.length) {
        showToast('That recovery snapshot is no longer available.', true);
        return;
      }
      const compare = compareLibraryBackup(backup.movies);
      const label = profileModel.backupImpactLabel(compare);
      if (!confirm(`Restore from ${profileModel.formatBackupDate(backup.createdAt)}?\n\nThis will merge safer progress from the snapshot and keep newer progress where it is stronger.\n\nDetected: ${label}`)) return;
      restoreLibraryFromBackup(backup.movies);
      save();
      updateCountryDropdown();
      render();
      renderProfile();
      showToast('Library restored from local snapshot.');
    });
  });

  panel.querySelectorAll('[data-time-spent-toggle]').forEach(el => {
    el.addEventListener('click', toggleTimeSpentFormat);
  });

  // Wire Appearance collapse/expand
  const appearanceSection = panel.querySelector('.appearance-section');
  const appearanceToggle  = panel.querySelector('.appearance-toggle');
  if (appearanceSection && appearanceToggle) {
    const toggleAppearance = () => {
      const isOpen = appearanceSection.classList.toggle('open');
      appearanceToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      localStorage.setItem('cinetrack_appearance_open', isOpen ? '1' : '0');
      scheduleSavePrefs();
    };
    appearanceToggle.addEventListener('click', toggleAppearance);
    appearanceToggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAppearance(); }
    });
  }

  // Wire background preset picker
  panel.querySelectorAll('.bg-swatch[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.bg;
      localStorage.removeItem('cinetrack_theme_preset');
      localStorage.setItem('cinetrack_bg', name);
      applyBgPreset(name);
      scheduleSavePrefs();
      panel.querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b === btn));
      panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
    });
  });

  // Wire accent swatches
  panel.querySelectorAll('.accent-swatch[data-accent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.accent;
      localStorage.removeItem('cinetrack_theme_preset');
      localStorage.setItem('cinetrack_accent', name);
      applyAccent(name);
      scheduleSavePrefs();
      panel.querySelectorAll('.accent-swatch').forEach(b => b.classList.toggle('active', b === btn));
      panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
    });
  });

  // Wire theme presets
  panel.querySelectorAll('.theme-preset-btn[data-theme-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.themePreset;
      if (!applyThemePreset(name)) return;
      scheduleSavePrefs();
      renderProfile();
    });
  });

  // Wire pill groups (glass / orbs / density / motion)
  const pillApplyMap = {
    glass:   { fn: applyGlass,   key: 'cinetrack_glass'   },
    orbs:    { fn: applyOrbs,    key: 'cinetrack_orbs'    },
    density: { fn: applyDensity, key: 'cinetrack_density' },
    motion:  { fn: applyMotion,  key: 'cinetrack_motion'  },
    posters: { fn: applyPosters, key: 'cinetrack_posters' },
    notif:   { fn: applyEpisodeNotif, key: 'cinetrack_notif', custom: setEpisodeNotifPref },
  };
  panel.querySelectorAll('.pill-group[data-pref]').forEach(group => {
    const pref = group.dataset.pref;
    const cfg  = pillApplyMap[pref];
    if (!cfg) return;
    group.querySelectorAll('.pill-btn[data-value]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const val = btn.dataset.value;
        localStorage.removeItem('cinetrack_theme_preset');
        if (cfg.custom) {
          const ok = await cfg.custom(val);
          if (!ok) return;
        } else {
          localStorage.setItem(cfg.key, val);
          cfg.fn(val);
          scheduleSavePrefs();
        }
        group.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b === btn));
        panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
      });
    });
  });
}

// ── Export CSV ──────────────────────────────────────────
function exportCSV() {
  const payload = csvModel.exportPayload(movies, activeType);
  if (!payload.list.length) { showToast('No titles to export for this tab.', true); return; }

  const blob = new Blob([payload.text], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = payload.filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${payload.list.length} title${payload.list.length !== 1 ? 's' : ''}.`);
}


// ── Pagination ──────────────────────────────────────────
function renderPagination(totalItems) {
  const pagination = paginationModel.view(totalItems, currentPage, pageSize);
  currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  if (totalPages <= 1) { paginationEl.classList.add('hidden'); pageSizeSelect.classList.add('hidden'); return; }
  paginationEl.classList.remove('hidden');
  pageSizeSelect.classList.remove('hidden');

  const pageNums = pagination.pages.map(item => {
    if (item.type === 'ellipsis') return '<span class="page-ellipsis">…</span>';
    return `<button class="page-num${item.active ? ' active' : ''}" data-page="${item.page}">${item.label}</button>`;
  }).join('');

  paginationEl.innerHTML =
    `<button class="page-btn" id="page-prev" ${pagination.prevDisabled ? 'disabled' : ''}>◀</button>` +
    pageNums +
    `<button class="page-btn" id="page-next" ${pagination.nextDisabled ? 'disabled' : ''}>▶</button>` +
    `<span class="page-info">${totalItems} titles · page ${currentPage + 1} of ${totalPages}</span>`;

  paginationEl.querySelectorAll('.page-num').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); render(); window.scrollTo(0, 0); });
  });
  document.getElementById('page-prev')?.addEventListener('click', () => { currentPage--; render(); window.scrollTo(0, 0); });
  document.getElementById('page-next')?.addEventListener('click', () => { currentPage++; render(); window.scrollTo(0, 0); });
}

// ── Render ──────────────────────────────────────────────
function render() {
  if (activeView !== 'content') return;

  const list = filtered();

  const visibleIds = new Set(list.map(m => m.id));
  for (const id of selectedIds) {
    if (!visibleIds.has(id)) selectedIds.delete(id);
  }
  updateBulkBar();
  updateStats();
  syncSeriesStatusFilterVisibility();
  updateClearFiltersBtn();

  const pageState = paginationModel.clampPage(currentPage, list.length, pageSize);
  currentPage = pageState.page;
  const pageList = paginationModel.slicePage(list, currentPage, pageSize);
  const mutationDisabled = isLibraryMutationLocked() ? ' disabled aria-disabled="true"' : '';

  grid.innerHTML = '';
  grid.className = `movie-grid grid-${gridSize}` + (selectMode ? ' select-mode' : '');

  if (list.length === 0) {
    renderEmptyState(hasActiveFilters());
    emptyMsg.classList.remove('hidden');
    renderPagination(0);
    return;
  }
  emptyMsg.classList.add('hidden');

  pageList.forEach(m => {
    const card = document.createElement('div');
    const checked = selectedIds.has(m.id);
    const airingToday = isAiringToday(m);
    card.className = 'movie-card'
      + (checked ? ' selected' : '')
      + (airingToday ? ' card-airing-today' : '');
    card.dataset.id = m.id;
    const cardView = cardModel.view(m, { activeSeason, posterEmoji, formatRuntime, infoUrlForEntry });
    const isTV    = cardView.isTV;
    const isShow  = cardView.isShow;
    const fallbackPosterHTML = `<div class="card-poster-emoji">${cardView.fallbackPosterLabel}</div>`;
    const posterHTML = m.posterUrl
      ? `${fallbackPosterHTML}<img class="card-poster-img" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" onerror="this.remove()" />`
      : fallbackPosterHTML;
    const runtimeStr = cardView.runtime;
    const episodeState = cardView.episode;

    const epHTML = (isShow && episodeState.total > 0)
      ? `<div class="ep-progress" title="${esc(episodeState.title)}">
           <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${episodeState.pct}%"></div></div>
           <div class="ep-progress-label">${episodeState.label}</div>
         </div>`
      : '';
    const epIncBtn = cardView.primaryAction?.type === 'episode'
      ? `<button class="btn-sm btn-ep-inc" data-ep-inc="${m.id}" title="${cardView.primaryAction.title}"${mutationDisabled}>
           <span class="lbl-md lbl-lg">${cardView.primaryAction.labelMd}</span><span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
         </button>`
      : '';

    const titleLabel = esc(m.title);
    const infoUrl = cardView.infoUrl;
    const toggleActionLabel = cardView.primaryAction?.title || '';
    const primaryActionHTML = epIncBtn || ((cardView.primaryAction?.type === 'toggle') ? `
        <button class="btn-sm btn-primary-action" data-toggle="${m.id}" title="${toggleActionLabel} ${titleLabel}" aria-label="${toggleActionLabel} ${titleLabel}"${mutationDisabled}>
          <span class="lbl-lg">${cardView.primaryAction.labelLg}</span>
          <span class="lbl-md">${cardView.primaryAction.labelMd}</span>
          <span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
        </button>` : '');
    const actionRowClass = primaryActionHTML ? 'card-actions' : 'card-actions card-actions-compact';
    const hoverInfoParts = [
      m.genre    && `<div class="chi-genre">${esc(m.genre)}</div>`,
      m.director && `<div class="chi-dir">${isTV ? 'Created by' : 'Dir.'} ${esc(m.director)}</div>`,
      m.country  && `<div class="chi-loc">🌍 ${esc(m.country)}</div>`,
    ].filter(Boolean);
    const hoverInfoHTML = hoverInfoParts.length
      ? `<div class="card-hover-info">${hoverInfoParts.join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="card-poster">
        ${posterHTML}
        ${hoverInfoHTML}
        <label class="card-checkbox" title="Select">
          <input type="checkbox" data-check="${m.id}" ${checked ? 'checked' : ''}${mutationDisabled} />
          <span class="card-checkbox-box"></span>
        </label>
      </div>
      <span class="badge badge-${m.status} card-status-badge">
        ${cardView.statusLabel}
      </span>
      ${airingToday ? `<span class="card-airing-pill" title="${m.mediaType === 'movie' ? 'Theatrical release today' : 'New episode airs today'}">● Today</span>` : ''}
      ${infoUrl
        ? `<a class="card-title card-title-link" href="${infoUrl}" target="_blank" rel="noopener noreferrer" title="${titleLabel}">${titleLabel}</a>`
        : `<div class="card-title" title="${titleLabel}">${titleLabel}</div>`}
      <div class="card-meta">
        ${m.year       ? `<span class="meta-year">${m.year}</span>` : ''}
        ${m.country    ? `<span class="meta-country">🌍 ${esc(m.country)}</span>` : ''}
        ${m.genre      ? `<span class="meta-genre">${esc(m.genre)}</span>` : ''}
        ${m.director   ? `<span class="meta-director">${isTV ? 'Created by' : 'Dir.'} ${esc(m.director)}</span>` : ''}
        ${runtimeStr   ? `<span class="meta-runtime">⏱ ${runtimeStr}</span>` : ''}
      </div>
      ${m.rating ? starsHTML(m.rating) : ''}
      ${epHTML}
      ${m.notes ? `<div class="card-notes">${esc(m.notes)}</div>` : ''}
      <div class="${actionRowClass}">
        <button class="btn-sm btn-icon" data-edit="${m.id}" title="Edit ${titleLabel}" aria-label="Edit ${titleLabel}"${mutationDisabled}>
          ✎
        </button>
        ${primaryActionHTML}
        <div class="card-more-wrap">
          <button class="btn-sm btn-icon card-more-btn" data-action-menu="${m.id}" title="More actions for ${titleLabel}" aria-label="More actions for ${titleLabel}" aria-expanded="false"${mutationDisabled}>⋯</button>
          <div class="card-action-menu" role="menu" hidden>
            <button type="button" class="card-menu-item danger" data-delete="${m.id}" role="menuitem"${mutationDisabled}>Delete</button>
          </div>
        </div>
      </div>
    `;
    const deleteBtn = card.querySelector('[data-delete]');
    if (deleteBtn) {
      deleteBtn.title = `Delete ${m.title}`;
      deleteBtn.setAttribute('aria-label', `Delete ${m.title}`);
    }
    grid.appendChild(card);
  });

  renderPagination(list.length);
}

// ── Bulk select ─────────────────────────────────────────
const bulkBar           = document.getElementById('bulk-bar');
const bulkCount         = document.getElementById('bulk-count');
const bulkSelectAll     = document.getElementById('bulk-select-all');
const bulkDeselect      = document.getElementById('bulk-deselect');
const bulkDelete        = document.getElementById('bulk-delete');
const bulkMarkWatched     = document.getElementById('bulk-mark-watched');
const bulkMarkInProgress  = document.getElementById('bulk-mark-in-progress');
const bulkMarkWatchlist   = document.getElementById('bulk-mark-watchlist');

function updateBulkBar() {
  const n = selectedIds.size;
  bulkBar.classList.toggle('hidden', n === 0);
  bulkCount.textContent = `${n} selected`;
}

let selectedIds = new Set();

grid.addEventListener('change', e => {
  const id = e.target.dataset.check;
  if (!id) return;
  if (e.target.checked) selectedIds.add(id);
  else selectedIds.delete(id);
  e.target.closest('.movie-card')?.classList.toggle('selected', e.target.checked);
  updateBulkBar();
});

bulkSelectAll.addEventListener('click', () => { filtered().forEach(m => selectedIds.add(m.id)); render(); });
bulkDeselect.addEventListener('click', () => { selectedIds.clear(); render(); });

bulkMarkWatched.addEventListener('click', () => {
  changeLibraryStatus(selectedIds, 'watched');
  selectedIds.clear(); save(); render();
});

bulkMarkInProgress.addEventListener('click', () => {
  changeLibraryStatus(selectedIds, 'in_progress');
  selectedIds.clear(); save(); render();
});

bulkMarkWatchlist.addEventListener('click', () => {
  changeLibraryStatus(selectedIds, 'watchlist');
  selectedIds.clear(); save(); render();
});

bulkDelete.addEventListener('click', () => {
  const n = selectedIds.size;
  if (!confirm(`Delete ${n} title${n !== 1 ? 's' : ''}? This cannot be undone.`)) return;
  removeLibraryEntries(selectedIds);
  selectedIds.clear();
  save(); updateCountryDropdown(); render();
});

// ── Year select ─────────────────────────────────────────
function populateYearSelect(selectedYear) {
  const sel = document.getElementById('f-year');
  const cur = new Date().getFullYear();
  let opts = '<option value="">— Year —</option>';
  for (let y = cur + 1; y >= 1888; y--) {
    opts += `<option value="${y}"${String(y) === String(selectedYear) ? ' selected' : ''}>${y}</option>`;
  }
  sel.innerHTML = opts;
}

// ── Modal ───────────────────────────────────────────────
// Per-season buffer used while the modal is open. Cloned from the
// entry on open and from TMDB on selection; written back on submit.
let editingSeasons   = [];
let editingSeasonIdx = 0;

const seasonSelectLabel = document.getElementById('season-select-label');
const seasonSelect      = document.getElementById('f-season-select');
const epWatchedInput    = document.getElementById('f-ep-watched');
const epTotalInput      = document.getElementById('f-ep-total');

function rebuildSeasonDropdown() {
  if (!editingSeasons.length) {
    seasonSelectLabel.classList.add('hidden');
    return;
  }
  seasonSelectLabel.classList.remove('hidden');
  seasonSelect.innerHTML = editingSeasons.map((s, i) =>
    `<option value="${i}"${i === editingSeasonIdx ? ' selected' : ''}>${esc(s.name || `Season ${s.number}`)} — ${s.watched || 0}/${s.total}</option>`
  ).join('');
}

function loadSeasonIntoInputs(idx) {
  editingSeasonIdx = idx;
  const s = editingSeasons[idx];
  if (!s) return;
  epWatchedInput.value = s.watched || 0;
  epTotalInput.value   = s.total   || 0;
}

function captureCurrentSeason() {
  const s = editingSeasons[editingSeasonIdx];
  if (!s) return;
  s.total   = Math.max(0, parseInt(epTotalInput.value)   || 0);
  s.watched = Math.max(0, parseInt(epWatchedInput.value) || 0);
  if (s.total > 0 && s.watched > s.total) s.watched = s.total;
}

seasonSelect.addEventListener('change', () => {
  const newIdx = parseInt(seasonSelect.value);
  // Save current season's edits, then advance to the new selection
  // *before* rebuilding — otherwise rebuild's `selected` attribute
  // resets the dropdown back to the previous season.
  captureCurrentSeason();
  editingSeasonIdx = newIdx;
  loadSeasonIntoInputs(editingSeasonIdx);
  rebuildSeasonDropdown();
});

function openModal(movie = null) {
  editingId = movie ? movie.id : null;
  modalTitle.textContent = movie ? 'Edit Title' : 'Add Title';

  const droppedOpt = document.getElementById('f-status-dropped-opt');
  if (droppedOpt) droppedOpt.hidden = !editingId;

  activeMediaType = modalModel.mediaTypeForOpen(movie, activeType);
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === activeMediaType)
  );
  updateModalForType();
  resetTMDBUI();
  modalTmdbRefreshBtn.classList.toggle('hidden', !(movie?.tmdbId || movie?.externalId));
  modalTmdbRefreshBtn.textContent = movie ? `↻ ${metadataRefreshLabel(movie)}` : '↻ Refresh metadata';
  modalTmdbRefreshBtn.title = movie
    ? `Re-fetch metadata from ${sourceForEntry(movie) === 'tmdb' ? 'TMDB' : sourceForEntry(movie) === 'anilist' ? 'AniList' : 'TMDB when available'} while preserving watch progress`
    : 'Re-fetch metadata from this title source while preserving watch progress';

  const values = modalModel.formValues(movie);
  document.getElementById('f-title').value    = values.title;
  populateYearSelect(values.year);
  document.getElementById('f-genre').value    = values.genre;
  document.getElementById('f-director').value = values.director;
  document.getElementById('f-country').value  = values.country;
  document.getElementById('f-status').value   = values.status;
  document.getElementById('f-runtime').value  = values.runtime;
  document.getElementById('f-notes').value    = values.notes;

  // Initialise the season buffer from the entry (deep copy)
  editingSeasons = modalModel.cloneSeasons(movie);
  // Default to lowest unfinished season, or first if all caught up
  editingSeasonIdx = modalModel.initialSeasonIndex(editingSeasons);
  rebuildSeasonDropdown();

  if (editingSeasons.length) {
    loadSeasonIntoInputs(editingSeasonIdx);
  } else {
    epWatchedInput.value = movie?.watchedEpisodes || '';
    epTotalInput.value   = movie?.totalEpisodes   || '';
  }
  selectedRating = values.rating;

  // Re-watch count: default to 1 when status is watched, otherwise 0
  editingWatchCount = modalModel.initialWatchCount(movie);
  updateRewatchUI();

  toggleRatingLabel();
  buildStars();
  modal.classList.remove('hidden');
  tmdbQuery.focus();

  // Auto-load streaming providers for entries with a TMDB id
  if (movie?.tmdbId) loadProvidersForEntry(movie);
}

let editingWatchCount = 0;
function updateRewatchUI() {
  const row = document.getElementById('rewatch-row');
  if (!row) return;
  const status = document.getElementById('f-status').value;
  const state = modalModel.rewatchState(status, editingId, editingWatchCount);
  row.classList.toggle('hidden', !state.visible);
  document.getElementById('rewatch-count').textContent = String(state.count);
  document.getElementById('rewatch-plural').textContent = state.plural;
}

document.getElementById('rewatch-inc-btn')?.addEventListener('click', () => {
  editingWatchCount = Math.max(1, editingWatchCount) + 1;
  updateRewatchUI();
});
document.getElementById('rewatch-dec-btn')?.addEventListener('click', () => {
  if (editingWatchCount > 1) editingWatchCount -= 1;
  updateRewatchUI();
});

const providerCache = new Map();
async function loadProvidersForEntry(movie) {
  if (!movie?.tmdbId) return;
  const fetchType = movie.mediaType === 'anime' ? 'tv' : (movie.mediaType || 'movie');
  const cacheKey  = `${fetchType}:${movie.tmdbId}`;
  if (providerCache.has(cacheKey)) {
    renderProviders(providerCache.get(cacheKey));
    return;
  }
  try {
    const details = await fetchTMDBDetails(movie.tmdbId, fetchType);
    providerCache.set(cacheKey, details.providers);
    renderProviders(details.providers);
  } catch { /* silent */ }
}

function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
  resetTMDBUI();
}

// ── Per-entry metadata refresh (Edit modal) ──────────────
modalTmdbRefreshBtn.addEventListener('click', async () => {
  const movie = editingId ? movies.find(m => m.id === editingId) : null;
  if (!movie) return;
  modalTmdbRefreshBtn.disabled = true;
  modalTmdbRefreshBtn.textContent = '↻ Refreshing…';
  try {
    const details = await fetchDetailsForEntry(movie);
    applyTMDBSelection(details);
  } catch (err) {
    logAppError('metadata.single_refresh', err, { id: movie.id, title: movie.title }, 'warn');
    const tmdbErr = document.getElementById('tmdb-error');
    tmdbErr.textContent = 'Metadata refresh failed: ' + err.message;
    tmdbErr.classList.remove('hidden');
  } finally {
    modalTmdbRefreshBtn.disabled = false;
    modalTmdbRefreshBtn.textContent = `↻ ${metadataRefreshLabel(movie)}`;
    modalTmdbRefreshBtn.title = `Re-fetch metadata from ${sourceForEntry(movie) === 'tmdb' ? 'TMDB' : sourceForEntry(movie) === 'anilist' ? 'AniList' : 'TMDB when available'} while preserving watch progress`;
  }
});

function toggleRatingLabel() {
  const s = document.getElementById('f-status').value;
  ratingLabel.classList.toggle('hidden', !modalModel.showsRating(s));
}

// ── Form submit ─────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  if (isLibraryMutationLocked()) {
    showMutationLockToast();
    return;
  }
  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const existing  = editingId ? movies.find(m => m.id === editingId) : null;
  const posterUrl = tmdbSelection?.poster_path
    ? externalPosterUrl(tmdbSelection.poster_path)
    : existing?.posterUrl || '';
  const selectedSource = tmdbSelection ? (tmdbSelection.source || 'tmdb') : null;
  const selectedExternalId = tmdbSelection ? String(tmdbSelection.externalId || tmdbSelection.id || '') : '';
  if (!editingId) {
    const duplicate = findDuplicateTitle({
      title,
      year: document.getElementById('f-year').value || tmdbSelection?.year || '',
      mediaType: activeMediaType,
      source: selectedSource || 'manual',
      externalId: selectedExternalId,
    });
    if (duplicate) {
      showToast(`"${duplicate.title}" is already in your ${duplicate.status === 'watchlist' ? 'watchlist' : 'library'}.`);
      closeModal();
      openModal(duplicate);
      return;
    }
  }

  const isShow = activeMediaType === 'tv' || activeMediaType === 'anime';

  // Capture in-flight edits to the currently-selected season, then normalise.
  if (isShow && editingSeasons.length) captureCurrentSeason();
  if (isShow && editingSeasons.length) normaliseSeasons(editingSeasons);

  const progress = modalModel.episodeState({
    mediaType: activeMediaType,
    seasons: editingSeasons,
    totalInput: epTotalInput.value,
    watchedInput: epWatchedInput.value,
  });

  const data = modalModel.entryPayload({
    fields: {
      title,
      year: document.getElementById('f-year').value,
      genre: document.getElementById('f-genre').value,
      director: document.getElementById('f-director').value,
      country: document.getElementById('f-country').value,
      status: document.getElementById('f-status').value,
      notes: document.getElementById('f-notes').value,
      runtime: document.getElementById('f-runtime').value,
    },
    mediaType: activeMediaType,
    progress,
    selectedRating,
    editingWatchCount,
    existing,
    posterUrl,
    selection: tmdbSelection,
    selectedSource,
    selectedExternalId,
  });

  if (editingId) {
    updateLibraryEntry(editingId, data, { allowDowngrade: true });
  } else {
    addLibraryEntry({ addedAt: Date.now(), ...data });
  }

  save(); updateCountryDropdown(); render(); closeModal();
});

// ── Events ──────────────────────────────────────────────
addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.getElementById('f-status').addEventListener('change', () => { toggleRatingLabel(); buildStars(); updateRewatchUI(); });
const searchClearBtn = document.getElementById('search-clear-btn');
function updateSearchClearBtn() {
  if (!searchClearBtn) return;
  searchClearBtn.classList.toggle('hidden', !searchInput.value);
}
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  currentPage = 0;
  updateSearchClearBtn();
  render();
});
searchClearBtn?.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  currentPage = 0;
  updateSearchClearBtn();
  searchInput.focus();
  render();
});
updateSearchClearBtn();
countryFilterEl.addEventListener('change', () => { countryFilter = countryFilterEl.value; currentPage = 0; render(); });
genreFilterEl.addEventListener('change', () => { genreFilter = genreFilterEl.value; currentPage = 0; render(); });
document.getElementById('sort-order').addEventListener('change', e => {
  sortOrder = e.target.value;
  localStorage.setItem('cinetrack_sort', sortOrder);
  scheduleSavePrefs();
  currentPage = 0;
  render();
});

grid.addEventListener('click', e => {
  const clickedMoreWrap = e.target.closest('.card-more-wrap');
  if (!clickedMoreWrap) {
    grid.querySelectorAll('.movie-card.action-menu-open').forEach(el => {
      el.classList.remove('action-menu-open');
      el.querySelector('[data-action-menu]')?.setAttribute('aria-expanded', 'false');
      const menu = el.querySelector('.card-action-menu');
      if (menu) menu.hidden = true;
    });
  }

  const noteEl = e.target.closest('.card-notes');
  if (noteEl) { noteEl.classList.toggle('expanded'); return; }

  const editId   = e.target.closest('[data-edit]')?.dataset.edit;
  const toggleId = e.target.closest('[data-toggle]')?.dataset.toggle;
  const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
  const epIncId  = e.target.closest('[data-ep-inc]')?.dataset.epInc;
  const menuId   = e.target.closest('[data-action-menu]')?.dataset.actionMenu;

  // Click poster to edit (skip in select mode or when clicking checkbox)
  if (!editId && !toggleId && !deleteId && !epIncId && !menuId && !selectMode && !e.target.closest('.card-checkbox')) {
    const poster = e.target.closest('.card-poster');
    if (poster) {
      const card = poster.closest('.movie-card');
      if (card?.dataset.id) openModal(movies.find(m => m.id === card.dataset.id));
      return;
    }
  }

  if (menuId) {
    const card = e.target.closest('.movie-card');
    const wasOpen = card?.classList.contains('action-menu-open');
    grid.querySelectorAll('.movie-card.action-menu-open').forEach(el => {
      el.classList.remove('action-menu-open');
      el.querySelector('[data-action-menu]')?.setAttribute('aria-expanded', 'false');
      const menu = el.querySelector('.card-action-menu');
      if (menu) menu.hidden = true;
    });
    if (card && !wasOpen) {
      card.classList.add('action-menu-open');
      e.target.closest('[data-action-menu]')?.setAttribute('aria-expanded', 'true');
      const menu = card.querySelector('.card-action-menu');
      if (menu) menu.hidden = false;
    }
  } else if (epIncId) {
    const m = movies.find(m => m.id === epIncId);
    if (!m) return;
    updateLibraryEntry(epIncId, entry => {
      if (Array.isArray(entry.seasons) && entry.seasons.length) {
        const active = activeSeason(entry);
        if (active) {
          active.watched = Math.min((active.watched || 0) + 1, active.total);
          normaliseSeasons(entry.seasons);
          recomputeShowProgress(entry);
          entry.status = entry.watchedEpisodes >= entry.totalEpisodes ? 'watched' : 'in_progress';
        }
      } else if ((entry.totalEpisodes || 0) > 0) {
        const next = Math.min((entry.watchedEpisodes || 0) + 1, entry.totalEpisodes);
        entry.watchedEpisodes = next;
        entry.status = next >= entry.totalEpisodes ? 'watched' : 'in_progress';
      }
      return entry;
    }, { allowDowngrade: true });
    save(); render();
  } else if (editId) {
    openModal(movies.find(m => m.id === editId));
  } else if (toggleId) {
    const m = movies.find(m => m.id === toggleId);
    if (m) {
      updateLibraryEntry(toggleId, entry => {
        entry.status = entry.status === 'watched' ? 'watchlist'
                 : entry.status === 'in_progress' ? 'watched'
                 : entry.status === 'dropped' ? 'in_progress'
                 : 'in_progress';
        if (entry.status === 'watchlist') {
          entry.rating = 0;
          entry.watchedEpisodes = 0;
          if (Array.isArray(entry.seasons)) entry.seasons.forEach(s => { s.watched = 0; });
        }
        return entry;
      }, { allowDowngrade: true });
      // 'watched' is handled by save() -> syncEpisodeProgress() (fills every season)
      save(); render();
    }
  } else if (deleteId) {
    grid.querySelectorAll('.movie-card.action-menu-open').forEach(el => {
      el.classList.remove('action-menu-open');
      el.querySelector('[data-action-menu]')?.setAttribute('aria-expanded', 'false');
      const menu = el.querySelector('.card-action-menu');
      if (menu) menu.hidden = true;
    });
    const m = movies.find(m => m.id === deleteId);
    if (m) {
      pendingDeleteId = deleteId;
      confirmMsg.textContent = `Remove "${m.title}" from your list?`;
      confirmModal.classList.remove('hidden');
    }
  }
});

confirmCancel.addEventListener('click', () => { confirmModal.classList.add('hidden'); pendingDeleteId = null; });
confirmOk.addEventListener('click', () => {
  if (pendingDeleteId) { removeLibraryEntry(pendingDeleteId); save(); updateCountryDropdown(); render(); }
  confirmModal.classList.add('hidden'); pendingDeleteId = null;
});
confirmModal.addEventListener('click', e => { if (e.target === confirmModal) { confirmModal.classList.add('hidden'); pendingDeleteId = null; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); confirmModal.classList.add('hidden'); } });

// ── Seed data ───────────────────────────────────────────
function seedData() {
  replaceLibrary([
    { id: genId(), title: 'Inception', year: '2010', genre: 'Sci-Fi, Thriller', director: 'Christopher Nolan', country: 'United States', status: 'watched', rating: 9, runtime: 148, notes: 'Mind-bending. The spinning top...', posterUrl: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', mediaType: 'movie', addedAt: Date.now() },
    { id: genId(), title: 'The Grand Budapest Hotel', year: '2014', genre: 'Comedy, Drama', director: 'Wes Anderson', country: 'Germany', status: 'watched', rating: 8, runtime: 99, notes: 'Gorgeous cinematography.', posterUrl: 'https://image.tmdb.org/t/p/w200/nX5XotM9yprCKarRFDtgpaKzkjr.jpg', mediaType: 'movie', addedAt: Date.now() },
    { id: genId(), title: 'Dune: Part Two', year: '2024', genre: 'Sci-Fi', director: 'Denis Villeneuve', country: 'United States', status: 'watchlist', rating: 0, runtime: 166, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', mediaType: 'movie', addedAt: Date.now() },
    { id: genId(), title: 'Spirited Away', year: '2001', genre: 'Animation, Fantasy', director: 'Hayao Miyazaki', country: 'Japan', status: 'watched', rating: 10, runtime: 125, notes: 'A masterpiece of imagination.', posterUrl: 'https://image.tmdb.org/t/p/w200/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', mediaType: 'movie', addedAt: Date.now() },
    { id: genId(), title: 'Breaking Bad', year: '2008', genre: 'Crime, Drama', director: 'Vince Gilligan', country: 'United States', status: 'watched', rating: 10, runtime: 2700, notes: 'One of the greatest TV dramas ever made.', posterUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', mediaType: 'tv', addedAt: Date.now() },
    { id: genId(), title: 'Dark', year: '2017', genre: 'Sci-Fi, Thriller', director: 'Baran bo Odar', country: 'Germany', status: 'watched', rating: 9, runtime: 1530, notes: 'Intricate time-travel mystery.', posterUrl: 'https://image.tmdb.org/t/p/w200/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg', mediaType: 'tv', addedAt: Date.now() },
    { id: genId(), title: 'Shogun', year: '2024', genre: 'Drama, History', director: 'Rachel Kondo', country: 'Japan', status: 'watchlist', rating: 0, runtime: 0, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg', mediaType: 'tv', addedAt: Date.now() },
    { id: genId(), title: 'Spirited Away', year: '2001', genre: 'Animation, Fantasy', director: 'Hayao Miyazaki', country: 'Japan', status: 'watched', rating: 10, runtime: 125, notes: 'A masterpiece.', posterUrl: 'https://image.tmdb.org/t/p/w200/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', mediaType: 'anime', addedAt: Date.now() },
    { id: genId(), title: 'Attack on Titan', year: '2013', genre: 'Action, Drama', director: 'Tetsuro Araki', country: 'Japan', status: 'watched', rating: 9, runtime: 4050, notes: 'Gripping from start to finish.', posterUrl: 'https://image.tmdb.org/t/p/w200/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', mediaType: 'anime', addedAt: Date.now() },
    { id: genId(), title: 'Demon Slayer', year: '2019', genre: 'Action, Fantasy', director: 'Haruo Sotozaki', country: 'Japan', status: 'watchlist', rating: 0, runtime: 0, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg', mediaType: 'anime', addedAt: Date.now() },
  ]);
  save();
}

// ── CSV Import ──────────────────────────────────────────
const csvInput       = document.getElementById('csv-input');
const importToast    = document.getElementById('import-toast');
const importProgress = document.getElementById('import-progress');
const progressBar    = document.getElementById('progress-bar');
const progressText   = document.getElementById('progress-text');
const progressCancel = document.getElementById('progress-cancel');

let cancelImport = false;

function parseCSV(text) {
  return csvModel.parse(text);
}

function showToast(msg, isError = false) {
  importToast.textContent = msg;
  importToast.className = 'import-toast' + (isError ? ' error' : '');
  importToast.classList.remove('hidden');
  clearTimeout(importToast._timer);
  importToast._timer = setTimeout(() => importToast.classList.add('hidden'), 5000);
}

function normaliseRow(row) {
  return csvModel.normaliseRow(row);
}

async function matchWithTMDB(title, year, mediaType) {
  try {
    const params = new URLSearchParams({ title, type: mediaType });
    if (year) params.set('year', year);
    const r = await fetch(`/api/match?${params}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data.matched ? data : null;
  } catch { return null; }
}

async function importRows(rows) {
  cancelImport = false;
  importProgress.classList.remove('hidden');
  let imported = 0, skipped = 0, unmatched = 0;
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    if (cancelImport) break;
    const row = rows[i];
    const title = row.title?.trim();
    if (!title) { skipped++; continue; }
    const { mediaType, status, rating, year, runtime, totalEpisodes, watchedEpisodes } = normaliseRow(row);
    const dup = movies.some(m => m.title.toLowerCase() === title.toLowerCase() && m.mediaType === mediaType && (m.year || '') === year);
    if (dup) { skipped++; continue; }
    progressText.textContent = `Matching "${title}" (${i + 1} of ${total})…`;
    progressBar.style.width = `${Math.round((i / total) * 100)}%`;
    const tmdb = await matchWithTMDB(title, year, mediaType);
    const source = tmdb ? 'tmdb' : 'manual';
    const externalId = tmdb?.tmdbId ? String(tmdb.tmdbId) : '';
    const duplicate = findDuplicateTitle({
      title: tmdb?.title || title,
      year: tmdb?.year || year,
      mediaType,
      source,
      externalId,
    });
    if (duplicate) { skipped++; continue; }
    const isShow      = mediaType === 'tv' || mediaType === 'anime';
    const epTotalUsed = isShow ? (totalEpisodes || (tmdb?.total_episodes || 0)) : 0;
    const epWatchUsed = isShow ? Math.min(watchedEpisodes, epTotalUsed || watchedEpisodes) : 0;
    if (tmdb) {
      movies.push({ id: genId(), addedAt: Date.now(), title: tmdb.title, year: tmdb.year, genre: tmdb.genre, director: tmdb.director, country: tmdb.country, notes: row.notes || tmdb.overview || '', posterUrl: tmdb.poster_path ? `https://image.tmdb.org/t/p/w200${tmdb.poster_path}` : '', tmdbId: tmdb.tmdbId, runtime: tmdb.runtime || runtime, mediaType, status, rating, totalEpisodes: epTotalUsed, watchedEpisodes: epWatchUsed });
    } else {
      unmatched++;
      movies.push({ id: genId(), addedAt: Date.now(), title, year, genre: row.genre || '', director: row.director || '', country: row.country || '', notes: row.notes || '', posterUrl: row.posterUrl || '', tmdbId: null, runtime, mediaType, status, rating, totalEpisodes: epTotalUsed, watchedEpisodes: epWatchUsed });
    }
    imported++;
  }

  progressBar.style.width = '100%';
  importProgress.classList.add('hidden');
  save(); updateCountryDropdown(); render();
  const parts = [`Imported ${imported} title${imported !== 1 ? 's' : ''}`];
  if (skipped)   parts.push(`${skipped} skipped`);
  if (unmatched) parts.push(`${unmatched} not on TMDB`);
  if (cancelImport) parts.push('cancelled');
  showToast(parts.join(' · '));
}

progressCancel.addEventListener('click', () => { cancelImport = true; });
csvInput.addEventListener('change', () => {
  const file = csvInput.files[0];
  if (!file) return;
  csvInput.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const rows = parseCSV(e.target.result);
      if (!rows.length) { showToast('CSV appears empty or has no valid rows.', true); return; }
      importRows(rows);
    } catch { showToast('Failed to parse CSV. Check the file format.', true); }
  };
  reader.readAsText(file);
});

const TEMPLATE_URL = URL.createObjectURL(new Blob([csvModel.TEMPLATE_CSV], { type: 'text/csv' }));

// ── Auth UI ──────────────────────────────────────────────
const authOverlay  = document.getElementById('auth-overlay');
const authLoading  = document.getElementById('auth-loading');
const authFormWrap = document.getElementById('auth-form-wrap');
const authForm     = document.getElementById('auth-form');
const authEmail    = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError    = document.getElementById('auth-error');
const authSuccess  = document.getElementById('auth-success');
const authSubmit   = document.getElementById('auth-submit');
const authOffline  = document.getElementById('auth-offline');
const userMenu     = document.getElementById('user-menu');
const userAvatar   = document.getElementById('user-avatar');
const userEmailEl  = document.getElementById('user-email');
const signoutBtn      = document.getElementById('signout-btn');
const reloadCloudBtn  = document.getElementById('reload-cloud-btn');

let authMode = 'signin';

document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    authMode = btn.dataset.tab;
    authSubmit.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
  });
});

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = authEmail.value.trim();
  const password = authPassword.value;
  authError.classList.add('hidden');
  authSuccess.classList.add('hidden');
  authSubmit.disabled = true;
  authSubmit.textContent = '…';

  try {
    if (authMode === 'signin') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      authSuccess.textContent = 'Account created! Check your email to confirm, then sign in.';
      authSuccess.classList.remove('hidden');
      authSubmit.disabled = false;
      authSubmit.textContent = 'Create Account';
      return;
    }
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
  authSubmit.disabled = false;
  authSubmit.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
});

authOffline.addEventListener('click', () => {
  offlineMode = true;
  hideAuthOverlay();
  setSyncState('error', 'Offline mode — changes saved locally only');
  updateCountryDropdown();
  render();
});

function showAuthOverlay(mode = 'form') {
  authOverlay.classList.remove('hidden');
  if (mode === 'loading') {
    authLoading.classList.remove('hidden');
    authFormWrap.classList.add('hidden');
  } else {
    authLoading.classList.add('hidden');
    authFormWrap.classList.remove('hidden');
  }
}

function hideAuthOverlay() {
  authOverlay.classList.add('hidden');
}

function updateUserMenu() {
  if (!currentUser) { userMenu.classList.add('hidden'); return; }
  userMenu.classList.remove('hidden');
  const displayName = currentUserDisplayName();
  userAvatar.textContent  = userInitial(displayName);
  userEmailEl.textContent = currentUser.email;
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.textContent = currentUsername || 'Set username';
    usernameDisplay.classList.toggle('username-placeholder', !currentUsername);
  }
  const sharingToggle = document.getElementById('sharing-toggle');
  if (sharingToggle) sharingToggle.checked = sharingEnabled;
}

// ── User dropdown toggle ────────────────────────────────
document.getElementById('user-avatar-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!e.target.closest('#user-menu')) {
    document.getElementById('user-dropdown').classList.add('hidden');
    closeUsernameForm();
  }
});

// ── Username edit ───────────────────────────────────────
function closeUsernameForm() {
  document.getElementById('username-form')?.classList.add('hidden');
}

document.getElementById('username-edit-btn').addEventListener('click', e => {
  e.stopPropagation();
  const form = document.getElementById('username-form');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    const input = document.getElementById('username-input');
    input.value = currentUsername || '';
    input.focus();
  }
});

document.getElementById('username-save-btn').addEventListener('click', async e => {
  e.stopPropagation();
  const val = document.getElementById('username-input').value.trim();
  if (!val) return;
  const previous = currentUsername;
  currentUsername = val;
  setStoredUsername(val);
  updateUserMenu();
  closeUsernameForm();
  const result = await saveProfile({ username: val });
  if (!result.ok) {
    currentUsername = previous;
    setStoredUsername(previous);
    updateUserMenu();
    showToast('Could not save username: ' + (result.error || 'unknown error'), true);
    return;
  }
  const savedUsername = result.data?.username || val;
  currentUsername = savedUsername;
  setStoredUsername(savedUsername);
  updateUserMenu();
  if (activeView === 'profile') renderProfile();
  showToast('Username saved');
});

document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.mobileView;
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === target);
    });
    currentPage = 0;
    if (target === 'stats') switchView('stats');
    else if (target === 'profile') switchView('profile');
    else if (target === 'calendar') switchView('calendar');
    else if (target === 'community') switchView('community');
    else switchView('content', target);
  });
});

document.getElementById('username-input').addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('username-save-btn').click();
  }
});

// ── Sharing toggle ──────────────────────────────────────
document.getElementById('sharing-toggle').addEventListener('change', async e => {
  sharingEnabled = e.target.checked;
  localStorage.setItem('cinetrack_sharing', sharingEnabled);
  const result = await saveProfile({ sharing_enabled: sharingEnabled });
  if (!result.ok) {
    sharingEnabled = !sharingEnabled;
    e.target.checked = sharingEnabled;
    localStorage.setItem('cinetrack_sharing', sharingEnabled);
    showToast('Could not update sharing: ' + (result.error || 'unknown error'), true);
  }
  if (activeView === 'profile') renderProfile();
});

// ── Reload from cloud ───────────────────────────────────
reloadCloudBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = null;
  reloadCloudBtn.disabled = true;
  reloadCloudBtn.textContent = '↻ Loading…';
  const result = await loadUserData({ force: true });
  reloadCloudBtn.disabled = false;
  reloadCloudBtn.textContent = '↻ Reload from cloud';
  if (result?.ok) showToast('Reloaded from cloud ✓');
});

// ── Sync now (push pending + pull latest) ──────────────
const syncNowBtn = document.getElementById('sync-now-btn');
syncNowBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  if (offlineMode || !currentUser) {
    showToast('Sync unavailable in offline mode.', true);
    return;
  }
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = '↻ Syncing…';
  // Cancel any pending debounce so we don't double-write
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = null;
  try {
    if (hasUnsyncedLocalChanges()) {
      const saveResult = await saveUserData();
      if (!saveResult?.ok) throw new Error(saveResult?.error || 'Cloud save failed');
    }
    const loadResult = await loadUserData({ force: true });
    if (!loadResult?.ok) throw new Error(loadResult?.error || 'Cloud reload failed');
    showToast('Synced ✓');
  } catch (e) {
    logAppError('sync.manual', e);
    showToast('Sync failed: ' + (e?.message || 'unknown error'), true);
  }
  syncNowBtn.disabled = false;
  syncNowBtn.textContent = '↻ Sync now';
});

// ── Refresh metadata ────────────────────────────────────
const tmdbRefreshBtn = document.getElementById('tmdb-refresh-btn');
let cancelTmdbRefresh = false;

tmdbRefreshBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  const targets = movies.filter(m => m.tmdbId || m.externalId);
  if (!targets.length) { showToast('No source-linked titles to refresh.'); return; }

  cancelTmdbRefresh = false;
  importProgress.classList.remove('hidden');
  let updated = 0, failed = 0, demoted = 0;
  const demotedTitles = [];
  for (let i = 0; i < targets.length; i++) {
    if (cancelTmdbRefresh) break;
    const m = targets[i];
    progressText.textContent = `Refreshing "${m.title}" (${i + 1} of ${targets.length})…`;
    progressBar.style.width = `${Math.round((i / targets.length) * 100)}%`;
    try {
      const d = await fetchDetailsForEntry(m);
      const before = libraryModel.clone(m);
      const result = applyMetadataRefresh(m, d);
      updateLibraryEntry(m.id, libraryModel.protectProgress(before, m), { allowDowngrade: false });
      if (result?.demoted) {
        demoted++;
        if (demotedTitles.length < 3) demotedTitles.push(m.title);
      }
      updated++;
    } catch (e) {
      failed++;
      logAppError('metadata.bulk_refresh', e, { title: m.title, id: m.id }, 'warn');
    }
  }
  progressBar.style.width = '100%';
  importProgress.classList.add('hidden');
  save(); updateCountryDropdown(); render();
  const parts = [`Refreshed ${updated} title${updated !== 1 ? 's' : ''}`];
  if (demoted) {
    const sample = demotedTitles.join(', ');
    const more   = demoted - demotedTitles.length;
    const list   = more > 0 ? `${sample} +${more} more` : sample;
    parts.push(`⏳ ${demoted} back to In Progress (${list})`);
  }
  if (failed)            parts.push(`${failed} failed`);
  if (cancelTmdbRefresh) parts.push('cancelled');
  showToast(parts.join(' · '));
});

// Reuse the import-progress cancel button for metadata refresh too
progressCancel.addEventListener('click', () => { cancelTmdbRefresh = true; });

// ── Sign out ────────────────────────────────────────────
signoutBtn.addEventListener('click', async () => {
  try { if (sb) await sb.auth.signOut(); } catch {}
  stopCloudPolling();
  writeLocalLibraryBackup('before-sign-out-clear', movies);
  currentUser     = null;
  currentUsername = null;
  sharingEnabled  = false;
  replaceLibrary([]);
  initialLibrarySyncPending = false;
  updateMutationLockUI();
  lastCloudUpdatedAt = null;
  lastCloudItemCount = null;
  localChangeVersion = 0;
  lastSavedLocalVersion = 0;
  localStorage.removeItem(STORAGE_KEY);
  clearPendingSyncMarker();
  localStorage.removeItem('cinetrack_sharing');
  document.getElementById('user-dropdown').classList.add('hidden');
  updateUserMenu();
  showAuthOverlay('form');
});

// ── Flush pending save when tab is hidden/closed ────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && cloudSyncTimer && !offlineMode && currentUser) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
    saveUserData();
  } else if (!document.hidden && !offlineMode && currentUser) {
    scheduleEntryCloudRefresh('visible');
  }
});

window.addEventListener('focus', () => {
  scheduleEntryCloudRefresh('focus');
});

window.addEventListener('pageshow', () => {
  scheduleEntryCloudRefresh('pageshow');
});

async function refreshFromCloudIfNewer() {
  if (!sb || !currentUser || offlineMode || hasUnsyncedLocalChanges()) return;
  const result = await loadUserData({ silent: true, onlyIfNewer: true });
  if (result?.changed) showToast('Updated from cloud ✓');
}

function scheduleEntryCloudRefresh(reason = 'entry') {
  if (!sb || !currentUser || offlineMode || document.hidden) return;
  if (hasUnsyncedLocalChanges()) return;

  const now = Date.now();
  if (cloudRefreshInFlight || now - lastCloudRefreshAttempt < 2500) return;
  lastCloudRefreshAttempt = now;
  cloudRefreshInFlight = true;

  setTimeout(async () => {
    try {
      await refreshFromCloudIfNewer();
    } finally {
      cloudRefreshInFlight = false;
    }
  }, reason === 'pageshow' ? 250 : 0);
}

function startCloudPolling() {
  clearInterval(cloudPollTimer);
  if (!sb || !currentUser || offlineMode) return;
  cloudPollTimer = setInterval(() => {
    if (!document.hidden) scheduleEntryCloudRefresh('poll');
  }, 15000);
}

function stopCloudPolling() {
  clearInterval(cloudPollTimer);
  cloudPollTimer = null;
}

// ── Init ────────────────────────────────────────────────
applyGridSize(gridSize);

if (movies.length > 0) { updateCountryDropdown(); render(); }

(async () => {
  showAuthOverlay('loading');

  const hasSupabase = await initSupabase();

  if (!hasSupabase) {
    offlineMode = true;
    hideAuthOverlay();
    setSyncState('error', 'Database not configured — offline mode');
    if (movies.length === 0) seedData();
    updateCountryDropdown();
    render();
    checkEpisodeNotifications();
    warmUpcomingCacheForBadge();
    return;
  }

  let userDataFetched = false;

  async function handleUserSignIn(user, accessToken = '') {
    if (userDataFetched && currentUser?.id === user.id) return;
    userDataFetched = true;
    currentUser = user;
    currentAccessToken = accessToken || currentAccessToken;
    offlineMode = false;
    updateUserMenu();

    // Snappy paint: show local-cached data immediately. The cloud sync
    // runs in the background; PR #66's post-await guard preserves any
    // edits made during the load. The header sync pill communicates the
    // background state.
    initialLibrarySyncPending = true;
    updateMutationLockUI();
    hideAuthOverlay();
    updateCountryDropdown();
    render();
    setSyncState('loading');

    // Profile + preferences fire-and-forget — neither blocks UI.
    withTimeout(loadProfile(), 'Profile load', 15000).catch(e => {
      logAppError('profile.initial_load', e, {}, 'warn');
    });
    withTimeout(loadPreferences(), 'Preference load', 15000).catch(e => {
      logAppError('preferences.initial_load', e, {}, 'warn');
    });

    // User data: still runs in the background, but we capture the local
    // count up front so we can tell the user when cloud diverges
    // significantly (added/removed titles from another device).
    const previousCount = Array.isArray(movies) ? movies.length : 0;
    (async () => {
      let loaded;
      try {
        if (hasUnsyncedLocalChanges()) {
          setSyncState('saving', 'Saving local changes before cloud load');
          const saved = await saveUserData();
          if (!saved?.ok) {
            loaded = { ok: false, error: saved?.error || 'Cloud save failed' };
          } else {
            loaded = await loadUserData({ onlyIfNewer: true });
          }
        } else {
          loaded = await loadUserData();
        }
        if (!loaded?.ok) {
          // pendingLocal isn't a real failure — guard just chose to keep
          // local. Don't redden the sync pill in that case.
          if (!loaded?.pendingLocal) setSyncState('error', loaded?.error || 'Cloud load failed');
          return;
        }
        startCloudPolling();
        maybeRefreshCalendarOncePerAccountToday();

        const newCount = Array.isArray(movies) ? movies.length : 0;
        const delta = newCount - previousCount;
        if (delta >= 2) {
          showToast(`Synced — ${delta} new title${delta === 1 ? '' : 's'} from another device`);
        } else if (delta <= -2) {
          showToast(`Synced — ${-delta} title${delta === -1 ? '' : 's'} removed since this device last synced`);
        }
      } finally {
        initialLibrarySyncPending = false;
        updateMutationLockUI();
        refreshCurrentView();
      }
    })();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    currentAccessToken = session?.access_token || currentAccessToken;
    if (event === 'SIGNED_IN' && session?.user) {
      await handleUserSignIn(session.user, session.access_token || '');
    } else if (event === 'SIGNED_OUT') {
      userDataFetched = false;
      currentUser = null;
      currentAccessToken = '';
      initialLibrarySyncPending = false;
      stopCloudPolling();
      updateMutationLockUI();
      updateUserMenu();
    }
  });

  try {
    const { data: { session } } = await withTimeout(sb.auth.getSession(), 'Initial session load', SESSION_TIMEOUT_MS);
    if (session?.user) {
      await handleUserSignIn(session.user, session.access_token || '');
    } else {
      showAuthOverlay('form');
    }
  } catch (e) {
    logAppError('auth.initial_session', e, {}, 'warn');
    if (currentUser) {
      hideAuthOverlay();
      updateCountryDropdown();
      render();
      startCloudPolling();
      return;
    }
    offlineMode = true;
    hideAuthOverlay();
    setSyncState('error', e?.message || 'Session load failed');
    if (movies.length === 0) seedData();
    updateCountryDropdown();
    render();
    showToast('Cloud session timed out. Opened in local mode.', true);
  }
})();
