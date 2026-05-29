(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function closeOpenMenus(grid) {
    grid.querySelectorAll('.movie-card.action-menu-open').forEach(el => {
      el.classList.remove('action-menu-open');
      el.querySelector('[data-action-menu]')?.setAttribute('aria-expanded', 'false');
      const menu = el.querySelector('.card-action-menu');
      if (menu) menu.hidden = true;
    });
  }

  function attachGridActions(grid, ctx = {}) {
    if (!grid) return;
    const {
      getMovies = () => [],
      isSelectMode = () => false,
      openModal,
      updateLibraryEntry,
      libraryModel,
      save,
      render,
      planEntry,
      clearPlan,
      setPendingDeleteId,
      confirmMsg,
      confirmModal,
    } = ctx;

    grid.addEventListener('click', e => {
      const clickedMoreWrap = e.target.closest('.card-more-wrap');
      if (!clickedMoreWrap) closeOpenMenus(grid);

      const noteEl = e.target.closest('.card-notes');
      if (noteEl) {
        noteEl.classList.toggle('expanded');
        return;
      }

      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const toggleId = e.target.closest('[data-toggle]')?.dataset.toggle;
      const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
      const epIncId = e.target.closest('[data-ep-inc]')?.dataset.epInc;
      const menuId = e.target.closest('[data-action-menu]')?.dataset.actionMenu;
      const planId = e.target.closest('[data-plan]')?.dataset.plan;
      const clearPlanId = e.target.closest('[data-clear-plan]')?.dataset.clearPlan;
      const movies = getMovies();

      if (!editId && !toggleId && !deleteId && !epIncId && !menuId && !planId && !clearPlanId && !isSelectMode() && !e.target.closest('.card-checkbox')) {
        const poster = e.target.closest('.card-poster');
        if (poster) {
          const card = poster.closest('.movie-card');
          if (card?.dataset.id) openModal?.(movies.find(m => m.id === card.dataset.id));
          return;
        }
      }

      if (menuId) {
        const card = e.target.closest('.movie-card');
        const wasOpen = card?.classList.contains('action-menu-open');
        closeOpenMenus(grid);
        if (card && !wasOpen) {
          card.classList.add('action-menu-open');
          e.target.closest('[data-action-menu]')?.setAttribute('aria-expanded', 'true');
          const menu = card.querySelector('.card-action-menu');
          if (menu) menu.hidden = false;
        }
      } else if (epIncId) {
        if (!movies.some(m => m.id === epIncId)) return;
        updateLibraryEntry?.(epIncId, libraryModel?.incrementEpisode, { allowDowngrade: true });
        save?.();
        render?.();
      } else if (editId) {
        openModal?.(movies.find(m => m.id === editId));
      } else if (toggleId) {
        const entry = movies.find(m => m.id === toggleId);
        if (entry) {
          updateLibraryEntry?.(toggleId, libraryModel?.cycleCardStatus, { allowDowngrade: true });
          save?.();
          render?.();
        }
      } else if (deleteId) {
        closeOpenMenus(grid);
        const entry = movies.find(m => m.id === deleteId);
        if (entry) {
          setPendingDeleteId?.(deleteId);
          if (confirmMsg) confirmMsg.textContent = `Remove "${entry.title}" from your list?`;
          confirmModal?.classList.remove('hidden');
        }
      } else if (planId) {
        closeOpenMenus(grid);
        planEntry?.(planId);
      } else if (clearPlanId) {
        closeOpenMenus(grid);
        clearPlan?.(clearPlanId);
      }
    });
  }

  root.cardController = { attachGridActions };
})();
