(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function renderProfileHtml(ctx = {}) {
    const {
      movies = [], watched = [], watchlist = [], totalMins = 0, avgRating = null,
      byType = [], topGenres = [], topCountries = [], ratingDist = [], recent = [],
      backups = [], health = null, displayName = '', initial = '', currentUser = null,
      sharingEnabled = false, currentSyncState = '', currentSyncTitle = '', maxGenre = 1,
      maxCountry = 1, maxRating = 1, esc, formatTimeSpent, renderBarChart,
      profileModel, compareLibraryBackup, THEME_PRESETS, BG_PRESETS, GLASS_PRESETS,
      GLASS_LABELS, ACCENT_PRESETS, DENSITY_OPTIONS, POSTERS_OPTIONS, ORBS_OPTIONS,
      MOTION_OPTIONS, NOTIF_OPTIONS, CALENDAR_WATCHED_OPTIONS,
    } = ctx;

  return `
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
            <div class="appearance-row">
              <div class="appearance-label">Calendar watched episodes</div>
              <div class="pill-group" data-pref="calendarWatched">
                ${CALENDAR_WATCHED_OPTIONS.map(name => {
                  const current = localStorage.getItem('cinetrack_calendar_watched') || 'dim';
                  const label = name === 'hide' ? 'Hide' : name === 'dim' ? 'Dim today' : 'Show today';
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


  }

  root.profileView = { renderProfileHtml };
})();
