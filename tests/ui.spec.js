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
});
