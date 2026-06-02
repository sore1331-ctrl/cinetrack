(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  const SETUP_SQL_URL = '/SUPABASE_SETUP.sql';
  const SETUP_SQL_FALLBACK = '-- Could not load SUPABASE_SETUP.sql. Open the project root copy and run that full file in Supabase SQL Editor.';
  let setupSqlPromise = null;

  function loadSetupSql() {
    if (!setupSqlPromise) {
      setupSqlPromise = fetch(SETUP_SQL_URL, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`Setup SQL returned ${response.status}`);
          return response.text();
        })
        .catch(() => SETUP_SQL_FALLBACK);
    }
    return setupSqlPromise;
  }

  function createCommunityController(options = {}) {
    const {
      documentRef = document,
      communityView,
      getCurrentUser = () => null,
      getOfflineMode = () => false,
      getSharingEnabled = () => false,
      getMovies = () => [],
      getSupabaseAccessToken = async () => '',
      fetchJsonWithTimeout,
      logAppError = () => {},
      esc = value => String(value || ''),
      actualWatchedMinutes = () => 0,
      formatTimeSpent = () => '',
      renderBarChart = () => '',
    } = options;

    function openProfile(profile, userMovies) {
      const body = documentRef.getElementById('community-profile-body');
      const modal = documentRef.getElementById('community-profile-modal');
      if (!body || !modal) return;

      body.innerHTML = communityView.profileModalHtml(profile, userMovies, {
        myMovies: getMovies(),
        esc,
        actualWatchedMinutes,
        formatTimeSpent,
        renderBarChart,
      });
      modal.classList.remove('hidden');
    }

    documentRef.getElementById('community-profile-close')?.addEventListener('click', () => {
      documentRef.getElementById('community-profile-modal')?.classList.add('hidden');
    });

    documentRef.getElementById('community-profile-modal')?.addEventListener('click', e => {
      if (e.target.id === 'community-profile-modal') {
        e.currentTarget.classList.add('hidden');
      }
    });

    async function renderCommunity() {
      const sharingToggle = documentRef.getElementById('sharing-toggle');
      if (sharingToggle) sharingToggle.checked = getSharingEnabled();

      const communityGrid = documentRef.getElementById('community-grid');
      if (!communityGrid) return;

      const currentUser = getCurrentUser();
      if (!currentUser || getOfflineMode()) {
        communityGrid.innerHTML = '<p class="community-empty">Sign in to see the community.</p>';
        return;
      }

      communityGrid.innerHTML = '<p class="community-loading">Loading community...</p>';

      const slowTimer = setTimeout(() => {
        if (!communityGrid.textContent.includes('Loading community')) return;
        communityGrid.innerHTML = '<p class="community-loading">Still connecting to Supabase... this can take a moment on a cold project.</p>';
      }, 8000);

      try {
        const token = await getSupabaseAccessToken();
        if (!token) throw new Error('Missing Supabase session token. Sign out and sign in again.');

        const { response: communityRes, data: community } = await fetchJsonWithTimeout(
          `/api/community?currentUserId=${encodeURIComponent(currentUser.id)}`,
          {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` },
          },
          'Community load'
        );
        if (!communityRes.ok) throw new Error(community?.error || `Community API failed (${communityRes.status})`);

        const sharingProfiles = community.profiles || [];

        if (!sharingProfiles?.length) {
          communityGrid.innerHTML = `
            <div class="community-empty-state">
              <div class="community-empty-icon">&#128101;</div>
              <p>No one is sharing their watchlist yet.</p>
              <p class="community-empty-hint">Enable sharing above to let others see what you're watching!</p>
            </div>`;
          return;
        }

        const { dataMap, cards: cardData } = communityView.cardData(
          sharingProfiles,
          community.sharedData || [],
          getMovies()
        );

        const controlsEl = documentRef.getElementById('community-controls');
        if (controlsEl) controlsEl.classList.remove('hidden');

        const renderCards = () => {
          const q = (documentRef.getElementById('community-search')?.value || '').trim().toLowerCase();
          const sort = documentRef.getElementById('community-sort')?.value || 'recent';
          const list = communityView.filterCards(cardData, { query: q, sort });
          communityGrid.innerHTML = communityView.cardsHtml(list, { esc });
        };

        renderCards();

        const searchEl = documentRef.getElementById('community-search');
        const sortEl = documentRef.getElementById('community-sort');
        if (searchEl) searchEl.oninput = renderCards;
        if (sortEl) sortEl.onchange = renderCards;
        communityGrid.onclick = e => {
          const card = e.target.closest('.community-card[data-user-id]');
          if (!card) return;
          const userId = card.dataset.userId;
          const profile = sharingProfiles.find(p => p.user_id === userId);
          const userMovies = dataMap[userId] || [];
          if (profile) openProfile(profile, userMovies);
        };
      } catch (e) {
        logAppError('community.load', e);
        let diagnosis = '';
        try {
          const hr = await fetch('/api/supabase-health', { cache: 'no-store' });
          const health = await hr.json();
          if (!health.env?.hasUrl || !health.env?.hasAnonKey) {
            diagnosis = '<p class="setup-error-body"><strong>Diagnosis:</strong> Vercel is missing <code>SUPABASE_URL</code> or <code>SUPABASE_ANON_KEY</code>.</p>';
          } else if (health.reachable) {
            diagnosis = '<p class="setup-error-body"><strong>Diagnosis:</strong> Supabase config is present and reachable. The failed query above is probably table/RLS related.</p>';
          } else {
            diagnosis = `<p class="setup-error-body"><strong>Diagnosis:</strong> Supabase config exists, but the server could not reach Supabase${health.error ? ` (${esc(health.error)})` : ''}.</p>`;
          }
        } catch {}
        const setupSql = await loadSetupSql();
        communityGrid.innerHTML = `
          <div class="supabase-setup-error">
            <p class="setup-error-title">&#9888;&#65039; Community failed to load</p>
            <p class="setup-error-body"><strong>Error:</strong> ${esc(String(e?.message || e))}</p>
            ${diagnosis}
            <p class="setup-error-body">If this mentions RLS or missing tables, run the SQL below in Supabase SQL Editor.</p>
            <pre class="setup-sql-block" id="setup-sql-pre">${esc(setupSql)}</pre>
            <button class="setup-copy-btn" id="setup-copy-btn">Copy SQL</button>
          </div>`;
        documentRef.getElementById('setup-copy-btn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(setupSql).then(() => {
            const btn = documentRef.getElementById('setup-copy-btn');
            if (btn) {
              btn.textContent = 'Copied!';
              setTimeout(() => { btn.textContent = 'Copy SQL'; }, 2000);
            }
          });
        });
      } finally {
        clearTimeout(slowTimer);
      }
    }

    return {
      openProfile,
      renderCommunity,
      loadSetupSql,
    };
  }

  root.communityController = { createCommunityController, loadSetupSql };
})();
