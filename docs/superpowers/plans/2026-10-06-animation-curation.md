# Animation curation and color modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curate Watchman's ten existing animations and add persistent solid-color and smooth color-cycle modes.

**Architecture:** Keep the existing canvas loop and animation registry. Add a four-stop palette model to persisted settings, use it in the new color-cycle scene, and expose the palette controls through the existing Settings panel. The solid scene uses the existing single-color setting and bypasses canvas opacity and positional drift so the viewport remains one uniform color.

**Tech Stack:** TypeScript, React, Zustand, Canvas 2D, CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-10-06-animation-curation-design.md`

## Global Constraints

- Preserve all ten existing animation IDs and playlist entries.
- Add exactly two modes: `solid` and `colorCycle`; register them through the existing animation registry.
- Keep the shared `Animation.draw` contract and canvas loop; add no dependencies.
- Use four palette stops; a full cycle lasts about 80 seconds at speed 1.
- Use a Watchman palette by default and fall back to it for missing or invalid persisted palette data.
- Localize names, palette choices, input labels, and explanatory copy in English and Portuguese.
- The solid-color mode stays static; anti-burn-in drift cannot visibly move a uniform fill.

## Review Focus

- Missing or malformed persisted palette values: recover to the Watchman palette (Task 2 manual check).
- Color-stop boundaries and cycle wrap: interpolate continuously with no flash (Task 3 visual check).
- Entering and leaving full-screen color modes with anti-burn-in enabled: never expose canvas edges (Task 3 visual check).
- Editing palette colors while the player is paused: redraw the visible frame immediately (Task 4 manual check).
- Small and portrait viewports: both new scenes fill the viewport at multiple aspect ratios (Task 5 visual check).

---

### Task 1: Curate the current animations

**Files:**
- Review and modify only where a concrete issue is found: `src/animations/dvd.ts`, `clock.ts`, `particles.ts`, `bubbles.ts`, `starfield.ts`, `matrix.ts`, `neon.ts`, `shapes.ts`, `customLogo.ts`, `customText.ts`.
- Modify `src/animations/index.ts` only if a control declaration needs correction.

**Interfaces:**
- Consumes: current `Animation.draw(frame: AnimationFrame)` contract and each registry entry's `controls` list.
- Produces: the same ten modes with any verified quality corrections and accurate control declarations.

- [ ] Inspect each mode for clipping, resize handling, visual balance, and whether its declared settings match its actual behavior.
- [ ] Fix only confirmed defects; keep intentional random-color modes and recognizable motion intact.
- [ ] Run `npm run build`.
- [ ] Preview all ten modes at a wide viewport and a phone-sized portrait viewport; record no clipping or dead controls.

### Task 2: Add validated palette preferences

**Files:**
- Create `src/animations/colorPalettes.ts`.
- Modify `src/types/index.ts` and `src/stores/settingsStore.ts`.

**Interfaces:**
- Produces `ColorPaletteId = 'watchman' | 'aurora' | 'sunset' | 'ocean' | 'custom'`.
- Produces `ColorPaletteStops = [string, string, string, string]`.
- Add `colorPaletteId: ColorPaletteId` and `customColorPalette: ColorPaletteStops` to `Settings`.
- Export `COLOR_PALETTES` for the four built-in IDs and `DEFAULT_COLOR_PALETTE` from `colorPalettes.ts`.
- Use these stop orders: Watchman `#7AA2F7, #BB9AF7, #7DCFFF, #9ECE6A`; Aurora `#80D6C4, #79C7E3, #8D9CF7, #C7A0F6`; Sunset `#ECA580, #E0AF68, #E58BA6, #B29BE7`; Ocean `#70C1CE, #4E9FA3, #6996CB, #8BAFCB`.

- [ ] Define the four built-in palettes and set Watchman as the default palette ID and custom-color fallback.
- [ ] Validate stored IDs against the five allowed values and accept custom colors only when exactly four valid hex colors are present; otherwise use safe defaults.
- [ ] Preserve compatibility with settings saved before these fields existed.
- [ ] Run `npm run build` and manually confirm absent and malformed values resolve to the Watchman defaults.

### Task 3: Implement and register both full-screen scenes

**Files:**
- Create `src/animations/solidColor.ts` and `src/animations/colorCycle.ts`.
- Modify `src/animations/index.ts` and `src/hooks/useAnimationLoop.ts`.

**Interfaces:**
- `createSolidColor(): Animation` fills the viewport with `settings.color`.
- `createColorCycle(): Animation` blends the four resolved palette stops using `settings.speed` and frame `time`.
- Registry IDs are `solid` and `colorCycle`; solid exposes color and brightness controls, color cycle exposes palette and speed controls.

- [ ] Implement solid fill without allocating per-frame state; keep it fully opaque regardless of the shared opacity setting.
- [ ] Implement smoothstep RGB interpolation between consecutive stops, with 20 seconds per stop at speed 1 and a continuous wrap after 80 seconds.
- [ ] Skip positional anti-burn-in drift for both uniform full-screen scenes so it cannot reveal edges.
- [ ] Register both scenes without changing the animation interface.
- [ ] Run `npm run build`; visually confirm no edge bands when switching between these scenes and existing scenes.

### Task 4: Add localized settings controls and live updates

**Files:**
- Modify `src/components/SettingsPanel.tsx`, `src/types/index.ts`, `src/hooks/useAnimationLoop.ts`, and `src/services/i18n.ts`.

**Interfaces:**
- Add `palette` to `PerModeControl`.
- Color Cycle settings show a built-in palette selector and four native color inputs when `custom` is selected.
- Solid Color settings show the existing single-color input and a note that this scene remains static.

- [ ] Connect built-in palette selection and custom color edits to the persisted settings fields from Task 2.
- [ ] Add localized English and Portuguese text for both mode names, all palette names, each custom color input, and the solid-mode note.
- [ ] Include palette field changes in the paused-player invalidation check so edits redraw immediately.
- [ ] Run `npm run build`; verify palette changes are live while playing and paused, and survive a reload.

### Task 5: Curate collection previews and verify the full flow

**Files:**
- Modify `src/components/AnimationSelector.tsx`, `src/components/AnimationPreviewCard.tsx` if needed, and `src/styles/index.css`.
- Modify `src/services/i18n.ts` only for missing localized search/category strings.

**Interfaces:**
- Add both new IDs to preview metadata; classify `solid` as `classic` and `colorCycle` as `effects`.
- Search, category filters, and playlist validation use the shared animation registry.

- [ ] Give each new mode a preview that communicates its actual solid or color-cycling output.
- [ ] Check all twelve modes by search, category filter, selection, settings, and playlist after addition.
- [ ] Capture and inspect desktop, small-screen, and portrait previews; confirm the color scenes cover every edge and the controls remain usable.
- [ ] Run `npm run lint`, `npm run build`, and `git diff --check`.
