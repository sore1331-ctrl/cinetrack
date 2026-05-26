(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function createAuthController(options = {}) {
    const {
      documentRef = document,
      getSupabase,
      profileModel,
      showToast = () => {},
      setSyncState = () => {},
      updateCountryDropdown = () => {},
      render = () => {},
      switchView = () => {},
      renderProfile = () => {},
      setCurrentPage = () => {},
      getActiveView = () => 'content',
      getCurrentUser = () => null,
      setOfflineMode = () => {},
      getCurrentUsername = () => null,
      setCurrentUsername = () => {},
      getSharingEnabled = () => false,
      setSharingEnabled = () => {},
      currentUserDisplayName = () => 'You',
      userInitial = name => String(name || 'You').slice(0, 1).toUpperCase(),
      setStoredUsername = () => {},
      saveProfile = async () => ({ ok: true }),
    } = options;

    const authOverlay  = documentRef.getElementById('auth-overlay');
    const authLoading  = documentRef.getElementById('auth-loading');
    const authFormWrap = documentRef.getElementById('auth-form-wrap');
    const authForm     = documentRef.getElementById('auth-form');
    const authEmail    = documentRef.getElementById('auth-email');
    const authPassword = documentRef.getElementById('auth-password');
    const authError    = documentRef.getElementById('auth-error');
    const authSuccess  = documentRef.getElementById('auth-success');
    const authSubmit   = documentRef.getElementById('auth-submit');
    const authOffline  = documentRef.getElementById('auth-offline');
    const userMenu     = documentRef.getElementById('user-menu');
    const userAvatar   = documentRef.getElementById('user-avatar');
    const userEmailEl  = documentRef.getElementById('user-email');
    const userDropdown = documentRef.getElementById('user-dropdown');
    const avatarButton = documentRef.getElementById('user-avatar-btn');
    const usernameForm = documentRef.getElementById('username-form');
    const usernameInput = documentRef.getElementById('username-input');
    const usernameEditButton = documentRef.getElementById('username-edit-btn');
    const usernameSaveButton = documentRef.getElementById('username-save-btn');
    const sharingToggle = documentRef.getElementById('sharing-toggle');

    let authMode = 'signin';

    function hideMessage(el) {
      el?.classList.add('hidden');
    }

    function setSubmitText() {
      if (authSubmit) authSubmit.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
    }

    function showAuthOverlay(mode = 'form') {
      authOverlay?.classList.remove('hidden');
      if (mode === 'loading') {
        authLoading?.classList.remove('hidden');
        authFormWrap?.classList.add('hidden');
      } else {
        authLoading?.classList.add('hidden');
        authFormWrap?.classList.remove('hidden');
      }
    }

    function hideAuthOverlay() {
      authOverlay?.classList.add('hidden');
    }

    function closeUsernameForm() {
      usernameForm?.classList.add('hidden');
    }

    function updateUserMenu() {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        userMenu?.classList.add('hidden');
        return;
      }
      userMenu?.classList.remove('hidden');
      const displayName = currentUserDisplayName();
      if (userAvatar) userAvatar.textContent = userInitial(displayName);
      if (userEmailEl) userEmailEl.textContent = currentUser.email;
      const usernameDisplay = documentRef.getElementById('username-display');
      if (usernameDisplay) {
        const username = getCurrentUsername();
        usernameDisplay.textContent = username || 'Set username';
        usernameDisplay.classList.toggle('username-placeholder', !username);
      }
      if (sharingToggle) sharingToggle.checked = getSharingEnabled();
    }

    documentRef.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        documentRef.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        authMode = btn.dataset.tab;
        setSubmitText();
        hideMessage(authError);
        hideMessage(authSuccess);
      });
    });

    authForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const sb = getSupabase();
      const email = authEmail?.value.trim() || '';
      const password = authPassword?.value || '';
      hideMessage(authError);
      hideMessage(authSuccess);
      if (authSubmit) {
        authSubmit.disabled = true;
        authSubmit.textContent = '...';
      }

      try {
        if (authMode === 'signin') {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          if (authSuccess) {
            authSuccess.textContent = 'Account created! Check your email to confirm, then sign in.';
            authSuccess.classList.remove('hidden');
          }
          if (authSubmit) {
            authSubmit.disabled = false;
            authSubmit.textContent = 'Create Account';
          }
          return;
        }
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.classList.remove('hidden');
        }
      }
      if (authSubmit) {
        authSubmit.disabled = false;
        setSubmitText();
      }
    });

    authOffline?.addEventListener('click', () => {
      setOfflineMode(true);
      hideAuthOverlay();
      setSyncState('error', 'Offline mode - changes saved locally only');
      updateCountryDropdown();
      render();
    });

    avatarButton?.addEventListener('click', e => {
      e.stopPropagation();
      userDropdown?.classList.toggle('hidden');
    });

    documentRef.addEventListener('click', e => {
      if (!e.target.closest('#user-menu')) {
        userDropdown?.classList.add('hidden');
        closeUsernameForm();
      }
    });

    usernameEditButton?.addEventListener('click', e => {
      e.stopPropagation();
      usernameForm?.classList.toggle('hidden');
      if (!usernameForm?.classList.contains('hidden') && usernameInput) {
        usernameInput.value = getCurrentUsername() || '';
        usernameInput.focus();
      }
    });

    usernameSaveButton?.addEventListener('click', async e => {
      e.stopPropagation();
      const saveStart = profileModel.usernameSaveStart({
        value: usernameInput?.value || '',
        currentUsername: getCurrentUsername(),
      });
      if (!saveStart.canSave) return;
      setCurrentUsername(saveStart.optimisticUsername);
      setStoredUsername(saveStart.optimisticUsername);
      if (saveStart.updateUserMenu) updateUserMenu();
      if (saveStart.closeForm) closeUsernameForm();
      const result = await saveProfile(saveStart.updates);
      const saveResult = profileModel.usernameSaveResult({
        result,
        previousUsername: saveStart.previousUsername,
        optimisticUsername: saveStart.optimisticUsername,
      });
      setCurrentUsername(saveResult.username);
      setStoredUsername(saveResult.username);
      if (saveResult.updateUserMenu) updateUserMenu();
      if (!saveResult.ok) {
        showToast(saveResult.toast.message, saveResult.toast.isError);
        return;
      }
      if (saveResult.renderProfile && getActiveView() === 'profile') renderProfile();
      showToast(saveResult.toast.message, saveResult.toast.isError);
    });

    usernameInput?.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        usernameSaveButton?.click();
      }
    });

    documentRef.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.mobileView;
        documentRef.querySelectorAll('.type-tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.type === target);
        });
        setCurrentPage(0);
        if (target === 'stats') switchView('stats');
        else if (target === 'profile') switchView('profile');
        else if (target === 'calendar') switchView('calendar');
        else if (target === 'community') switchView('community');
        else switchView('content', target);
      });
    });

    sharingToggle?.addEventListener('change', async e => {
      const previousSharing = getSharingEnabled();
      const toggleStart = profileModel.sharingToggleStart({ checked: e.target.checked });
      setSharingEnabled(toggleStart.sharingEnabled);
      localStorage.setItem('cinetrack_sharing', toggleStart.storageValue);
      const result = await saveProfile(toggleStart.updates);
      const toggleResult = profileModel.sharingToggleResult({
        result,
        previousSharing,
        optimisticSharing: toggleStart.sharingEnabled,
      });
      setSharingEnabled(toggleResult.sharingEnabled);
      localStorage.setItem('cinetrack_sharing', toggleResult.storageValue);
      if (!toggleResult.ok) {
        e.target.checked = toggleResult.checkboxChecked;
        showToast(toggleResult.toast.message, toggleResult.toast.isError);
      }
      if (toggleResult.renderProfile && getActiveView() === 'profile') renderProfile();
    });

    return {
      showAuthOverlay,
      hideAuthOverlay,
      updateUserMenu,
      closeUsernameForm,
    };
  }

  root.authController = { createAuthController };
})();
