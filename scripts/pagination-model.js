(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function totalPages(totalItems, pageSize) {
    return Math.max(1, Math.ceil((totalItems || 0) / pageSize));
  }

  function clampPage(currentPage, totalItems, pageSize) {
    const pages = totalPages(totalItems, pageSize);
    const page = Math.min(Math.max(parseInt(currentPage) || 0, 0), pages - 1);
    return { page, totalPages: pages };
  }

  function slicePage(list = [], currentPage, pageSize) {
    const { page } = clampPage(currentPage, list.length, pageSize);
    return list.slice(page * pageSize, (page + 1) * pageSize);
  }

  function windowRange(currentPage, totalPageCount, maxVisible = 7) {
    if (totalPageCount <= 0) return { start: 0, end: -1 };
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPageCount - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    return { start, end };
  }

  function pageNumbers(currentPage, totalPageCount, maxVisible = 7) {
    const { start, end } = windowRange(currentPage, totalPageCount, maxVisible);
    const pages = [];
    if (start > 0) {
      pages.push({ type: 'page', page: 0, label: '1', active: currentPage === 0 });
      pages.push({ type: 'ellipsis' });
    }
    for (let page = start; page <= end; page++) {
      pages.push({ type: 'page', page, label: String(page + 1), active: page === currentPage });
    }
    if (end < totalPageCount - 1) {
      pages.push({ type: 'ellipsis' });
      pages.push({ type: 'page', page: totalPageCount - 1, label: String(totalPageCount), active: currentPage === totalPageCount - 1 });
    }
    return pages;
  }

  function view(totalItems, currentPage, pageSize, maxVisible = 7) {
    const clamped = clampPage(currentPage, totalItems, pageSize);
    return {
      totalItems: totalItems || 0,
      page: clamped.page,
      totalPages: clamped.totalPages,
      showControls: clamped.totalPages > 1,
      pages: pageNumbers(clamped.page, clamped.totalPages, maxVisible),
      prevDisabled: clamped.page === 0,
      nextDisabled: clamped.page >= clamped.totalPages - 1,
    };
  }

  root.pagination = {
    totalPages,
    clampPage,
    slicePage,
    windowRange,
    pageNumbers,
    view,
  };
})();
