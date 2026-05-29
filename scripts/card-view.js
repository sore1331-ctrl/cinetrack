(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function renderLibraryCard(entry, options = {}) {
    const {
      checked = false,
      airingToday = false,
      mutationDisabled = '',
      cardView = {},
      esc = value => String(value ?? ''),
      starsHTML = () => '',
    } = options;

    const isTV = cardView.isTV;
    const titleLabel = esc(entry.title);
    const infoUrl = cardView.infoUrl;
    const runtimeStr = cardView.runtime;
    const episodeState = cardView.episode || {};
    const fallbackPosterHTML = `<div class="card-poster-emoji">${cardView.fallbackPosterLabel}</div>`;
    const posterHTML = entry.posterUrl
      ? `${fallbackPosterHTML}<img class="card-poster-img" src="${esc(entry.posterUrl)}" alt="${titleLabel}" loading="lazy" onerror="this.remove()" />`
      : fallbackPosterHTML;

    const epHTML = (cardView.isShow && episodeState.total > 0)
      ? `<div class="ep-progress" title="${esc(episodeState.title)}">
           <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${episodeState.pct}%"></div></div>
           <div class="ep-progress-label">${episodeState.label}</div>
         </div>`
      : '';

    const epIncBtn = cardView.primaryAction?.type === 'episode'
      ? `<button class="btn-sm btn-ep-inc" data-ep-inc="${entry.id}" title="${cardView.primaryAction.title}"${mutationDisabled}>
           <span class="lbl-md lbl-lg">${cardView.primaryAction.labelMd}</span><span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
         </button>`
      : '';

    const toggleActionLabel = cardView.primaryAction?.title || '';
    const primaryActionHTML = epIncBtn || ((cardView.primaryAction?.type === 'toggle') ? `
        <button class="btn-sm btn-primary-action" data-toggle="${entry.id}" title="${toggleActionLabel} ${titleLabel}" aria-label="${toggleActionLabel} ${titleLabel}"${mutationDisabled}>
          <span class="lbl-lg">${cardView.primaryAction.labelLg}</span>
          <span class="lbl-md">${cardView.primaryAction.labelMd}</span>
          <span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
        </button>` : '');
    const actionRowClass = primaryActionHTML ? 'card-actions' : 'card-actions card-actions-compact';
    const planLabel = entry.plannedWatchDate ? 'Reschedule' : 'Plan';
    const clearPlanHTML = entry.plannedWatchDate
      ? `<button type="button" class="card-menu-item" data-clear-plan="${entry.id}" role="menuitem"${mutationDisabled}>Clear plan</button>`
      : '';

    const hoverInfoParts = [
      entry.genre && `<div class="chi-genre">${esc(entry.genre)}</div>`,
      entry.director && `<div class="chi-dir">${isTV ? 'Created by' : 'Dir.'} ${esc(entry.director)}</div>`,
      entry.country && `<div class="chi-loc">🌍 ${esc(entry.country)}</div>`,
    ].filter(Boolean);
    const hoverInfoHTML = hoverInfoParts.length
      ? `<div class="card-hover-info">${hoverInfoParts.join('')}</div>`
      : '';

    return `
      <div class="card-poster">
        ${posterHTML}
        ${hoverInfoHTML}
        <label class="card-checkbox" title="Select">
          <input type="checkbox" data-check="${entry.id}" ${checked ? 'checked' : ''}${mutationDisabled} />
          <span class="card-checkbox-box"></span>
        </label>
      </div>
      <span class="badge badge-${entry.status} card-status-badge">
        ${cardView.statusLabel}
      </span>
      ${airingToday ? `<span class="card-airing-pill" title="${entry.mediaType === 'movie' ? 'Theatrical release today' : 'New episode airs today'}">● Today</span>` : ''}
      ${infoUrl
        ? `<a class="card-title card-title-link" href="${infoUrl}" target="_blank" rel="noopener noreferrer" title="${titleLabel}">${titleLabel}</a>`
        : `<div class="card-title" title="${titleLabel}">${titleLabel}</div>`}
      <div class="card-meta">
        ${entry.year ? `<span class="meta-year">${entry.year}</span>` : ''}
        ${entry.country ? `<span class="meta-country">🌍 ${esc(entry.country)}</span>` : ''}
        ${entry.genre ? `<span class="meta-genre">${esc(entry.genre)}</span>` : ''}
        ${entry.director ? `<span class="meta-director">${isTV ? 'Created by' : 'Dir.'} ${esc(entry.director)}</span>` : ''}
        ${runtimeStr ? `<span class="meta-runtime">⏱ ${runtimeStr}</span>` : ''}
      </div>
      ${entry.rating ? starsHTML(entry.rating) : ''}
      ${epHTML}
      ${entry.notes ? `<div class="card-notes">${esc(entry.notes)}</div>` : ''}
      <div class="${actionRowClass}">
        <button class="btn-sm btn-icon" data-edit="${entry.id}" title="Edit ${titleLabel}" aria-label="Edit ${titleLabel}"${mutationDisabled}>
          ✎
        </button>
        ${primaryActionHTML}
        <div class="card-more-wrap">
          <button class="btn-sm btn-icon card-more-btn" data-action-menu="${entry.id}" title="More actions for ${titleLabel}" aria-label="More actions for ${titleLabel}" aria-expanded="false"${mutationDisabled}>⋯</button>
          <div class="card-action-menu" role="menu" hidden>
            <button type="button" class="card-menu-item" data-plan="${entry.id}" role="menuitem"${mutationDisabled}>${planLabel}</button>
            ${clearPlanHTML}
            <button type="button" class="card-menu-item danger" data-delete="${entry.id}" role="menuitem"${mutationDisabled}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  root.cardView = { renderLibraryCard };
})();
