# Animation curation and color modes

**Status:** Draft for user review  
**Date:** 2026-10-06

## Goal

Make the animation collection feel more coherent, keep the existing useful modes, and add two screen-filling color modes: a fixed solid color and a smooth color cycle.

## Existing flow

The collection is registered in `src/animations/index.ts`. Each animation draws through the shared canvas loop and declares its relevant controls. The home page keeps preview metadata in `src/components/AnimationSelector.tsx`; the Settings panel filters controls by the selected animation. User settings are validated and persisted by `src/stores/settingsStore.ts`.

The current ten modes are DVD Logo, Digital Clock, Particle System, Floating Bubbles, Starfield, Matrix Rain, Neon Lines, Geometric Shapes, Custom Logo, and Custom Text.

## Design

### Curate the current collection

- Review all ten animations for visual consistency, legibility, resizing behavior, relevant controls, and whether their settings affect the scene as presented.
- Keep the existing modes and their recognizable character. Make targeted corrections where the review finds a concrete defect or inconsistent control; do not rewrite working animations for novelty.
- Keep names, category filters, previews, and settings descriptions aligned in English and Portuguese.

### Add the two color modes

- **Solid Color:** fill the full screen with one opaque color, selected with the existing color input. Keep the selected color across reloads. This scene is intentionally static; the existing anti-burn-in drift cannot visibly move a uniform fill.
- **Color Cycle:** smoothly blend between four colors, using the existing speed control. A full transition through the four stops takes about 80 seconds at speed 1.
- Offer a small set of built-in palettes, including the Watchman default, plus a custom palette with four editable color stops. Start with the Watchman default. Store user changes with existing settings so they survive reloads; invalid stored colors fall back safely to the default palette.
- Keep the color cycle calm: no flashes, abrupt cuts, or extra motion. Brightness remains adjustable through the existing display controls.
- Add both modes to the current collection and category filtering, with previews representative of the actual output.

## Interaction and accessibility

- Color inputs remain native controls and have localized names identifying their palette stop.
- The selected animation continues to use the existing pressed/selected state.
- New names, palette labels, and help text are localized in English and Portuguese.
- The color-cycle palette selection and edits update the running scene immediately and persist through the current settings store.

## Compatibility

- Existing saved settings continue to load. Missing or malformed palette data uses the Watchman default.
- Existing animation IDs and playlist entries remain valid; the two new IDs are added to the same registry used for selection and playlist validation.
- Keep the shared `Animation.draw` contract and canvas loop. Do not add dependencies or a second rendering system.

## Out of scope

- Removing or renaming existing animations.
- Adding unrelated animation modes beyond the two requested.
- Replacing the settings store, animation engine, or collection architecture.

## Acceptance criteria

1. All ten existing modes remain selectable and their relevant controls still work after curation.
2. Solid Color fills the viewport with the selected color and retains it after reload.
3. Color Cycle blends continuously through the selected four-color palette; built-in and custom palettes work, and speed changes transition timing.
4. Palette changes appear in the active scene immediately and survive reload; invalid persisted palette data recovers to the default.
5. Both new modes appear in search, filters, settings, and playlist validation, with English and Portuguese labels.
6. The UI remains usable on narrow and wide screens, and the feature builds successfully.
