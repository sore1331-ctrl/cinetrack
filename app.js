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
});

// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'cinetrack_movies';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w200';

let movies          = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeType      = 'movie';   // 'movie' | 'tv' | 'anime'
let activeView      = 'content'; // 'content' | 'stats' | 'community'
let activeStatus    = 'all';
let searchQuery     = '';
let countryFilter   = '';
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
  ['sync-indicator', 'header-sync-indicator'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.state = state;
    el.title = currentSyncTitle;
  });
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
  if (!sb || !currentUser) return;
  try {
    await sb.from('profiles').upsert({
      user_id: currentUser.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });
  } catch {}
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
      backfillWatchedDates();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    }
    setSyncState('saved');
  } catch (e) {
    console.error('Failed to load data from cloud:', e);
    setSyncState('error', 'Could not reach the cloud — using local copy');
    showToast('Could not load your data from the cloud. Using your local copy instead.', true);
  }
  updateCountryDropdown();
  refreshCurrentView();
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
    setSyncState('error', 'Cloud sync failed — saved locally');
    showToast('Cloud sync failed — your changes are saved locally only.', true);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  if (offlineMode || !currentUser) return;
  setSyncState('saving');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(saveUserData, 600);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Watch-date helpers ──────────────────────────────────
function toISODate(ts) {
  if (!ts) return '';
  // Use local date so the date input matches what the user expects.
  const d = new Date(ts);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}
function fromISODate(str) {
  if (!str) return null;
  // Anchor at noon local to dodge TZ-day-shift issues
  const d = new Date(str + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d.getTime();
}
function formatWatchedDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function monthLabel(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

// One-time backfill: any 'watched' item without watchedAt gets the addedAt
// timestamp so legacy data has a date for the diary view.
function backfillWatchedDates() {
  let changed = 0;
  movies.forEach(m => {
    if (m.status === 'watched' && !m.watchedAt) {
      m.watchedAt = m.addedAt || Date.now();
      changed++;
    }
  });
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
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
const watchedDateLabel = document.getElementById('watched-date-label');
const watchedDateInput = document.getElementById('f-watched-date');
const episodeFields     = document.getElementById('episode-fields');
const currentEpInput    = document.getElementById('f-current-episode');
const totalEpInput      = document.getElementById('f-total-episodes');
const currentSeasonInput = document.getElementById('f-current-season');
const totalSeasonsInput  = document.getElementById('f-total-seasons');
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
  }

  const isContent   = view === 'content';
  const isStats     = view === 'stats';
  const isCommunity = view === 'community';
  const isProfile   = view === 'profile';

  // Sync header profile button active state
  document.getElementById('header-profile-btn')?.classList.toggle('active', isProfile);

  document.querySelector('.controls').classList.toggle('hidden', !isContent);
  statsBar.classList.toggle('hidden', !isContent);
  grid.classList.toggle('hidden', !isContent);
  emptyMsg.classList.add('hidden');
  paginationEl.classList.add('hidden');
  document.getElementById('bulk-bar').classList.add('hidden');
  document.getElementById('stats-panel').classList.toggle('hidden', !isStats);
  document.getElementById('community-panel').classList.toggle('hidden', !isCommunity);
  document.getElementById('profile-panel').classList.toggle('hidden', !isProfile);

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

// ── Status tabs ─────────────────────────────────────────
document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status;
    currentPage = 0;
    render();
  });
});

// ── Select mode ─────────────────────────────────────────
selectModeBtn.addEventListener('click', () => {
  selectMode = !selectMode;
  selectModeBtn.classList.toggle('active', selectMode);
  render();
});

// ── Page size ───────────────────────────────────────────
pageSizeSelect.value = String(pageSize);
pageSizeSelect.addEventListener('change', () => {
  pageSize = parseInt(pageSizeSelect.value);
  localStorage.setItem('cinetrack_pagesize', pageSize);
  currentPage = 0;
  render();
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
  // Episode tracker only makes sense for TV / anime
  episodeFields.classList.toggle('hidden', !(isTV || isAnime));
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
  if (!document.getElementById('f-notes').value)
    document.getElementById('f-notes').value  = details.overview || '';
  if (details.total_episodes) totalEpInput.value     = details.total_episodes;
  if (details.total_seasons)  totalSeasonsInput.value = details.total_seasons;
}

function resetTMDBUI() {
  tmdbSelection = null;
  tmdbSelected.classList.add('hidden');
  tmdbQuery.disabled = false;
  tmdbQuery.value = '';
  hideDropdown();
  tmdbError.classList.add('hidden');
  tmdbSearching.classList.add('hidden');
}

tmdbClear.addEventListener('click', () => {
  resetTMDBUI();
  ['f-title','f-year','f-genre','f-director','f-country','f-runtime','f-total-episodes','f-total-seasons'].forEach(id =>
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
  const countries = [...new Set(
    movies.filter(m => m.mediaType === activeType).map(m => m.country).filter(Boolean)
  )].sort();

  const current = countryFilterEl.value;
  countryFilterEl.innerHTML = '<option value="">All Countries</option>' +
    countries.map(c => `<option value="${esc(c)}"${c === current ? ' selected' : ''}>${esc(c)}</option>`).join('');
}

// ── Filtering ───────────────────────────────────────────
function filtered() {
  return movies.filter(m => {
    if (m.mediaType !== activeType) return false;
    if (activeStatus !== 'all' && m.status !== activeStatus) return false;
    if (countryFilter && m.country !== countryFilter) return false;
    const q = searchQuery.toLowerCase();
    if (q) {
      const hay = [m.title, m.genre, m.director, m.country].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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
  const allOfType    = movies.filter(m => m.mediaType === activeType);
  const watchedList    = allOfType.filter(m => m.status === 'watched');
  const inProgressCnt  = allOfType.filter(m => m.status === 'in_progress').length;
  const watchlistCnt   = allOfType.filter(m => m.status === 'watchlist').length;
  const totalMins      = watchedList.reduce((s, m) => s + (m.runtime || 0), 0);
  const timeStr        = formatRuntime(totalMins);

  statsBar.innerHTML =
    `<span class="stat-item stat-watched">✓ <strong>${watchedList.length}</strong> watched</span>` +
    `<span class="stat-sep">·</span>` +
    `<span class="stat-item stat-in-progress">▶ <strong>${inProgressCnt}</strong> in progress</span>` +
    `<span class="stat-sep">·</span>` +
    `<span class="stat-item stat-watchlist">⏳ <strong>${watchlistCnt}</strong> on watchlist</span>` +
    (timeStr ? `<span class="stat-sep">·</span><span class="stat-item stat-time">⏱ <strong>${timeStr}</strong> spent watching</span>` : '');
}

// ── Stats panel ─────────────────────────────────────────
function renderStats() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;

  const watched  = movies.filter(m => m.status === 'watched');
  const total    = movies.length;
  const watchedN = watched.length;
  const totalMin = watched.reduce((s, m) => s + (m.runtime || 0), 0);
  const ratings  = watched.filter(m => m.rating > 0).map(m => m.rating);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;

  // Genre counts (split comma-separated)
  const genreCounts = {};
  watched.forEach(m => {
    if (!m.genre) return;
    m.genre.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 14);

  // Year counts
  const yearCounts = {};
  watched.forEach(m => {
    const y = parseInt(m.year);
    if (!y || y < 1900 || y > 2100) return;
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  });
  const yearEntries = Object.entries(yearCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  // Type breakdown
  const tc = {
    movie: movies.filter(m => m.mediaType === 'movie' && m.status === 'watched').length,
    tv:    movies.filter(m => m.mediaType === 'tv'    && m.status === 'watched').length,
    anime: movies.filter(m => m.mediaType === 'anime' && m.status === 'watched').length,
  };
  const typeEntries = [
    ['🎬 Films',    tc.movie],
    ['📺 TV Shows', tc.tv],
    ['🎌 Anime',    tc.anime],
  ].filter(e => e[1] > 0);

  const maxGenre = topGenres[0]?.[1] || 1;
  const maxYear  = yearEntries.length ? Math.max(...yearEntries.map(e => e[1])) : 1;
  const maxType  = typeEntries.length ? Math.max(...typeEntries.map(e => e[1])) : 1;

  const inProgressN = movies.filter(m => m.status === 'in_progress').length;
  const watchlistN  = movies.filter(m => m.status === 'watchlist').length;

  panel.innerHTML = `
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-card-value">${watchedN}</div>
        <div class="stat-card-label">Watched</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${inProgressN}</div>
        <div class="stat-card-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${watchlistN}</div>
        <div class="stat-card-label">On Watchlist</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${formatRuntime(totalMin) || '—'}</div>
        <div class="stat-card-label">Time Spent</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgRating ? '★ ' + avgRating : '—'}</div>
        <div class="stat-card-label">Avg Rating</div>
      </div>
    </div>

    <div class="stats-charts">
      ${topGenres.length ? `
      <div class="chart-section">
        <h3>Top Genres</h3>
        <div class="chart-bars">${renderBarChart(topGenres, maxGenre, '#e2405a')}</div>
      </div>` : ''}

      ${yearEntries.length ? `
      <div class="chart-section">
        <h3>By Year</h3>
        <div class="chart-bars chart-bars-scroll">${renderBarChart(yearEntries, maxYear, '#3b9eff')}</div>
      </div>` : ''}

      ${typeEntries.length ? `
      <div class="chart-section chart-section-sm">
        <h3>By Type</h3>
        <div class="chart-bars">${renderBarChart(typeEntries, maxType, '#a855f7')}</div>
      </div>` : ''}
    </div>

    <div id="recs-section" class="recs-section">
      <div class="recs-loading"><span class="recs-spinner"></span> Loading recommendations…</div>
    </div>
  `;

  loadRecommendations();
}

const DISMISSED_RECS_KEY = 'cinetrack_dismissed_recs';
const DISMISSED_RECS_CAP = 500;

function getDismissedRecs() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_RECS_KEY) || '[]').map(String)); }
  catch { return new Set(); }
}
function dismissRec(id) {
  const list = [...getDismissedRecs(), String(id)];
  // Keep most-recent N — Set preserves insertion order, oldest entries get dropped first.
  const trimmed = list.length > DISMISSED_RECS_CAP ? list.slice(-DISMISSED_RECS_CAP) : list;
  localStorage.setItem(DISMISSED_RECS_KEY, JSON.stringify(trimmed));
}

const RECS_LIMIT = 10; // 2 rows of 5

// Refresh state — kept across refreshes within a single Stats visit
let recsState = { refreshCount: 0, shownIds: new Set(), loading: false };

// Country recommendation toggle — persisted in localStorage
let recsByCountryEnabled = localStorage.getItem('cinetrack_recs_country') === 'true';

// Country name → ISO 3166-1 alpha-2. Covers the country datalist + a few extras.
const COUNTRY_TO_ISO = {
  'United States': 'US', 'United Kingdom': 'GB', 'Japan': 'JP', 'France': 'FR',
  'Germany': 'DE', 'South Korea': 'KR', 'Italy': 'IT', 'Spain': 'ES',
  'China': 'CN', 'India': 'IN', 'Australia': 'AU', 'Canada': 'CA',
  'Brazil': 'BR', 'Mexico': 'MX', 'Argentina': 'AR', 'Russia': 'RU',
  'Sweden': 'SE', 'Denmark': 'DK', 'Norway': 'NO', 'Finland': 'FI',
  'Poland': 'PL', 'Czech Republic': 'CZ', 'Hungary': 'HU', 'Romania': 'RO',
  'Austria': 'AT', 'Switzerland': 'CH', 'Belgium': 'BE', 'Netherlands': 'NL',
  'Portugal': 'PT', 'Greece': 'GR', 'Turkey': 'TR', 'Israel': 'IL',
  'Iran': 'IR', 'Egypt': 'EG', 'Nigeria': 'NG', 'South Africa': 'ZA',
  'Morocco': 'MA', 'Kenya': 'KE', 'Ethiopia': 'ET', 'Ghana': 'GH',
  'Thailand': 'TH', 'Vietnam': 'VN', 'Indonesia': 'ID', 'Malaysia': 'MY',
  'Philippines': 'PH', 'Taiwan': 'TW', 'Hong Kong': 'HK', 'Singapore': 'SG',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'New Zealand': 'NZ',
  'Ireland': 'IE', 'Serbia': 'RS', 'Croatia': 'HR', 'Ukraine': 'UA',
  'Kazakhstan': 'KZ', 'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE',
  'Venezuela': 'VE', 'Cuba': 'CU', 'Jordan': 'JO', 'Saudi Arabia': 'SA',
  'Iraq': 'IQ', 'Lebanon': 'LB', 'Algeria': 'DZ', 'Tunisia': 'TN',
  'Senegal': 'SN', 'Cambodia': 'KH',
};

function getMostWatchedCountry() {
  const data = {};
  movies
    .filter(m => (m.status === 'watched' || m.status === 'in_progress') && m.country)
    .forEach(m => {
      if (!data[m.country]) data[m.country] = { count: 0, types: {} };
      data[m.country].count++;
      data[m.country].types[m.mediaType] = (data[m.country].types[m.mediaType] || 0) + 1;
    });
  const top = Object.entries(data).sort((a, b) => b[1].count - a[1].count)[0];
  if (!top) return null;
  const iso = COUNTRY_TO_ISO[top[0]];
  if (!iso) return null;
  const topType = Object.entries(top[1].types).sort((a, b) => b[1] - a[1])[0][0];
  return { name: top[0], iso, count: top[1].count, type: topType === 'anime' ? 'tv' : topType };
}

function buildRecsHeader(genreLabel, country) {
  const toggleHTML = country
    ? `<button class="recs-toggle-btn ${recsByCountryEnabled ? 'active' : ''}" id="recs-country-toggle"
         title="Show top picks from ${esc(country.name)}">🌍 ${esc(country.name)}</button>`
    : '';
  return `
    <div class="recs-header">
      <div class="recs-header-text">
        <h3 class="recs-heading">✨ Recommended For You</h3>
        <p class="recs-sub">Based on what you've watched${genreLabel ? ` · favouring ${esc(genreLabel)}` : ''}</p>
      </div>
      <div class="recs-actions">
        ${toggleHTML}
        <button class="recs-refresh-btn" id="recs-refresh-btn" title="Refresh recommendations" aria-label="Refresh">↻</button>
      </div>
    </div>
  `;
}

function renderRecCard(r) {
  return `
    <div class="rec-card" data-rec-card="${r.id}">
      <button class="rec-dismiss-btn" data-rec-dismiss="${r.id}" title="Not interested">✕</button>
      <div class="rec-poster">
        ${r.poster_path
          ? `<img src="${POSTER_BASE}${r.poster_path}" alt="${esc(r.title)}" loading="lazy" />`
          : `<div class="rec-poster-placeholder">${r.media_type === 'tv' ? '📺' : '🎬'}</div>`}
      </div>
      <div class="rec-info">
        <div class="rec-title">
          <a class="rec-title-link" href="https://www.themoviedb.org/${r.media_type === 'movie' ? 'movie' : 'tv'}/${r.id}" target="_blank" rel="noopener noreferrer" title="View on TMDB">${esc(r.title)}</a>
        </div>
        ${r.year ? `<div class="rec-year">${r.year}</div>` : ''}
        ${r.overview ? `<div class="rec-overview" title="Tap to expand">${esc(r.overview)}</div>` : ''}
      </div>
      <button class="rec-add-btn" data-rec-id="${r.id}" data-rec-type="${r.media_type}"
        data-rec-title="${esc(r.title)}" data-rec-year="${r.year || ''}"
        data-rec-poster="${r.poster_path || ''}" title="Add to Watchlist">＋ Watchlist</button>
    </div>
  `;
}

function removeRecCard(section, recId) {
  const card = section.querySelector(`.rec-card[data-rec-card="${recId}"]`);
  if (!card) return;
  card.classList.add('rec-card-removing');
  setTimeout(() => {
    card.remove();
    if (!section.querySelector('.rec-card')) {
      const grid = section.querySelector('.recs-grid');
      if (grid) grid.outerHTML = '<p class="recs-empty">All caught up — hit ↻ to refresh.</p>';
    }
  }, 200);
}

async function loadRecommendations(refresh = false) {
  const section = document.getElementById('recs-section');
  if (!section) return;
  if (recsState.loading) return;

  if (refresh) {
    recsState.refreshCount++;
  } else {
    recsState.refreshCount = 0;
    recsState.shownIds.clear();
  }
  recsState.loading = true;

  try {
    // Pool: titles you've watched OR are currently watching.
    const engaged = movies.filter(m => m.status === 'watched' || m.status === 'in_progress');

    // Genre frequency across engaged titles
    const genreCounts = {};
    engaged.forEach(m => {
      if (!m.genre) return;
      m.genre.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    // Most-watched country among TV/anime titles (used to boost TV seed scores)
    const tvCountryCounts = {};
    engaged.filter(m => m.mediaType === 'tv' || m.mediaType === 'anime').forEach(m => {
      if (m.country) tvCountryCounts[m.country] = (tvCountryCounts[m.country] || 0) + 1;
    });
    const topTVCountry = Object.entries(tvCountryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Build seed pool: genre score, plus boosts for in-progress and TV-from-top-country.
    const seedPool = engaged
      .filter(m => m.tmdbId)
      .map(m => {
        const genres = (m.genre || '').split(',').map(g => g.trim()).filter(Boolean);
        let score = genres.length
          ? genres.reduce((s, g) => s + (genreCounts[g] || 0), 0) / genres.length
          : 0;
        if (m.status === 'in_progress') score *= 1.5; // currently engaging viewer
        const isTVish = m.mediaType === 'tv' || m.mediaType === 'anime';
        if (isTVish && topTVCountry && m.country === topTVCountry) score *= 1.3;
        return { ...m, _score: score };
      })
      .sort((a, b) => b._score - a._score || (b.addedAt || 0) - (a.addedAt || 0));

    if (!seedPool.length) {
      section.innerHTML = '<p class="recs-empty">Mark some titles as watched to get personalised recommendations.</p>';
      return;
    }

    // Initial load uses top 8 seeds. Refreshes rotate the window across the pool
    // so we send a different seed combo to TMDB and get different recommendations.
    let seeds;
    if (refresh && seedPool.length > 8) {
      const offset = (recsState.refreshCount * 3) % seedPool.length;
      seeds = [...seedPool.slice(offset), ...seedPool.slice(0, offset)].slice(0, 8);
    } else {
      seeds = seedPool.slice(0, 8);
    }

    // Cycle TMDB pages 1→2→3 across refreshes for further variety.
    const page = (recsState.refreshCount % 3) + 1;

    const topGenres  = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const genreLabel = topGenres.length ? topGenres.join(', ') : '';
    const country    = getMostWatchedCountry();
    const headerHTML = buildRecsHeader(genreLabel, country);

    // Show header + loading while we fetch
    section.innerHTML = headerHTML +
      '<div class="recs-loading"><span class="recs-spinner"></span> Loading recommendations…</div>';

    const trackedTmdbIds = new Set(movies.map(m => String(m.tmdbId)).filter(Boolean));
    const dismissed      = getDismissedRecs();
    const idParam = seeds.map(m => `${m.tmdbId}:${m.mediaType === 'anime' ? 'tv' : m.mediaType}`).join(',');

    let data;
    try {
      const r = await fetch(`/api/recommend?ids=${encodeURIComponent(idParam)}&page=${page}`);
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
    } catch {
      section.innerHTML = headerHTML +
        '<p class="recs-empty">Recommendations require Vercel deployment with a TMDB API key.</p>';
      bindRecsHandlers(section);
      return;
    }

    const candidates = (data.results || []).filter(r =>
      !trackedTmdbIds.has(String(r.id)) && !dismissed.has(String(r.id))
    );

    // Prefer items not yet shown in this session; fall back to repeats so the grid stays full.
    let recs = candidates.filter(r => !recsState.shownIds.has(String(r.id))).slice(0, RECS_LIMIT);
    if (recs.length < RECS_LIMIT) {
      const fillers = candidates
        .filter(r => !recs.some(x => x.id === r.id))
        .slice(0, RECS_LIMIT - recs.length);
      recs = recs.concat(fillers);
    }

    let mainHTML;
    if (!recs.length) {
      recsState.shownIds.clear();
      mainHTML = '<p class="recs-empty">No new recommendations — try watching more titles or hit ↻ again.</p>';
    } else {
      recs.forEach(r => recsState.shownIds.add(String(r.id)));
      mainHTML = `<div class="recs-grid">${recs.map(renderRecCard).join('')}</div>`;
    }

    // Country section (if enabled and a country is detected)
    let countryHTML = '';
    if (recsByCountryEnabled && country) {
      countryHTML = await buildCountrySectionHTML(country, page, trackedTmdbIds, dismissed);
    }

    section.innerHTML = headerHTML + mainHTML + countryHTML;
    bindRecsHandlers(section);
  } finally {
    recsState.loading = false;
  }
}

async function buildCountrySectionHTML(country, page, trackedTmdbIds, dismissed) {
  try {
    const r = await fetch(`/api/by-country?code=${country.iso}&type=${country.type}&page=${page}`);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    const recs = (data.results || [])
      .filter(x => !trackedTmdbIds.has(String(x.id)) && !dismissed.has(String(x.id)))
      .slice(0, RECS_LIMIT);
    if (!recs.length) {
      return `<div class="recs-country-section">
        <h3 class="recs-country-heading">🌍 Top from ${esc(country.name)}</h3>
        <p class="recs-empty">No new picks from ${esc(country.name)} right now.</p>
      </div>`;
    }
    const typeLabel = country.type === 'tv' ? 'TV shows' : 'films';
    return `<div class="recs-country-section">
      <h3 class="recs-country-heading">🌍 Top ${typeLabel} from ${esc(country.name)}</h3>
      <p class="recs-country-sub">Most-voted on TMDB · based on ${country.count} watched title${country.count !== 1 ? 's' : ''}</p>
      <div class="recs-grid">${recs.map(renderRecCard).join('')}</div>
    </div>`;
  } catch {
    return `<div class="recs-country-section">
      <p class="recs-empty">Could not load country picks.</p>
    </div>`;
  }
}

function bindRecsHandlers(section) {
  if (section._recsBound) return;
  section._recsBound = true;
  section.addEventListener('click', e => {
    if (e.target.closest('#recs-refresh-btn')) {
      loadRecommendations(true);
      return;
    }

    if (e.target.closest('#recs-country-toggle')) {
      recsByCountryEnabled = !recsByCountryEnabled;
      localStorage.setItem('cinetrack_recs_country', recsByCountryEnabled);
      loadRecommendations();
      return;
    }

    const overview = e.target.closest('.rec-overview');
    if (overview) {
      overview.closest('.rec-card')?.classList.toggle('expanded');
      return;
    }

    const dismissBtn = e.target.closest('.rec-dismiss-btn');
    if (dismissBtn) {
      const id = dismissBtn.dataset.recDismiss;
      dismissRec(id);
      removeRecCard(section, id);
      return;
    }

    const addBtn = e.target.closest('.rec-add-btn');
    if (!addBtn) return;
    const recId     = addBtn.dataset.recId;
    const recType   = addBtn.dataset.recType;
    const recTitle  = addBtn.dataset.recTitle;
    const recYear   = addBtn.dataset.recYear;
    const recPoster = addBtn.dataset.recPoster;
    if (!movies.some(m => String(m.tmdbId) === recId)) {
      movies.unshift({
        id:        genId(),
        addedAt:   Date.now(),
        title:     recTitle,
        year:      recYear,
        status:    'watchlist',
        rating:    0,
        mediaType: recType === 'tv' ? 'tv' : 'movie',
        tmdbId:    Number(recId),
        posterUrl: recPoster ? POSTER_BASE + recPoster : '',
        genre: '', director: '', country: '', notes: '', runtime: 0,
      });
      save();
      updateCountryDropdown();
    }
    removeRecCard(section, recId);
  });
}

function renderBarChart(entries, maxVal, color) {
  if (!entries.length || !maxVal) return '<p class="chart-empty">No data yet</p>';
  return entries.map(([label, count]) => `
    <div class="chart-row">
      <div class="chart-label" title="${esc(String(label))}">${esc(String(label))}</div>
      <div class="chart-track">
        <div class="chart-fill" style="width:${Math.max(3, Math.round((count / maxVal) * 100))}%;background:${color}"></div>
      </div>
      <div class="chart-count">${count}</div>
    </div>
  `).join('');
}

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
  updated_at timestamptz DEFAULT now()
);
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

    const cards = sharingProfiles.map(profile => {
      const userMovies = dataMap[profile.user_id] || [];
      const watched    = userMovies.filter(m => m.status === 'watched');
      const inProgress = userMovies.filter(m => m.status === 'in_progress');
      const watchlist  = userMovies.filter(m => m.status === 'watchlist');
      const username   = profile.username || 'Anonymous';
      const initial    = username[0].toUpperCase();

      const posters = watched
        .filter(m => m.posterUrl)
        .slice(0, 6)
        .map(m => `<img class="community-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" title="${esc(m.title)}" loading="lazy" />`)
        .join('');

      const topGenres = (() => {
        const gc = {};
        watched.forEach(m => (m.genre || '').split(',').map(g => g.trim()).filter(Boolean).forEach(g => { gc[g] = (gc[g] || 0) + 1; }));
        return Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]).join(', ');
      })();

      return `
        <div class="community-card">
          <div class="community-card-header">
            <div class="community-avatar">${esc(initial)}</div>
            <div class="community-card-info">
              <div class="community-username">${esc(username)}</div>
              <div class="community-stats-mini">
                <span>✓ ${watched.length} watched</span>
                ${inProgress.length ? `<span>▶ ${inProgress.length} in progress</span>` : ''}
                <span>⏳ ${watchlist.length} on list</span>
              </div>
              ${topGenres ? `<div class="community-genres">${esc(topGenres)}</div>` : ''}
            </div>
          </div>
          ${posters ? `<div class="community-posters">${posters}</div>` : ''}
        </div>
      `;
    }).join('');

    communityGrid.innerHTML = cards || '<p class="community-empty">No data found.</p>';

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

  // Diary: watched titles with dates, newest first, grouped by month
  const diaryEntries = movies
    .filter(m => m.status === 'watched' && m.watchedAt)
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, 24);
  const diaryByMonth = {};
  diaryEntries.forEach(m => {
    const key = monthLabel(m.watchedAt);
    if (!diaryByMonth[key]) diaryByMonth[key] = [];
    diaryByMonth[key].push(m);
  });

  // Watched-this-month count (full month, not just diary slice)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const watchedThisMonth = movies.filter(m =>
    m.status === 'watched' && m.watchedAt && m.watchedAt >= monthStart
  ).length;

  const displayName = currentUsername || currentUser?.email?.split('@')[0] || 'You';
  const initial     = displayName[0].toUpperCase();

  const maxGenre   = topGenres[0]?.[1]   || 1;
  const maxCountry = topCountries[0]?.[1] || 1;
  const maxRating  = ratingDist[0]?.[1]   || 1;

  panel.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-lg">${esc(initial)}</div>
      <div class="profile-hero-info">
        <div class="profile-display-name" id="profile-name-display">
          <span class="profile-name-text">${esc(displayName)}</span>
          ${currentUser ? `<button type="button" class="profile-name-edit" id="profile-name-edit-btn" title="Edit username">✏ Edit</button>` : ''}
          <span id="sync-indicator" class="sync-indicator" data-state="${currentSyncState}" title="${currentSyncTitle}"></span>
        </div>
        ${currentUser ? `
        <form class="profile-name-form hidden" id="profile-name-form">
          <input type="text" id="profile-name-input" maxlength="30" placeholder="Your display name" />
          <button type="submit" id="profile-name-save" class="profile-name-save">Save</button>
          <button type="button" id="profile-name-cancel" class="profile-name-cancel">Cancel</button>
        </form>` : ''}
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
        <div class="stat-card-value">${watchedThisMonth}</div>
        <div class="stat-card-label">This Month</div>
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

    ${diaryEntries.length ? `
    <div class="profile-section diary-section">
      <h3>📔 Diary</h3>
      ${Object.entries(diaryByMonth).map(([month, items]) => `
        <div class="diary-month">
          <div class="diary-month-label">${esc(month)}</div>
          <div class="diary-items">
            ${items.map(m => `
              <div class="diary-item" data-edit="${m.id}" title="Edit">
                <div class="diary-day">${new Date(m.watchedAt).getDate()}</div>
                ${m.posterUrl
                  ? `<img class="diary-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" loading="lazy" />`
                  : `<div class="diary-poster diary-poster-placeholder">${m.mediaType === 'anime' ? '🎌' : m.mediaType === 'tv' ? '📺' : '🎬'}</div>`}
                <div class="diary-info">
                  <div class="diary-title">${esc(m.title)}</div>
                  <div class="diary-meta">
                    ${m.year ? `<span>${m.year}</span>` : ''}
                    ${m.rating ? `<span class="diary-rating">★ ${m.rating}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>` : ''}

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

    <div class="profile-section">
      <h3>
        Refresh metadata
        <button type="button" class="info-btn" aria-label="What is this?"
          title="Re-fetch the latest TMDB info (posters, episode counts, genres, runtime) for every title with a TMDB link. Useful if older entries are missing newer fields like total episodes.">ⓘ</button>
      </h3>
      <p class="profile-csv-hint">Re-pulls posters, episode counts and other TMDB fields for every linked title.</p>
      <div class="profile-csv-actions">
        <button id="profile-refresh-tmdb-btn" class="csv-action-btn" title="Refresh from TMDB">🔄 Refresh from TMDB</button>
      </div>
    </div>
  `;

  // Clicking a recent card or diary item opens the edit modal
  panel.querySelectorAll('[data-edit]').forEach(card => {
    card.addEventListener('click', () => openModal(movies.find(m => m.id === card.dataset.edit)));
  });

  // Wire CSV controls (re-rendered every renderProfile)
  panel.querySelector('#profile-import-btn')?.addEventListener('click', () => csvInput.click());
  panel.querySelector('#profile-export-btn')?.addEventListener('click', exportCSV);
  panel.querySelector('#profile-refresh-tmdb-btn')?.addEventListener('click', refreshAllFromTMDB);
  const tplLink = panel.querySelector('#profile-csv-template');
  if (tplLink) tplLink.href = TEMPLATE_URL;

  // Wire username editor
  const nameDisplay = panel.querySelector('#profile-name-display');
  const nameForm    = panel.querySelector('#profile-name-form');
  const nameInput   = panel.querySelector('#profile-name-input');
  const nameSave    = panel.querySelector('#profile-name-save');
  const nameCancel  = panel.querySelector('#profile-name-cancel');
  const nameEditBtn = panel.querySelector('#profile-name-edit-btn');

  function showNameForm() {
    if (!nameForm || !nameInput) return;
    nameDisplay?.classList.add('hidden');
    nameForm.classList.remove('hidden');
    nameInput.value = currentUsername || '';
    nameInput.focus();
    nameInput.select();
  }
  function hideNameForm() {
    nameForm?.classList.add('hidden');
    nameDisplay?.classList.remove('hidden');
  }
  async function saveName() {
    const val = (nameInput?.value || '').trim();
    if (!val) return;
    currentUsername = val;
    updateUserMenu();
    await saveProfile({ username: val });
    renderProfile();
  }

  nameEditBtn?.addEventListener('click', showNameForm);
  nameCancel?.addEventListener('click', hideNameForm);
  nameForm?.addEventListener('submit', e => { e.preventDefault(); saveName(); });
  nameInput?.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); hideNameForm(); }
  });
}

// ── Export CSV ──────────────────────────────────────────
function exportCSV() {
  const list = movies.filter(m => m.mediaType === activeType);
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
  if (totalPages <= 1) { paginationEl.classList.add('hidden'); return; }
  paginationEl.classList.remove('hidden');

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

// ── Episode progress chip / bar ─────────────────────────
function renderEpisodeProgress(m) {
  const isTVish = m.mediaType === 'tv' || m.mediaType === 'anime';
  if (!isTVish) return '';
  const cur     = m.currentEpisode || 0;
  const tot     = m.totalEpisodes  || 0;
  const season  = m.currentSeason  || 0;
  const totSeas = m.totalSeasons   || 0;

  // Build a position label like "S2·E4 / 24 ep" or "Episode 4"
  const posLabel = (() => {
    if (season && cur) return `S${season}·E${cur}${tot ? ` / ${tot} ep` : ''}`;
    if (season)        return `S${season}${totSeas ? ` of ${totSeas}` : ''}`;
    if (cur)           return `Episode ${cur}${tot ? ` / ${tot}` : ''}`;
    return '';
  })();

  if (m.status === 'in_progress') {
    if (!posLabel && !tot) return '';
    const incBtn = `<button class="card-progress-inc" data-increment="${m.id}" title="Mark next episode watched">+1</button>`;
    if (!tot) {
      return `<div class="card-progress">
        <div class="card-progress-row">
          <span class="card-progress-label">▶ ${posLabel || 'In progress'}</span>
          ${incBtn}
        </div>
      </div>`;
    }
    const pct = Math.min(100, Math.round((cur / tot) * 100));
    return `<div class="card-progress">
      <div class="card-progress-row">
        <span class="card-progress-label">▶ ${posLabel}</span>
        <div class="card-progress-right">
          <span class="card-progress-pct">${pct}%</span>
          ${incBtn}
        </div>
      </div>
      <div class="card-progress-track">
        <div class="card-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }
  if (m.status === 'watched' && tot) {
    const seasonLabel = totSeas ? ` · ${totSeas} season${totSeas !== 1 ? 's' : ''}` : '';
    return `<div class="card-progress card-progress-done">✓ All ${tot} episodes${seasonLabel}</div>`;
  }
  return '';
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

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  if (currentPage < 0) currentPage = 0;

  const pageList = list.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  grid.innerHTML = '';
  grid.className = `movie-grid grid-${gridSize}` + (selectMode ? ' select-mode' : '');

  if (list.length === 0) {
    const isFirstRun = movies.length === 0;
    const typeLabel  = activeType === 'tv' ? 'TV shows' : activeType === 'anime' ? 'anime' : 'films';
    emptyMsg.innerHTML = isFirstRun
      ? `<div class="empty-hero">
          <div class="empty-hero-icon">🎬</div>
          <h2 class="empty-hero-title">Welcome to CineTrack</h2>
          <p class="empty-hero-sub">Track films, TV shows, and anime in one place. Get started by adding a title or importing your library.</p>
          <div class="empty-hero-actions">
            <button type="button" class="empty-cta primary" data-empty-add>+ Add your first title</button>
            <button type="button" class="empty-cta" data-empty-import>⬆ Import CSV</button>
          </div>
        </div>`
      : `<div class="empty-simple">
          <p>No ${typeLabel} match your filters.</p>
          <p class="empty-hint">Try clearing the search or switching tabs.</p>
        </div>`;
    emptyMsg.classList.remove('hidden');
    emptyMsg.querySelector('[data-empty-add]')?.addEventListener('click', () => openModal());
    emptyMsg.querySelector('[data-empty-import]')?.addEventListener('click', () => csvInput.click());
    renderPagination(0);
    return;
  }
  emptyMsg.classList.add('hidden');

  pageList.forEach(m => {
    const card = document.createElement('div');
    const checked = selectedIds.has(m.id);
    card.className = 'movie-card' + (checked ? ' selected' : '');
    card.dataset.id = m.id;
    const isTV = m.mediaType === 'tv';
    const posterHTML = m.posterUrl
      ? `<img class="card-poster-img" src="${m.posterUrl}" alt="${esc(m.title)}" loading="lazy" />`
      : `<div class="card-poster-emoji">${m.mediaType === 'anime' ? '🎌' : isTV ? '📺' : posterEmoji(m.title)}</div>`;
    const runtimeStr = formatRuntime(m.runtime);

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
        ${m.status === 'watched' ? '✓ Watched' : m.status === 'in_progress' ? '▶ In Progress' : '⏳ Watchlist'}
      </span>
      <div class="card-title">${
        m.tmdbId
          ? `<a class="card-title-link" href="https://www.themoviedb.org/${m.mediaType === 'movie' ? 'movie' : 'tv'}/${m.tmdbId}" target="_blank" rel="noopener noreferrer" title="View on TMDB">${esc(m.title)}</a>`
          : esc(m.title)
      }</div>
      <div class="card-meta">
        ${m.year       ? `<span class="meta-year">${m.year}</span>` : ''}
        ${m.country    ? `<span class="meta-country">🌍 ${esc(m.country)}</span>` : ''}
        ${m.genre      ? `<span class="meta-genre">${esc(m.genre)}</span>` : ''}
        ${m.director   ? `<span class="meta-director">${isTV ? 'Created by' : 'Dir.'} ${esc(m.director)}</span>` : ''}
        ${runtimeStr   ? `<span class="meta-runtime">⏱ ${runtimeStr}</span>` : ''}
        ${m.status === 'watched' && m.watchedAt ? `<span class="meta-watched">📅 ${formatWatchedDate(m.watchedAt)}</span>` : ''}
      </div>
      ${renderEpisodeProgress(m)}
      ${m.rating ? starsHTML(m.rating) : ''}
      ${m.notes ? `<div class="card-notes">${esc(m.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn-sm" data-edit="${m.id}">
          <span class="lbl-md lbl-lg">Edit</span><span class="lbl-sm">✎</span>
        </button>
        <button class="btn-sm" data-toggle="${m.id}">
          <span class="lbl-lg">${m.status === 'watched' ? '⏳ Watchlist' : m.status === 'in_progress' ? '✓ Watched' : '▶ In Progress'}</span>
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
  movies.forEach(m => {
    if (selectedIds.has(m.id)) {
      m.status = 'watched';
      if (!m.watchedAt) m.watchedAt = Date.now();
    }
  });
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
function openModal(movie = null) {
  editingId = movie ? movie.id : null;
  modalTitle.textContent = movie ? 'Edit Title' : 'Add Title';

  activeMediaType = movie?.mediaType || activeType;
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === activeMediaType)
  );
  updateModalForType();
  resetTMDBUI();

  document.getElementById('f-title').value    = movie?.title    || '';
  populateYearSelect(movie?.year || '');
  document.getElementById('f-genre').value    = movie?.genre    || '';
  document.getElementById('f-director').value = movie?.director || '';
  document.getElementById('f-country').value  = movie?.country  || '';
  document.getElementById('f-status').value   = movie?.status   || 'watchlist';
  document.getElementById('f-runtime').value  = movie?.runtime  || '';
  document.getElementById('f-notes').value    = movie?.notes    || '';
  watchedDateInput.value = movie?.watchedAt
    ? toISODate(movie.watchedAt)
    : (movie?.status === 'watched' ? toISODate(Date.now()) : '');
  currentEpInput.value     = movie?.currentEpisode || '';
  totalEpInput.value       = movie?.totalEpisodes  || '';
  currentSeasonInput.value = movie?.currentSeason  || '';
  totalSeasonsInput.value  = movie?.totalSeasons   || '';
  selectedRating = movie?.rating || 0;

  toggleRatingLabel();
  buildStars();
  modal.classList.remove('hidden');
  tmdbQuery.focus();
}

function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
  resetTMDBUI();
}

function toggleRatingLabel() {
  const s = document.getElementById('f-status').value;
  ratingLabel.classList.toggle('hidden', s !== 'watched' && s !== 'in_progress');
  watchedDateLabel.classList.toggle('hidden', s !== 'watched');
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

  const status = document.getElementById('f-status').value;
  let watchedAt = existing?.watchedAt || null;
  if (status === 'watched') {
    const formDate = fromISODate(watchedDateInput.value);
    watchedAt = formDate || watchedAt || Date.now();
  }

  const isTVish        = activeMediaType === 'tv' || activeMediaType === 'anime';
  const currentEp      = isTVish ? (parseInt(currentEpInput.value)     || 0) : 0;
  const totalEp        = isTVish ? (parseInt(totalEpInput.value)       || 0) : 0;
  const currentSeason  = isTVish ? (parseInt(currentSeasonInput.value) || 0) : 0;
  const totalSeasons   = isTVish ? (parseInt(totalSeasonsInput.value)  || 0) : 0;

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
    watchedAt,
    currentEpisode: currentEp,
    totalEpisodes:  totalEp,
    currentSeason,
    totalSeasons,
    mediaType: activeMediaType,
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
document.getElementById('f-status').addEventListener('change', () => { toggleRatingLabel(); buildStars(); });
searchInput.addEventListener('input', () => { searchQuery = searchInput.value; currentPage = 0; render(); });
countryFilterEl.addEventListener('change', () => { countryFilter = countryFilterEl.value; currentPage = 0; render(); });

grid.addEventListener('click', e => {
  const incBtn = e.target.closest('[data-increment]');
  if (incBtn) {
    const m = movies.find(x => x.id === incBtn.dataset.increment);
    if (m) {
      m.currentEpisode = (m.currentEpisode || 0) + 1;
      // Hitting the finale auto-completes the show
      if (m.totalEpisodes && m.currentEpisode >= m.totalEpisodes) {
        m.currentEpisode = m.totalEpisodes;
        m.status = 'watched';
        if (!m.watchedAt) m.watchedAt = Date.now();
      }
      save(); render();
    }
    return;
  }

  const noteEl = e.target.closest('.card-notes');
  if (noteEl) { noteEl.classList.toggle('expanded'); return; }

  const editId   = e.target.dataset.edit;
  const toggleId = e.target.dataset.toggle;
  const deleteId = e.target.dataset.delete;

  // Click poster to edit (skip in select mode or when clicking checkbox)
  if (!editId && !toggleId && !deleteId && !selectMode && !e.target.closest('.card-checkbox')) {
    const poster = e.target.closest('.card-poster');
    if (poster) {
      const card = poster.closest('.movie-card');
      if (card?.dataset.id) openModal(movies.find(m => m.id === card.dataset.id));
      return;
    }
  }

  if (editId) {
    openModal(movies.find(m => m.id === editId));
  } else if (toggleId) {
    const m = movies.find(m => m.id === toggleId);
    if (m) {
      m.status = m.status === 'watched' ? 'watchlist' : m.status === 'in_progress' ? 'watched' : 'in_progress';
      if (m.status === 'watched' && !m.watchedAt) m.watchedAt = Date.now();
      if (m.status === 'watchlist') m.rating = 0;
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
    { id: genId(), title: 'Spirited Away', year: '2001', genre: 'Animation, Fantasy', director: 'Hayao Miyazaki', country: 'Japan', status: 'watched', rating: 10, runtime: 125, notes: 'A masterpiece of imagination.', posterUrl: 'https://image.tmdb.org/t/p/w200/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', mediaType: 'anime', addedAt: Date.now() },
    { id: genId(), title: 'Breaking Bad', year: '2008', genre: 'Crime, Drama', director: 'Vince Gilligan', country: 'United States', status: 'watched', rating: 10, runtime: 2700, notes: 'One of the greatest TV dramas ever made.', posterUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', mediaType: 'tv', addedAt: Date.now() },
    { id: genId(), title: 'Dark', year: '2017', genre: 'Sci-Fi, Thriller', director: 'Baran bo Odar', country: 'Germany', status: 'watched', rating: 9, runtime: 1530, notes: 'Intricate time-travel mystery.', posterUrl: 'https://image.tmdb.org/t/p/w200/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg', mediaType: 'tv', addedAt: Date.now() },
    { id: genId(), title: 'Shogun', year: '2024', genre: 'Drama, History', director: 'Rachel Kondo', country: 'Japan', status: 'watchlist', rating: 0, runtime: 0, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg', mediaType: 'tv', addedAt: Date.now() },
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
  const status    = rawStatus === 'watched' ? 'watched'
                  : (rawStatus === 'in_progress' || rawStatus === 'in progress' || rawStatus === 'inprogress') ? 'in_progress'
                  : 'watchlist';
  const rating    = (status === 'watched' || status === 'in_progress')
                    ? Math.min(10, Math.max(0, parseInt(row.rating) || 0)) : 0;
  const year      = (row.year || '').toString().slice(0, 4);
  const runtime   = parseInt(row.runtime) || 0;
  return { mediaType, status, rating, year, runtime };
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
  document.getElementById('progress-title').textContent = 'Matching with TMDB';
  importProgress.classList.remove('hidden');
  let imported = 0, skipped = 0, unmatched = 0;
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    if (cancelImport) break;
    const row = rows[i];
    const title = row.title?.trim();
    if (!title) { skipped++; continue; }
    const { mediaType, status, rating, year, runtime } = normaliseRow(row);
    const dup = movies.some(m => m.title.toLowerCase() === title.toLowerCase() && m.mediaType === mediaType && (m.year || '') === year);
    if (dup) { skipped++; continue; }
    progressText.textContent = `Matching "${title}" (${i + 1} of ${total})…`;
    progressBar.style.width = `${Math.round((i / total) * 100)}%`;
    const tmdb = await matchWithTMDB(title, year, mediaType);
    if (tmdb) {
      movies.push({ id: genId(), addedAt: Date.now(), title: tmdb.title, year: tmdb.year, genre: tmdb.genre, director: tmdb.director, country: tmdb.country, notes: row.notes || tmdb.overview || '', posterUrl: tmdb.poster_path ? `https://image.tmdb.org/t/p/w200${tmdb.poster_path}` : '', tmdbId: tmdb.tmdbId, runtime: tmdb.runtime || runtime, totalEpisodes: tmdb.total_episodes || 0, mediaType, status, rating, watchedAt: status === 'watched' ? Date.now() : null });
    } else {
      unmatched++;
      movies.push({ id: genId(), addedAt: Date.now(), title, year, genre: row.genre || '', director: row.director || '', country: row.country || '', notes: row.notes || '', posterUrl: row.posterUrl || '', tmdbId: null, runtime, mediaType, status, rating });
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

// ── Bulk refresh from TMDB ──────────────────────────────
async function refreshAllFromTMDB() {
  const items = movies.filter(m => m.tmdbId);
  if (!items.length) {
    showToast('No TMDB-linked titles to refresh.', true);
    return;
  }
  if (!confirm(`Refresh TMDB data for ${items.length} title${items.length !== 1 ? 's' : ''}? This may take a few minutes.`)) return;

  cancelImport = false;
  document.getElementById('progress-title').textContent = 'Refreshing from TMDB';
  importProgress.classList.remove('hidden');
  let updated = 0, failed = 0;
  const total = items.length;

  for (let i = 0; i < total; i++) {
    if (cancelImport) break;
    const m = items[i];
    progressText.textContent = `Refreshing "${m.title}" (${i + 1} of ${total})…`;
    progressBar.style.width = `${Math.round((i / total) * 100)}%`;

    try {
      const fetchType = m.mediaType === 'anime' ? 'tv' : (m.mediaType === 'tv' ? 'tv' : 'movie');
      const r = await fetch(`/api/movie?id=${m.tmdbId}&type=${fetchType}`);
      if (!r.ok) { failed++; continue; }
      const d = await r.json();

      // Refresh metadata fields. User-edited state (rating, status, notes,
      // watchedAt, currentEpisode, currentSeason) is preserved.
      if (d.title)    m.title    = d.title;
      if (d.year)     m.year     = d.year;
      if (d.genre)    m.genre    = d.genre;
      if (d.director) m.director = d.director;
      if (d.country)  m.country  = d.country;
      if (d.runtime)  m.runtime  = d.runtime;
      if (d.poster_path) m.posterUrl = `https://image.tmdb.org/t/p/w200${d.poster_path}`;
      if (d.total_episodes) m.totalEpisodes = d.total_episodes;
      if (d.total_seasons)  m.totalSeasons  = d.total_seasons;
      updated++;
    } catch {
      failed++;
    }
  }

  progressBar.style.width = '100%';
  importProgress.classList.add('hidden');
  save();
  updateCountryDropdown();
  refreshCurrentView();

  const parts = [`Refreshed ${updated} title${updated !== 1 ? 's' : ''}`];
  if (failed)        parts.push(`${failed} failed`);
  if (cancelImport)  parts.push('cancelled');
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

const TEMPLATE_CSV = `title,year,genre,director,country,status,rating,runtime,notes,type\nInception,2010,"Sci-Fi, Thriller",Christopher Nolan,United States,watched,9,148,Mind-bending film,movie\nBreaking Bad,2008,"Crime, Drama",Vince Gilligan,United States,watched,10,2700,Greatest TV drama,tv\n`;
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
  if (movies.length === 0) seedData();
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
  }
});

// ── Sharing toggle ──────────────────────────────────────
document.getElementById('sharing-toggle').addEventListener('change', async e => {
  sharingEnabled = e.target.checked;
  localStorage.setItem('cinetrack_sharing', sharingEnabled);
  await saveProfile({ sharing_enabled: sharingEnabled });
});

// ── Reload from cloud ───────────────────────────────────
reloadCloudBtn.addEventListener('click', async () => {
  document.getElementById('user-dropdown').classList.add('hidden');
  await loadUserData();
  showToast('Reloaded from cloud');
});

// ── Sign out ────────────────────────────────────────────
signoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
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
backfillWatchedDates();

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
