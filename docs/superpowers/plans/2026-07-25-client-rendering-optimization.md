# Client Rendering & Storage Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound Watchman's client-side Canvas memory and per-frame work while preserving animation timing and persisting uploaded images outside `localStorage`.

**Architecture:** A pure render-quality module converts a named quality profile into a canvas pixel budget and animation density; `useAnimationLoop` uses it to size the buffer, account for frame cost, and preserve elapsed time across skipped frames. Static backgrounds move into a React CSS layer, while image blobs reside in IndexedDB and settings retain only image IDs. Animations receive density through `AnimationFrame` and reduce or batch their Canvas API work without reading DOM state.

**Tech Stack:** React 18, TypeScript, Zustand 4 persistence middleware, Canvas 2D, native IndexedDB, Vitest, Testing Library, fake-indexeddb (development test polyfill).

## Global Constraints

- Add no production dependency for rendering, scheduling, or image storage.
- Keep `requestAnimationFrame` as the only render scheduler; do not add `setInterval`.
- Use four persisted render-quality values exactly: `auto`, `economy`, `balanced`, and `high`; the default is `auto`.
- Apply pixel budgets exactly: Economy 6 MP, Balanced 12 MP, High 20 MP; Auto initially uses Balanced and ranges only from Economy through High.
- An FPS cap must advance logical time by elapsed time since the last draw, capped at 100 ms.
- Images are maximum 5 MiB, are stored as `Blob`s in IndexedDB, and must not appear in the `watchman-settings` persisted JSON.
- Do not migrate legacy Data URL image contents. Migration must preserve non-image settings and clear legacy image values.
- Use existing `Select`, i18n dictionaries, Tailwind conventions, and `@/` imports.

---

### Task 1: Define render-quality contracts and pure controller

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/renderQuality.ts`
- Create: `src/utils/renderQuality.test.ts`

**Interfaces:**
- Produces: `RenderQuality`, `RenderQualityLevel`, `RenderQualityState`, `RenderQualityDecision`, `getCanvasDimensions`, and `nextAutoQualityState`.
- Consumes: `AnimationFrame` consumers receive its new required `renderDensity: number` property in later tasks.

- [ ] **Step 1: Write failing tests for the pixel cap and auto-quality hysteresis**

```ts
import { describe, expect, it } from 'vitest';
import {
  getCanvasDimensions,
  initialAutoQualityState,
  nextAutoQualityState,
} from './renderQuality';

describe('getCanvasDimensions', () => {
  it('limits a 4K DPR-3 buffer to the balanced 12 MP budget', () => {
    const result = getCanvasDimensions({ cssWidth: 3840, cssHeight: 2160, deviceDpr: 3, level: 'balanced' });
    expect(result.width * result.height).toBeLessThanOrEqual(12_000_000);
    expect(result.dpr).toBeLessThan(3);
  });
});

describe('nextAutoQualityState', () => {
  it('lowers after exactly 20 over-budget rendered frames', () => {
    let state = initialAutoQualityState();
    for (let frame = 0; frame < 19; frame++) state = nextAutoQualityState(state, 15, 16);
    expect(state.level).toBe('balanced');
    state = nextAutoQualityState(state, 15, 16);
    expect(state.level).toBe('economy');
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `rtk npm test -- src/utils/renderQuality.test.ts`

Expected: FAIL because `renderQuality.ts` does not exist.

- [ ] **Step 3: Add exact types and controller implementation**

In `src/types/index.ts`, add the quality types and fields:

```ts
export type RenderQuality = 'auto' | 'economy' | 'balanced' | 'high';
export type RenderQualityLevel = Exclude<RenderQuality, 'auto'>;

export interface Settings {
  // existing settings
  renderQuality: RenderQuality;
  backgroundImageId: string | null;
  customImageId: string | null;
}

export interface AnimationFrame {
  // existing fields
  renderDensity: number;
  customImageUrl: string | null;
}
```

Implement `src/utils/renderQuality.ts` with profile constants and no DOM reads:

```ts
import type { RenderQualityLevel } from '@/types';

export const QUALITY_PROFILES = {
  economy: { maxPixels: 6_000_000, density: 0.5 },
  balanced: { maxPixels: 12_000_000, density: 0.75 },
  high: { maxPixels: 20_000_000, density: 1 },
} as const;

export const getCanvasDimensions = ({ cssWidth, cssHeight, deviceDpr, level }: {
  cssWidth: number; cssHeight: number; deviceDpr: number; level: RenderQualityLevel;
}) => {
  const maxPixels = QUALITY_PROFILES[level].maxPixels;
  const cappedDpr = Math.min(Math.max(deviceDpr || 1, 1), Math.sqrt(maxPixels / Math.max(cssWidth * cssHeight, 1)));
  return { dpr: cappedDpr, width: Math.max(1, Math.floor(cssWidth * cappedDpr)), height: Math.max(1, Math.floor(cssHeight * cappedDpr)) };
};
```

Represent auto state as `{ level, overBudgetFrames, headroomFrames }`. Reset the opposite counter after every observation; move down after 20 samples above `intervalMs * 0.8`, move up after 300 samples at or below `intervalMs * 0.5`, and clamp the order `economy → balanced → high`.

- [ ] **Step 4: Complete boundary and restoration coverage**

Add tests for 6/12/20 MP profile boundaries, zero CSS dimensions, DPR 1 preservation, no downgrade before frame 20, no upgrade before frame 300, and no transition beyond Economy/High. Test `renderDensity` equals 0.5, 0.75, and 1 for those respective levels.

- [ ] **Step 5: Run focused tests and commit**

Run: `rtk npm test -- src/utils/renderQuality.test.ts`

Expected: PASS.

```bash
rtk git add src/types/index.ts src/utils/renderQuality.ts src/utils/renderQuality.test.ts
rtk git commit -m "feat: add adaptive render quality controller"
```

### Task 2: Migrate settings to image IDs and a debounced persisted subset

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Create: `src/stores/settingsStore.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `RenderQuality` and nullable `backgroundImageId`/`customImageId` from Task 1.
- Produces: `SettingsState.set`, `patch`, and `reset` with the new settings; exported `migrateSettings`; `watchman-settings` version 2 persists only serializable settings.

- [ ] **Step 1: Write failing migration and persistence tests**

Use a storage spy that records the final payload. Test that legacy version-1 input preserves `animationId` and `speed`, produces `backgroundImageId: null` and `customImageId: null`, and contains neither `data:image` nor the old `backgroundImage`/`customImage` keys after hydration. Test multiple `set('speed', ...)` calls within 250 ms result in one `setItem` call after fake timers advance.

```ts
it('removes legacy Data URLs while preserving scalar settings', () => {
  const migrated = migrate({ state: { ...defaultSettings, speed: 2, backgroundImage: 'data:image/png;base64,abc' }, version: 1 }, 1);
  expect(migrated).toMatchObject({ speed: 2, backgroundImageId: null, customImageId: null });
  expect(migrated).not.toHaveProperty('backgroundImage');
});
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `rtk npm test -- src/stores/settingsStore.test.ts`

Expected: FAIL because the store is version 1 and exposes Data URL fields.

- [ ] **Step 3: Implement version-2 settings and debounced storage adapter**

Replace the Data URL members in `defaultSettings` with:

```ts
renderQuality: 'auto',
backgroundImageId: null,
customImageId: null,
```

Define `PersistedSettings = Omit<SettingsState, 'set' | 'patch' | 'reset'>` and export a pure `migrateSettings(persistedState: unknown, version: number): Partial<Settings>` for direct unit tests. Use `partialize` to return only the explicitly enumerated `Settings` fields. Supply a `storage` adapter that delays `setItem` by 250 ms, cancels its prior timer for the same key, and delegates `getItem`/`removeItem` immediately to `createJSONStorage(() => localStorage)`. Set `version: 2` and use this migration:

```ts
migrate: (persistedState, version) => {
  const legacy = persistedState as Partial<Settings> & { backgroundImage?: unknown; customImage?: unknown };
  if (version < 2) {
    const { backgroundImage: _backgroundImage, customImage: _customImage, ...scalarSettings } = legacy;
    return { ...defaultSettings, ...scalarSettings, backgroundImageId: null, customImageId: null };
  }
  return { ...defaultSettings, ...legacy };
},
```

- [ ] **Step 4: Make reset preserve the new complete defaults and run tests**

Ensure `reset` writes a fresh spread (`set({ ...defaultSettings })`) so state cannot be mutated through a shared object reference. Run: `rtk npm test -- src/stores/settingsStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/types/index.ts src/stores/settingsStore.ts src/stores/settingsStore.test.ts
rtk git commit -m "feat: migrate settings to lightweight persisted state"
```

### Task 3: Store uploaded image Blobs in IndexedDB and resolve object URLs

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/test/setup.ts`
- Replace: `src/utils/file.ts`
- Create: `src/services/imageStorage.ts`
- Create: `src/services/imageStorage.test.ts`
- Create: `src/hooks/useStoredImage.ts`
- Create: `src/hooks/useStoredImage.test.ts`

**Interfaces:**
- Produces: `validateImageFile(file): void`, `imageStorage.save(file): Promise<string>`, `imageStorage.get(id): Promise<Blob | null>`, `imageStorage.remove(id): Promise<void>`, and `useStoredImage(id: string | null): { url: string | null; error: Error | null }`.
- Consumes: image IDs from Task 2. Later background and logo components consume only `useStoredImage`.

- [ ] **Step 1: Add an IndexedDB test environment and write repository failures first**

Install `fake-indexeddb` as a development dependency, then import `fake-indexeddb/auto` in `src/test/setup.ts`. In `imageStorage.test.ts`, test these cases: saving a PNG returns an ID and stores the exact Blob, `get` returns `null` for unknown IDs, replacement flow removes the old ID only after saving a new Blob, and a rejected transaction surfaces an `Error`.

```ts
it('round-trips a Blob without converting it to a Data URL', async () => {
  const file = new File(['pixel'], 'pixel.png', { type: 'image/png' });
  const id = await imageStorage.save(file);
  const blob = await imageStorage.get(id);
  expect(blob).toBeInstanceOf(Blob);
  expect(await blob?.text()).toBe('pixel');
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `rtk npm test -- src/services/imageStorage.test.ts`

Expected: FAIL because the repository and test IndexedDB setup do not exist.

- [ ] **Step 3: Replace Data URL conversion with validation and an IndexedDB repository**

Keep the existing MIME and 5 MiB checks, but export `validateImageFile` instead of `readImageAsDataUrl`:

```ts
export const validateImageFile = (file: File): void => {
  if (!file.type.startsWith('image/')) throw new Error('Not an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size exceeds 5MB limit');
};
```

Implement database `watchman-assets`, version 1, object store `images`. `save` validates then writes `{ id: crypto.randomUUID(), blob: file }`; `get` reads that record and returns its Blob; `remove` deletes its ID. Wrap `IDBRequest` and transaction completion in Promises and reject `onerror`/`onabort` with `transaction.error ?? new Error('Image storage failed')`.

- [ ] **Step 4: Implement object-URL lifecycle and its test**

Implement `useStoredImage` with one effect keyed by `id`. It calls `imageStorage.get(id)`, creates a URL only when the effect is current, and revokes the created URL in cleanup. Add a test that stubs `URL.createObjectURL`/`URL.revokeObjectURL`, changes the rendered ID, and asserts the old URL is revoked on replacement and unmount.

```ts
useEffect(() => {
  let active = true;
  let url: string | null = null;
  if (!id) { setState({ url: null, error: null }); return; }
  void imageStorage.get(id).then((blob) => {
    if (!active) return;
    url = blob ? URL.createObjectURL(blob) : null;
    setState({ url, error: null });
  }).catch((error: unknown) => active && setState({ url: null, error: Error(error) }));
  return () => { active = false; if (url) URL.revokeObjectURL(url); };
}, [id]);
```

- [ ] **Step 5: Run focused tests and commit**

Run: `rtk npm test -- src/services/imageStorage.test.ts src/hooks/useStoredImage.test.ts src/utils/file.test.ts`

Expected: PASS.

```bash
rtk git add package.json package-lock.json src/test/setup.ts src/utils/file.ts src/services/imageStorage.ts src/services/imageStorage.test.ts src/hooks/useStoredImage.ts src/hooks/useStoredImage.test.ts src/utils/file.test.ts
rtk git commit -m "feat: store uploaded images in indexeddb"
```

### Task 4: Render static backgrounds in a scoped CSS layer and wire image controls

**Files:**
- Create: `src/components/ScreensaverBackground.tsx`
- Create: `src/components/ScreensaverBackground.test.tsx`
- Modify: `src/components/ScreensaverCanvas.tsx`
- Modify: `src/pages/PlayerPage.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Create: `src/components/SettingsPanel.test.tsx`
- Modify: `src/services/i18n.ts`
- Modify: `src/animations/customLogo.ts`
- Create: `src/animations/customLogo.test.ts`

**Interfaces:**
- Consumes: `useStoredImage`, `backgroundImageId`, `customImageId`, and `imageStorage` from Tasks 2–3.
- Produces: a background layer below the transparent canvas and upload actions that atomically replace IDs only after a successful save.

- [ ] **Step 1: Write background and upload behavior tests**

Test that `ScreensaverBackground` renders a color background, a CSS `linear-gradient` when enabled, and `backgroundImage` URL when its ID resolves. Test that SettingsPanel calls `imageStorage.save(file)` before `s.set('backgroundImageId', id)`, leaves the old ID unchanged on failure, and removes the old Blob only after a successful replacement.

- [ ] **Step 2: Run the new component tests to verify they fail**

Run: `rtk npm test -- src/components/ScreensaverBackground.test.tsx src/animations/customLogo.test.ts`

Expected: FAIL because the component and ID-based image flow do not exist.

- [ ] **Step 3: Implement the background layer and stack order**

`ScreensaverBackground` must use individual Zustand selectors rather than `useSettings()` without a selector. Derive its style exactly as follows:

```ts
const style: CSSProperties = backgroundUrl
  ? { backgroundImage: `url("${backgroundUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' }
  : gradientBackground
    ? { backgroundImage: `linear-gradient(135deg, ${background}, ${color})` }
    : { backgroundColor: background };
```

Render it as `<div aria-hidden="true" className="absolute inset-0" style={style} />` immediately before `<ScreensaverCanvas>`. Keep the canvas `absolute inset-0` and give it `z-10`; raise existing controls/panels only where needed so interactions remain unchanged.

- [ ] **Step 4: Update custom-logo and upload/clear actions**

In `PlayerPage`, resolve `customImageId` through `useStoredImage` and call `useAnimationLoop({ canvasRef, paused, onFps, customImageUrl: customImage.url })`. Add `customImageUrl: string | null` to the loop's `Options` interface and its effect dependency list. In `customLogo`, use `frame.customImageUrl`; create an `Image` only when that URL changes and retain the existing textual fallback.

In SettingsPanel, replace each `readImageAsDataUrl` callback with an async handler:

```ts
const replaceImage = async (key: 'backgroundImageId' | 'customImageId', file: File) => {
  const previousId = s[key];
  try {
    const nextId = await imageStorage.save(file);
    s.set(key, nextId);
    if (previousId) await imageStorage.remove(previousId);
  } catch (error) {
    setUploadError(error instanceof Error ? error.message : t('settings.imageSaveFailed'));
  }
};
```

On clear, set the ID to `null` first, then call `imageStorage.remove(previousId)` and report an error only if cleanup fails. Add `settings.quality`, four quality-option labels, and `settings.imageSaveFailed` to both dictionaries.

- [ ] **Step 5: Run focused tests and commit**

Run: `rtk npm test -- src/components/ScreensaverBackground.test.tsx src/components/SettingsPanel.test.tsx src/animations/customLogo.test.ts`

Expected: PASS. If `SettingsPanel.test.tsx` is newly needed for upload behavior, include it in this task and in the commit.

```bash
rtk git add src/components/ScreensaverBackground.tsx src/components/ScreensaverBackground.test.tsx src/components/ScreensaverCanvas.tsx src/pages/PlayerPage.tsx src/components/SettingsPanel.tsx src/components/SettingsPanel.test.tsx src/services/i18n.ts src/animations/customLogo.ts src/animations/customLogo.test.ts src/types/index.ts
rtk git commit -m "feat: separate static background from canvas rendering"
```

### Task 5: Make the animation loop pixel-budgeted and time-correct

**Files:**
- Modify: `src/hooks/useAnimationLoop.ts`
- Modify: `src/hooks/useAnimationLoop.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `getCanvasDimensions`, `initialAutoQualityState`, `nextAutoQualityState`, profile density, settings render quality, and a resolved custom-image URL from Tasks 1–4.
- Produces: `AnimationFrame` values with correct `dt`, `time`, `renderDensity`, and image URL; transparent canvas output.

- [ ] **Step 1: Write failing time, sizing, and style-update regressions**

Extend the animation-loop tests with a controllable animation factory. Simulate callbacks at 0, 16, 33, 50, … ms with `fpsLimit = 30`; capture each `AnimationFrame.dt` and assert the sum is approximately 1 second after 1 second of callbacks. Stub a 3840×2160 canvas and DPR 3; assert canvas dimensions do not exceed 12,000,000 pixels in default Auto. With anti-burn-in enabled, invoke several frames and assert `canvas.style.filter` is set once unless brightness changes.

- [ ] **Step 2: Run the loop tests to verify they fail**

Run: `rtk npm test -- src/hooks/useAnimationLoop.test.ts`

Expected: FAIL on the 30 FPS elapsed-time and default pixel-budget assertions.

- [ ] **Step 3: Replace fixed DPR sizing and raw callback time**

Replace `Math.min(window.devicePixelRatio || 1, 3)` with the active profile calculation. Keep `cssW`/`cssH` in CSS pixels, update `canvas.width`/`height` only if the calculated integer dimensions differ, and do not allocate for a zero-size canvas.

Track these separate values:

```ts
let lastCallbackTime = performance.now();
let lastRenderTime = lastCallbackTime;
let autoState = initialAutoQualityState();

const elapsedSinceRender = Math.min((now - lastRenderTime) / 1000, 0.1);
```

Apply the FPS accumulator using callback elapsed time. When it permits drawing, set `lastRenderTime = now`, and use `elapsedSinceRender` for `dt`, `time`, playlist switching, drift, and FPS accounting. Keep `lastCallbackTime` solely for cap accumulation.

- [ ] **Step 4: Remove background work and per-frame filter mutation; measure drawing**

Delete background image/gradient state and `drawBackground`. Each rendered frame calls only `ctx.clearRect` before the animation. Compute `brightness` directly from `s.brightness`; do not apply the sinusoidal anti-burn-in multiplier. Keep `lastFilter` and `lastOpacity`, but derive both only from their user settings.

Measure draw cost around `instance.draw`:

```ts
const drawStartedAt = performance.now();
instance.draw(frame);
const drawMs = performance.now() - drawStartedAt;
if (s.renderQuality === 'auto') autoState = nextAutoQualityState(autoState, drawMs, intervalMs);
```

When an auto transition changes level, call the same resize function before the next draw. Pass `QUALITY_PROFILES[effectiveLevel].density` as `renderDensity`.

- [ ] **Step 5: Run focused tests and commit**

Run: `rtk npm test -- src/hooks/useAnimationLoop.test.ts`

Expected: PASS.

```bash
rtk git add src/hooks/useAnimationLoop.ts src/hooks/useAnimationLoop.test.ts src/types/index.ts
rtk git commit -m "fix: bound canvas rendering and preserve frame timing"
```

### Task 6: Apply density, batching, and allocation reductions to animations

**Files:**
- Modify: `src/animations/particles.ts`
- Modify: `src/animations/starfield.ts`
- Modify: `src/animations/bubbles.ts`
- Modify: `src/animations/matrix.ts`
- Modify: `src/animations/neon.ts`
- Modify: `src/animations/shapes.ts`
- Modify: `src/animations/clock.ts`
- Create: `src/animations/rendering.test.ts`

**Interfaces:**
- Consumes: `AnimationFrame.renderDensity` from Task 5.
- Produces: dense-animation work bounded by quality while preserving established animation minimums and visuals.

- [ ] **Step 1: Write failing draw-call and density tests**

Provide a mock Canvas context recording `beginPath`, `arc`, `fill`, `fillText`, `shadowBlur`, and style assignments. Draw particles and starfield with count 100 and `renderDensity: 0.5`; assert the mock receives 50 arcs (100 for Starfield's `count * 2 * 0.5`) and one `fill` per animation. Draw Neon with Economy density and assert no nonzero shadow blur. Draw Matrix at 0.5 density and assert fewer text calls than at density 1.

- [ ] **Step 2: Run the animation rendering test to verify it fails**

Run: `rtk npm test -- src/animations/rendering.test.ts`

Expected: FAIL because animations neither receive density nor batch fills.

- [ ] **Step 3: Implement count derivation and circle batching**

Use a shared local formula in every pool-based animation:

```ts
const densityCount = (raw: number, minimum: number) => Math.max(minimum, Math.round(raw * renderDensity));
```

For particles and starfield, move `ctx.beginPath()` before their loop, append every `arc`, and call `ctx.fill()` after it. Continue updating each particle/star even if it lies outside the viewport; add an arc only when the star is visible. Do not change the pool-reconciliation behavior other than using density-adjusted counts.

- [ ] **Step 4: Implement module-specific allocation reductions**

- Bubbles: rebuild a `Map<number, { fill: string; stroke: string }>` only when `settings.color` or `settings.opacity` changes; index it by each bubble's rounded alpha bucket instead of calling `rgba()` in the frame loop.
- Matrix: compute `columns = Math.max(1, Math.floor((width / font) * renderDensity))` and `tail = Math.max(4, Math.round(18 * renderDensity))`; rebuild the tail alpha-style array when `settings.color` changes.
- Neon: use density-adjusted node count and set `ctx.shadowBlur = renderDensity <= 0.5 ? 0 : 24`; only assign `shadowColor` when blur is nonzero.
- Shapes: apply density to its existing `Math.round(settings.count / 8)` base and preserve `minimum = 6`.
- Clock: create `const formatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })` once in `createClock` and use `formatter.format(now)` in `draw`.

- [ ] **Step 5: Run focused tests and commit**

Run: `rtk npm test -- src/animations/rendering.test.ts src/animations/playlist.test.ts`

Expected: PASS.

```bash
rtk git add src/animations/particles.ts src/animations/starfield.ts src/animations/bubbles.ts src/animations/matrix.ts src/animations/neon.ts src/animations/shapes.ts src/animations/clock.ts src/animations/rendering.test.ts
rtk git commit -m "perf: scale animation work to render quality"
```

### Task 7: Verify the integrated rendering path and document browser evidence

**Files:**
- Modify: `README.md`
- Modify: `src/hooks/useAnimationLoop.test.ts`
- Modify: `src/components/SettingsPanel.test.tsx`

**Interfaces:**
- Consumes: all completed rendering, storage, and UI interfaces.
- Produces: end-to-end regression coverage and user-facing quality guidance.

- [ ] **Step 1: Add integration-level regressions**

Add a Player-page or loop integration test that selects `renderQuality: 'economy'`, enables Matrix, and confirms the loop provides `renderDensity: 0.5`. Add a settings test that switches quality to High and verifies Zustand state changes to `'high'`; test a persisted serialized settings value contains `backgroundImageId` but not blob or Data URL content.

- [ ] **Step 2: Run the integration tests to verify they fail before their assertions are implemented**

Run: `rtk npm test -- src/hooks/useAnimationLoop.test.ts src/components/SettingsPanel.test.tsx`

Expected: FAIL only if a required assertion is missing; otherwise update the tests to cover the final public contracts and continue to Step 3.

- [ ] **Step 3: Add concise operational documentation**

Add a README section titled `## Rendering quality` that states:

```markdown
Watchman starts in **Auto** quality. It begins with a 12 MP canvas budget and reduces resolution and animation density only after sustained frame pressure. Use Economy for battery-sensitive or older devices; choose High for displays with sufficient GPU headroom. Uploaded background and logo images stay in this browser through IndexedDB and are limited to 5 MiB.
```

- [ ] **Step 4: Run the complete automated verification suite**

Run each command separately:

```bash
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected: all commands exit 0. Fix only failures caused by this feature; report unrelated pre-existing failures separately.

- [ ] **Step 5: Capture manual browser profiling evidence**

In Chrome DevTools Performance/Memory, collect one 30-second trace for each of these scenarios: DVD at Auto on 1080p; Matrix at Auto on a high-DPR display; Starfield at High on a high-DPR display; and Matrix at Economy. Record canvas dimensions, `width × height`, peak JS heap, average frame duration, and displayed FPS. Confirm every buffer is at or below its active profile budget and that Auto does not change quality more than once during recovery.

- [ ] **Step 6: Commit**

```bash
rtk git add README.md src/hooks/useAnimationLoop.test.ts src/components/SettingsPanel.test.tsx
rtk git commit -m "docs: document adaptive rendering quality"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1 and 5 implement megapixel budgeting, Auto hysteresis, and correct logical time. Task 4 separates static composition and removes frame-frequency brightness updates. Task 6 covers every animation policy from the spec. Tasks 2–4 implement image-ID persistence, IndexedDB Blob storage, validation, object URL cleanup, migration, debounce, UI, and i18n. Task 7 validates the complete behavior and collects browser evidence.
- **Placeholder scan:** The plan contains no unresolved work markers, deferred implementation, or undefined interface names. New interfaces are declared in each task before later tasks consume them.
- **Type consistency:** `RenderQuality` is the persisted user choice, `RenderQualityLevel` is the effective non-auto level, image settings use `backgroundImageId`/`customImageId`, and every animation receives `AnimationFrame.renderDensity`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-client-rendering-optimization.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** — execute tasks in this session in batches with checkpoints.

Which approach?
