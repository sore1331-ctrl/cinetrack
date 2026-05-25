(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function renderCards({
    results = [],
    genreCounts = {},
    scope = 'all',
    model,
    esc,
    externalPosterUrl,
    recommendationInfoUrl,
    dismissedIds = new Set(),
    visibleLimit = 10,
    isTracked = () => false,
    identityFor,
  } = {}) {
    const recs = model.visibleResults(results, {
      scope,
      dismissedIds,
      visibleLimit,
      isTracked,
      identityFor,
    });

    if (!recs.length) {
      return {
        recs,
        html: `
          <div class="recs-heading-row">
            <h3 class="recs-heading">✨ Recommended For You</h3>
            <button class="recs-refresh-btn" id="recs-refresh-btn" title="Re-sample your seeds and re-fetch from TMDB">↻ Refresh</button>
          </div>
          <p class="recs-empty">No new recommendations found — try watching more titles!</p>
        `,
      };
    }

    const { genreLabel, scopeLabel } = model.displayMeta(genreCounts, scope);
    return {
      recs,
      html: `
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
              ? `<a class="rec-poster rec-source-link" href="${esc(infoUrl)}" target="_blank" rel="noopener noreferrer" title="View details">${posterContent}</a>`
              : `<div class="rec-poster">${posterContent}</div>`;
            const title = infoUrl
              ? `<a class="rec-title rec-source-link" href="${esc(infoUrl)}" target="_blank" rel="noopener noreferrer" title="View details">${esc(r.title)}</a>`
              : `<div class="rec-title">${esc(r.title)}</div>`;
            return `
              <div class="rec-card" data-rec-card="${esc(r.id)}">
                <button class="rec-dismiss-btn" data-rec-dismiss="${esc(r.id)}" title="Not interested">✕</button>
                ${poster}
                <div class="rec-info">
                  ${title}
                  ${r.year ? `<div class="rec-year">${esc(r.year)}</div>` : ''}
                  ${r.overview ? `<div class="rec-overview" title="Tap to expand">${esc(r.overview)}</div>` : ''}
                </div>
                <button class="rec-add-btn" data-rec-id="${esc(r.id)}" data-rec-source="${esc(r.source || 'tmdb')}" data-rec-type="${esc(r.media_type)}"
                  data-rec-title="${esc(r.title)}" data-rec-year="${esc(r.year || '')}"
                  data-rec-poster="${esc(r.poster_path || '')}" title="Add to Watchlist">＋ Watchlist</button>
              </div>
            `;
          }).join('')}
        </div>
      `,
    };
  }

  function bindCards(section, {
    onRefresh,
    onDismiss,
    onAdd,
    onTopUp,
    model,
    visibleLimit = 10,
  } = {}) {
    const refreshBtn = section.querySelector('#recs-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        section.innerHTML = '<div class="recs-loading"><span class="recs-spinner"></span> Re-sampling and fetching…</div>';
        onRefresh?.();
      });
    }

    section.onclick = e => {
      if (e.target.closest('#recs-refresh-btn')) return;

      const overview = e.target.closest('.rec-overview');
      if (overview) {
        overview.closest('.rec-card')?.classList.toggle('expanded');
        return;
      }

      const dismissBtn = e.target.closest('.rec-dismiss-btn');
      if (dismissBtn) {
        const id = dismissBtn.dataset.recDismiss;
        onDismiss?.(id);
        const card = section.querySelector(`.rec-card[data-rec-card="${CSS.escape(String(id))}"]`);
        if (card) {
          card.classList.add('rec-card-removing');
          setTimeout(() => {
            card.remove();
            if (!section.querySelector('.rec-card')) {
              section.querySelector('.recs-grid')?.remove();
              section.querySelector('.recs-sub')?.remove();
              section.insertAdjacentHTML('beforeend',
                '<p class="recs-empty">All caught up — dismissed everything for now. Hit ↻ Refresh for a fresh batch.</p>');
            } else if (model.shouldTopUpRecommendations({
              visibleCount: section.querySelectorAll('.rec-card').length,
              visibleLimit,
            })) {
              onTopUp?.();
            }
          }, 200);
        }
        return;
      }

      const btn = e.target.closest('.rec-add-btn');
      if (btn) onAdd?.(btn);
    };
  }

  root.recommendationView = {
    renderCards,
    bindCards,
  };
})();
