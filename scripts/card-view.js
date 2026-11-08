(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function renderLibraryCard(entry, options = {}) {
    const {
      checked = false,
      airingToday = false,
      behind = 0,
      behindLabel = '',
      airedPct = 0,
      airingEpisode = '',
      airingEpisodeName = '',
      journal = null,
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

    const behindCount = Math.max(0, Number(behind) || 0);
    // Amber segment fills the gap between what's watched and what's aired.
    const airedGap = Math.max(0, Math.min(100, Number(airedPct) || 0) - episodeState.pct);
    const airedHTML = airedGap > 0
      ? `<div class="ep-progress-aired" style="width:${airedGap}%"></div>`
      : '';
    const behindHTML = behindCount > 0
      ? `<span class="ep-behind" title="${behindCount} aired episode${behindCount === 1 ? '' : 's'} you haven't watched yet${behindLabel ? `: ${esc(behindLabel)}` : ''}"> · ${behindCount} behind${behindLabel ? ` (${esc(behindLabel)})` : ''}</span>`
      : '';
    const airingPillText = airingEpisode ? `● ${esc(airingEpisode)} today` : '● Today';
    const airingPillTitle = entry.mediaType === 'movie'
      ? 'Theatrical release today'
      : `${airingEpisode ? `${airingEpisode}${airingEpisodeName ? ` · ${airingEpisodeName}` : ''}` : 'New episode'} airs today`;
    const epHTML = (cardView.isShow && episodeState.total > 0)
      ? `<div class="ep-progress" title="${esc(episodeState.title)}">
           <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${episodeState.pct}%"></div>${airedHTML}</div>
           <div class="ep-progress-label">${episodeState.label}${behindHTML}</div>
         </div>`
      : '';

    // Journal style: ticks (one per episode of the current season), a short
    // count, and the next airing. Hidden in the Glass style.
    const journalTicks = journal
      ? (journal.ticks
        ? `<div class="j-ticks" aria-hidden="true">${Array.from({ length: journal.total }, (_, i) =>
            `<i class="${i < journal.watched ? 'w' : (i < journal.aired ? 'a' : '')}"></i>`).join('')}</div>`
        : `<div class="j-bar" aria-hidden="true"><u style="left:${Math.round(journal.watched / journal.total * 100)}%;width:${Math.round((journal.aired - journal.watched) / journal.total * 100)}%"></u><i style="width:${Math.round(journal.watched / journal.total * 100)}%"></i></div>`)
      : '';
    const journalHTML = journal
      ? `<div class="j-progress">${journalTicks}
           <div class="j-count">${esc(journal.count)}${journal.behind ? ` · <b>${journal.behind} behind</b>` : (journal.upToDate ? ' · up to date' : '')}</div>
           ${journal.next ? `<div class="j-next">${esc(journal.next)}</div>` : ''}
         </div>`
      : '';

    const epIncBtn = cardView.primaryAction?.type === 'episode'
      ? `<button class="btn-sm btn-ep-inc" data-ep-inc="${entry.id}" title="${cardView.primaryAction.title}"${mutationDisabled}>
           <span class="lbl-md lbl-lg">${cardView.primaryAction.labelMd}</span><span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
           <span class="j-text">${esc(journal?.incLabel || '+1 ep')}</span>
         </button>`
      : '';

    const toggleActionLabel = cardView.primaryAction?.title || '';
    const primaryActionHTML = epIncBtn || ((cardView.primaryAction?.type === 'toggle') ? `
        <button class="btn-sm btn-primary-action" data-toggle="${entry.id}" title="${toggleActionLabel} ${titleLabel}" aria-label="${toggleActionLabel} ${titleLabel}"${mutationDisabled}>
          <span class="lbl-lg">${cardView.primaryAction.labelLg}</span>
          <span class="lbl-md">${cardView.primaryAction.labelMd}</span>
          <span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
          <span class="j-text">${toggleActionLabel === 'Mark watched' ? 'Mark watched' : 'Start'}</span>
        </button>` : '')
      || ((cardView.primaryAction?.type === 'uptodate') ? `
        <span class="btn-sm card-uptodate" role="status" title="${cardView.primaryAction.title}">
          <span class="lbl-lg">${cardView.primaryAction.labelLg}</span>
          <span class="lbl-md">${cardView.primaryAction.labelMd}</span>
          <span class="lbl-sm">${cardView.primaryAction.labelSm}</span>
          <span class="j-text">Up to date</span>
        </span>` : '');
    const actionRowClass = primaryActionHTML ? 'card-actions' : 'card-actions card-actions-compact';
    const planLabel = entry.plannedWatchDate ? 'Reschedule' : 'Plan';
    const clearPlanHTML = entry.plannedWatchDate
      ? `<button type="button" class="card-menu-item" data-clear-plan="${entry.id}" role="menuitem"${mutationDisabled}>Clear plan</button>`
      : '';

    // One stable fact line — "2010 · United States · 2h 28m" — instead of the
    // old inline-wrapping stream that laid out differently on every card. The
    // runtime keeps its own span so the small grid can hide it.
    const primaryFacts = [entry.year, entry.country].filter(Boolean).map(esc).join(' · ');
    const runtimeHTML = runtimeStr ? `<span class="meta-runtime">${primaryFacts ? ' · ' : ''}${runtimeStr}</span>` : '';
    const metaPrimaryHTML = (primaryFacts || runtimeHTML)
      ? `<span class="meta-primary">${primaryFacts}${runtimeHTML}</span>`
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
      ${airingToday ? `<span class="card-airing-pill" title="${esc(airingPillTitle)}">${airingPillText}</span>` : ''}
      ${infoUrl
        ? `<a class="card-title card-title-link" href="${esc(infoUrl)}" target="_blank" rel="noopener noreferrer" title="${titleLabel}">${titleLabel}</a>`
        : `<div class="card-title" title="${titleLabel}">${titleLabel}</div>`}
      <div class="card-meta">
        ${metaPrimaryHTML}
        ${entry.genre ? `<span class="meta-genre">${esc(entry.genre)}</span>` : ''}
        ${entry.director ? `<span class="meta-director">${isTV ? 'Created by' : 'Dir.'} ${esc(entry.director)}</span>` : ''}
      </div>
      ${entry.rating ? starsHTML(entry.rating) : ''}
      ${epHTML}
      ${journalHTML}
      ${entry.notes ? `<div class="card-notes">${esc(entry.notes)}</div>` : ''}
      <div class="${actionRowClass}">
        <button class="btn-sm btn-icon" data-edit="${entry.id}" title="Edit ${titleLabel}" aria-label="Edit ${titleLabel}"${mutationDisabled}>
          <span class="j-glass-only">✎</span><span class="j-text">Edit</span>
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
