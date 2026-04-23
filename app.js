// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'cinetrack_movies';

let movies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeTab = 'all';
let searchQuery = '';
let editingId = null;
let pendingDeleteId = null;
let selectedRating = 0;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── DOM refs ────────────────────────────────────────────
const grid        = document.getElementById('movie-grid');
const emptyMsg    = document.getElementById('empty-msg');
const searchInput = document.getElementById('search-input');
const addBtn      = document.getElementById('add-btn');
const modal       = document.getElementById('modal');
const modalTitle  = document.getElementById('modal-title');
const form        = document.getElementById('movie-form');
const cancelBtn   = document.getElementById('cancel-btn');
const ratingLabel = document.getElementById('rating-label');
const starRow     = document.getElementById('star-row');
const confirmModal  = document.getElementById('confirm-modal');
const confirmMsg    = document.getElementById('confirm-msg');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk     = document.getElementById('confirm-ok');

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
  const filled = '★'.repeat(rating);
  const empty  = '☆'.repeat(10 - rating);
  return `<span class="card-stars" title="${rating}/10">${filled}${empty}</span>`;
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
    card.innerHTML = `
      <div class="card-poster">${posterEmoji(m.title)}</div>
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
          ${m.status === 'watched' ? 'Move to Watchlist' : 'Mark Watched'}
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
  modalTitle.textContent = movie ? 'Edit Movie' : 'Add Movie';

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
  document.getElementById('f-title').focus();
}

function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
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

  const data = {
    title,
    year:     document.getElementById('f-year').value     || '',
    genre:    document.getElementById('f-genre').value    || '',
    director: document.getElementById('f-director').value || '',
    status:   document.getElementById('f-status').value,
    notes:    document.getElementById('f-notes').value    || '',
    rating:   document.getElementById('f-status').value === 'watched' ? selectedRating : 0,
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

// Keyboard: Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    confirmModal.classList.add('hidden');
  }
});

// ── Seed data (first run) ────────────────────────────────
if (movies.length === 0) {
  movies = [
    { id: genId(), title: 'Inception', year: '2010', genre: 'Sci-Fi, Thriller', director: 'Christopher Nolan', status: 'watched', rating: 9, notes: 'Mind-bending. The spinning top...', addedAt: Date.now() },
    { id: genId(), title: 'The Grand Budapest Hotel', year: '2014', genre: 'Comedy, Drama', director: 'Wes Anderson', status: 'watched', rating: 8, notes: 'Gorgeous cinematography and colors.', addedAt: Date.now() },
    { id: genId(), title: 'Dune: Part Two', year: '2024', genre: 'Sci-Fi', director: 'Denis Villeneuve', status: 'watchlist', rating: 0, notes: '', addedAt: Date.now() },
    { id: genId(), title: 'Spirited Away', year: '2001', genre: 'Animation, Fantasy', director: 'Hayao Miyazaki', status: 'watched', rating: 10, notes: 'A masterpiece of imagination.', addedAt: Date.now() },
    { id: genId(), title: 'Everything Everywhere All at Once', year: '2022', genre: 'Action, Sci-Fi', director: 'Daniels', status: 'watchlist', rating: 0, notes: '', addedAt: Date.now() },
  ];
  save();
}

render();
