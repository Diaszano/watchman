# Review Fixes Implementation Plan (2026-08-25)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan addresses the gaps found while reviewing the 1.0.3 codebase: broken favicon/PWA icon references (the manifest points at a non-existent `/favicon.svg`), a cosmetic-only light theme that never restyles hardcoded dark classes, incomplete i18n coverage with several user-facing strings hardcoded in English, missing player UX affordances (no now-playing label, no Escape-to-close, no per-animation control relevance, no shortcut help), missing dialog accessibility on the settings panel, and README placeholder screenshots.

**Goal:** Ship a 1.0.4-quality pass where PWA installability is real, both themes are fully styled, all strings flow through i18n, the player exposes clear affordances and shortcuts, the settings panel is keyboard accessible, and documentation shows actual screenshots.

---

## Phase 1: PWA and favicon repair (fix(pwa))

The current `index.html:5` and the `vite.config.ts` manifest reference `/favicon.svg`, which does not exist; only a PNG favicon is present. This phase provides real SVG/PNG assets and a complete icon set.

- [ ] **Step 1: Inspect current assets and confirm the breakage**

Check `public/favicon.png` dimensions and confirm `index.html` line 5 and the `vite.config.ts` manifest reference `/favicon.svg`, which has no file behind it.

- [ ] **Step 2: Create `public/favicon.svg` from the Logo.tsx artwork**

Reproduce the logo as standalone SVG: `viewBox="0 0 64 64"`, `<circle cx="32" cy="32" r="18" fill="none" stroke="#38bdf8" stroke-width="4"/>`, `<circle cx="32" cy="32" r="7" fill="#38bdf8"/>`, transparent background. Match the geometry used by `src/components/Logo.tsx`.

- [ ] **Step 3: Add an icon generation script for PNG variants**

Add `sharp` as devDependency plus `scripts/generate-icons.mjs` producing:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-192.png`
- `public/icons/icon-maskable-512.png`

Maskable variants render the logo centered at ~66% scale on a solid `#0a0a0a` full-bleed square. Run the script once and commit the generated outputs.

- [ ] **Step 4: Update `index.html` icon links**

Reference the SVG as primary with PNG fallbacks, including `apple-touch-icon`.

- [ ] **Step 5: Update the VitePWA manifest in `vite.config.ts`**

Extend `includeAssets` to cover `favicon.svg`, `favicon.png` and `icons/*.png`; add four `manifest.icons` entries for the generated PNGs, including `purpose: 'maskable'` on the maskable pair.

- [ ] **Step 6: Verify build output and commit**

Run `npm run build` and check `dist/` contains the icons and that `manifest.webmanifest` lists all of them. Run `npm test` and `npm run lint`. Commit as `fix(pwa): provide real favicon and installable icon set`.

## Phase 2: Functional light theme (feat(theme))

`.dark` is already toggled on `<html>` by `src/hooks/useTheme.ts`; the styles simply never react to it. Convert hardcoded dark styling into light defaults plus Tailwind `dark:` variants:

- [ ] **Step 1: Convert shared layout and controls**

`CenteredLayout.tsx` line 5: `bg-neutral-950` → `bg-neutral-100 dark:bg-neutral-950`. Apply the same pattern to the `Button.tsx` ghost variant, `controls.tsx` `Row` text colors and `Select` colors, `AnimationSelector.tsx`, and the `HomePage` subtitle `text-white/60`.

- [ ] **Step 2: Handle SettingsPanel contextually**

SettingsPanel keeps its dark glass styling when open over the player canvas, but respects the active theme when opened from HomePage.

- [ ] **Step 3: Verify theme behavior**

Acceptance: toggling the theme visibly changes Home and the panel on Home; existing tests stay green.

## Phase 3: Complete i18n (feat(i18n))

Several user-facing strings bypass the dictionary. Route them through `src/services/i18n.ts`:

- [ ] **Step 1: Add new keys for en+pt**

New keys: `settings.playlistMode.sequential`, `settings.playlistMode.random`, `settings.theme.dark`, `settings.theme.light`, `settings.clear`, `logo.uploadPrompt`.

- [ ] **Step 2: Replace hardcoded strings in components**

Replace hardcoded strings in `SettingsPanel.tsx` lines 165–166 (`'Dark'`/`'Light'`) and lines 236–237 (`'Sequential'`/`'Random'`), the FileField `'clear'` button, and the `customLogo.ts` line 26 fallback text `'Upload a logo in Settings'` (read language via `useSettings.getState()` inside draw and use `translate()`).

- [ ] **Step 3: Derive clock locale from settings**

`clock.ts`: derive the `Intl.DateTimeFormat` locale from `settings.lang` instead of the fixed `en-GB`.

- [ ] **Step 4: Verify i18n completeness**

Acceptance: no visible user-facing string outside the i18n dictionary; tests updated/added.

## Phase 4: Player UX (feat(player))

- [ ] **Step 1: Add a now-playing label**

Show `t(`anim.${animationId}`)` at the bottom-left of PlayerPage, hidden together with the auto-hiding UI.

- [ ] **Step 2: Escape closes the panel**

Escape closes SettingsPanel via a new `useKeyboardShortcuts` handler without breaking native fullscreen exit.

- [ ] **Step 3: Per-mode relevant controls**

Optional `controls` field on `AnimationMeta` listing relevant setting keys per animation; SettingsPanel filters sliders/selects accordingly; global controls always shown. Add unit tests for the mapping/filter helper.

- [ ] **Step 4: Shortcuts overlay**

ShortcutsOverlay component toggled with `H` or `?` listing F, Space, Esc, N, P, S, H with i18n strings.

- [ ] **Step 5: Verify player UX**

Acceptance: unit tests for control filtering and shortcut overlay rendering.

## Phase 5: Panel accessibility (feat(a11y))

- [ ] **Step 1: Implement focus trap for SettingsPanel**

Focus trap for the SettingsPanel aside: `role="dialog"`, `aria-modal`, `aria-label`, focus moves into the panel on open, Tab cycles within, focus restored to the trigger on close (small `useFocusTrap` hook).

- [ ] **Step 2: Verify keyboard navigation**

Acceptance: keyboard-only navigation stays inside the open panel.

## Phase 6: Screenshots and docs (docs(readme))

- [ ] **Step 1: Capture screenshots**

Optional `scripts/capture-screenshots.mjs` using Playwright to capture `docs/home.png` and `docs/player.png`; replace the README Screenshots placeholder section; update the shortcuts table with `H`.

Fallback if Playwright is undesirable: capture manually and drop files in `docs/`.

- [ ] **Step 2: Verify docs accuracy**

README screenshots render correctly and the shortcuts table matches the implemented keys.

## Final verification

- [ ] `npm run lint && npm test && npm run format:check && npm run build` all pass
- [ ] Manual smoke: theme toggle both ways, en/pt switch, keyboard shortcuts incl. Esc and H, PWA install prompt works
