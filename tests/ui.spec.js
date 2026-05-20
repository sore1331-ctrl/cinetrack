const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('#auth-overlay')).toBeHidden();
  await expect(page.locator('#movie-grid .movie-card').first()).toBeVisible();
}

test.describe('desktop regressions', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop-only checks.');
  });

  test('local API config route is available in dev/test', async ({ request }) => {
    const response = await request.get('/api/config');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['cache-control']).toMatch(/no-store/);
    const data = await response.json();
    expect(data).toEqual(expect.objectContaining({
      supabaseUrl: expect.any(String),
      supabaseKey: expect.any(String),
    }));
  });

  test('corrupt saved library data does not break startup', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('cinetrack_movies', '{bad json'));
    await page.reload();

    await expect(page.locator('#auth-overlay')).toBeHidden();
    await expect(page.locator('#movie-grid .movie-card').first()).toBeVisible();
  });

  test('header uses supplied theme-aware image assets', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('cinetrack_theme', 'light'));
    await page.reload();

    await expect(page.locator('#auth-overlay')).toBeHidden();
    await expect(page.locator('header .brand-logo-img')).toHaveAttribute('src', /cinetrack-logo-light\.png/);
    await expect(page.locator('#header-profile-btn img')).toHaveAttribute('src', /profile-control-light\.png/);
    await expect(page.locator('#theme-toggle img')).toHaveAttribute('src', /theme-control-light\.png/);
    await expect(page.locator('#header-profile-btn')).toHaveAttribute('aria-label', 'Profile');

    const pseudoDisplays = await page.locator('#theme-toggle').evaluate(el => ({
      before: getComputedStyle(el, '::before').display,
      after: getComputedStyle(el, '::after').display,
    }));
    expect(pseudoDisplays).toEqual({ before: 'none', after: 'none' });

    await page.locator('#theme-toggle').click();
    await expect(page.locator('header .brand-logo-img')).toHaveAttribute('src', /cinetrack-logo\.png/);
    await expect(page.locator('#header-profile-btn img')).toHaveAttribute('src', /profile-control\.png/);
    await expect(page.locator('#theme-toggle img')).toHaveAttribute('src', /theme-control\.png/);
  });

  test('header keeps navigation clear of the logo at narrow desktop widths', async ({ page }) => {
    await page.setViewportSize({ width: 1076, height: 360 });
    await openApp(page);

    const layout = await page.evaluate(() => {
      const brand = document.querySelector('.header-brand')?.getBoundingClientRect();
      const firstTab = document.querySelector('.type-tab')?.getBoundingClientRect();
      const actions = document.querySelector('.header-actions')?.getBoundingClientRect();
      return {
        logoGap: brand && firstTab ? firstTab.left - brand.right : 0,
        actionGap: firstTab && actions ? actions.left - firstTab.right : 0,
      };
    });

    expect(layout.logoGap).toBeGreaterThanOrEqual(8);
    expect(layout.actionGap).toBeGreaterThanOrEqual(8);
  });

  test('animated orbs are visible and respect reduced motion', async ({ page }) => {
    await openApp(page);

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-orbs', 'animated');
      document.documentElement.removeAttribute('data-motion');
    });
    await expect.poll(() => page.evaluate(() =>
      Number(getComputedStyle(document.body, '::before').opacity)
    )).toBeGreaterThan(0.25);

    const animated = await page.evaluate(() => ({
      bodyAnimation: getComputedStyle(document.body).animationName,
      orbAnimation: getComputedStyle(document.body, '::before').animationName,
      orbOpacity: Number(getComputedStyle(document.body, '::before').opacity),
    }));

    expect(animated.bodyAnimation).toBe('orb-drift');
    expect(animated.orbAnimation).toBe('orb-float');
    expect(animated.orbOpacity).toBeGreaterThan(0.25);

    await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduced'));
    await expect.poll(() => page.evaluate(() =>
      Number(getComputedStyle(document.body, '::before').opacity)
    )).toBeLessThan(0.01);

    const reduced = await page.evaluate(() => ({
      bodyAnimation: getComputedStyle(document.body).animationName,
      orbAnimation: getComputedStyle(document.body, '::before').animationName,
      orbOpacity: Number(getComputedStyle(document.body, '::before').opacity),
    }));

    expect(reduced.bodyAnimation).toBe('none');
    expect(reduced.orbAnimation).toBe('none');
    expect(reduced.orbOpacity).toBeLessThan(0.01);
  });

  test('custom filter dropdown renders above movie cards', async ({ page }) => {
    await openApp(page);

    await page.locator('#more-filters-btn').click();
    await page.locator('[data-select-for="rating-filter"] .filter-select-button').click();

    const menu = page.locator('[data-select-for="rating-filter"] .filter-select-menu');
    await expect(menu).toBeVisible();

    const topElementClass = await menu.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = Math.min(rect.bottom - 10, rect.top + 120);
      const top = document.elementFromPoint(x, y);
      return top?.closest('.filter-select-menu')?.className || top?.className || '';
    });

    expect(String(topElementClass)).toContain('filter-select-menu');
  });

  test('filtered empty state does not show onboarding copy', async ({ page }) => {
    await openApp(page);

    await page.locator('#search-input').fill('zzzz-no-title-should-match-zzzz');

    await expect(page.locator('#empty-msg')).toContainText('No matching titles');
    await expect(page.locator('#empty-msg')).not.toContainText('Welcome to Cinetrack');
  });

  test('recommendations hide titles already tracked across compatible media types', async ({ page }) => {
    await page.route('**/api/recommend?**', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 27205, source: 'tmdb', media_type: 'movie', title: 'Inception', year: '2010', poster_path: null, overview: '' },
          { id: 999001, source: 'tmdb', media_type: 'tv', title: 'Attack on Titan', year: '2013', poster_path: null, overview: '' },
          { id: 999002, source: 'tmdb', media_type: 'movie', title: 'Dune: Part Two', year: '2024', poster_path: null, overview: '' },
          { id: 999003, source: 'tmdb', media_type: 'movie', title: 'Arrival', year: '2016', poster_path: null, overview: '' },
        ],
      }),
    }));
    await page.addInitScript(() => {
      localStorage.setItem('cinetrack_movies', JSON.stringify([
        { id: 'm1', addedAt: 3, title: 'Inception', year: '2010', status: 'watched', rating: 9, mediaType: 'movie', tmdbId: 27205, genre: 'Sci-Fi', runtime: 148 },
        { id: 'm2', addedAt: 2, title: 'Attack on Titan', year: '2013', status: 'watched', rating: 10, mediaType: 'anime', externalSource: 'anilist', externalId: '16498', genre: 'Action', runtime: 0 },
        { id: 'm3', addedAt: 1, title: 'Dune: Part Two', year: '2024', status: 'watchlist', rating: 0, mediaType: 'movie', genre: 'Sci-Fi', runtime: 166 },
      ]));
      localStorage.removeItem('cinetrack_recs_cache_v2');
    });

    await openApp(page);
    await page.locator('.type-tab[data-type="stats"]').click();

    const recSection = page.locator('#recs-section');
    await expect(recSection).toContainText('Arrival');
    await expect(recSection).not.toContainText('Inception');
    await expect(recSection).not.toContainText('Attack on Titan');
    await expect(recSection).not.toContainText('Dune: Part Two');
  });
});

test.describe('mobile regressions', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile-only checks.');
  });

  test('mobile keeps native filter selects', async ({ page }) => {
    await openApp(page);

    await page.locator('#more-filters-btn').click();

    await expect(page.locator('#more-filters')).toBeVisible();
    await expect(page.locator('#rating-filter')).toBeVisible();
    await expect(page.locator('[data-select-for="rating-filter"]')).toHaveCount(0);
  });

  test('mobile filter panel closes from outside tap', async ({ page }) => {
    await openApp(page);

    await page.locator('#more-filters-btn').click();
    await expect(page.locator('#more-filters')).toBeVisible();

    await page.mouse.click(8, 8);
    await expect(page.locator('#more-filters')).toBeHidden();
  });

  test('mobile bottom nav can open Calendar', async ({ page }) => {
    await openApp(page);

    const calendarButton = page.locator('.mobile-nav-btn[data-mobile-view="calendar"]');
    await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    await calendarButton.scrollIntoViewIfNeeded();
    await calendarButton.click();

    await expect(page.locator('#calendar-panel')).toBeVisible();
    await expect(page.locator('.calendar-header')).toContainText('Calendar');
  });

  test('mobile bottom nav does not duplicate Profile', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    await expect(page.locator('.mobile-nav-btn[data-mobile-view="profile"]')).toHaveCount(0);
    await expect(page.locator('#header-profile-btn')).toBeVisible();
  });

  test('mobile bottom nav fits without horizontal scrolling', async ({ page }) => {
    await openApp(page);

    const navFits = await page.locator('.mobile-bottom-nav').evaluate(nav => nav.scrollWidth <= nav.clientWidth + 1);
    expect(navFits).toBeTruthy();
  });
});
