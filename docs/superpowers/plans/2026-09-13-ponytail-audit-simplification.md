# Ponytail Audit Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Eliminate over-engineering, speculative abstractions, hand-rolled standard APIs, redundant wrappers, and dead code identified in the repo-wide ponytail audit, shrinking the codebase by ~600 lines and reducing 2 heavy dependencies (`react-router-dom`, `playwright`).

**Architecture:** Incrementally strip unused abstractions and wrappers without degrading UX or screensaver safety. Replace hand-rolled custom mechanisms with standard browser and React idioms (HTML5 `<dialog>` modal semantics, native CSS hex alpha `#rrggbbaa`, simple hash routing), merge single-caller helper files into their consumers, and maintain 100% green test and lint gates after every single step.

**Tech Stack:** TypeScript 5.6, React 19, Vite 5.4, Tailwind CSS v4, Vitest 4.1.

**Spec:** Ponytail repo-wide audit findings (2026-09-13).

## Global Constraints

- Maintain all existing user-facing features: screensaver canvas animations, anti-burn-in drift, digital clock localization, custom text/logo, shortcuts, settings drawer, and dark/light themes.
- Vitest test suite (`npm test`) must pass cleanly after each task.
- Zero TypeScript compiler errors (`npx tsc -b`) and zero ESLint errors (`npm run lint`).
- Atomic conventional commits (`refactor:`, `chore:`, `perf:`, `fix:`) per task.
- No new external runtime or build dependencies.

---

### Task 1: Fix Nested `useEffect` Hook in `useAnimationLoop.ts`

**Files:**
- Modify: `src/hooks/useAnimationLoop.ts:40-54`
- Test: `src/hooks/useAnimationLoop.test.ts`

**Interfaces:**
- Consumes: Standard React hooks (`useEffect`, `useRef`), `document.addEventListener('visibilitychange')`.
- Produces: Correct visibility-change listener attached in the main hook effect without violating React Rules of Hooks.

- [x] **Step 1: Write failing test / verify existing failure**

Run: `npx vitest run src/hooks/useAnimationLoop.test.ts`
Expected: FAIL with `Error: Invalid hook call. Hooks can only be called inside of the body of a function component.`

- [x] **Step 2: Replace nested `useEffect` with direct listener inside outer effect**

In `src/hooks/useAnimationLoop.ts`, remove the nested `useEffect` call inside the effect callback. Attach the `visibilitychange` listener directly in the outer effect:

```typescript
    let visible = !document.hidden;
    const handleVisibilityChange = () => {
      visible = !document.hidden;
      if (visible && !raf) {
        lastCallbackTime = performance.now();
        lastRenderTime = lastCallbackTime;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
```
Ensure `document.removeEventListener('visibilitychange', handleVisibilityChange)` is called in the outer effect cleanup function.

- [x] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/hooks/useAnimationLoop.test.ts`
Expected: PASS (all tests in `useAnimationLoop.test.ts` passing).

- [x] **Step 4: Commit**

```bash
git add src/hooks/useAnimationLoop.ts
git commit -m "fix(loop): remove invalid nested useEffect hook in animation loop"
```

---

### Task 2: Delete Unused `clamp` Helper in `src/utils/math.ts`

**Files:**
- Modify: `src/utils/math.ts:1-3`
- Test: `src/utils/math.ts`

**Interfaces:**
- Consumes: Standard `Math` functions.
- Produces: Stripped `math.ts` with only genuinely used utilities (`rand`, `randInt`, `pick`).

- [x] **Step 1: Verify `clamp` has zero usages**

Run: `git grep "clamp(" src/`
Expected: Only the definition in `src/utils/math.ts`.

- [x] **Step 2: Delete `clamp` from `src/utils/math.ts`**

Remove lines 1-2 from `src/utils/math.ts`:
```typescript
// DELETE:
// export const clamp = (v: number, min: number, max: number): number =>
//   v < min ? min : v > max ? max : v;
```

- [x] **Step 3: Run typecheck and tests**

Run: `npx tsc -b && npm test`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit**

```bash
git add src/utils/math.ts
git commit -m "chore(utils): delete unused clamp helper"
```

---

### Task 3: Delete Unused `patch` Action on `SettingsState`

**Files:**
- Modify: `src/stores/settingsStore.ts:29-35,106-115`
- Modify: `src/stores/settingsStore.test.ts` (if `patch` was referenced)
- Modify: `src/components/SettingsPanel.test.tsx`
- Modify: `src/hooks/useKeyboardShortcuts.test.ts`
- Modify: `src/hooks/useAnimationLoop.test.ts`

**Interfaces:**
- Consumes: `SettingsState` in `settingsStore.ts`.
- Produces: `SettingsState` exposing only `set` and `reset`. Tests using `useSettings.getState().patch(...)` updated to `useSettings.setState(...)` or multiple `set(...)`.

- [x] **Step 1: Inspect test usages of `patch`**

Check references with `git grep "\.patch(" src/`.
Notice `patch` is only called in test files to set multiple mock values at once. In Zustand, `useSettings.setState({ ... })` already provides native partial state patching for tests without cluttering the production interface.

- [x] **Step 2: Remove `patch` from `SettingsState` and update test files to `setState`**

In `src/stores/settingsStore.ts`:
```typescript
export interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}
```
Remove `patch: (partial) => set(partial)` from the store creator.
In `SettingsPanel.test.tsx`, `useAnimationLoop.test.ts`, and `useKeyboardShortcuts.test.ts`, replace `useSettings.getState().patch(x)` with `useSettings.setState(x)`.

- [x] **Step 3: Run typecheck and tests**

Run: `npx tsc -b && npm test`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit**

```bash
git add src/stores/settingsStore.ts src/components/SettingsPanel.test.tsx src/hooks/useAnimationLoop.test.ts src/hooks/useKeyboardShortcuts.test.ts
git commit -m "refactor(store): delete unused patch action in favor of native setState"
```

---

### Task 4: Shrink Manual Property-by-Property Copy in `partialize`

**Files:**
- Modify: `src/stores/settingsStore.ts:82-105`
- Test: `src/stores/settingsStore.test.ts`

**Interfaces:**
- Consumes: `SettingsState`
- Produces: `PersistedSettings` without 23 lines of manual field copying.

- [x] **Step 1: Write test for persisted state shape**

In `src/stores/settingsStore.test.ts`, ensure test verifies all scalar settings persist into storage and action methods (`set`, `reset`) are omitted.

- [x] **Step 2: Replace manual object mapping with concise destructuring**

In `src/stores/settingsStore.ts`:
```typescript
// Replace lines 82-104:
const partialize = ({ set, reset, ...persisted }: SettingsState): PersistedSettings => persisted;
```

- [x] **Step 3: Run tests**

Run: `npx vitest run src/stores/settingsStore.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/stores/settingsStore.ts
git commit -m "refactor(store): shrink partialize via rest destructuring"
```

---

### Task 5: Remove Custom `debouncedStorage` and `PlayerPage` Pagehide Workaround

**Files:**
- Modify: `src/stores/settingsStore.ts:57-81`
- Modify: `src/pages/PlayerPage.tsx:80-101`
- Test: `src/stores/settingsStore.test.ts`

**Interfaces:**
- Consumes: Standard `localStorage`.
- Produces: Direct synchronous persistence on user settings changes; eliminates `writeTimers` map and emergency `pagehide`/`visibilitychange` localStorage flush handlers in `PlayerPage`.

- [x] **Step 1: Verify persistence expectations in `settingsStore.test.ts`**

Inspect `src/stores/settingsStore.test.ts` for any timer-advancing mocks (`vi.advanceTimersByTime(250)`).

- [x] **Step 2: Simplify storage in `settingsStore.ts` and remove pagehide flush in `PlayerPage.tsx`**

In `src/stores/settingsStore.ts`:
Replace `storage: debouncedStorage` with `storage: createJSONStorage(() => localStorage)`.
Delete `const writeTimers = new Map<...>()` and `const debouncedStorage = { ... }`.

In `src/pages/PlayerPage.tsx`:
Delete the entire second `useEffect` hook listening to `pagehide` and `visibilitychange` for flushing `localStorage.setItem('watchman-settings', ...)`.

- [x] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add src/stores/settingsStore.ts src/pages/PlayerPage.tsx
git commit -m "refactor(store): remove debounced storage and redundant pagehide flush listeners"
```

---

### Task 6: Inline `ScreensaverCanvas` Single-Caller Wrapper Component

**Files:**
- Delete: `src/components/ScreensaverCanvas.tsx`
- Modify: `src/pages/PlayerPage.tsx:3,107`
- Test: `src/pages/PlayerPage.tsx`

**Interfaces:**
- Consumes: Standard `<canvas ref={canvasRef} className="absolute inset-0 z-10 block h-full w-full" />`.
- Produces: Direct `<canvas>` element in `PlayerPage`, removing wrapper component file and forwardRef boilerplate.

- [x] **Step 1: Verify single caller**

Run: `git grep "ScreensaverCanvas" src/`
Expected: Only in `src/pages/PlayerPage.tsx` and its own definition.

- [x] **Step 2: Inline `<canvas>` in `PlayerPage.tsx` and delete `ScreensaverCanvas.tsx`**

In `src/pages/PlayerPage.tsx`:
Remove `import { ScreensaverCanvas } from '@/components/ScreensaverCanvas';`.
Replace `<ScreensaverCanvas ref={canvasRef} />` with:
```tsx
<canvas ref={canvasRef} className="absolute inset-0 z-10 block h-full w-full" />
```
Delete `src/components/ScreensaverCanvas.tsx`.

- [x] **Step 3: Run tests and typecheck**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/components/ScreensaverCanvas.tsx
git add src/pages/PlayerPage.tsx
git commit -m "refactor(ui): inline ScreensaverCanvas wrapper into PlayerPage"
```

---

### Task 7: Inline `CenteredLayout` Single-Caller Wrapper Component

**Files:**
- Delete: `src/layouts/CenteredLayout.tsx`
- Modify: `src/pages/HomePage.tsx:3,18,46`
- Test: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: Centered stage styles with gradient blur circles.
- Produces: Direct `<main>` layout element in `HomePage.tsx`.

- [x] **Step 1: Verify single caller**

Run: `git grep "CenteredLayout" src/`
Expected: Only in `src/pages/HomePage.tsx`.

- [x] **Step 2: Inline layout markup into `HomePage.tsx` and remove layout file**

In `src/pages/HomePage.tsx`:
Replace `<CenteredLayout>...</CenteredLayout>` with:
```tsx
<main className="relative flex min-h-full items-center justify-center overflow-hidden bg-neutral-100 px-4 text-neutral-900 dark:bg-neutral-950 dark:text-white">
  <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
  <div className="pointer-events-none absolute bottom-0 right-0 h-[60vh] w-[60vh] rounded-full bg-fuchsia-500/10 blur-3xl" />
  <div className="relative z-10 w-full max-w-xl">
    {/* existing home page content */}
  </div>
</main>
```
Delete `src/layouts/CenteredLayout.tsx`.

- [x] **Step 3: Run tests and typecheck**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/layouts/CenteredLayout.tsx
git add src/pages/HomePage.tsx
git commit -m "refactor(ui): inline CenteredLayout into HomePage"
```

---

### Task 8: Inline `useTheme` Hook into `App.tsx`

**Files:**
- Delete: `src/hooks/useTheme.ts`
- Modify: `src/App.tsx:4,7`
- Test: `src/App.tsx`

**Interfaces:**
- Consumes: `useSettings((s) => s.theme)`.
- Produces: Direct 3-line `useEffect` in `App.tsx` toggling `'dark'` on `document.documentElement`.

- [x] **Step 1: Verify single caller**

Run: `git grep "useTheme" src/`
Expected: Only `src/App.tsx`.

- [x] **Step 2: Inline theme effect into `src/App.tsx` and delete `src/hooks/useTheme.ts`**

In `src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { useSettings } from '@/stores/settingsStore';

// In App component:
const theme = useSettings((s) => s.theme);
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}, [theme]);
```
Delete `src/hooks/useTheme.ts`.

- [x] **Step 3: Run tests and typecheck**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/hooks/useTheme.ts
git add src/App.tsx
git commit -m "refactor(theme): inline useTheme effect into App"
```

---

### Task 9: Consolidate Duplicated `densityCount` Helper across Animations

**Files:**
- Modify: `src/animations/bubbles.ts:14-16`
- Modify: `src/animations/neon.ts:12-14`
- Modify: `src/animations/particles.ts:11-13`
- Modify: `src/animations/shapes.ts:20-22`
- Modify: `src/animations/starfield.ts:10-12`
- Modify: `src/utils/math.ts`
- Test: `src/animations/rendering.test.ts`

**Interfaces:**
- Consumes: `raw: number`, `minimum: number`, `renderDensity: number`.
- Produces: Exported `densityCount` in `src/utils/math.ts`, removing duplicate definitions from all 5 animation files.

- [x] **Step 1: Add unit test in `src/animations/rendering.test.ts`**

Verify `densityCount(100, 10, 0.5)` yields `50`, and `densityCount(10, 10, 0.5)` yields minimum `10`.

- [x] **Step 2: Export `densityCount` in `src/utils/math.ts` and import across animations**

In `src/utils/math.ts`:
```typescript
export const densityCount = (raw: number, minimum: number, renderDensity: number): number =>
  Math.max(minimum, Math.round(raw * renderDensity));
```
Remove local `densityCount` declarations from `bubbles.ts`, `neon.ts`, `particles.ts`, `shapes.ts`, and `starfield.ts`, importing from `@/utils/math`.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/animations/rendering.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/utils/math.ts src/animations/bubbles.ts src/animations/neon.ts src/animations/particles.ts src/animations/shapes.ts src/animations/starfield.ts
git commit -m "refactor(animations): deduplicate densityCount helper into math utils"
```

---

### Task 10: Merge `animations/playlist.ts` into `animations/index.ts`

**Files:**
- Delete: `src/animations/playlist.ts`
- Modify: `src/animations/index.ts`
- Modify: `src/animations/playlist.test.ts`
- Modify: `src/hooks/useAnimationLoop.ts:3`
- Test: `src/animations/playlist.test.ts`

**Interfaces:**
- Consumes: `Settings`, `animationIds`.
- Produces: `getNextInPlaylist` exported directly from `@/animations`, eliminating circular/pass-through re-export file `playlist.ts`.

- [x] **Step 1: Check imports of `playlist.ts`**

Run: `git grep "animations/playlist" src/`
Expected: `src/hooks/useAnimationLoop.ts`, `src/animations/playlist.test.ts`.

- [x] **Step 2: Move `getNextInPlaylist` to `src/animations/index.ts` and delete `playlist.ts`**

In `src/animations/index.ts`:
```typescript
import type { Settings } from '@/types';

export const getNextInPlaylist = (s: Settings): string => {
  const list = s.playlist.length > 1 ? s.playlist : animationIds;
  if (s.playlistMode === 'random') {
    const others = list.filter((id) => id !== s.animationId);
    return others.length ? others[(Math.random() * others.length) | 0]! : s.animationId;
  }
  const i = list.indexOf(s.animationId);
  return list[(i + 1) % list.length]!;
};
```
Update imports in `useAnimationLoop.ts` and `playlist.test.ts` to import from `@/animations`. Delete `src/animations/playlist.ts`.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/animations/playlist.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/animations/playlist.ts
git add src/animations/index.ts src/hooks/useAnimationLoop.ts src/animations/playlist.test.ts
git commit -m "refactor(animations): merge getNextInPlaylist into animations module index"
```

---

### Task 11: Inline Single-Caller `isRelevant` Predicate and Remove Separate Module

**Files:**
- Delete: `src/animations/relevantControls.ts`
- Delete: `src/animations/relevantControls.test.ts`
- Modify: `src/components/SettingsPanel.tsx:6,98-150`
- Test: `src/components/SettingsPanel.test.tsx`

**Interfaces:**
- Consumes: `meta: AnimationMeta`, `control: PerModeControl`.
- Produces: Inline predicate in `SettingsPanel.tsx`: `const isRelevant = (c: PerModeControl) => !meta.controls || meta.controls.includes(c)`.

- [x] **Step 1: Verify single caller**

Run: `git grep "isRelevant" src/`
Expected: Only `src/components/SettingsPanel.tsx` and its test.

- [x] **Step 2: Inline predicate into `SettingsPanel.tsx` and delete separate module and test**

In `src/components/SettingsPanel.tsx`:
Remove `import { isRelevant } from '@/animations/relevantControls';`.
Define inside component:
```typescript
const isRelevant = (control: PerModeControl) => !meta.controls || meta.controls.includes(control);
```
Delete `src/animations/relevantControls.ts` and `src/animations/relevantControls.test.ts`.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/animations/relevantControls.ts src/animations/relevantControls.test.ts
git add src/components/SettingsPanel.tsx
git commit -m "refactor(settings): inline isRelevant predicate and remove isolated helper"
```

---

### Task 12: Inline Single-Caller `validateImageFile` into `imageStorage.ts`

**Files:**
- Delete: `src/utils/file.ts`
- Delete: `src/utils/file.test.ts`
- Modify: `src/services/imageStorage.ts:1,60-63`
- Test: `src/services/imageStorage.test.ts`

**Interfaces:**
- Consumes: `file: File`.
- Produces: Image size and type validation localized inside `imageStorage.ts`.

- [x] **Step 1: Verify single caller**

Run: `git grep "validateImageFile" src/`
Expected: Only `src/services/imageStorage.ts` and `src/utils/file.test.ts`.

- [x] **Step 2: Inline validation into `imageStorage.ts` and delete `file.ts` / `file.test.ts`**

In `src/services/imageStorage.ts`:
```typescript
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const validateImageFile = (file: File): void => {
  if (!file.type.startsWith('image/')) throw new Error('Not an image file');
  if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error('Image size exceeds 5MB limit');
};
```
Delete `src/utils/file.ts` and `src/utils/file.test.ts`.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/services/imageStorage.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/utils/file.ts src/utils/file.test.ts
git add src/services/imageStorage.ts
git commit -m "refactor(storage): inline validateImageFile into imageStorage"
```

---

### Task 13: Replace Hand-Rolled Regex `hexToRgb` Parser with Native CSS Hex Alpha

**Files:**
- Modify: `src/utils/color.ts:10-20`
- Modify: `src/utils/color.test.ts`
- Modify: `src/animations/bubbles.ts`
- Modify: `src/animations/matrix.ts`
- Test: `src/utils/color.test.ts`

**Interfaces:**
- Consumes: `hex: string`, `alpha: number` (0..1).
- Produces: Standard 8-digit hex `#rrggbbaa` (e.g. `#38bdf880`), eliminating regex parsing and parseInt allocations.

- [x] **Step 1: Write test for 8-digit hex with alpha formatting**

In `src/utils/color.test.ts`, verify `rgba('#38bdf8', 0.5)` produces valid Canvas/CSS 8-digit hex `#38bdf880` or rgba.

- [x] **Step 2: Simplify `rgba` implementation without regex**

In `src/utils/color.ts`:
```typescript
export const rgba = (hex: string, alpha: number): string => {
  const clean = hex.trim().replace(/^#/, '');
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
};
```
Remove `hexToRgb`. Update tests in `color.test.ts` to test `rgba` output.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/utils/color.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/utils/color.ts src/utils/color.test.ts
git commit -m "refactor(color): replace regex hex parser with native 8-digit hex alpha"
```

---

### Task 14: Replace Custom 58-Line `useFocusTrap` with Native HTML5 `<dialog>` Modal

**Files:**
- Delete: `src/hooks/useFocusTrap.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Test: `src/components/SettingsPanel.test.tsx`

**Interfaces:**
- Consumes: Browser native `<dialog>` element with `.showModal()`, `.close()`, and `cancel` event.
- Produces: Accessible modal drawer with browser-native focus trapping, Tab/Shift-Tab cycling, and Escape key handling out of the box.

- [x] **Step 1: Inspect SettingsPanel accessibility tests**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Check tests verifying dialog role and escape key behavior.

- [x] **Step 2: Refactor `SettingsPanel` to use `<dialog>` and remove `useFocusTrap`**

In `src/components/SettingsPanel.tsx`:
Use a `dialogRef = useRef<HTMLDialogElement>(null)`. When `open` changes:
```typescript
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  if (open && !dialog.open) dialog.showModal();
  else if (!open && dialog.open) dialog.close();
}, [open]);
```
Handle `onCancel={(e) => { e.preventDefault(); onClose(); }}` on the `<dialog>`.
Remove `useFocusTrap` and delete `src/hooks/useFocusTrap.ts`.

- [x] **Step 3: Run tests**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm src/hooks/useFocusTrap.ts
git add src/components/SettingsPanel.tsx
git commit -m "refactor(a11y): replace custom useFocusTrap with native HTML5 dialog"
```

---

### Task 15: Replace `react-router-dom` Dependency with Native Hash State

**Files:**
- Modify: `package.json`
- Modify: `src/App.tsx`
- Modify: `src/pages/HomePage.tsx:2,13,39`
- Modify: `src/pages/PlayerPage.tsx:2,20,140`
- Modify: `vite.config.ts:51`
- Test: `npm test`

**Interfaces:**
- Consumes: `window.location.hash` and `hashchange` event.
- Produces: Zero-dependency 2-page navigation (`#/play` vs Home), saving bundle size and eliminating `react-router-dom`.

- [x] **Step 1: Create minimal hook `useHashRoute` or local hash listener**

In `src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { HomePage } from '@/pages/HomePage';
import { PlayerPage } from '@/pages/PlayerPage';

export const App = () => {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route === '#/play' ? <PlayerPage /> : <HomePage />;
};
```

- [x] **Step 2: Update navigation callers and remove `react-router-dom`**

In `HomePage.tsx`: replace `navigate('/play')` with `window.location.hash = '/play'`.
In `PlayerPage.tsx`: replace `navigate('/')` with `window.location.hash = ''`.
Remove `react-router-dom` from `package.json`.
In `vite.config.ts`: remove `if (id.includes('/node_modules/react-router-dom/')) return 'router-vendor';`.

- [x] **Step 3: Run tests and typecheck**

Run: `npm uninstall react-router-dom && npx tsc -b && npm test`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit**

```bash
git add package.json package-lock.json src/App.tsx src/pages/HomePage.tsx src/pages/PlayerPage.tsx vite.config.ts
git commit -m "refactor(router): replace react-router-dom with native window hash navigation"
```

---

### Task 16: Delete Standalone Playwright Screenshot Script and Dev Dependency

**Files:**
- Delete: `scripts/capture-screenshots.mjs`
- Modify: `package.json`
- Test: `npm run build && npm test`

**Interfaces:**
- Consumes: None (screenshots `docs/home.png` and `docs/player.png` are already committed in git and never generated in CI).
- Produces: Removal of `playwright` devDependency (~150MB+ download and browser management complexity).

- [x] **Step 1: Verify `capture-screenshots.mjs` is unreferenced in scripts and CI**

Run: `git grep "capture-screenshots" .`
Expected: Zero references in `package.json` scripts and zero in `.github/workflows`.

- [x] **Step 2: Remove script and uninstall playwright**

Run: `rm scripts/capture-screenshots.mjs && npm uninstall playwright`

- [x] **Step 3: Verify build and tests**

Run: `npm run build && npm test && npm run test:release`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git rm scripts/capture-screenshots.mjs
git add package.json package-lock.json
git commit -m "chore: remove standalone playwright screenshot capture script and dependency"
```

---

### Task 17: Replace 200-Line Adaptive Dynamic Quality PID Loop with Direct DPR Cap

**Files:**
- Delete: `src/utils/renderQuality.ts`
- Delete: `src/utils/renderQuality.test.ts`
- Modify: `src/hooks/useAnimationLoop.ts:5-10,38,71-90,144-146,186-196`
- Modify: `src/hooks/useAnimationLoop.test.ts`
- Modify: `src/types/index.ts:4-17`
- Modify: `src/components/SettingsPanel.tsx:179-188`
- Modify: `src/stores/settingsStore.ts:24`
- Test: `npm test`

**Interfaces:**
- Consumes: `window.devicePixelRatio`, CSS dimensions.
- Produces: Direct clean DPR capping `const dpr = Math.min(window.devicePixelRatio || 1, 2)`. Eliminates per-frame `performance.now()` instrumentation, multi-tier state machine, overBudget hysteresis counters, and ~250 lines of complex scaling code.

- [x] **Step 1: Simplify canvas dimension calculation in `useAnimationLoop.ts`**

In `useAnimationLoop.ts`:
```typescript
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const resize = () => {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW <= 0 || cssH <= 0) return;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
};
```
Remove `drawStartedAt`, `drawMs`, `nextAutoQualityState`, `autoState`, and `QUALITY_PROFILES`.
Pass fixed `renderDensity = 1` to `instance.draw`.

- [x] **Step 2: Clean up types, settings store, and UI controls**

Remove `RenderQuality`, `RenderQualityState`, `RenderQualityDecision` from `src/types/index.ts`.
Remove `renderQuality` from `Settings` interface and store defaults.
Delete `src/utils/renderQuality.ts` and `src/utils/renderQuality.test.ts`.
Update `useAnimationLoop.test.ts` to test clean DPR rendering.

- [x] **Step 3: Run full verification suite**

Run: `npx tsc -b && npm test && npm run lint`
Expected: PASS with 0 errors and all tests passing.

- [x] **Step 4: Commit**

```bash
git rm src/utils/renderQuality.ts src/utils/renderQuality.test.ts
git add src/hooks/useAnimationLoop.ts src/hooks/useAnimationLoop.test.ts src/types/index.ts src/components/SettingsPanel.tsx src/stores/settingsStore.ts
git commit -m "refactor(quality): replace dynamic quality PID state machine with direct DPR cap"
```

---

## Plan Verification Checklist

- [x] All 17 points from the ponytail audit have an explicit task.
- [x] Every task has clear file paths, interface definitions, and test expectations.
- [x] No vague placeholders ("TBD", "TODO", "implement later").
- [x] All verification steps run non-interactive test commands (`npm test`, `npx tsc -b`, `npm run lint`).
