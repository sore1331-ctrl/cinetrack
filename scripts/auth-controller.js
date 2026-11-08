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
      getOfflineMode = () => false,
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
    const signedInView  = documentRef.getElementById('user-dropdown-signed-in');
    const signedOutView = documentRef.getElementById('user-dropdown-signed-out');
    const signInButton  = documentRef.getElementById('menu-signin-btn');
    const userAvatar   = documentRef.getElementById('user-avatar');
    // Journal style shows the display name instead of the initial.
    const userAvatarName = documentRef.getElementById('user-avatar-name');
    const userEmailEl  = documentRef.getElementById('user-email');
    const userDropdown = documentRef.getElementById('user-dropdown');
    const avatarButton = documentRef.getElementById('user-avatar-btn');
    const usernameForm = documentRef.getElementById('username-form');
    const usernameInput = documentRef.getElementById('username-input');
    const usernameEditButton = documentRef.getElementById('username-edit-btn');
    const usernameSaveButton = documentRef.getElementById('username-save-btn');
    const sharingToggle = documentRef.getElementById('sharing-toggle');
    const authTabs      = documentRef.querySelector('.auth-tabs');
    const forgotButton  = documentRef.getElementById('auth-forgot');
    const resetForm     = documentRef.getElementById('auth-reset-form');
    const newPassword   = documentRef.getElementById('auth-new-password');
    const newPasswordConfirm = documentRef.getElementById('auth-new-password-confirm');
    const resetError    = documentRef.getElementById('auth-reset-error');
    const resetSubmit   = documentRef.getElementById('auth-reset-submit');

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
      // Only offer sign-in when there is actually a backend to sign in to.
      // The "database not configured" path also sets offlineMode, and there
      // the button would be dead.
      const offline = !currentUser && getOfflineMode() && Boolean(getSupabase?.());

      // Offline ("Continue without account") previously left the header with
      // no account control at all, so once the auth overlay was dismissed
      // there was no way back to the sign-in form. Keep the menu available in
      // that state, showing a single Sign in action instead of the account
      // panel. Reload used to be the only escape, which is awkward on mobile
      // and absent entirely from a home-screen shortcut.
      signedOutView?.classList.toggle('hidden', !offline);
      signedInView?.classList.toggle('hidden', offline);

      if (!currentUser && !offline) {
        userMenu?.classList.add('hidden');
        return;
      }
      userMenu?.classList.remove('hidden');
      if (offline) {
        if (userAvatar) userAvatar.textContent = '?';
        if (userAvatarName) userAvatarName.textContent = 'Sign in';
        avatarButton?.setAttribute('title', 'Not signed in');
        avatarButton?.setAttribute('aria-label', 'Not signed in — sign in');
        return;
      }
      avatarButton?.setAttribute('title', 'Account');
      avatarButton?.setAttribute('aria-label', 'Account');
      const displayName = currentUserDisplayName();
      if (userAvatar) userAvatar.textContent = userInitial(displayName);
      if (userAvatarName) userAvatarName.textContent = displayName;
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
        forgotButton?.classList.toggle('hidden', authMode !== 'signin');
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

    function showError(el, message) {
      if (!el) return;
      el.textContent = message;
      el.classList.remove('hidden');
    }

    // Password reset, step 1: email a recovery link. The reply is the same
    // whether or not an account exists, so the form can't be used to probe
    // which emails are registered.
    forgotButton?.addEventListener('click', async () => {
      const sb = getSupabase();
      const email = authEmail?.value.trim() || '';
      hideMessage(authError);
      hideMessage(authSuccess);
      if (!email) {
        showError(authError, 'Enter your email above, then choose "Forgot password?" again.');
        authEmail?.focus();
        return;
      }
      if (!sb) {
        showError(authError, 'Password reset needs the cloud connection, which is not available right now.');
        return;
      }
      forgotButton.disabled = true;
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        if (authSuccess) {
          authSuccess.textContent = 'If an account exists for that email, a reset link is on its way. Open it on this device to choose a new password.';
          authSuccess.classList.remove('hidden');
        }
      } catch (err) {
        showError(authError, err?.message || 'Could not send the reset email.');
      }
      forgotButton.disabled = false;
    });

    // Password reset, step 2: the recovery link signs the user in; ask for
    // the new password before letting them carry on.
    function showPasswordRecovery() {
      showAuthOverlay('form');
      authTabs?.classList.add('hidden');
      authForm?.classList.add('hidden');
      authOffline?.classList.add('hidden');
      hideMessage(authSuccess);
      hideMessage(resetError);
      resetForm?.classList.remove('hidden');
      newPassword?.focus();
    }

    function closePasswordRecovery() {
      resetForm?.classList.add('hidden');
      authTabs?.classList.remove('hidden');
      authForm?.classList.remove('hidden');
      authOffline?.classList.remove('hidden');
      if (newPassword) newPassword.value = '';
      if (newPasswordConfirm) newPasswordConfirm.value = '';
    }

    resetForm?.addEventListener('submit', async e => {
      e.preventDefault();
      hideMessage(resetError);
      const password = newPassword?.value || '';
      if (password !== (newPasswordConfirm?.value || '')) {
        showError(resetError, 'The two passwords do not match.');
        return;
      }
      const sb = getSupabase();
      if (resetSubmit) resetSubmit.disabled = true;
      try {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        closePasswordRecovery();
        hideAuthOverlay();
        showToast('Password updated ✓');
      } catch (err) {
        showError(resetError, err?.message || 'Could not update the password.');
      }
      if (resetSubmit) resetSubmit.disabled = false;
    });

    // Returning to the sign-in form from offline mode. Leaves offlineMode set
    // until a sign-in actually succeeds, so dismissing the overlay again drops
    // the user back where they were rather than into a broken half-state.
    signInButton?.addEventListener('click', () => {
      userDropdown?.classList.add('hidden');
      showAuthOverlay('form');
    });

    authOffline?.addEventListener('click', () => {
      setOfflineMode(true);
      hideAuthOverlay();
      setSyncState('error', 'Offline mode - changes saved locally only');
      // Reveal the header menu so the sign-in route stays reachable; without
      // this the overlay closes onto a UI with no account control at all.
      updateUserMenu();
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
      showPasswordRecovery,
    };
  }

  root.authController = { createAuthController };
})();
