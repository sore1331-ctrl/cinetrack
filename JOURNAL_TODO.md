# Journal style — remaining work

The Journal style is a flat, editorial alternative to the Glass look, switched in
Profile → Appearance → Style. **Glass stays the default until everything below
is done**, then the default flips to Journal.

How it is built (keep to this):
- All Journal CSS lives in `styles/journal.css`, every rule scoped to
  `:root[data-style="journal"]`. A test (`tests/integrity.spec.js`, "Journal
  style") fails if anything leaks into Glass.
- Journal-only markup uses `.j-only` / `.j-text` / `.j-progress` (hidden in Glass).
- Palette: dark `#141517` bg, `#1c1d20` panel, `#232428` panel2, `#2c2d31` line,
  `#e9e9ec` text, `#8d8e95` muted, accent `#8b7cf6`; day `#f3f3f5` / `#fbfbfc` /
  `#e6e6eb` / `#dcdce1` / `#18191c` / `#6f7078` / `#7563ec`. Vars: `--j-*`.
- Type: Fraunces (`--j-serif`) for page titles, show titles, section headings;
  Inter (`--j-sans`) for everything else. No blur, glows, gradients, emoji
  icons, pills with coloured fills.
- Verify with Playwright screenshots of the real app (both styles, dark/day,
  1440px and 390px), then run integrity + UI tests (UI with `--workers=1`).

## Done
- [x] Stage 1: setting, header, page heading, toolbar, status tabs, library
      cards (ticks counter, "Next E11 · Mon", text action line). Commit 17b152a.

## To do (from user feedback, 2026-11-08)
1. [ ] **Selected tab looks awful.** Both the top section menu (active item has a
       heavy underline on a wide padded box; items spread far apart at wide
       widths) and the status tabs ("All 512 / Watching / …"). Make the active
       state a thin underline under the text only, tighter spacing, consistent
       for both. Also check: an "Edit" label appears over the top-left of
       posters on some cards (grid S/L sizes?) — card actions must stay in the
       bottom line.
2. [ ] **Account button shows "E"; should show the display name** (e.g.
       "Equinox") as plain text, like the mockup ("Equinox · Profile · Day").
       Fall back to the email name. Keep the dropdown working.
3. [ ] **Calendar** still looks like Glass: "SCHEDULE" label + emoji icon, pill
       buttons (Tracked/Planned/Discover), boxed day groups, "TV" pills, green
       "TODAY" pills. Journal version: serif "Calendar" heading + summary, text
       tabs, day groups as serif date headings with hairline rules, rows without
       boxes, plain "TV" label, "Today" in accent text.
4. [ ] **Stats**: boxed stat tiles, pill type filter with emoji, glassy chart
       panels, gradient bars. Journal: serif heading, text tabs (All / Films /
       TV / Anime), numbers as large serif figures with small labels and
       hairline separators, flat bars in text colour/accent, top-rated posters
       without frames.
5. [ ] **Community**: boxed user cards, emoji stats (✓ ⏳ 🎯), coloured toggle.
       Journal: serif heading, user rows/cards flat with hairlines, text stats.
6. [ ] **Profile**: big glass hero ("Y" avatar circle), stat tiles, "By Type"
       with emoji, Appearance section with pill buttons and gradient swatches.
       Journal: serif name heading, flat sections with hairlines, text stats.
7. [ ] **Home dashboard** ("At a glance"): boxed panels → flat editorial.
8. [ ] **Add/Edit dialog, account dropdown, confirm/plan modals, filter panel,
       toasts**: flat panels, Journal buttons.
9. [ ] **Phone bottom bar**: still a floating glass pill; make it a flat bar.
10. [ ] When all above are done: switch the default style to Journal
        (`applyStyle(... || 'journal')` in app.js and the early script in
        index.html), keep Glass selectable.
