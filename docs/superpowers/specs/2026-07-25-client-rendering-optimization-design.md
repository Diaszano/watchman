# Design Spec: Client Rendering & Storage Optimization (Watchman)

**Date**: 2026-07-25  
**Status**: Approved  

---

## 1. Overview & Goals

Watchman renders full-screen screensavers with a Canvas 2D loop. Its current rendering model can allocate a very large backing buffer on high-DPR 4K displays, redraw that entire buffer every frame, and serialize user image data repeatedly through synchronous `localStorage`. The result is excessive client memory, CPU/GPU work, garbage collection, and interaction jank.

This specification introduces a progressive Canvas 2D optimization architecture. It keeps all existing animations and browser support while adapting image quality to the device and workload.

### Goals

- Bound canvas memory through an explicit pixel budget, independent of display DPR.
- Sustain responsive rendering by adapting quality after sustained frame-budget pressure.
- Preserve animation speed at every FPS limit.
- Avoid repainting static backgrounds and avoid per-frame CSS filter updates.
- Reduce Canvas API calls and transient string allocations in dense animations.
- Keep uploaded images across reloads without placing image blobs in Zustand or `localStorage`.
- Make performance behavior deterministic and testable without adding runtime dependencies.

### Non-goals

- Rewriting animations in WebGL or moving rendering to a Worker/`OffscreenCanvas`.
- Changing the visual identity or removing existing animations.
- Syncing user settings or images between devices.
- Adding analytics or remote performance telemetry.

---

## 2. Constraints and Success Criteria

### Constraints

- Continue using React 18, TypeScript, Zustand, Canvas 2D, and native browser APIs.
- Add no production dependency for rendering, storage, or scheduling.
- `requestAnimationFrame` remains the presentation scheduler; no `setInterval` render loop.
- The existing settings controls remain available. New quality controls use the project's existing `Select` and i18n patterns.
- Persisted settings must migrate safely from the current `watchman-settings` shape.
- The selected animation must run with the same logical elapsed time at 30, 60, 120, and unlimited FPS settings.

### Measurable acceptance criteria

- The canvas backing store never exceeds the active quality profile's pixel budget.
- The default `auto` profile uses a 12-megapixel maximum canvas buffer; Economy uses 6 MP and High uses 20 MP.
- In `auto`, a sustained over-budget render lowers quality one step at a time; quality is restored only after sustained headroom, avoiding visible oscillation.
- Choosing 30 FPS yields the same elapsed animation movement over one wall-clock second as 60 FPS, within one rendered frame.
- Default and high-density animations perform no per-object `fill()` call when their objects share a fill style.
- User image binary data is absent from the persisted Zustand JSON payload.
- `npm run test`, `npm run lint`, and `npm run build` pass after implementation.

---

## 3. Architecture

### 3.1 Rendering quality controller

Create a pure quality controller responsible for two decisions:

1. **Canvas resolution**: calculate an effective DPR from CSS width, CSS height, device DPR, and the active profile's megapixel budget. The result is clamped to a positive value no greater than the device DPR. Canvas dimensions are rounded and their product may not exceed the profile budget.
2. **Animation density**: expose a density multiplier for animation modules. Manual profiles have fixed multipliers; `auto` changes its effective level based on a moving render-time signal.

The profiles are:

| Profile | Canvas budget | Density | Behavior |
| --- | ---: | ---: | --- |
| `economy` | 6 MP | 0.5 | Prioritizes battery, thermals, and older GPUs. |
| `balanced` | 12 MP | 0.75 | Predictable quality on most displays. |
| `high` | 20 MP | 1 | Maximum supported Canvas 2D quality. |
| `auto` | starts at 12 MP / 0.75 | adaptive | Lowers or restores its effective level from measured render cost. |

`auto` records the drawing duration with `performance.now()`. When the moving average exceeds 80% of the active render interval for at least 20 rendered frames, it lowers one effective quality level. It increases one level only after 300 consecutive rendered frames at or below 50% of that interval. Changes are capped between Economy and High. This hysteresis prevents frequent resolution reallocations and quality flicker.

The controller is pure and receives no DOM objects. `useAnimationLoop` owns the controller instance and re-evaluates canvas dimensions only when the observed CSS size, device DPR, or active profile changes.

### 3.2 Frame scheduling and logical time

`useAnimationLoop` continues requesting browser frames via `requestAnimationFrame`, but it tracks a separate `lastRenderTime`. If a browser callback is skipped by `fpsLimit`, the next drawing call receives elapsed time since the previous actual drawing call, capped at 100 ms. The same elapsed time advances playlist switching, anti-burn-in drift, FPS accounting, and animation state.

This corrects the existing behavior where `rawDt` is calculated for every browser callback but only accumulated into animation time on rendered callbacks. At 30 FPS on a 60 Hz display, that halves logical time.

The FPS monitor remains an optional React update at most four times per second. The loop must not subscribe React components to per-frame state.

### 3.3 Background and brightness composition

Introduce a `ScreensaverBackground` React component behind `ScreensaverCanvas`. It subscribes only to `background`, `color`, `gradientBackground`, and the resolved background image URL. It renders a CSS color, linear gradient, or cover image and changes only when one of those settings changes.

The canvas becomes transparent after `clearRect`; `useAnimationLoop` no longer calls `fillRect`, recreates a gradient, or draws the static background image every rendered frame. Existing animations still render on top of the same visual background.

Anti-burn-in keeps its in-canvas positional drift. Remove its sinusoidal CSS brightness pulse: it causes `canvas.style.filter` to change at display frequency and can force an extra compositor pass. The user-selected brightness is applied as a quantized CSS filter only when that setting changes. Canvas opacity follows the same setting-change-only policy.

### 3.4 Animation workload policy

The loop passes `renderDensity` to animation frames. Every animation derives its live object count from its existing count setting and this multiplier, preserving its documented minimums.

- **Particles and Starfield**: build one canvas path for all same-color circles, then call `fill()` once. Their pools reconcile to the quality-adjusted count rather than the raw setting. Starfield's existing `count * 2` remains its pre-quality base.
- **Bubbles**: pool size uses density. Replace per-frame `rgba()` string generation with cached colors rebuilt only when base color or opacity changes.
- **Matrix**: cap tail length and columns through density, cache alpha fill styles when its base color changes, and keep random glyph selection only for glyphs that are actually drawn.
- **Neon**: use density for nodes; Economy disables shadow blur, while other profiles retain the current glow.
- **Shapes**: use density for pool size while retaining the current minimum shape count.
- **DVD, Clock, Custom Logo, and Custom Text**: retain full density because each draws a single visual object. Clock may cache its `Intl.DateTimeFormat` formatter rather than allocating formatting options on every frame.

The `AnimationFrame` type gains an immutable `renderDensity: number` field. An animation must not read browser DPR or quality state directly.

### 3.5 Image storage and settings persistence

Replace Data URL persistence with a native IndexedDB image repository.

- The repository stores original `Blob` values under generated image IDs in a `watchman-assets` database.
- Settings retain only nullable image IDs (`backgroundImageId` and `customImageId`), not the binary content or a Data URL.
- A loader resolves IDs into object URLs for `ScreensaverBackground` and the custom-logo animation. Consumers revoke old object URLs when an image is replaced, cleared, or their component unmounts.
- Upload validation retains the existing image MIME check and 5 MiB source-file limit. The upload UI reports a storage failure without replacing the currently active image.
- Zustand persistence is versioned up from version 1. Its migration drops legacy Data URL image fields instead of trying to copy them to IndexedDB synchronously. Existing non-image settings are preserved. The UI clearly shows no image selected after this one-time migration.
- Persist only the serializable settings subset through `partialize`. Debounce storage writes by 250 ms after user-initiated changes, so slider drags do not serialize settings on each input event.

### 3.6 Settings and user-facing behavior

Add a `renderQuality` setting with values `auto`, `economy`, `balanced`, and `high`. The default is `auto`. The Settings panel adds a localized quality selector near FPS controls.

No advanced performance telemetry is persisted or displayed. The existing FPS monitor is enough for an end user; tests validate the controller's decisions.

---

## 4. Files and Responsibilities

| File | Change |
| --- | --- |
| `src/types/index.ts` | Add render-quality types, image ID settings, and `AnimationFrame.renderDensity`. |
| `src/utils/renderQuality.ts` | Pure profile constants, DPR/pixel-budget calculation, and adaptive-quality state transitions. |
| `src/utils/renderQuality.test.ts` | Unit coverage for budget boundaries, profile mappings, and hysteresis. |
| `src/services/imageStorage.ts` | IndexedDB Blob repository and object-URL loading lifecycle helpers. |
| `src/services/imageStorage.test.ts` | IndexedDB repository success, replacement, clear, and failure behavior. |
| `src/stores/settingsStore.ts` | Versioned persisted subset, migration, write debounce, and `renderQuality`. |
| `src/components/ScreensaverBackground.tsx` | Static CSS background layer with scoped store selectors. |
| `src/components/ScreensaverCanvas.tsx` | Stack canvas above the background without changing its viewport contract. |
| `src/components/SettingsPanel.tsx` | Quality selector and Blob-based image upload/clear handling. |
| `src/hooks/useAnimationLoop.ts` | Correct logical time, effective DPR, render measurement, transparent canvas, and setting-change-only styles. |
| `src/hooks/useAnimationLoop.test.ts` | Regression tests for 30 FPS logical time, style updates, and quality input wiring. |
| `src/animations/*.ts` | Consume render density and apply the module-specific batching/caching policy. |
| `src/services/i18n.ts` | Add localized quality labels in English and Portuguese. |

---

## 5. Error Handling

- If IndexedDB is unavailable or an operation fails, retain the current image and show a localized upload error. Other settings continue working.
- If an image ID cannot be loaded, render the configured color/gradient background or the existing custom-logo fallback; do not retry on every frame.
- If a calculated CSS size is zero, defer buffer allocation and drawing until `ResizeObserver` reports a non-zero size.
- If a device DPR changes after monitor movement or browser zoom, recalculate dimensions on the next observed resize or visibility restoration without exceeding the quality budget.
- A bad or missing persisted `renderQuality` value migrates to `auto`.

---

## 6. Verification Strategy

### Automated tests

- Verify every calculated canvas dimension stays within its profile's pixel budget, including 4K CSS dimensions and DPR values 1, 2, and 3.
- Verify `auto` lowers quality only after 20 over-budget frames and restores only after 300 headroom frames.
- Simulate a 60 Hz callback stream with `fpsLimit = 30`; assert an animation receives approximately one second of logical time after one wall-clock second.
- Assert brightness and opacity DOM styles are untouched across frames unless their settings change.
- Assert background rendering is delegated to the background component and the render loop does not create a gradient or fill a static background.
- Assert pools use `renderDensity`, and particles/starfield issue one `fill()` call for their shared-color path.
- Verify IndexedDB stores a Blob, settings JSON contains only image IDs, migration removes legacy Data URLs, and failed writes preserve the active image.

### Manual browser validation

- Profile all four quality modes in Chrome DevTools on 1080p and a high-DPR display; record canvas pixel dimensions, heap, frame time, and FPS with each dense animation.
- Confirm the default Auto mode uses at most 12 MP initially and reduces quality under deliberate load without visual flashing.
- Upload a valid image, reload the app, verify it remains available, then clear it and verify the object URL no longer appears in use.
- Exercise 30/60/120/unlimited FPS with DVD and clock; confirm movement and playlist timing match wall-clock time.

### Project checks

Run `npm run test`, `npm run lint`, and `npm run build` after the implementation tasks. Inspect the production bundle only for regressions; no bundle-size target is imposed because this work uses native browser APIs.

---

## 7. Rollout Order

1. Add types, pure quality logic, and unit tests.
2. Correct loop timing and pixel-budget allocation behind the new setting.
3. Move static backgrounds out of the loop and remove per-frame brightness composition.
4. Apply density, batching, and caching policies to animations.
5. Migrate image handling to IndexedDB and simplify persisted settings.
6. Add UI/i18n, run automated checks, and perform browser profiling.

Each stage must preserve a runnable application. The migration stage is intentionally after rendering changes so its persistence behavior can be tested in isolation.
