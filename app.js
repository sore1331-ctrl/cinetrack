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

let movies         = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeType     = 'movie';   // 'movie' | 'tv' | 'anime'
let activeStatus   = 'all';     // 'all' | 'watched' | 'watchlist'
let searchQuery    = '';
let countryFilter  = '';
let gridSize       = localStorage.getItem('cinetrack_grid') || 'md';
let editingId      = null;
let pendingDeleteId = null;
let selectedRating = 0;
let tmdbSelection  = null;
let activeMediaType = 'movie';
let searchTimer    = null;
let currentPage    = 0;
let pageSize       = parseInt(localStorage.getItem('cinetrack_pagesize') || '50');
let selectMode     = false;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
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

// ── Section nav (Films / TV / Anime) ───────────────────
document.querySelectorAll('.type-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeType = btn.dataset.type;
    activeMediaType = activeType;
    currentPage = 0;
    updateCountryDropdown();
    render();
  });
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
  document.getElementById('f-year').value     = details.year     || '';
  document.getElementById('f-genre').value    = details.genre    || '';
  document.getElementById('f-director').value = details.director || '';
  document.getElementById('f-country').value  = details.country  || '';
  if (details.runtime) document.getElementById('f-runtime').value = details.runtime;
  if (!document.getElementById('f-notes').value)
    document.getElementById('f-notes').value  = details.overview || '';
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
  const watchedList  = allOfType.filter(m => m.status === 'watched');
  const watchlistCnt = allOfType.filter(m => m.status === 'watchlist').length;
  const totalMins    = watchedList.reduce((s, m) => s + (m.runtime || 0), 0);
  const timeStr      = formatRuntime(totalMins);

  statsBar.innerHTML =
    `<span class="stat-item stat-watched">✓ <strong>${watchedList.length}</strong> watched</span>` +
    `<span class="stat-sep">·</span>` +
    `<span class="stat-item stat-watchlist">⏳ <strong>${watchlistCnt}</strong> on watchlist</span>` +
    (timeStr ? `<span class="stat-sep">·</span><span class="stat-item stat-time">⏱ <strong>${timeStr}</strong> spent watching</span>` : '');
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

// ── Render ──────────────────────────────────────────────
function render() {
  const list = filtered();

  // Remove stale selections
  const visibleIds = new Set(list.map(m => m.id));
  for (const id of selectedIds) {
    if (!visibleIds.has(id)) selectedIds.delete(id);
  }
  updateBulkBar();
  updateStats();

  // Clamp page
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
    const isTV = m.mediaType === 'tv';
    const posterHTML = m.posterUrl
      ? `<img class="card-poster-img" src="${m.posterUrl}" alt="${esc(m.title)}" loading="lazy" />`
      : `<div class="card-poster-emoji">${m.mediaType === 'anime' ? '🎌' : isTV ? '📺' : posterEmoji(m.title)}</div>`;
    const runtimeStr = formatRuntime(m.runtime);

    card.innerHTML = `
      <div class="card-poster">
        ${posterHTML}
        <label class="card-checkbox" title="Select">
          <input type="checkbox" data-check="${m.id}" ${checked ? 'checked' : ''} />
          <span class="card-checkbox-box"></span>
        </label>
      </div>
      <span class="badge badge-${m.status} card-status-badge">
        ${m.status === 'watched' ? '✓ Watched' : '⏳ Watchlist'}
      </span>
      <div class="card-title">${esc(m.title)}</div>
      <div class="card-meta">
        ${m.year       ? `<span>${m.year}</span>` : ''}
        ${m.country    ? `<span>🌍 ${esc(m.country)}</span>` : ''}
        ${m.genre      ? `<span>${esc(m.genre)}</span>` : ''}
        ${m.director   ? `<span>${isTV ? 'Created by' : 'Dir.'} ${esc(m.director)}</span>` : ''}
        ${runtimeStr   ? `<span>⏱ ${runtimeStr}</span>` : ''}
      </div>
      ${m.rating ? starsHTML(m.rating) : ''}
      ${m.notes ? `<div class="card-notes">${esc(m.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn-sm" data-edit="${m.id}">Edit</button>
        <button class="btn-sm" data-toggle="${m.id}">
          ${m.status === 'watched' ? 'Watchlist' : 'Mark Watched'}
        </button>
        <button class="btn-sm danger" data-delete="${m.id}">✕</button>
      </div>
    `;
    grid.appendChild(card);
  });

  renderPagination(list.length);
}

// ── Bulk select ─────────────────────────────────────────
const bulkBar       = document.getElementById('bulk-bar');
const bulkCount     = document.getElementById('bulk-count');
const bulkSelectAll = document.getElementById('bulk-select-all');
const bulkDeselect  = document.getElementById('bulk-deselect');
const bulkDelete    = document.getElementById('bulk-delete');

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

bulkSelectAll.addEventListener('click', () => {
  filtered().forEach(m => selectedIds.add(m.id));
  render();
});

bulkDeselect.addEventListener('click', () => {
  selectedIds.clear();
  render();
});

bulkDelete.addEventListener('click', () => {
  const n = selectedIds.size;
  if (!confirm(`Delete ${n} title${n !== 1 ? 's' : ''}? This cannot be undone.`)) return;
  movies = movies.filter(m => !selectedIds.has(m.id));
  selectedIds.clear();
  save();
  updateCountryDropdown();
  render();
});

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
  document.getElementById('f-year').value     = movie?.year     || '';
  document.getElementById('f-genre').value    = movie?.genre    || '';
  document.getElementById('f-director').value = movie?.director || '';
  document.getElementById('f-country').value  = movie?.country  || '';
  document.getElementById('f-status').value   = movie?.status   || 'watchlist';
  document.getElementById('f-runtime').value  = movie?.runtime  || '';
  document.getElementById('f-notes').value    = movie?.notes    || '';
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
  ratingLabel.classList.toggle('hidden', document.getElementById('f-status').value !== 'watched');
}

// ── Form submit ─────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const existing = editingId ? movies.find(m => m.id === editingId) : null;
  const posterUrl = tmdbSelection?.poster_path
    ? POSTER_BASE + tmdbSelection.poster_path
    : existing?.posterUrl || '';

  const data = {
    title,
    year:      document.getElementById('f-year').value     || '',
    genre:     document.getElementById('f-genre').value    || '',
    director:  document.getElementById('f-director').value || '',
    country:   document.getElementById('f-country').value  || '',
    status:    document.getElementById('f-status').value,
    notes:     document.getElementById('f-notes').value    || '',
    runtime:   parseInt(document.getElementById('f-runtime').value) || 0,
    rating:    document.getElementById('f-status').value === 'watched' ? selectedRating : 0,
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

  save();
  updateCountryDropdown();
  render();
  closeModal();
});

// ── Events ──────────────────────────────────────────────
addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.getElementById('f-status').addEventListener('change', () => { toggleRatingLabel(); buildStars(); });
searchInput.addEventListener('input', () => { searchQuery = searchInput.value; currentPage = 0; render(); });
countryFilterEl.addEventListener('change', () => { countryFilter = countryFilterEl.value; currentPage = 0; render(); });

grid.addEventListener('click', e => {
  const editId   = e.target.dataset.edit;
  const toggleId = e.target.dataset.toggle;
  const deleteId = e.target.dataset.delete;

  if (editId) {
    openModal(movies.find(m => m.id === editId));
  } else if (toggleId) {
    const m = movies.find(m => m.id === toggleId);
    if (m) {
      m.status = m.status === 'watched' ? 'watchlist' : 'watched';
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
if (movies.length === 0) {
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
const importBtn      = document.getElementById('import-btn');
const csvInput       = document.getElementById('csv-input');
const csvTemplate    = document.getElementById('csv-template');
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
  status: 'status',
  rating: 'rating',
  runtime: 'runtime',
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
    headers.forEach((h, idx) => {
      const field = COL_MAP[h];
      if (field) obj[field] = vals[idx] ?? '';
    });
    rows.push(obj);
  }
  return rows;
}

function showToast(msg, isError = false) {
  importToast.textContent = msg;
  importToast.className = 'import-toast' + (isError ? ' error' : '');
  clearTimeout(importToast._timer);
  importToast._timer = setTimeout(() => importToast.classList.add('hidden'), 5000);
}

function normaliseRow(row) {
  const rawType = (row.mediaType || '').toLowerCase();
  const mediaType = (rawType === 'tv' || rawType === 'tv show' || rawType === 'show') ? 'tv' : 'movie';
  const rawStatus = (row.status || '').toLowerCase();
  const status = rawStatus === 'watched' ? 'watched' : 'watchlist';
  const rating = status === 'watched' ? Math.min(10, Math.max(0, parseInt(row.rating) || 0)) : 0;
  const year = (row.year || '').toString().slice(0, 4);
  const runtime = parseInt(row.runtime) || 0;
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
  } catch {
    return null;
  }
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

    const { mediaType, status, rating, year, runtime } = normaliseRow(row);

    const dup = movies.some(m =>
      m.title.toLowerCase() === title.toLowerCase() &&
      m.mediaType === mediaType &&
      (m.year || '') === year
    );
    if (dup) { skipped++; continue; }

    progressText.textContent = `Matching "${title}" (${i + 1} of ${total})…`;
    progressBar.style.width = `${Math.round(((i) / total) * 100)}%`;

    const tmdb = await matchWithTMDB(title, year, mediaType);

    if (tmdb) {
      movies.push({
        id: genId(), addedAt: Date.now(),
        title:     tmdb.title,
        year:      tmdb.year,
        genre:     tmdb.genre,
        director:  tmdb.director,
        country:   tmdb.country,
        notes:     row.notes || tmdb.overview || '',
        posterUrl: tmdb.poster_path ? `https://image.tmdb.org/t/p/w200${tmdb.poster_path}` : '',
        tmdbId:    tmdb.tmdbId,
        runtime:   tmdb.runtime || runtime,
        mediaType, status, rating,
      });
    } else {
      unmatched++;
      movies.push({
        id: genId(), addedAt: Date.now(),
        title,
        year,
        genre:     row.genre     || '',
        director:  row.director  || '',
        country:   row.country   || '',
        notes:     row.notes     || '',
        posterUrl: row.posterUrl || '',
        tmdbId:    null,
        runtime,
        mediaType, status, rating,
      });
    }
    imported++;
  }

  progressBar.style.width = '100%';
  importProgress.classList.add('hidden');
  save();
  updateCountryDropdown();
  render();

  const parts = [`Imported ${imported} title${imported !== 1 ? 's' : ''}`];
  if (skipped)   parts.push(`${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`);
  if (unmatched) parts.push(`${unmatched} not found on TMDB`);
  if (cancelImport) parts.push('cancelled');
  showToast(parts.join(' · '));
}

progressCancel.addEventListener('click', () => { cancelImport = true; });
importBtn.addEventListener('click', () => csvInput.click());

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
    } catch {
      showToast('Failed to parse CSV. Check the file format.', true);
    }
  };
  reader.readAsText(file);
});

const TEMPLATE_CSV = `title,year,genre,director,country,status,rating,runtime,notes,type
Inception,2010,"Sci-Fi, Thriller",Christopher Nolan,United States,watched,9,148,Mind-bending film,movie
Breaking Bad,2008,"Crime, Drama",Vince Gilligan,United States,watched,10,2700,Greatest TV drama,tv
Dune Part Two,2024,Sci-Fi,Denis Villeneuve,United States,watchlist,,,166,movie
`;
csvTemplate.href = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));

applyGridSize(gridSize);
updateCountryDropdown();
render();
