const { test, expect } = require('@playwright/test');

const FIXED_NOW = '2026-05-23T12:00:00Z';

function poster(label, a = '#111827', b = '#8b5cf6') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${a}" />
          <stop offset="1" stop-color="${b}" />
        </linearGradient>
      </defs>
      <rect width="320" height="480" fill="url(#g)" />
      <circle cx="245" cy="78" r="64" fill="rgba(255,255,255,.12)" />
      <text x="28" y="390" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="800">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const visualLibrary = [
  {
    id: 'visual-movie-watched',
    addedAt: 5,
    title: 'Velvet Signal',
    year: '2026',
    status: 'watched',
    rating: 9,
    mediaType: 'movie',
    tmdbId: 200,
    genre: 'Drama, Mystery',
    director: 'Ari Vale',
    country: 'United States of America',
    runtime: 118,
    posterUrl: poster('VELVET', '#1f2937', '#a855f7'),
    notes: 'A precise visual baseline entry.',
  },
  {
    id: 'visual-tv-progress',
    addedAt: 4,
    title: 'Northline',
    year: '2025',
    status: 'in_progress',
    rating: 8,
    mediaType: 'tv',
    tmdbId: 100,
    genre: 'Comedy, Drama',
    director: 'Mira Stone',
    country: 'United Kingdom',
    runtime: 420,
    watchedEpisodes: 6,
    totalEpisodes: 10,
    seasons: [{ number: 1, total: 10, watched: 6, name: 'Season 1' }],
    posterUrl: poster('NORTH', '#0f766e', '#38bdf8'),
  },
  {
    id: 'visual-anime-watchlist',
    addedAt: 3,
    title: 'Moon Circuit',
    year: '2026',
    status: 'watchlist',
    rating: 0,
    mediaType: 'anime',
    externalSource: 'anilist',
    externalId: '777',
    genre: 'Action, Sci-Fi',
    director: 'Kei Nara',
    country: 'Japan',
    runtime: 0,
    posterUrl: poster('MOON', '#581c87', '#06b6d4'),
  },
  {
    id: 'visual-movie-watchlist',
    addedAt: 2,
    title: 'Harbour Days',
    year: '2026',
    status: 'watchlist',
    rating: 0,
    mediaType: 'movie',
    tmdbId: 201,
    genre: 'Romance, Drama',
    director: 'Lena Park',
    country: 'South Korea',
    runtime: 104,
    posterUrl: poster('HARBOUR', '#0f172a', '#f59e0b'),
  },
  {
    id: 'visual-dropped',
    addedAt: 1,
    title: 'Static Field',
    year: '2024',
    status: 'dropped',
    rating: 3,
    mediaType: 'tv',
    tmdbId: 101,
    genre: 'Thriller',
    director: 'Noah Rill',
    country: 'Canada',
    runtime: 250,
    watchedEpisodes: 2,
    totalEpisodes: 8,
    posterUrl: poster('STATIC', '#450a0a', '#ef4444'),
  },
];

async function installVisualState(page) {
  await page.route('**/api/recommend?**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ results: [] }),
  }));
  await page.route('**/api/upcoming?**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      results: [{
        type: 'tv',
        tmdbId: 100,
        title: 'Northline',
        poster_url: visualLibrary[1].posterUrl,
        nextEpisode: { season: 1, episode: 7, name: 'Signal Return', airDate: '2026-05-24' },
      }, {
        type: 'movie',
        tmdbId: 201,
        title: 'Harbour Days',
        poster_url: visualLibrary[3].posterUrl,
        releaseDate: '2026-06-12',
      }],
    }),
  }));
  await page.route('**/api/tvmaze-calendar', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ results: [] }),
  }));
  await page.route('**/api/external?**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ media: { nextAiringEpisode: null } }),
  }));
  await page.addInitScript(({ movies, fixedNow }) => {
    const fixedTime = new Date(fixedNow).getTime();
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args) {
        super(args.length ? args[0] : fixedTime);
      }
      static now() { return fixedTime; }
    }
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    window.Date = FixedDate;

    localStorage.clear();
    localStorage.setItem('cinetrack_movies', JSON.stringify(movies));
    localStorage.setItem('cinetrack_theme', 'dark');
    localStorage.setItem('cinetrack_bg', 'cinema');
    localStorage.setItem('cinetrack_orbs', 'static');
    localStorage.setItem('cinetrack_motion', 'reduced');
    localStorage.setItem('cinetrack_density', 'comfortable');
    localStorage.setItem('cinetrack_pagesize', '50');
  }, { movies: visualLibrary, fixedNow: FIXED_NOW });
}

async function openVisualApp(page) {
  await installVisualState(page);
  await page.goto('/');
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  ` });
  await expect(page.locator('#auth-overlay')).toBeHidden();
  await expect(page.locator('#movie-grid .movie-card').first()).toBeVisible();
}

test.describe('desktop visual baselines', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop visual baselines run once.');
  });

  test('library cards visual baseline', async ({ page }) => {
    await openVisualApp(page);

    await expect(page.locator('#movie-grid')).toHaveScreenshot('library-cards-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('profile visual baseline', async ({ page }) => {
    await openVisualApp(page);

    await page.locator('#logo').click();
    await expect(page.locator('#profile-panel')).toBeVisible();

    await expect(page.locator('#profile-panel')).toHaveScreenshot('profile-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('stats visual baseline', async ({ page }) => {
    await openVisualApp(page);

    await page.locator('.type-tab[data-type="stats"]').click();
    await expect(page.locator('#stats-panel')).toBeVisible();

    await expect(page.locator('#stats-panel')).toHaveScreenshot('stats-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('calendar visual baseline', async ({ page }) => {
    await openVisualApp(page);

    await page.locator('.type-tab[data-type="calendar"]').click();
    await expect(page.locator('#calendar-panel')).toBeVisible();
    await expect(page.locator('#calendar-panel')).toContainText('Northline');

    await expect(page.locator('#calendar-panel')).toHaveScreenshot('calendar-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('mobile visual baselines', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile visual baselines run once.');
  });

  test('mobile shell visual baseline', async ({ page }) => {
    await openVisualApp(page);

    await expect(page).toHaveScreenshot('mobile-shell.png', {
      animations: 'disabled',
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});
