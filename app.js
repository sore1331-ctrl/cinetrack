// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'cinetrack_movies';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w200';

let movies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeTab = 'all';
let searchQuery = '';
let editingId = null;
let pendingDeleteId = null;
let selectedRating = 0;
let tmdbSelection = null; // { id, title, year, genre, director, overview, poster_path }
let searchTimer = null;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── DOM refs ────────────────────────────────────────────
const grid          = document.getElementById('movie-grid');
const emptyMsg      = document.getElementById('empty-msg');
const searchInput   = document.getElementById('search-input');
const addBtn        = document.getElementById('add-btn');
const modal         = document.getElementById('modal');
const modalTitle    = document.getElementById('modal-title');
const form          = document.getElementById('movie-form');
const cancelBtn     = document.getElementById('cancel-btn');
const ratingLabel   = document.getElementById('rating-label');
const starRow       = document.getElementById('star-row');
const confirmModal  = document.getElementById('confirm-modal');
const confirmMsg    = document.getElementById('confirm-msg');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk     = document.getElementById('confirm-ok');

const tmdbQuery      = document.getElementById('tmdb-query');
const tmdbDropdown   = document.getElementById('tmdb-dropdown');
const tmdbSelected   = document.getElementById('tmdb-selected');
const tmdbPosterThumb = document.getElementById('tmdb-poster-thumb');
const tmdbSelTitle   = document.getElementById('tmdb-selected-title');
const tmdbSelYear    = document.getElementById('tmdb-selected-year');
const tmdbClear      = document.getElementById('tmdb-clear');
const tmdbSearching  = document.getElementById('tmdb-searching');
const tmdbError      = document.getElementById('tmdb-error');

// ── TMDB API ────────────────────────────────────────────
async function searchTMDB(q) {
  const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('Search failed');
  return r.json();
}

async function fetchMovieDetails(id) {
  const r = await fetch(`/api/movie?id=${id}`);
  if (!r.ok) throw new Error('Details failed');
  return r.json();
}

// ── TMDB search UI ──────────────────────────────────────
tmdbQuery.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = tmdbQuery.value.trim();
  if (!q) { hideDropdown(); return; }
  tmdbSearching.classList.remove('hidden');
  tmdbError.classList.add('hidden');
  searchTimer = setTimeout(() => runSearch(q), 400);
});

async function runSearch(q) {
  try {
    const data = await searchTMDB(q);
    tmdbSearching.classList.add('hidden');
    renderDropdown(data.results || []);
  } catch {
    tmdbSearching.classList.add('hidden');
    tmdbError.textContent = 'Could not reach TMDB. You can still fill in details manually below.';
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
    <div class="tmdb-result" data-id="${m.id}">
      <img class="tmdb-result-poster"
           src="${m.poster_path ? POSTER_BASE + m.poster_path : ''}"
           alt=""
           onerror="this.style.display='none'" />
      <div class="tmdb-result-info">
        <span class="tmdb-result-title">${esc(m.title)}</span>
        <span class="tmdb-result-year">${m.release_date?.slice(0, 4) || '—'}</span>
      </div>
    </div>
  `).join('');
  tmdbDropdown.classList.remove('hidden');
}

function hideDropdown() {
  tmdbDropdown.classList.add('hidden');
  tmdbSearching.classList.add('hidden');
  tmdbDropdown.innerHTML = '';
}

tmdbDropdown.addEventListener('click', async e => {
  const row = e.target.closest('.tmdb-result');
  if (!row) return;
  const id = row.dataset.id;
  hideDropdown();
  tmdbSearching.textContent = 'Loading details…';
  tmdbSearching.classList.remove('hidden');
  tmdbQuery.value = '';

  try {
    const details = await fetchMovieDetails(id);
    tmdbSearching.classList.add('hidden');
    applyTMDBSelection(details);
  } catch {
    tmdbSearching.classList.add('hidden');
    tmdbError.textContent = 'Failed to load movie details.';
    tmdbError.classList.remove('hidden');
  }
});

function applyTMDBSelection(details) {
  tmdbSelection = details;

  tmdbPosterThumb.src = details.poster_path ? POSTER_BASE + details.poster_path : '';
  tmdbPosterThumb.style.display = details.poster_path ? 'block' : 'none';
  tmdbSelTitle.textContent = details.title;
  tmdbSelYear.textContent = details.year || '';
  tmdbSelected.classList.remove('hidden');
  tmdbQuery.parentElement.querySelector('input').disabled = true;

  // populate manual fields (editable in case user wants to tweak)
  document.getElementById('f-title').value    = details.title    || '';
  document.getElementById('f-year').value     = details.year     || '';
  document.getElementById('f-genre').value    = details.genre    || '';
  document.getElementById('f-director').value = details.director || '';
  if (!document.getElementById('f-notes').value) {
    document.getElementById('f-notes').value  = details.overview || '';
  }
}

tmdbClear.addEventListener('click', () => {
  tmdbSelection = null;
  tmdbSelected.classList.add('hidden');
  tmdbQuery.disabled = false;
  tmdbQuery.value = '';
  tmdbQuery.focus();
  document.getElementById('f-title').value    = '';
  document.getElementById('f-year').value     = '';
  document.getElementById('f-genre').value    = '';
  document.getElementById('f-director').value = '';
});

// close dropdown when clicking outside
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
    s.dataset.val = i;
    s.addEventListener('click', () => setRating(i));
    s.addEventListener('mouseenter', () => hoverStars(i));
    s.addEventListener('mouseleave', () => hoverStars(selectedRating));
    starRow.appendChild(s);
  }
}

function setRating(val) {
  selectedRating = val;
  hoverStars(val);
}

function hoverStars(val) {
  starRow.querySelectorAll('.star').forEach((s, i) => {
    s.classList.toggle('lit', i < val);
  });
}

// ── Filtering ───────────────────────────────────────────
function filtered() {
  return movies.filter(m => {
    const matchTab = activeTab === 'all' || m.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      m.title.toLowerCase().includes(q) ||
      (m.genre || '').toLowerCase().includes(q) ||
      (m.director || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });
}

// ── Render ──────────────────────────────────────────────
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

function render() {
  const list = filtered();
  grid.innerHTML = '';

  if (list.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  list.forEach(m => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const posterHTML = m.posterUrl
      ? `<img class="card-poster-img" src="${m.posterUrl}" alt="${esc(m.title)}" loading="lazy" />`
      : `<div class="card-poster-emoji">${posterEmoji(m.title)}</div>`;

    card.innerHTML = `
      <div class="card-poster">${posterHTML}</div>
      <span class="badge badge-${m.status}">${m.status === 'watched' ? '✓ Watched' : '⏳ Watchlist'}</span>
      <div class="card-title">${esc(m.title)}</div>
      <div class="card-meta">
        ${m.year ? `<span>${m.year}</span>` : ''}
        ${m.genre ? `<span>${esc(m.genre)}</span>` : ''}
        ${m.director ? `<span>Dir. ${esc(m.director)}</span>` : ''}
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
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Modal helpers ───────────────────────────────────────
function openModal(movie = null) {
  editingId = movie ? movie.id : null;
  tmdbSelection = null;
  modalTitle.textContent = movie ? 'Edit Movie' : 'Add Movie';

  // Reset TMDB UI
  tmdbQuery.value = '';
  tmdbQuery.disabled = false;
  tmdbSelected.classList.add('hidden');
  hideDropdown();
  tmdbError.classList.add('hidden');

  document.getElementById('f-title').value    = movie?.title    || '';
  document.getElementById('f-year').value     = movie?.year     || '';
  document.getElementById('f-genre').value    = movie?.genre    || '';
  document.getElementById('f-director').value = movie?.director || '';
  document.getElementById('f-status').value   = movie?.status   || 'watchlist';
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
  tmdbSelection = null;
  hideDropdown();
}

function toggleRatingLabel() {
  const status = document.getElementById('f-status').value;
  ratingLabel.classList.toggle('hidden', status !== 'watched');
}

// ── Events ──────────────────────────────────────────────
addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.getElementById('f-status').addEventListener('change', () => {
  toggleRatingLabel();
  buildStars();
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const posterUrl = tmdbSelection?.poster_path
    ? POSTER_BASE + tmdbSelection.poster_path
    : (editingId ? movies.find(m => m.id === editingId)?.posterUrl || '' : '');

  const data = {
    title,
    year:      document.getElementById('f-year').value     || '',
    genre:     document.getElementById('f-genre').value    || '',
    director:  document.getElementById('f-director').value || '',
    status:    document.getElementById('f-status').value,
    notes:     document.getElementById('f-notes').value    || '',
    rating:    document.getElementById('f-status').value === 'watched' ? selectedRating : 0,
    posterUrl,
    tmdbId:    tmdbSelection?.id || (editingId ? movies.find(m => m.id === editingId)?.tmdbId : null),
  };

  if (editingId) {
    const idx = movies.findIndex(m => m.id === editingId);
    if (idx !== -1) movies[idx] = { ...movies[idx], ...data };
  } else {
    movies.unshift({ id: genId(), addedAt: Date.now(), ...data });
  }

  save();
  render();
  closeModal();
});

// Tab buttons
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    render();
  });
});

// Search
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  render();
});

// Card actions (event delegation)
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
      save();
      render();
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

confirmCancel.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  pendingDeleteId = null;
});

confirmOk.addEventListener('click', () => {
  if (pendingDeleteId) {
    movies = movies.filter(m => m.id !== pendingDeleteId);
    save();
    render();
  }
  confirmModal.classList.add('hidden');
  pendingDeleteId = null;
});

confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) {
    confirmModal.classList.add('hidden');
    pendingDeleteId = null;
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    confirmModal.classList.add('hidden');
  }
});

// ── Seed data (first run) ────────────────────────────────
if (movies.length === 0) {
  movies = [
    { id: genId(), title: 'Inception', year: '2010', genre: 'Sci-Fi, Thriller', director: 'Christopher Nolan', status: 'watched', rating: 9, notes: 'Mind-bending. The spinning top...', posterUrl: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', addedAt: Date.now() },
    { id: genId(), title: 'The Grand Budapest Hotel', year: '2014', genre: 'Comedy, Drama', director: 'Wes Anderson', status: 'watched', rating: 8, notes: 'Gorgeous cinematography and colors.', posterUrl: 'https://image.tmdb.org/t/p/w200/nX5XotM9yprCKarRFDtgpaKzkjr.jpg', addedAt: Date.now() },
    { id: genId(), title: 'Dune: Part Two', year: '2024', genre: 'Sci-Fi', director: 'Denis Villeneuve', status: 'watchlist', rating: 0, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', addedAt: Date.now() },
    { id: genId(), title: 'Spirited Away', year: '2001', genre: 'Animation, Fantasy', director: 'Hayao Miyazaki', status: 'watched', rating: 10, notes: 'A masterpiece of imagination.', posterUrl: 'https://image.tmdb.org/t/p/w200/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', addedAt: Date.now() },
    { id: genId(), title: 'Everything Everywhere All at Once', year: '2022', genre: 'Action, Sci-Fi', director: 'Daniels', status: 'watchlist', rating: 0, notes: '', posterUrl: 'https://image.tmdb.org/t/p/w200/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg', addedAt: Date.now() },
  ];
  save();
}

render();
