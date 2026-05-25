(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function compatibility(myMovies = [], theirMovies = []) {
    const keyOf = m => m?.tmdbId ? `${m.tmdbId}:${m.mediaType}` : null;
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
        (sum, key) => sum + Math.abs((myWatched.get(key).rating || 0) - (theirWatched.get(key).rating || 0)),
        0
      ) / bothRated.length;
      ratingMatch = Math.round((1 - avgDiff / 10) * 100);
    }

    const combined = ratingMatch != null
      ? Math.round(overlap * 0.4 + ratingMatch * 0.6)
      : overlap;
    return { overlap, ratingMatch, combined, sharedCount: sharedKeys.length };
  }

  function cardData(profiles = [], sharedData = [], myMovies = []) {
    const dataMap = Object.fromEntries(
      (sharedData || []).map(row => [row.user_id, Array.isArray(row.movies) ? row.movies : []])
    );
    const cards = (profiles || []).map(profile => {
      const userMovies = dataMap[profile.user_id] || [];
      const watched = userMovies.filter(m => m.status === 'watched');
      const inProgress = userMovies.filter(m => m.status === 'in_progress');
      const watchlist = userMovies.filter(m => m.status === 'watchlist');
      return {
        userId: profile.user_id,
        username: profile.username || 'Anonymous',
        watched,
        inProgress,
        watchlist,
        lastActive: userMovies.reduce((max, m) => Math.max(max, m.addedAt || 0), 0),
        compat: compatibility(myMovies, userMovies).combined,
      };
    });
    return { dataMap, cards };
  }

  function filterCards(cards = [], { query = '', sort = 'recent' } = {}) {
    const q = String(query || '').trim().toLowerCase();
    let list = cards.slice();
    if (q) list = list.filter(card => card.username.toLowerCase().includes(q));
    list.sort((a, b) => {
      switch (sort) {
        case 'watched': return b.watched.length - a.watched.length;
        case 'alpha': return a.username.localeCompare(b.username);
        case 'compat': return (b.compat || 0) - (a.compat || 0);
        default: return b.lastActive - a.lastActive;
      }
    });
    return list;
  }

  function topGenres(watched = []) {
    const counts = {};
    watched.forEach(m => String(m.genre || '').split(',').map(g => g.trim()).filter(Boolean)
      .forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(entry => entry[0]).join(', ');
  }

  function cardsHtml(cards = [], { esc } = {}) {
    if (!cards.length) return '<p class="community-empty">No matching users.</p>';
    return cards.map(card => {
      const initial = card.username[0].toUpperCase();
      const genres = topGenres(card.watched);
      const posters = card.watched
        .filter(m => m.posterUrl)
        .slice(0, 6)
        .map(m => `<img class="community-poster" src="${esc(m.posterUrl)}" alt="${esc(m.title)}" title="${esc(m.title)}" loading="lazy" />`)
        .join('');
      const compatBadge = card.compat != null
        ? `<span class="community-compat" title="Compatibility based on shared titles + rating similarity">🎯 ${card.compat}%</span>`
        : '';
      return `
        <div class="community-card" data-user-id="${esc(card.userId)}">
          <div class="community-card-header">
            <div class="community-avatar">${esc(initial)}</div>
            <div class="community-card-info">
              <div class="community-username">${esc(card.username)} ${compatBadge}</div>
              <div class="community-stats-mini">
                <span>✓ ${card.watched.length} watched</span>
                ${card.inProgress.length ? `<span>▶ ${card.inProgress.length} in progress</span>` : ''}
                <span>⏳ ${card.watchlist.length} on list</span>
              </div>
              ${genres ? `<div class="community-genres">${esc(genres)}</div>` : ''}
            </div>
          </div>
          ${posters ? `<div class="community-posters">${posters}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function profileModalHtml(profile, userMovies = [], {
    myMovies = [],
    esc,
    actualWatchedMinutes,
    formatTimeSpent,
    renderBarChart,
  } = {}) {
    const username = profile.username || 'Anonymous';
    const initial = username[0].toUpperCase();
    const watched = userMovies.filter(m => m.status === 'watched');
    const inProgress = userMovies.filter(m => m.status === 'in_progress');
    const watchlist = userMovies.filter(m => m.status === 'watchlist');
    const totalMins = userMovies.reduce((sum, m) => sum + actualWatchedMinutes(m), 0);
    const ratings = watched.filter(m => m.rating > 0).map(m => m.rating);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    const compat = compatibility(myMovies, userMovies);
    const favourites = watched
      .filter(m => (m.rating || 0) >= 1)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, 4);
    const currentlyWatching = inProgress
      .filter(m => (m.mediaType === 'tv' || m.mediaType === 'anime') && (m.totalEpisodes || 0) > 0)
      .map(m => ({ m, pct: Math.round((Math.min(m.watchedEpisodes || 0, m.totalEpisodes) / m.totalEpisodes) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
    const byType = ['movie', 'tv', 'anime'].map(type => ({
      label: type === 'movie' ? '🎬 Films' : type === 'tv' ? '📺 TV Shows' : '🎌 Anime',
      watched: userMovies.filter(m => m.mediaType === type && m.status === 'watched').length,
      inProgress: userMovies.filter(m => m.mediaType === type && m.status === 'in_progress').length,
      watchlist: userMovies.filter(m => m.mediaType === type && m.status === 'watchlist').length,
    })).filter(type => type.watched + type.inProgress + type.watchlist > 0);
    const genreCounts = {};
    watched.forEach(m => String(m.genre || '').split(',').map(g => g.trim()).filter(Boolean)
      .forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
    const countryCounts = {};
    watched.forEach(m => { if (m.country) countryCounts[m.country] = (countryCounts[m.country] || 0) + 1; });
    const topGenresList = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const ratingDist = Array.from({ length: 10 }, (_, i) => {
      const star = 10 - i;
      return [star, ratings.filter(r => r === star).length];
    }).filter(([, count]) => count > 0);
    const recent = [...userMovies].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 8);
    const maxGenre = topGenresList[0]?.[1] || 1;
    const maxCountry = topCountries[0]?.[1] || 1;
    const maxRating = ratingDist[0]?.[1] || 1;

    return `
      <div class="profile-hero">
        <div class="profile-avatar-lg">${esc(initial)}</div>
        <div class="profile-hero-info">
          <div class="profile-display-name">${esc(username)}</div>
          ${compat.combined != null ? `
            <div class="compat-row">
              <span class="compat-badge">🎯 ${compat.combined}% match</span>
              <span class="compat-detail">${compat.sharedCount} shared title${compat.sharedCount === 1 ? '' : 's'}${compat.ratingMatch != null ? ` · ${compat.ratingMatch}% rating similarity` : ''}</span>
            </div>` : '<div class="compat-row"><span class="compat-detail">No shared titles yet</span></div>'}
        </div>
      </div>

      <div class="stats-overview">
        <div class="stat-card"><div class="stat-card-value">${watched.length}</div><div class="stat-card-label">Watched</div></div>
        <div class="stat-card"><div class="stat-card-value">${watchlist.length}</div><div class="stat-card-label">Watchlist</div></div>
        <div class="stat-card" title="Total runtime, prorated by progress on each series"><div class="stat-card-value">${formatTimeSpent(totalMins) || '—'}</div><div class="stat-card-label">Time Spent</div></div>
        <div class="stat-card"><div class="stat-card-value">${avgRating ? '★ ' + avgRating : '—'}</div><div class="stat-card-label">Avg Rating</div></div>
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
            ${byType.map(type => `
              <div class="profile-type-card">
                <div class="profile-type-label">${type.label}</div>
                <div class="profile-type-stats">
                  <span>✓ ${type.watched} watched</span>
                  ${type.inProgress ? `<span>▶ ${type.inProgress} in progress</span>` : ''}
                  <span>⏳ ${type.watchlist} on list</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

      <div class="stats-charts">
        ${topGenresList.length ? `<div class="chart-section"><h3>Top Genres</h3><div class="chart-bars">${renderBarChart(topGenresList, maxGenre, '#e2405a')}</div></div>` : ''}
        ${topCountries.length ? `<div class="chart-section"><h3>Top Countries</h3><div class="chart-bars">${renderBarChart(topCountries, maxCountry, '#3b9eff')}</div></div>` : ''}
        ${ratingDist.length ? `<div class="chart-section chart-section-sm"><h3>Ratings</h3><div class="chart-bars">${renderBarChart(ratingDist.map(([s, c]) => ['★'.repeat(s), c]), maxRating, '#f5a623')}</div></div>` : ''}
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
  }

  root.communityView = {
    compatibility,
    cardData,
    filterCards,
    cardsHtml,
    profileModalHtml,
  };
})();
