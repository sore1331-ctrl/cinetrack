(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  const SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  sharing_enabled boolean DEFAULT false,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sharing_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  movies jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS movies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "user_data_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_shared" ON public.user_data;
DROP POLICY IF EXISTS "Community read shared data" ON public.user_data;
DROP POLICY IF EXISTS "Users manage their own data" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_insert_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_update_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_delete_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_shared" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_authenticated" ON public.user_data;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "user_data_select_authenticated" ON public.user_data FOR SELECT TO authenticated USING (
  ((select auth.uid()) = user_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_data.user_id
      AND p.sharing_enabled = true
  )
);
CREATE POLICY "user_data_insert_own" ON public.user_data FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_data_update_own" ON public.user_data FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_data_delete_own" ON public.user_data FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;`;

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
        communityGrid.innerHTML = `
          <div class="supabase-setup-error">
            <p class="setup-error-title">&#9888;&#65039; Community failed to load</p>
            <p class="setup-error-body"><strong>Error:</strong> ${esc(String(e?.message || e))}</p>
            ${diagnosis}
            <p class="setup-error-body">If this mentions RLS or missing tables, run the SQL below in Supabase SQL Editor.</p>
            <pre class="setup-sql-block" id="setup-sql-pre">${esc(SETUP_SQL)}</pre>
            <button class="setup-copy-btn" id="setup-copy-btn">Copy SQL</button>
          </div>`;
        documentRef.getElementById('setup-copy-btn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(SETUP_SQL).then(() => {
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
      setupSql: SETUP_SQL,
    };
  }

  root.communityController = { createCommunityController, SETUP_SQL };
})();
