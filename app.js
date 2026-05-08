// ── Theme ───────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

const savedTheme = localStorage.getItem('cinetrack_theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
  localStorage.setItem('cinetrack_theme', next);
  applyTheme(next);
  if (typeof scheduleSavePrefs === 'function') scheduleSavePrefs();
});

// ── Background preset ───────────────────────────────────
const BG_PRESETS = ['default', 'aurora', 'sunset', 'ocean', 'midnight', 'mono'];
function applyBgPreset(name) {
  const safe = BG_PRESETS.includes(name) ? name : 'default';
  if (safe === 'default') document.documentElement.removeAttribute('data-bg');
  else document.documentElement.setAttribute('data-bg', safe);
}
applyBgPreset(localStorage.getItem('cinetrack_bg') || 'default');

// ── Appearance: glass / accent / orbs / density / motion ─
const GLASS_PRESETS   = ['vivid', 'medium', 'subtle'];
const ACCENT_PRESETS  = ['default', 'blue', 'green', 'purple', 'amber', 'cyan'];
const ORBS_OPTIONS    = ['static', 'animated'];
const DENSITY_OPTIONS = ['comfortable', 'compact'];
const MOTION_OPTIONS  = ['full', 'reduced'];
const POSTERS_OPTIONS = ['shown', 'hidden'];
const NOTIF_OPTIONS   = ['off', 'on'];

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

applyGlass(localStorage.getItem('cinetrack_glass')   || 'vivid');
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
];
let prefSaveTimer = null;
let prefMigrationWarned = false;

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
    const { error } = await sb.from('profiles').upsert({
      user_id: currentUser.id,
      preferences: prefs,
    });
    if (error) throw error;
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
    const { data, error } = await sb.from('profiles')
      .select('preferences')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('preferences') || msg.includes('column') || error?.code === '42703') {
        // Column missing — first-time setup. Silent here; will warn on save.
        return;
      }
      throw error;
    }
    const prefs = data?.preferences;
    if (!prefs || typeof prefs !== 'object') return;

    for (const k of SYNC_PREF_KEYS) {
      if (prefs[k] != null) localStorage.setItem(k, String(prefs[k]));
    }
    applyAllAppearance();
    refreshCurrentView();
  } catch (e) {
    console.warn('[cinetrack] Could not load preferences:', e?.message || e);
  }
}

function applyAllAppearance() {
  applyTheme(localStorage.getItem('cinetrack_theme') || 'dark');
  applyBgPreset(localStorage.getItem('cinetrack_bg')   || 'default');
  applyGlass(localStorage.getItem('cinetrack_glass')   || 'vivid');
  applyAccent(localStorage.getItem('cinetrack_accent') || 'default');
  applyOrbs(localStorage.getItem('cinetrack_orbs')     || 'static');
  applyDensity(localStorage.getItem('cinetrack_density') || 'comfortable');
  applyMotion(localStorage.getItem('cinetrack_motion') || 'full');
  applyPosters(localStorage.getItem('cinetrack_posters') || 'shown');
  applyEpisodeNotif(localStorage.getItem('cinetrack_notif') || 'off');
}

// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'cinetrack_movies';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w200';

let movies          = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeType      = 'movie';   // 'movie' | 'tv' | 'anime'
let activeView      = 'content'; // 'content' | 'stats' | 'community'
let activeStatus    = 'all';
let searchQuery     = '';
let countryFilter   = '';
let genreFilter     = '';
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
let pageSize        = parseInt(localStorage.getItem('cinetrack_pagesize') || '50');
let selectMode      = false;
let cloudSyncTimer  = null;

// Supabase
let sb              = null;
let currentUser     = null;
let offlineMode     = false;
let currentUsername = null;
let sharingEnabled  = localStorage.getItem('cinetrack_sharing') === 'true';

// ── Sync indicator ──────────────────────────────────────
let currentSyncState = 'loading';
let currentSyncTitle = 'Loading…';

function setSyncState(state, detail = '') {
  currentSyncState = state;
  currentSyncTitle = { loading: 'Loading…', saving: 'Saving…', saved: 'Synced ✓', error: detail || 'Offline — saved locally' }[state] || '';
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.dataset.state = state;
  el.title = currentSyncTitle;
}

// ── Supabase init ───────────────────────────────────────
async function initSupabase() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error();
    const { supabaseUrl, supabaseKey } = await r.json();
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
  try {
    const { data } = await sb
      .from('profiles')
      .select('username, sharing_enabled')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (data) {
      currentUsername = data.username || null;
      sharingEnabled  = !!data.sharing_enabled;
      localStorage.setItem('cinetrack_sharing', sharingEnabled);
    }
    updateUserMenu();
  } catch {}
}

async function saveProfile(updates) {
  if (!sb || !currentUser) return { ok: false, error: 'Not signed in' };
  try {
    const { error } = await sb.from('profiles').upsert({
      user_id: currentUser.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error('[cinetrack] saveProfile failed:', e);
    return { ok: false, error: e?.message || String(e) };
  }
}

// ── User data load / save ───────────────────────────────
async function loadUserData() {
  if (!sb || !currentUser) return;
  setSyncState('loading');
  try {
    // order + limit(1) instead of maybeSingle() so duplicate rows (if any exist
    // due to a table without a unique user_id constraint) don't cause an error
    const { data: rows, error } = await sb
      .from('user_data')
      .select('movies')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = rows?.[0] ?? null;
    if (row?.movies && Array.isArray(row.movies)) {
      movies = row.movies;
      syncEpisodeProgress();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    }
    setSyncState('saved');
  } catch (e) {
    console.error('Failed to load data from cloud:', e);
    setSyncState('error', e.message);
    showToast('Could not load your data from the cloud: ' + e.message, true);
  }
  updateCountryDropdown();
  refreshCurrentView();
  checkEpisodeNotifications();
  warmUpcomingCacheForBadge();
}

async function saveUserData() {
  if (!sb || !currentUser) return;
  try {
    const payload = { user_id: currentUser.id, movies, updated_at: new Date().toISOString() };
    // Try update first; if nothing was updated, insert (avoids duplicate rows
    // when the table's primary key is not user_id)
    const { count, error: ue } = await sb
      .from('user_data')
      .update(payload)
      .eq('user_id', currentUser.id)
      .select('user_id', { count: 'exact', head: true });
    if (ue) throw ue;
    if (count === 0) {
      const { error: ie } = await sb.from('user_data').insert(payload);
      if (ie) throw ie;
    }
    setSyncState('saved');
  } catch (e) {
    console.error('Failed to save data to cloud:', e);
    setSyncState('error', e.message);
    showToast('Cloud sync failed — your changes are saved locally only. (' + e.message + ')', true);
  }
}

// ── Season-tracking helpers ─────────────────────────────
// Cascade rule: if any season has progress, all earlier seasons must be
// fully watched. Mutates the array in place.
function normaliseSeasons(seasons) {
  if (!Array.isArray(seasons) || !seasons.length) return;
  const sorted = [...seasons].sort((a, b) => a.number - b.number);
  // Find the highest-indexed season with any progress
  let lastTouched = -1;
  for (let i = 0; i < sorted.length; i++) {
    const w = Math.min(sorted[i].watched || 0, sorted[i].total || 0);
    sorted[i].watched = w;
    if (w > 0) lastTouched = i;
  }
  // Cascade: every earlier season is fully watched
  for (let i = 0; i < lastTouched; i++) {
    sorted[i].watched = sorted[i].total;
  }
}

// Recompute totalEpisodes / watchedEpisodes from seasons[] (kept as
// derived sums so stats / CSV / cloud-sync continue to work).
function recomputeShowProgress(m) {
  if (!Array.isArray(m.seasons) || !m.seasons.length) return;
  m.totalEpisodes   = m.seasons.reduce((s, x) => s + (x.total   || 0), 0);
  m.watchedEpisodes = m.seasons.reduce((s, x) => s + Math.min(x.watched || 0, x.total || 0), 0);
}

// First season with watched < total. Returns null if all caught up.
function activeSeason(m) {
  if (!Array.isArray(m.seasons) || !m.seasons.length) return null;
  const sorted = [...m.seasons].sort((a, b) => a.number - b.number);
  return sorted.find(s => (s.watched || 0) < (s.total || 0)) || null;
}

// If a TV/anime entry is marked watched, every episode counts as watched.
// Applies at the season level too when seasons[] is present.
function syncEpisodeProgress() {
  for (const m of movies) {
    if (m.mediaType !== 'tv' && m.mediaType !== 'anime') continue;
    if (m.status === 'watched') {
      if (Array.isArray(m.seasons) && m.seasons.length) {
        m.seasons.forEach(s => { s.watched = s.total; });
        recomputeShowProgress(m);
      } else if ((m.totalEpisodes || 0) > 0) {
        m.watchedEpisodes = m.totalEpisodes;
      }
    } else if (Array.isArray(m.seasons) && m.seasons.length) {
      normaliseSeasons(m.seasons);
      recomputeShowProgress(m);
    }
  }
}

// One-shot at startup to fix any legacy data missing the invariant.
syncEpisodeProgress();

function save() {
  syncEpisodeProgress();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  if (offlineMode || !currentUser) return;
  setSyncState('saving');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(saveUserData, 300);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── DOM refs ────────────────────────────────────────────
const grid            = document.getElementById('movie-grid');
const emptyMsg        = document.getElementById('empty-msg');
const searchInput     = document.getElementById('search-input');
const countryFilterEl = document.getElementById('country-filter');
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

// ── View switching ──────────────────────────────────────
function refreshCurrentView() {
  if (activeView === 'stats') renderStats();
  else if (activeView === 'profile') renderProfile();
  else if (activeView === 'community') { /* don't auto-reload community */ }
  else render();
}

function switchView(view, type) {
  activeView = view;
  if (type && view === 'content') {
    activeType      = type;
    activeMediaType = type;
    activeStatus    = 'all';
    genreFilter     = '';
    genreFilterEl.value = '';
  }

  const isContent   = view === 'content';
  const isStats     = view === 'stats';
  const isCommunity = view === 'community';
  const isProfile   = view === 'profile';
  const isCalendar  = view === 'calendar';

  // Sync header profile button active state
  document.getElementById('header-profile-btn')?.classList.toggle('active', isProfile);

  document.querySelector('.controls').classList.toggle('hidden', !isContent);
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

function hasActiveFilters() {
  return !!(searchQuery || genreFilter || countryFilter || activeStatus !== 'all'
    || yearMinFilter || yearMaxFilter || ratingMinFilter || ratingMaxFilter);
}

function updateClearFiltersBtn() {
  const active = hasActiveFilters();
  clearFiltersBtn.classList.toggle('hidden', !active);
  selectModeBtn.classList.toggle('hidden', active);
}

clearFiltersBtn.addEventListener('click', () => {
  searchQuery   = '';
  genreFilter   = '';
  countryFilter = '';
  activeStatus  = 'all';
  yearMinFilter = '';
  yearMaxFilter = '';
  ratingMinFilter = '';
  ratingMaxFilter = '';
  searchInput.value     = '';
  genreFilterEl.value   = '';
  countryFilterEl.value = '';
  const yMin = document.getElementById('year-min'); if (yMin) yMin.value = '';
  const yMax = document.getElementById('year-max'); if (yMax) yMax.value = '';
  const rMin = document.getElementById('rating-min'); if (rMin) rMin.value = '';
  const rMax = document.getElementById('rating-max'); if (rMax) rMax.value = '';
  currentPage = 0;
  render();
});

// ── More filters (year / rating) ────────────────────────
const moreFiltersBtn   = document.getElementById('more-filters-btn');
const moreFiltersPanel = document.getElementById('more-filters');
const moreFiltersClear = document.getElementById('more-filters-clear');
const yearMinEl   = document.getElementById('year-min');
const yearMaxEl   = document.getElementById('year-max');
const ratingMinEl = document.getElementById('rating-min');
const ratingMaxEl = document.getElementById('rating-max');

if (moreFiltersBtn && moreFiltersPanel) {
  moreFiltersBtn.addEventListener('click', () => {
    const willOpen = moreFiltersPanel.classList.contains('hidden');
    moreFiltersPanel.classList.toggle('hidden', !willOpen);
    moreFiltersBtn.classList.toggle('active', willOpen);
  });
}
yearMinEl?.addEventListener('input', () => { yearMinFilter = yearMinEl.value.trim(); currentPage = 0; render(); });
yearMaxEl?.addEventListener('input', () => { yearMaxFilter = yearMaxEl.value.trim(); currentPage = 0; render(); });
ratingMinEl?.addEventListener('change', () => { ratingMinFilter = ratingMinEl.value; currentPage = 0; render(); });
ratingMaxEl?.addEventListener('change', () => { ratingMaxFilter = ratingMaxEl.value; currentPage = 0; render(); });
moreFiltersClear?.addEventListener('click', () => {
  yearMinFilter = ''; yearMaxFilter = ''; ratingMinFilter = ''; ratingMaxFilter = '';
  if (yearMinEl) yearMinEl.value = '';
  if (yearMaxEl) yearMaxEl.value = '';
  if (ratingMinEl) ratingMinEl.value = '';
  if (ratingMaxEl) ratingMaxEl.value = '';
  currentPage = 0;
  render();
});

// ── Random picker ───────────────────────────────────────
const randomPickBtn   = document.getElementById('random-pick-btn');
const randomPickModal = document.getElementById('random-pick-modal');
const randomPickBody  = document.getElementById('random-pick-body');

function showRandomPick() {
  if (!randomPickModal || !randomPickBody) return;
  const pool = filtered();
  if (!pool.length) {
    randomPickBody.innerHTML = '<p class="random-pick-empty">No titles match the current filters.</p>';
    randomPickModal.classList.remove('hidden');
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const isTV = pick.mediaType === 'tv' || pick.mediaType === 'anime';
  const emoji = pick.mediaType === 'anime' ? '🎌' : isTV ? '📺' : '🎬';
  randomPickBody.innerHTML = `
    <h2>🎲 How about…</h2>
    ${pick.posterUrl
      ? `<img class="random-pick-poster" src="${esc(pick.posterUrl)}" alt="${esc(pick.title)}" />`
      : `<div class="random-pick-poster-emoji">${emoji}</div>`}
    <div class="random-pick-title">${esc(pick.title)}</div>
    <div class="random-pick-meta">${pick.year || ''}${pick.year && pick.genre ? ' · ' : ''}${esc(pick.genre || '')}</div>
    <div class="random-pick-actions">
      <button type="button" data-pick-action="another">🎲 Pick another</button>
      <button type="button" data-pick-action="open" data-id="${pick.id}" class="primary">Open</button>
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

// ── Page size ───────────────────────────────────────────
pageSizeSelect.value = String(pageSize);
pageSizeSelect.addEventListener('change', () => {
  pageSize = parseInt(pageSizeSelect.value);
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
  const labels  = { movie: 'Search TMDB', tv: 'Search TMDB (TV)', anime: 'Search TMDB (Anime)' };
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
    const data = await searchTMDB(q, activeMediaType);
    tmdbSearching.classList.add('hidden');
    renderDropdown(data.results || []);
  } catch (err) {
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
    <div class="tmdb-result" data-id="${m.id}" data-media-type="${m.media_type}">
      <img class="tmdb-result-poster"
           src="${m.poster_path ? POSTER_BASE + m.poster_path : ''}"
           alt="" onerror="this.style.display='none'" />
      <div class="tmdb-result-info">
        <span class="tmdb-result-title">${esc(m.title)}</span>
        <span class="tmdb-result-year">${m.year || '—'}${activeMediaType === 'anime' ? ` · ${m.media_type}` : ''}</span>
      </div>
    </div>
  `).join('');
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
  const fetchType = activeMediaType === 'anime' ? (row.dataset.mediaType || 'tv') : activeMediaType;
  hideDropdown();
  tmdbSearching.textContent = 'Loading details…';
  tmdbSearching.classList.remove('hidden');
  tmdbQuery.value = '';

  try {
    const details = await fetchTMDBDetails(id, fetchType);
    tmdbSearching.classList.add('hidden');
    applyTMDBSelection(details);
  } catch (err) {
    tmdbSearching.classList.add('hidden');
    tmdbError.textContent = err.message;
    tmdbError.classList.remove('hidden');
  }
});

function applyTMDBSelection(details) {
  tmdbSelection = details;
  tmdbPosterThumb.src = details.poster_path ? POSTER_BASE + details.poster_path : '';
  tmdbPosterThumb.style.display = details.poster_path ? 'block' : 'none';
  tmdbSelTitle.textContent = details.title;
  tmdbSelYear.textContent  = details.year || '';
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
  // any watched counts the user already had on existing seasons by number).
  if (Array.isArray(details.seasons) && details.seasons.length) {
    const prev = new Map(editingSeasons.map(s => [s.number, s.watched || 0]));
    editingSeasons = details.seasons.map(s => ({
      number:  s.number,
      total:   s.total,
      watched: Math.min(prev.get(s.number) || 0, s.total),
      name:    s.name,
    }));
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

  const current = countryFilterEl.value;
  countryFilterEl.innerHTML = '<option value="">All Countries</option>' +
    countries.map(c => `<option value="${esc(c)}"${c === current ? ' selected' : ''}>${esc(c)}</option>`).join('');

  updateGenreDropdown();
}

// ── Genre dropdown ───────────────────────────────────────
const genreFilterEl = document.getElementById('genre-filter');

function updateGenreDropdown() {
  const sourceFilter = activeType === 'dropped'
    ? (m => m.status === 'dropped')
    : (m => m.mediaType === activeType && m.status !== 'dropped');
  const genres = [...new Set(
    movies
      .filter(sourceFilter)
      .flatMap(m => (m.genre || '').split(',').map(g => g.trim()).filter(Boolean))
  )].sort();

  const current = genreFilterEl.value;
  genreFilterEl.innerHTML = '<option value="">All Genres</option>' +
    genres.map(g => `<option value="${esc(g)}"${g === current ? ' selected' : ''}>${esc(g)}</option>`).join('');
}

// ── Filtering ───────────────────────────────────────────
function filtered() {
  const list = movies.filter(m => {
    if (activeType === 'dropped') {
      if (m.status !== 'dropped') return false;
    } else {
      if (m.mediaType !== activeType) return false;
      if (m.status === 'dropped') return false;
      if (activeStatus !== 'all' && m.status !== activeStatus) return false;
    }
    if (countryFilter && m.country !== countryFilter) return false;
    if (genreFilter) {
      const genres = (m.genre || '').split(',').map(g => g.trim());
      if (!genres.includes(genreFilter)) return false;
    }
    if (yearMinFilter || yearMaxFilter) {
      const y = parseInt(m.year);
      if (yearMinFilter && (!y || y < parseInt(yearMinFilter))) return false;
      if (yearMaxFilter && (!y || y > parseInt(yearMaxFilter))) return false;
    }
    if (ratingMinFilter && (m.rating || 0) < parseInt(ratingMinFilter)) return false;
    if (ratingMaxFilter && (m.rating || 0) > parseInt(ratingMaxFilter)) return false;
    const q = searchQuery.toLowerCase();
    if (q) {
      const hay = [m.title, m.genre, m.director, m.country].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    switch (sortOrder) {
      case 'title':  return a.title.localeCompare(b.title);
      case 'year':   return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      default:       return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  return list;
}

// ── Helpers ─────────────────────────────────────────────
const EMOJIS = ['🎬','🎥','🎞️','🍿','🎦','🌟','🎭','🎪'];

function posterEmoji(title) {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) | 0;
  return EMOJIS[Math.abs(h) % EMOJIS.length];
}

function starsHTML(rating) {
  if (!rating) return '';
  return `<span class="card-stars" title="${rating}/10">${'★'.repeat(rating)}${'☆'.repeat(10 - rating)}</span>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRuntime(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// ── Stats bar ───────────────────────────────────────────
function updateStats() {
  const allOfType     = movies.filter(m => m.mediaType === activeType);
  const watchedCnt    = allOfType.filter(m => m.status === 'watched').length;
  const inProgressCnt = allOfType.filter(m => m.status === 'in_progress').length;
  const watchlistCnt  = allOfType.filter(m => m.status === 'watchlist').length;

  const a = s => activeStatus === s ? ' stat-active' : '';

  let countryHTML = '';
  if (countryFilter) {
    const byCountry   = allOfType.filter(m => m.country === countryFilter);
    const cWatched    = byCountry.filter(m => m.status === 'watched').length;
    const cInProgress = byCountry.filter(m => m.status === 'in_progress').length;
    const cWatchlist  = byCountry.filter(m => m.status === 'watchlist').length;
    countryHTML =
      `<span class="country-stats">` +
      `🌍 <strong>${esc(countryFilter)}</strong>` +
      `<span class="stat-sep">·</span><span class="cs-watched">✓ ${cWatched}</span>` +
      (cInProgress ? `<span class="stat-sep">·</span><span class="cs-progress">▶ ${cInProgress}</span>` : '') +
      (cWatchlist  ? `<span class="stat-sep">·</span><span class="cs-watchlist">⏳ ${cWatchlist}</span>` : '') +
      `</span>`;
  }

  statsBar.innerHTML =
    `<button class="stat-item stat-watched${a('watched')}" data-filter-status="watched">✓ <strong>${watchedCnt}</strong> watched</button>` +
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

  // Time spent — prorate by progress for partially-watched series.
  // For movies / shows without an episode total, fall back to full runtime when watched.
  function actualMinutes(m) {
    const isShow = m.mediaType === 'tv' || m.mediaType === 'anime';
    if (isShow && (m.totalEpisodes || 0) > 0) {
      const w = Math.min(m.watchedEpisodes || 0, m.totalEpisodes);
      return Math.round((m.runtime || 0) * (w / m.totalEpisodes));
    }
    return m.status === 'watched' ? (m.runtime || 0) : 0;
  }
  const totalMin = scoped.reduce((s, m) => s + actualMinutes(m), 0);

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

  const topRatedHTML = topRated.length ? `
    <div class="chart-section chart-section-wide">
      <h3>Your Top Rated</h3>
      <div class="top-rated-grid">
        ${topRated.map(m => {
          const url = m.tmdbId
            ? `https://www.themoviedb.org/${m.mediaType === 'movie' ? 'movie' : 'tv'}/${m.tmdbId}`
            : null;
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
    <div class="stats-type-tabs">${filterTabs}</div>

    <div class="stats-overview">
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
      <div class="stat-card" title="Total runtime, prorated by your progress on each series">
        <div class="stat-card-value">${formatRuntime(totalMin) || '—'}</div>
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
  searchInput.value     = searchQuery;
  currentPage = 0;
  render();
  window.scrollTo(0, 0);
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

function readUpcomingCache() {
  try { return JSON.parse(localStorage.getItem(UPCOMING_CACHE_KEY) || 'null'); }
  catch { return null; }
}

function writeUpcomingCache(cache) {
  localStorage.setItem(UPCOMING_CACHE_KEY, JSON.stringify(cache));
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

// ── Episode-air-today notifications ─────────────────────
const NOTIF_DEDUPE_KEY = 'cinetrack_notified_episodes';

function todayDateString() {
  const d = new Date(); d.setHours(0,0,0,0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
      if (isShow && m.status === 'in_progress') {
        const item = cache.byId[`tv:${m.tmdbId}`];
        if (item?.nextEpisode?.airDate === todayStr) count += 1;
      } else if (isMovie && m.status === 'watchlist') {
        const item = cache.byId[`movie:${m.tmdbId}`];
        if (item?.releaseDate === todayStr) count += 1;
      }
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
  for (const m of movies) {
    if (!m.tmdbId) continue;
    const isShow = m.mediaType === 'tv' || m.mediaType === 'anime';
    if (isShow && m.status === 'in_progress')      ids.push(`tv:${m.tmdbId}`);
    else if (m.mediaType === 'movie' && m.status === 'watchlist') ids.push(`movie:${m.tmdbId}`);
  }
  if (!ids.length) { updateCalendarAiringBadge(); return; }
  try { await fetchUpcoming(ids); } catch { /* offline-safe */ }
  updateCalendarAiringBadge();
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
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

async function renderCalendar({ force = false } = {}) {
  const panel = document.getElementById('calendar-panel');
  if (!panel) return;

  // What we track: in-progress TV/anime (next episode) + watchlist movies
  // (theatrical release). Each entry is keyed as `${type}:${tmdbId}`.
  const tracked = movies.filter(m => m.tmdbId && (
    ((m.mediaType === 'tv' || m.mediaType === 'anime') && m.status === 'in_progress') ||
    (m.mediaType === 'movie' && m.status === 'watchlist')
  ));

  const ids = tracked.map(m => {
    const t = (m.mediaType === 'tv' || m.mediaType === 'anime') ? 'tv' : 'movie';
    return `${t}:${m.tmdbId}`;
  });

  if (!ids.length) {
    panel.innerHTML = `
      <div class="calendar-header">
        <h2>📅 Upcoming</h2>
      </div>
      <p class="recs-empty">Mark a TV show or anime as <em>In Progress</em>, or add a movie to your <em>Watchlist</em>, to see what's coming up.</p>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="calendar-header">
      <h2>📅 Upcoming <span class="cal-window">· episodes (${UPCOMING_HORIZON_DAYS}d) + film releases (${MOVIE_HORIZON_DAYS}d)</span></h2>
      <button id="calendar-refresh-btn" class="cal-refresh-btn" title="Re-fetch from TMDB now (bypasses 6h cache)">↻ Refresh</button>
    </div>
    <div class="calendar-list"><div class="recs-loading"><span class="recs-spinner"></span> Loading…</div></div>
  `;
  panel.querySelector('#calendar-refresh-btn').addEventListener('click', () => renderCalendar({ force: true }));

  let upcoming;
  try {
    upcoming = await fetchUpcoming(ids, { force });
  } catch (e) {
    panel.querySelector('.calendar-list').innerHTML =
      `<p class="recs-empty">Couldn't load upcoming dates: ${esc(e.message)}</p>`;
    return;
  }

  // Index local entries so we can read user posters / titles back
  const localByKey = new Map(tracked.map(m => {
    const t = (m.mediaType === 'tv' || m.mediaType === 'anime') ? 'tv' : 'movie';
    return [`${t}:${m.tmdbId}`, m];
  }));

  const todayStr = todayDateString();
  const dPlus = (n) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const tvHorizonStr    = dPlus(UPCOMING_HORIZON_DAYS);
  const movieHorizonStr = dPlus(MOVIE_HORIZON_DAYS);

  // Normalize each upcoming entry into a unified row descriptor.
  const dated   = [];
  const undated = [];   // TV between seasons / no scheduled date

  for (const u of upcoming) {
    const key   = `${u.type}:${u.tmdbId}`;
    const local = localByKey.get(key);

    if (u.type === 'movie') {
      const rd = u.releaseDate;
      if (rd && rd >= todayStr && rd <= movieHorizonStr) {
        dated.push({
          date: rd,
          kind: 'movie',
          tmdbId: u.tmdbId,
          title:   local?.title || u.title,
          poster:  local?.posterUrl || (u.poster_path ? POSTER_BASE + u.poster_path : ''),
          sublabel: '🎬 Theatrical release',
          tmdbUrl:  `https://www.themoviedb.org/movie/${u.tmdbId}`,
        });
      }
      continue;
    }

    // TV / anime
    const ne = u.nextEpisode;
    if (ne && ne.airDate && ne.airDate <= tvHorizonStr) {
      dated.push({
        date: ne.airDate,
        kind: local?.mediaType === 'anime' ? 'anime' : 'tv',
        tmdbId: u.tmdbId,
        title:  local?.title || u.title,
        poster: local?.posterUrl || (u.poster_path ? POSTER_BASE + u.poster_path : ''),
        sublabel: `S${ne.season}E${ne.episode}${ne.name ? ` · ${esc(ne.name)}` : ''}`,
        tmdbUrl:  `https://www.themoviedb.org/tv/${u.tmdbId}`,
      });
    } else if (!ne || !ne.airDate) {
      undated.push({
        kind: local?.mediaType === 'anime' ? 'anime' : 'tv',
        tmdbId: u.tmdbId,
        title:  local?.title || u.title,
        poster: local?.posterUrl || (u.poster_path ? POSTER_BASE + u.poster_path : ''),
        tmdbUrl: `https://www.themoviedb.org/tv/${u.tmdbId}`,
      });
    }
  }

  if (!dated.length && !undated.length) {
    panel.querySelector('.calendar-list').innerHTML =
      `<p class="recs-empty">Nothing on the horizon. Watchlist movies will show up to ${MOVIE_HORIZON_DAYS} days before release; in-progress shows up to ${UPCOMING_HORIZON_DAYS} days.</p>`;
    return;
  }

  // Group by date
  dated.sort((a, b) => a.date.localeCompare(b.date));
  const groups = {};
  for (const r of dated) (groups[r.date] ||= []).push(r);

  const groupHTML = Object.keys(groups).sort().map(date => {
    const isToday = date === todayStr;
    const rows = groups[date].map(r => calRow(r, { airingToday: isToday })).join('');
    return `
      <div class="cal-group${isToday ? ' cal-group-today' : ''}">
        <h3 class="cal-group-date">${esc(relativeDayLabel(date))}${isToday ? ' <span class="cal-airing-pill">● Today</span>' : ''}</h3>
        ${rows}
      </div>
    `;
  }).join('');

  const hiatusHTML = undated.length ? `
    <div class="cal-group cal-group-hiatus">
      <h3 class="cal-group-date">Between seasons / no date yet</h3>
      ${undated.map(r => calRow(r, { hideSub: true })).join('')}
    </div>
  ` : '';

  panel.querySelector('.calendar-list').innerHTML = groupHTML + hiatusHTML;

  // Refresh the nav-tab dot using the freshly-fetched cache
  updateCalendarAiringBadge();

  function calRow(r, opts = {}) {
    const fallback = r.kind === 'movie' ? '🎬' : r.kind === 'anime' ? '🎌' : '📺';
    const poster = r.poster
      ? `<img class="cal-poster" src="${r.poster}" alt="${esc(r.title)}" loading="lazy" />`
      : `<div class="cal-poster cal-poster-emoji">${fallback}</div>`;
    const sub = !opts.hideSub
      ? r.sublabel
      : '<em>No date scheduled</em>';
    return `
      <a class="cal-row${opts.airingToday ? ' cal-row-today' : ''}" href="${r.tmdbUrl}" target="_blank" rel="noopener noreferrer" title="View on TMDB">
        ${poster}
        <div class="cal-info">
          <div class="cal-title">${esc(r.title)}</div>
          <div class="cal-ep">${sub}</div>
        </div>
        ${opts.airingToday ? '<span class="cal-row-pill">● Today</span>' : ''}
      </a>
    `;
  }
}

const DISMISSED_RECS_KEY = 'cinetrack_dismissed_recs';
const RECS_CACHE_KEY     = 'cinetrack_recs_cache_v1';
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

// Fisher–Yates partial shuffle: take n items at random from arr.
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function loadRecommendations({ force = false } = {}) {
  const section = document.getElementById('recs-section');
  if (!section) return;

  // Pool: watched + in_progress titles with tmdbId. In-progress shows
  // reflect what you're currently watching → reasonable to seed from.
  const pool = movies.filter(m =>
    (m.status === 'watched' || m.status === 'in_progress') && m.tmdbId
  );

  if (!pool.length) {
    section.innerHTML = '<p class="recs-empty">Mark some titles as watched to get personalised recommendations.</p>';
    return;
  }

  // Genre profile (only watched titles count toward the genre weights).
  const watched = movies.filter(m => m.status === 'watched');
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
  const poolKey = topPool.map(m => m.tmdbId).sort((a, b) => a - b).join(',');

  // Cache check (skip when forced)
  if (!force) {
    const cache = readRecsCache();
    if (cache && cache.poolKey === poolKey && (Date.now() - cache.fetchedAt) < RECS_TTL_MS) {
      renderRecsCards(section, cache.results, genreCounts);
      return;
    }
  }

  const sample = pickRandom(topPool, Math.min(8, topPool.length))
    .sort((a, b) => b._score - a._score);  // best-scored first → API ranks them higher
  const idParam = sample.map(m => `${m.tmdbId}:${m.mediaType}`).join(',');

  let data;
  try {
    const r = await fetch(`/api/recommend?ids=${encodeURIComponent(idParam)}`);
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch {
    section.innerHTML = '<p class="recs-empty">Recommendations require Vercel deployment with a TMDB API key.</p>';
    return;
  }

  const results = data.results || [];
  writeRecsCache({ fetchedAt: Date.now(), poolKey, results });
  renderRecsCards(section, results, genreCounts);
}

function renderRecsCards(section, results, genreCounts) {
  const trackedTmdbIds = new Set(movies.map(m => String(m.tmdbId)).filter(Boolean));
  const dismissed      = getDismissedRecs();
  const recs = results.filter(r =>
    !trackedTmdbIds.has(String(r.id)) && !dismissed.has(String(r.id))
  ).slice(0, 18);

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

  section.innerHTML = `
    <div class="recs-heading-row">
      <h3 class="recs-heading">✨ Recommended For You</h3>
      <button class="recs-refresh-btn" id="recs-refresh-btn" title="Re-sample your seeds and re-fetch from TMDB">↻ Refresh</button>
    </div>
    <p class="recs-sub">Based on what you've watched · favouring ${esc(genreLabel)}</p>
    <div class="recs-grid">
      ${recs.map(r => `
        <div class="rec-card" data-rec-card="${r.id}">
          <button class="rec-dismiss-btn" data-rec-dismiss="${r.id}" title="Not interested">✕</button>
          <div class="rec-poster">
            ${r.poster_path
              ? `<img src="${POSTER_BASE}${r.poster_path}" alt="${esc(r.title)}" loading="lazy" />`
              : `<div class="rec-poster-placeholder">${r.media_type === 'tv' ? '📺' : '🎬'}</div>`}
          </div>
          <div class="rec-info">
            <div class="rec-title">${esc(r.title)}</div>
            ${r.year ? `<div class="rec-year">${r.year}</div>` : ''}
            ${r.overview ? `<div class="rec-overview" title="Tap to expand">${esc(r.overview)}</div>` : ''}
          </div>
          <button class="rec-add-btn" data-rec-id="${r.id}" data-rec-type="${r.media_type}"
            data-rec-title="${esc(r.title)}" data-rec-year="${r.year || ''}"
            data-rec-poster="${r.poster_path || ''}" title="Add to Watchlist">＋ Watchlist</button>
        </div>
      `).join('')}
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

    const poster = e.target.closest('.rec-poster');
    const btn = poster
      ? poster.closest('.rec-card')?.querySelector('.rec-add-btn')
      : e.target.closest('.rec-add-btn');
    if (!btn) return;
    const recId     = btn.dataset.recId;
    const recType   = btn.dataset.recType;
    const recTitle  = btn.dataset.recTitle;
    const recYear   = btn.dataset.recYear;
    const recPoster = btn.dataset.recPoster;
    if (movies.some(m => String(m.tmdbId) === recId)) { btn.textContent = '✓ Added'; btn.disabled = true; return; }
    const newId = genId();
    movies.unshift({
      id:        newId,
      addedAt:   Date.now(),
      title:     recTitle,
      year:      recYear,
      status:    'watchlist',
      rating:    0,
      mediaType: recType === 'anime' ? 'anime' : (recType === 'tv' ? 'tv' : 'movie'),
      tmdbId:    Number(recId),
      posterUrl: recPoster ? POSTER_BASE + recPoster : '',
      genre: '', director: '', country: '', notes: '', runtime: 0,
    });
    save(); updateCountryDropdown();
    btn.textContent = '✓ Added';
    btn.disabled = true;
    trackedTmdbIds.add(recId);

    // Enrich with full TMDB metadata in the background.
    (async () => {
      try {
        const fetchType = recType === 'anime' ? 'tv' : (recType === 'tv' ? 'tv' : 'movie');
        const details = await fetchTMDBDetails(recId, fetchType);
        const m = movies.find(m => m.id === newId);
        if (!m) return;
        if (details.title)    m.title    = details.title;
        if (details.year)     m.year     = details.year;
        if (details.genre)    m.genre    = details.genre;
        if (details.director) m.director = details.director;
        if (details.country)  m.country  = details.country;
        if (details.runtime)  m.runtime  = details.runtime;
        if (details.overview && !m.notes) m.notes = details.overview;
        if (details.poster_path && !m.posterUrl) m.posterUrl = POSTER_BASE + details.poster_path;
        if (Array.isArray(details.seasons) && details.seasons.length) {
          m.seasons = details.seasons.map(s => ({
            number: s.number, total: s.total, watched: 0, name: s.name,
          }));
          m.totalEpisodes   = m.seasons.reduce((sum, x) => sum + (x.total || 0), 0);
          m.watchedEpisodes = 0;
        } else if (details.total_episodes) {
          m.totalEpisodes = details.total_episodes;
        }
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

  const totalMins = userMovies.reduce((s, m) => {
    const isShow = m.mediaType === 'tv' || m.mediaType === 'anime';
    if (isShow && (m.totalEpisodes || 0) > 0) {
      const w = Math.min(m.watchedEpisodes || 0, m.totalEpisodes);
      return s + Math.round((m.runtime || 0) * (w / m.totalEpisodes));
    }
    return s + (m.status === 'watched' ? (m.runtime || 0) : 0);
  }, 0);

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
      <div class="stat-card">
        <div class="stat-card-value">${formatRuntime(totalMins) || '—'}</div>
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
  username text, sharing_enabled boolean DEFAULT false,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  movies jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_modify" ON public.profiles FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "user_data_own"   ON public.user_data FOR ALL  USING (auth.uid() = user_id);
CREATE POLICY "user_data_shared" ON public.user_data FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = user_data.user_id AND profiles.sharing_enabled = true)
);`;

  // Timeout fallback — fires if Supabase project is paused or tables are missing
  const timeoutId = setTimeout(() => {
    if (!communityGrid.textContent.includes('Loading community')) return;
    communityGrid.innerHTML = `
      <div class="supabase-setup-error">
        <p class="setup-error-title">⚠️ Could not reach the database</p>
        <p class="setup-error-body">Two likely causes:</p>
        <ol class="setup-error-list">
          <li><strong>Supabase project is paused</strong> — free-tier projects pause after 7 days of inactivity.
              <a href="https://app.supabase.com" target="_blank" rel="noopener">Open Supabase dashboard</a> and click <em>Restore project</em>.</li>
          <li><strong>Tables not yet created</strong> — paste the SQL below into
              <a href="https://app.supabase.com" target="_blank" rel="noopener">Supabase → SQL Editor</a> and run it once.</li>
        </ol>
        <pre class="setup-sql-block" id="setup-sql-pre">${esc(SETUP_SQL)}</pre>
        <button class="setup-copy-btn" id="setup-copy-btn">Copy SQL</button>
      </div>`;
    document.getElementById('setup-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(SETUP_SQL).then(() => {
        const btn = document.getElementById('setup-copy-btn');
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy SQL'; }, 2000); }
      });
    });
  }, 10000);

  try {
    const { data: sharingProfiles, error: pe } = await sb
      .from('profiles')
      .select('user_id, username')
      .eq('sharing_enabled', true)
      .neq('user_id', currentUser.id);

    if (pe) throw new Error(pe.message || pe.details || JSON.stringify(pe));

    if (!sharingProfiles?.length) {
      communityGrid.innerHTML = `
        <div class="community-empty-state">
          <div class="community-empty-icon">👥</div>
          <p>No one is sharing their watchlist yet.</p>
          <p class="community-empty-hint">Enable sharing above to let others see what you're watching!</p>
        </div>`;
      return;
    }

    const userIds = sharingProfiles.map(p => p.user_id);
    const { data: sharedData, error: de } = await sb
      .from('user_data')
      .select('user_id, movies')
      .in('user_id', userIds);

    if (de) throw new Error(de.message || de.details || JSON.stringify(de));

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
    console.error('Community load error:', e);
    communityGrid.innerHTML = `<p class="community-empty error">Failed to load: ${esc(String(e?.message || e))}</p>`;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Profile panel ───────────────────────────────────────
function renderProfile() {
  const panel = document.getElementById('profile-panel');
  if (!panel) return;

  const watched   = movies.filter(m => m.status === 'watched');
  const watchlist = movies.filter(m => m.status === 'watchlist');
  const totalMins = watched.reduce((s, m) => s + (m.runtime || 0), 0);
  const ratings   = watched.filter(m => m.rating > 0).map(m => m.rating);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;

  // Per-type counts
  const byType = ['movie', 'tv', 'anime'].map(t => ({
    label: t === 'movie' ? '🎬 Films' : t === 'tv' ? '📺 TV Shows' : '🎌 Anime',
    watched:    movies.filter(m => m.mediaType === t && m.status === 'watched').length,
    inProgress: movies.filter(m => m.mediaType === t && m.status === 'in_progress').length,
    watchlist:  movies.filter(m => m.mediaType === t && m.status === 'watchlist').length,
  })).filter(t => t.watched + t.inProgress + t.watchlist > 0);

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

  // Recently added (last 8 across all types)
  const recent = [...movies]
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, 8);

  const displayName = currentUsername || currentUser?.email?.split('@')[0] || 'You';
  const initial     = displayName[0].toUpperCase();

  const maxGenre   = topGenres[0]?.[1]   || 1;
  const maxCountry = topCountries[0]?.[1] || 1;
  const maxRating  = ratingDist[0]?.[1]   || 1;

  panel.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-lg">${esc(initial)}</div>
      <div class="profile-hero-info">
        <div class="profile-display-name">
          ${esc(displayName)}
          <span id="sync-indicator" class="sync-indicator" data-state="${currentSyncState}" title="${currentSyncTitle}"></span>
        </div>
        ${currentUser ? `<div class="profile-email-sm">${esc(currentUser.email)}</div>` : ''}
        ${sharingEnabled ? '<div class="profile-sharing-badge">🌐 Sharing enabled</div>' : ''}
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
      <div class="stat-card">
        <div class="stat-card-value">${formatRuntime(totalMins) || '—'}</div>
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

    <div class="profile-section appearance-section${localStorage.getItem('cinetrack_appearance_open') === '1' ? ' open' : ''}">
      <h3 class="appearance-toggle" role="button" tabindex="0" aria-expanded="${localStorage.getItem('cinetrack_appearance_open') === '1' ? 'true' : 'false'}">
        <span>Appearance</span>
        <span class="appearance-chevron" aria-hidden="true">▶</span>
      </h3>
      <div class="appearance-body">
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

      <div class="appearance-row">
        <div class="appearance-label">Glass intensity</div>
        <div class="pill-group" data-pref="glass">
          ${GLASS_PRESETS.map(name => {
            const current = localStorage.getItem('cinetrack_glass') || 'vivid';
            return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${name[0].toUpperCase() + name.slice(1)}</button>`;
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

      <div class="appearance-row">
        <div class="appearance-label">Animated orbs</div>
        <div class="pill-group" data-pref="orbs">
          ${ORBS_OPTIONS.map(name => {
            const current = localStorage.getItem('cinetrack_orbs') || 'static';
            const label = name === 'static' ? 'Off' : 'On';
            return `<button type="button" class="pill-btn ${name === current ? 'active' : ''}" data-value="${name}">${label}</button>`;
          }).join('')}
        </div>
      </div>

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

      <div class="appearance-row">
        <div class="appearance-label">Notify when an episode airs today</div>
        <div class="pill-group" data-pref="notif">
          ${NOTIF_OPTIONS.map(name => {
            const current = localStorage.getItem('cinetrack_notif') || 'off';
            const label = name === 'off' ? 'Off' : 'On';
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
  `;

  // Clicking a recent card opens the edit modal
  panel.querySelectorAll('.profile-recent-card[data-edit]').forEach(card => {
    card.addEventListener('click', () => openModal(movies.find(m => m.id === card.dataset.edit)));
  });

  // Wire CSV controls (re-rendered every renderProfile)
  panel.querySelector('#profile-import-btn')?.addEventListener('click', () => csvInput.click());
  panel.querySelector('#profile-export-btn')?.addEventListener('click', exportCSV);
  const tplLink = panel.querySelector('#profile-csv-template');
  if (tplLink) tplLink.href = TEMPLATE_URL;

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
      localStorage.setItem('cinetrack_bg', name);
      applyBgPreset(name);
      scheduleSavePrefs();
      panel.querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Wire accent swatches
  panel.querySelectorAll('.accent-swatch[data-accent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.accent;
      localStorage.setItem('cinetrack_accent', name);
      applyAccent(name);
      scheduleSavePrefs();
      panel.querySelectorAll('.accent-swatch').forEach(b => b.classList.toggle('active', b === btn));
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
        if (cfg.custom) {
          const ok = await cfg.custom(val);
          if (!ok) return;
        } else {
          localStorage.setItem(cfg.key, val);
          cfg.fn(val);
          scheduleSavePrefs();
        }
        group.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  });
}

// ── Export CSV ──────────────────────────────────────────
function exportCSV() {
  const list = activeType === 'dropped'
    ? movies.filter(m => m.status === 'dropped')
    : movies.filter(m => m.mediaType === activeType && m.status !== 'dropped');
  if (!list.length) { showToast('No titles to export for this tab.', true); return; }

  const headers = ['title','year','genre','director','country','status','rating','runtime','notes','type'];
  const rows = list.map(m =>
    [m.title, m.year, m.genre, m.director, m.country, m.status, m.rating || '', m.runtime || '', m.notes, m.mediaType]
      .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`)
      .join(',')
  );

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cinetrack-${activeType}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${list.length} title${list.length !== 1 ? 's' : ''}.`);
}


// ── Pagination ──────────────────────────────────────────
function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) { paginationEl.classList.add('hidden'); pageSizeSelect.classList.add('hidden'); return; }
  paginationEl.classList.remove('hidden');
  pageSizeSelect.classList.remove('hidden');

  const maxVisible = 7;
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let end   = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);

  let pageNums = '';
  if (start > 0) pageNums += `<button class="page-num" data-page="0">1</button><span class="page-ellipsis">…</span>`;
  for (let i = start; i <= end; i++) {
    pageNums += `<button class="page-num${i === currentPage ? ' active' : ''}" data-page="${i}">${i + 1}</button>`;
  }
  if (end < totalPages - 1) pageNums += `<span class="page-ellipsis">…</span><button class="page-num" data-page="${totalPages - 1}">${totalPages}</button>`;

  paginationEl.innerHTML =
    `<button class="page-btn" id="page-prev" ${currentPage === 0 ? 'disabled' : ''}>◀</button>` +
    pageNums +
    `<button class="page-btn" id="page-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>▶</button>` +
    `<span class="page-info">${totalItems} titles · page ${currentPage + 1} of ${totalPages}</span>`;

  paginationEl.querySelectorAll('.page-num').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); render(); window.scrollTo(0, 0); });
  });
  document.getElementById('page-prev')?.addEventListener('click', () => { currentPage--; render(); window.scrollTo(0, 0); });
  document.getElementById('page-next')?.addEventListener('click', () => { currentPage++; render(); window.scrollTo(0, 0); });
}

// ── Render ──────────────────────────────────────────────
function render() {
  const list = filtered();

  const visibleIds = new Set(list.map(m => m.id));
  for (const id of selectedIds) {
    if (!visibleIds.has(id)) selectedIds.delete(id);
  }
  updateBulkBar();
  updateStats();
  updateClearFiltersBtn();

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  if (currentPage < 0) currentPage = 0;

  const pageList = list.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  grid.innerHTML = '';
  grid.className = `movie-grid grid-${gridSize}` + (selectMode ? ' select-mode' : '');

  if (list.length === 0) {
    emptyMsg.classList.remove('hidden');
    renderPagination(0);
    return;
  }
  emptyMsg.classList.add('hidden');

  pageList.forEach(m => {
    const card = document.createElement('div');
    const checked = selectedIds.has(m.id);
    card.className = 'movie-card' + (checked ? ' selected' : '');
    card.dataset.id = m.id;
    const isTV    = m.mediaType === 'tv';
    const isShow  = isTV || m.mediaType === 'anime';
    const posterHTML = m.posterUrl
      ? `<img class="card-poster-img" src="${m.posterUrl}" alt="${esc(m.title)}" loading="lazy" />`
      : `<div class="card-poster-emoji">${m.mediaType === 'anime' ? '🎌' : isTV ? '📺' : posterEmoji(m.title)}</div>`;
    const runtimeStr = formatRuntime(m.runtime);
    // For shows with seasons[], the card focuses on the active season.
    // For legacy entries (or manual flat tracking), fall back to the
    // show-level total / watched counts.
    const seasonsArr  = Array.isArray(m.seasons) ? m.seasons : [];
    const hasSeasons  = isShow && seasonsArr.length > 0;
    const active      = hasSeasons ? activeSeason(m) : null;
    const fallbackTotal   = m.totalEpisodes   || 0;
    const fallbackWatched = Math.min(m.watchedEpisodes || 0, fallbackTotal);

    const epTotal   = hasSeasons ? (active ? active.total   : 0) : fallbackTotal;
    const epWatched = hasSeasons ? (active ? active.watched : 0) : fallbackWatched;
    const epPct     = epTotal > 0 ? Math.round((epWatched / epTotal) * 100) : 0;

    const epLabelText = hasSeasons && active && seasonsArr.length > 1
      ? `▶ S${active.number} ${epWatched}/${epTotal} eps`
      : `▶ ${epWatched}/${epTotal} eps`;
    const epTitleText = hasSeasons && active
      ? `${active.name || 'Season ' + active.number}: ${epWatched} of ${epTotal} episodes watched`
      : `${epWatched} of ${epTotal} episodes watched`;

    const epHTML = (isShow && epTotal > 0)
      ? `<div class="ep-progress" title="${esc(epTitleText)}">
           <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${epPct}%"></div></div>
           <div class="ep-progress-label">${epLabelText}</div>
         </div>`
      : '';
    const epIncBtn = (isShow && epTotal > 0 && epWatched < epTotal)
      ? `<button class="btn-sm btn-ep-inc" data-ep-inc="${m.id}" title="Mark next episode watched">
           <span class="lbl-md lbl-lg">+1 ep</span><span class="lbl-sm">+1</span>
         </button>`
      : '';

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
          <input type="checkbox" data-check="${m.id}" ${checked ? 'checked' : ''} />
          <span class="card-checkbox-box"></span>
        </label>
      </div>
      <span class="badge badge-${m.status} card-status-badge">
        ${m.status === 'watched' ? `✓ Watched${(m.watchCount || 0) > 1 ? ` ×${m.watchCount}` : ''}` : m.status === 'in_progress' ? '▶ In Progress' : m.status === 'dropped' ? '📛 Dropped' : '⏳ Watchlist'}
      </span>
      ${m.tmdbId
        ? `<a class="card-title card-title-link" href="https://www.themoviedb.org/${m.mediaType === 'movie' ? 'movie' : 'tv'}/${m.tmdbId}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a>`
        : `<div class="card-title">${esc(m.title)}</div>`}
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
      <div class="card-actions">
        <button class="btn-sm" data-edit="${m.id}">
          <span class="lbl-md lbl-lg">Edit</span><span class="lbl-sm">✎</span>
        </button>
        ${epIncBtn}
        <button class="btn-sm" data-toggle="${m.id}">
          <span class="lbl-lg">${m.status === 'watched' ? '⏳ Watchlist' : m.status === 'in_progress' ? '✓ Watched' : m.status === 'dropped' ? '▶ In Progress' : '▶ In Progress'}</span>
          <span class="lbl-md">${m.status === 'watched' ? 'List' : m.status === 'in_progress' ? 'Watched' : 'In Prog'}</span>
          <span class="lbl-sm">${m.status === 'watched' ? '⏳' : m.status === 'in_progress' ? '✓' : '▶'}</span>
        </button>
        <button class="btn-sm danger" data-delete="${m.id}">✕</button>
      </div>
    `;
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
  movies.forEach(m => { if (selectedIds.has(m.id)) m.status = 'watched'; });
  selectedIds.clear(); save(); render();
});

bulkMarkInProgress.addEventListener('click', () => {
  movies.forEach(m => { if (selectedIds.has(m.id)) m.status = 'in_progress'; });
  selectedIds.clear(); save(); render();
});

bulkMarkWatchlist.addEventListener('click', () => {
  movies.forEach(m => { if (selectedIds.has(m.id)) { m.status = 'watchlist'; m.rating = 0; } });
  selectedIds.clear(); save(); render();
});

bulkDelete.addEventListener('click', () => {
  const n = selectedIds.size;
  if (!confirm(`Delete ${n} title${n !== 1 ? 's' : ''}? This cannot be undone.`)) return;
  movies = movies.filter(m => !selectedIds.has(m.id));
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

  activeMediaType = movie?.mediaType || (activeType === 'dropped' ? 'movie' : activeType);
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === activeMediaType)
  );
  updateModalForType();
  resetTMDBUI();
  modalTmdbRefreshBtn.classList.toggle('hidden', !(movie?.tmdbId));

  document.getElementById('f-title').value    = movie?.title    || '';
  populateYearSelect(movie?.year || '');
  document.getElementById('f-genre').value    = movie?.genre    || '';
  document.getElementById('f-director').value = movie?.director || '';
  document.getElementById('f-country').value  = movie?.country  || '';
  document.getElementById('f-status').value   = movie?.status   || 'watchlist';
  document.getElementById('f-runtime').value  = movie?.runtime  || '';
  document.getElementById('f-notes').value    = movie?.notes    || '';

  // Initialise the season buffer from the entry (deep copy)
  editingSeasons = Array.isArray(movie?.seasons)
    ? movie.seasons.map(s => ({ number: s.number, total: s.total, watched: s.watched || 0, name: s.name }))
    : [];
  // Default to lowest unfinished season, or first if all caught up
  const unfinished = editingSeasons.findIndex(s => (s.watched || 0) < (s.total || 0));
  editingSeasonIdx = unfinished === -1 ? 0 : unfinished;
  rebuildSeasonDropdown();

  if (editingSeasons.length) {
    loadSeasonIntoInputs(editingSeasonIdx);
  } else {
    epWatchedInput.value = movie?.watchedEpisodes || '';
    epTotalInput.value   = movie?.totalEpisodes   || '';
  }
  selectedRating = movie?.rating || 0;

  // Re-watch count: default to 1 when status is watched, otherwise 0
  editingWatchCount = movie?.watchCount != null
    ? movie.watchCount
    : (movie?.status === 'watched' ? 1 : 0);
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
  const visible = status === 'watched' && !!editingId;
  row.classList.toggle('hidden', !visible);
  document.getElementById('rewatch-count').textContent = String(Math.max(1, editingWatchCount));
  document.getElementById('rewatch-plural').textContent = (editingWatchCount === 1) ? '' : 's';
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

// ── Per-entry TMDB refresh (Edit modal) ─────────────────
modalTmdbRefreshBtn.addEventListener('click', async () => {
  const movie = editingId ? movies.find(m => m.id === editingId) : null;
  if (!movie?.tmdbId) return;
  const fetchType = movie.mediaType === 'anime' ? 'tv' : (movie.mediaType || 'movie');
  modalTmdbRefreshBtn.disabled = true;
  modalTmdbRefreshBtn.textContent = '↻ Refreshing…';
  try {
    const details = await fetchTMDBDetails(movie.tmdbId, fetchType);
    applyTMDBSelection(details);
  } catch (err) {
    const tmdbErr = document.getElementById('tmdb-error');
    tmdbErr.textContent = 'TMDB refresh failed: ' + err.message;
    tmdbErr.classList.remove('hidden');
  } finally {
    modalTmdbRefreshBtn.disabled = false;
    modalTmdbRefreshBtn.textContent = '↻ Refresh from TMDB';
  }
});

function toggleRatingLabel() {
  const s = document.getElementById('f-status').value;
  ratingLabel.classList.toggle('hidden', s !== 'watched' && s !== 'in_progress' && s !== 'dropped');
}

// ── Form submit ─────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const existing  = editingId ? movies.find(m => m.id === editingId) : null;
  const posterUrl = tmdbSelection?.poster_path
    ? POSTER_BASE + tmdbSelection.poster_path
    : existing?.posterUrl || '';

  const isShow = activeMediaType === 'tv' || activeMediaType === 'anime';

  // Capture in-flight edits to the currently-selected season, then normalise.
  if (isShow && editingSeasons.length) captureCurrentSeason();
  if (isShow && editingSeasons.length) normaliseSeasons(editingSeasons);

  let totalEpisodes, watchedEpisodes, seasons;
  if (isShow && editingSeasons.length) {
    seasons = editingSeasons.map(s => ({ number: s.number, total: s.total, watched: s.watched || 0, name: s.name }));
    totalEpisodes   = seasons.reduce((s, x) => s + (x.total   || 0), 0);
    watchedEpisodes = seasons.reduce((s, x) => s + (x.watched || 0), 0);
  } else if (isShow) {
    totalEpisodes   = Math.max(0, parseInt(epTotalInput.value)   || 0);
    watchedEpisodes = Math.max(0, parseInt(epWatchedInput.value) || 0);
    if (totalEpisodes > 0 && watchedEpisodes > totalEpisodes) watchedEpisodes = totalEpisodes;
    seasons = [];
  } else {
    totalEpisodes = 0; watchedEpisodes = 0; seasons = [];
  }

  let status = document.getElementById('f-status').value;
  if (isShow && totalEpisodes > 0) {
    if (watchedEpisodes >= totalEpisodes) status = 'watched';
    else if (watchedEpisodes > 0)         status = 'in_progress';
  }

  // Re-watch count: only meaningful for 'watched' status. Use the in-modal
  // editor value when status is watched; otherwise preserve the existing
  // count so downgrading and re-promoting doesn't lose the history.
  let watchCount;
  if (status === 'watched') {
    watchCount = Math.max(1, editingWatchCount || 1);
  } else if (existing?.watchCount != null) {
    watchCount = existing.watchCount;
  } else {
    watchCount = 0;
  }

  const data = {
    title,
    year:      document.getElementById('f-year').value     || '',
    genre:     document.getElementById('f-genre').value    || '',
    director:  document.getElementById('f-director').value || '',
    country:   document.getElementById('f-country').value  || '',
    status,
    notes:     document.getElementById('f-notes').value    || '',
    runtime:   parseInt(document.getElementById('f-runtime').value) || 0,
    rating:    ['watched', 'in_progress'].includes(status) ? selectedRating : 0,
    mediaType: activeMediaType,
    totalEpisodes,
    watchedEpisodes,
    seasons,
    watchCount,
    posterUrl,
    tmdbId: tmdbSelection?.id || existing?.tmdbId || null,
  };

  if (editingId) {
    const idx = movies.findIndex(m => m.id === editingId);
    if (idx !== -1) movies[idx] = { ...movies[idx], ...data };
  } else {
    movies.unshift({ id: genId(), addedAt: Date.now(), ...data });
  }

  save(); updateCountryDropdown(); render(); closeModal();
});

// ── Events ──────────────────────────────────────────────
addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.getElementById('f-status').addEventListener('change', () => { toggleRatingLabel(); buildStars(); updateRewatchUI(); });
searchInput.addEventListener('input', () => { searchQuery = searchInput.value; currentPage = 0; render(); });
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
  const noteEl = e.target.closest('.card-notes');
  if (noteEl) { noteEl.classList.toggle('expanded'); return; }

  const editId   = e.target.closest('[data-edit]')?.dataset.edit;
  const toggleId = e.target.closest('[data-toggle]')?.dataset.toggle;
  const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
  const epIncId  = e.target.closest('[data-ep-inc]')?.dataset.epInc;

  // Click poster to edit (skip in select mode or when clicking checkbox)
  if (!editId && !toggleId && !deleteId && !epIncId && !selectMode && !e.target.closest('.card-checkbox')) {
    const poster = e.target.closest('.card-poster');
    if (poster) {
      const card = poster.closest('.movie-card');
      if (card?.dataset.id) openModal(movies.find(m => m.id === card.dataset.id));
      return;
    }
  }

  if (epIncId) {
    const m = movies.find(m => m.id === epIncId);
    if (!m) return;
    if (Array.isArray(m.seasons) && m.seasons.length) {
      const active = activeSeason(m);
      if (active) {
        active.watched = Math.min((active.watched || 0) + 1, active.total);
        normaliseSeasons(m.seasons);
        recomputeShowProgress(m);
        m.status = m.watchedEpisodes >= m.totalEpisodes ? 'watched' : 'in_progress';
        save(); render();
      }
    } else if ((m.totalEpisodes || 0) > 0) {
      const next = Math.min((m.watchedEpisodes || 0) + 1, m.totalEpisodes);
      m.watchedEpisodes = next;
      m.status = next >= m.totalEpisodes ? 'watched' : 'in_progress';
      save(); render();
    }
  } else if (editId) {
    openModal(movies.find(m => m.id === editId));
  } else if (toggleId) {
    const m = movies.find(m => m.id === toggleId);
    if (m) {
      m.status = m.status === 'watched' ? 'watchlist'
               : m.status === 'in_progress' ? 'watched'
               : m.status === 'dropped' ? 'in_progress'
               : 'in_progress';
      if (m.status === 'watchlist') {
        m.rating = 0;
        m.watchedEpisodes = 0;
        if (Array.isArray(m.seasons)) m.seasons.forEach(s => { s.watched = 0; });
      }
      // 'watched' is handled by save() → syncEpisodeProgress() (fills every season)
      save(); render();
    }
  } else if (deleteId) {
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
  if (pendingDeleteId) { movies = movies.filter(m => m.id !== pendingDeleteId); save(); updateCountryDropdown(); render(); }
  confirmModal.classList.add('hidden'); pendingDeleteId = null;
});
confirmModal.addEventListener('click', e => { if (e.target === confirmModal) { confirmModal.classList.add('hidden'); pendingDeleteId = null; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); confirmModal.classList.add('hidden'); } });

// ── Seed data ───────────────────────────────────────────
function seedData() {
  movies = [
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
  ];
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

const COL_MAP = {
  title: 'title', name: 'title',
  year: 'year', release_year: 'year', release_date: 'year',
  genre: 'genre', genres: 'genre',
  director: 'director', creator: 'director', created_by: 'director',
  country: 'country', origin_country: 'country',
  status: 'status', rating: 'rating', runtime: 'runtime',
  notes: 'notes', overview: 'notes', description: 'notes',
  type: 'mediaType', media_type: 'mediaType', mediatype: 'mediaType',
  poster: 'posterUrl', poster_url: 'posterUrl', posterurl: 'posterUrl',
  total_episodes: 'totalEpisodes', totalepisodes: 'totalEpisodes', episodes: 'totalEpisodes', episode_count: 'totalEpisodes',
  episodes_watched: 'watchedEpisodes', watched_episodes: 'watchedEpisodes', watchedepisodes: 'watchedEpisodes',
};

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  function parseLine(line) {
    const fields = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim()); cur = '';
      } else { cur += ch; }
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, idx) => { const field = COL_MAP[h]; if (field) obj[field] = vals[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function showToast(msg, isError = false) {
  importToast.textContent = msg;
  importToast.className = 'import-toast' + (isError ? ' error' : '');
  importToast.classList.remove('hidden');
  clearTimeout(importToast._timer);
  importToast._timer = setTimeout(() => importToast.classList.add('hidden'), 5000);
}

function normaliseRow(row) {
  const rawType   = (row.mediaType || '').toLowerCase();
  const mediaType = (rawType === 'tv' || rawType === 'tv show' || rawType === 'show') ? 'tv'
                  : rawType === 'anime' ? 'anime' : 'movie';
  const rawStatus = (row.status || '').toLowerCase().trim();
  let status      = rawStatus === 'watched' ? 'watched'
                  : (rawStatus === 'in_progress' || rawStatus === 'in progress' || rawStatus === 'inprogress') ? 'in_progress'
                  : rawStatus === 'dropped' ? 'dropped'
                  : 'watchlist';
  const year      = (row.year || '').toString().slice(0, 4);
  const runtime   = parseInt(row.runtime) || 0;
  const isShow    = mediaType === 'tv' || mediaType === 'anime';
  const totalEpisodes   = isShow ? Math.max(0, parseInt(row.totalEpisodes)   || 0) : 0;
  let   watchedEpisodes = isShow ? Math.max(0, parseInt(row.watchedEpisodes) || 0) : 0;
  if (totalEpisodes > 0 && watchedEpisodes > totalEpisodes) watchedEpisodes = totalEpisodes;
  if (isShow && totalEpisodes > 0) {
    if      (watchedEpisodes >= totalEpisodes) status = 'watched';
    else if (watchedEpisodes > 0)              status = 'in_progress';
  }
  const rating    = (status === 'watched' || status === 'in_progress')
                    ? Math.min(10, Math.max(0, parseInt(row.rating) || 0)) : 0;
  return { mediaType, status, rating, year, runtime, totalEpisodes, watchedEpisodes };
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

const TEMPLATE_CSV = `title,year,genre,director,country,status,rating,runtime,notes,type,total_episodes,episodes_watched\nInception,2010,"Sci-Fi, Thriller",Christopher Nolan,United States,watched,9,148,Mind-bending film,movie,,\nBreaking Bad,2008,"Crime, Drama",Vince Gilligan,United States,watched,10,2700,Greatest TV drama,tv,62,62\nDark,2017,"Sci-Fi, Thriller",Baran bo Odar,Germany,in_progress,9,1530,Time-travel mystery,tv,26,12\n`;
const TEMPLATE_URL = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));

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
  const displayName = currentUsername || currentUser.email.split('@')[0];
  userAvatar.textContent  = displayName[0].toUpperCase();
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
  updateUserMenu();
  closeUsernameForm();
  const result = await saveProfile({ username: val });
  if (!result.ok) {
    currentUsername = previous;
    updateUserMenu();
    showToast('Could not save username: ' + (result.error || 'unknown error'), true);
    return;
  }
  // Confirm round-trip: re-read what the DB now has.
  try {
    const { data } = await sb.from('profiles')
      .select('username').eq('user_id', currentUser.id).maybeSingle();
    if (data?.username !== val) {
      showToast('Username save did not persist (DB returned a different value). Check RLS policies.', true);
      currentUsername = data?.username || previous;
      updateUserMenu();
    } else {
      showToast('Username saved');
    }
  } catch { /* network blip on confirm — keep the optimistic state */ }
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
});

// ── Reload from cloud ───────────────────────────────────
reloadCloudBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  reloadCloudBtn.disabled = true;
  reloadCloudBtn.textContent = '↻ Loading…';
  await loadUserData();
  reloadCloudBtn.disabled = false;
  reloadCloudBtn.textContent = '↻ Reload from cloud';
  showToast('Reloaded from cloud ✓');
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
    await saveUserData();
    await loadUserData();
    showToast('Synced ✓');
  } catch (e) {
    showToast('Sync failed: ' + (e?.message || 'unknown error'), true);
  }
  syncNowBtn.disabled = false;
  syncNowBtn.textContent = '↻ Sync now';
});

// ── Refresh from TMDB ───────────────────────────────────
const tmdbRefreshBtn = document.getElementById('tmdb-refresh-btn');
let cancelTmdbRefresh = false;

tmdbRefreshBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  const targets = movies.filter(m => m.tmdbId);
  if (!targets.length) { showToast('No TMDB-linked titles to refresh.'); return; }

  cancelTmdbRefresh = false;
  importProgress.classList.remove('hidden');
  let updated = 0, failed = 0;
  for (let i = 0; i < targets.length; i++) {
    if (cancelTmdbRefresh) break;
    const m = targets[i];
    progressText.textContent = `Refreshing "${m.title}" (${i + 1} of ${targets.length})…`;
    progressBar.style.width = `${Math.round((i / targets.length) * 100)}%`;
    try {
      const fetchType = m.mediaType === 'anime' ? 'tv' : (m.mediaType || 'movie');
      const r = await fetch(`/api/movie?id=${m.tmdbId}&type=${fetchType}`);
      if (!r.ok) { failed++; continue; }
      const d = await r.json();
      if (d.poster_path)             m.posterUrl = POSTER_BASE + d.poster_path;
      if (d.year)                    m.year      = d.year;
      if (d.genre)                   m.genre     = d.genre;
      if (d.director)                m.director  = d.director;
      if (d.country)                 m.country   = d.country;
      if (d.runtime)                 m.runtime   = d.runtime;
      if (m.mediaType === 'tv' || m.mediaType === 'anime') {
        if (Array.isArray(d.seasons) && d.seasons.length) {
          // Merge by season number, preserving the user's watched counts
          // (clamped to the new total, in case TMDB shrunk a season).
          const prev = new Map((m.seasons || []).map(s => [s.number, s.watched || 0]));
          m.seasons = d.seasons.map(s => ({
            number:  s.number,
            total:   s.total,
            watched: Math.min(prev.get(s.number) || 0, s.total),
            name:    s.name,
          }));
          normaliseSeasons(m.seasons);
          recomputeShowProgress(m);
        } else if (d.total_episodes) {
          m.totalEpisodes = d.total_episodes;
          if ((m.watchedEpisodes || 0) > m.totalEpisodes) m.watchedEpisodes = m.totalEpisodes;
        }
      }
      updated++;
    } catch { failed++; }
  }
  progressBar.style.width = '100%';
  importProgress.classList.add('hidden');
  save(); updateCountryDropdown(); render();
  const parts = [`Refreshed ${updated} title${updated !== 1 ? 's' : ''}`];
  if (failed)            parts.push(`${failed} failed`);
  if (cancelTmdbRefresh) parts.push('cancelled');
  showToast(parts.join(' · '));
});

// Reuse the import-progress cancel button for the TMDB refresh too
progressCancel.addEventListener('click', () => { cancelTmdbRefresh = true; });

// ── Sign out ────────────────────────────────────────────
signoutBtn.addEventListener('click', async () => {
  try { if (sb) await sb.auth.signOut(); } catch {}
  currentUser     = null;
  currentUsername = null;
  sharingEnabled  = false;
  movies          = [];
  localStorage.removeItem(STORAGE_KEY);
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
  }
});

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

  async function handleUserSignIn(user) {
    if (userDataFetched && currentUser?.id === user.id) return;
    userDataFetched = true;
    currentUser = user;
    updateUserMenu();
    hideAuthOverlay();
    await loadProfile();
    await loadPreferences();
    await loadUserData();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await handleUserSignIn(session.user);
    } else if (event === 'SIGNED_OUT') {
      userDataFetched = false;
      currentUser = null;
      updateUserMenu();
    }
  });

  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await handleUserSignIn(session.user);
  } else {
    showAuthOverlay('form');
  }
})();
