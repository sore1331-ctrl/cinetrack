(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function attachProfileInteractions(panel, ctx = {}) {
    if (!panel) return;
    const {
      movies = [],
      openModal,
      csvInput,
      exportCSV,
      TEMPLATE_URL,
      localLibraryBackups,
      showToast,
      compareLibraryBackup,
      profileModel,
      restoreLibraryFromBackup,
      save,
      updateCountryDropdown,
      render,
      renderProfile,
      toggleTimeSpentFormat,
      scheduleSavePrefs,
      applyBgPreset,
      applyAccent,
      applyThemePreset,
      applyGlass,
      applyOrbs,
      applyDensity,
      applyMotion,
      applyPosters,
      applyEpisodeNotif,
      setEpisodeNotifPref,
    } = ctx;

    panel.querySelectorAll('.profile-recent-card[data-edit]').forEach(card => {
      card.addEventListener('click', () => openModal?.(movies.find(m => m.id === card.dataset.edit)));
    });

    panel.querySelector('#profile-import-btn')?.addEventListener('click', () => csvInput?.click());
    panel.querySelector('#profile-export-btn')?.addEventListener('click', () => exportCSV?.());
    const tplLink = panel.querySelector('#profile-csv-template');
    if (tplLink && TEMPLATE_URL) tplLink.href = TEMPLATE_URL;

    panel.querySelectorAll('[data-restore-backup]').forEach(btn => {
      btn.addEventListener('click', () => {
        const backup = localLibraryBackups?.()[Number(btn.dataset.restoreBackup)];
        if (!backup?.movies?.length) {
          showToast?.('That recovery snapshot is no longer available.', true);
          return;
        }
        const compare = compareLibraryBackup?.(backup.movies);
        const label = profileModel?.backupImpactLabel(compare);
        const date = profileModel?.formatBackupDate(backup.createdAt) || 'this snapshot';
        if (!confirm(`Restore from ${date}?\n\nThis will merge safer progress from the snapshot and keep newer progress where it is stronger.\n\nDetected: ${label}`)) return;
        restoreLibraryFromBackup?.(backup.movies);
        save?.();
        updateCountryDropdown?.();
        render?.();
        renderProfile?.();
        showToast?.('Library restored from local snapshot.');
      });
    });

    panel.querySelectorAll('[data-time-spent-toggle]').forEach(el => {
      el.addEventListener('click', () => toggleTimeSpentFormat?.());
    });

    const appearanceSection = panel.querySelector('.appearance-section');
    const appearanceToggle = panel.querySelector('.appearance-toggle');
    if (appearanceSection && appearanceToggle) {
      const toggleAppearance = () => {
        const isOpen = appearanceSection.classList.toggle('open');
        appearanceToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        localStorage.setItem('cinetrack_appearance_open', isOpen ? '1' : '0');
        scheduleSavePrefs?.();
      };
      appearanceToggle.addEventListener('click', toggleAppearance);
      appearanceToggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAppearance();
        }
      });
    }

    panel.querySelectorAll('.bg-swatch[data-bg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.bg;
        localStorage.removeItem('cinetrack_theme_preset');
        localStorage.setItem('cinetrack_bg', name);
        applyBgPreset?.(name);
        scheduleSavePrefs?.();
        panel.querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b === btn));
        panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
      });
    });

    panel.querySelectorAll('.accent-swatch[data-accent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.accent;
        localStorage.removeItem('cinetrack_theme_preset');
        localStorage.setItem('cinetrack_accent', name);
        applyAccent?.(name);
        scheduleSavePrefs?.();
        panel.querySelectorAll('.accent-swatch').forEach(b => b.classList.toggle('active', b === btn));
        panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
      });
    });

    panel.querySelectorAll('.theme-preset-btn[data-theme-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.themePreset;
        if (!applyThemePreset?.(name)) return;
        scheduleSavePrefs?.();
        renderProfile?.();
      });
    });

    const pillApplyMap = {
      glass: { fn: applyGlass, key: 'cinetrack_glass' },
      orbs: { fn: applyOrbs, key: 'cinetrack_orbs' },
      density: { fn: applyDensity, key: 'cinetrack_density' },
      motion: { fn: applyMotion, key: 'cinetrack_motion' },
      posters: { fn: applyPosters, key: 'cinetrack_posters' },
      notif: { fn: applyEpisodeNotif, key: 'cinetrack_notif', custom: setEpisodeNotifPref },
    };
    panel.querySelectorAll('.pill-group[data-pref]').forEach(group => {
      const pref = group.dataset.pref;
      const cfg = pillApplyMap[pref];
      if (!cfg) return;
      group.querySelectorAll('.pill-btn[data-value]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const val = btn.dataset.value;
          localStorage.removeItem('cinetrack_theme_preset');
          if (cfg.custom) {
            const ok = await cfg.custom(val);
            if (!ok) return;
          } else {
            localStorage.setItem(cfg.key, val);
            cfg.fn?.(val);
            scheduleSavePrefs?.();
          }
          group.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b === btn));
          panel.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
        });
      });
    });
  }

  root.profileController = { attachProfileInteractions };
})();
