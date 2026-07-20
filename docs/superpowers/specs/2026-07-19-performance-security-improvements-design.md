# Design Spec: Performance, Security & Codebase Improvements (Watchman)

**Date**: 2026-07-19  
**Status**: Approved  

---

## 1. Overview & Goals

Watchman is an interactive browser screensaver designed to reduce OLED burn-in risk. This specification defines major upgrades to dependency infrastructure, canvas animation performance, theme management, local storage resilience, and HTTP/container security hardening.

---

## 2. Architecture & Detailed Changes

### 2.1 Major Dependency & Build Pipeline Upgrade (`vite.config.ts`, `package.json`)
- **Dependency Upgrades**:
  - Upgrade `vite`, `vitest`, `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-plugin-pwa` to latest major versions to resolve known advisories from `npm audit` (e.g. `esbuild` / `vite` dev server vulnerabilities).
  - Ensure zero breaking changes across existing React 18, Zustand, and TypeScript definitions.
- **Vitest Configuration**:
  - Update `test.exclude` in `vite.config.ts` to include `.worktrees/**`, `node_modules/**`, and `dist/**` to prevent redundant test execution when Git worktrees are active.
- **Rollup Vendor Chunking**:
  - Configure `build.rollupOptions.output.manualChunks` to separate vendor bundles:
    - `react-vendor`: `react`, `react-dom`
    - `router-vendor`: `react-router-dom`
    - `store-vendor`: `zustand`

### 2.2 Canvas Performance & Theme Variable Integration (`src/hooks/useAnimationLoop.ts`)
- **DOM Style Recalculation Elimination**:
  - Track `lastBrightness` and `lastOpacity` in mutable references inside `useAnimationLoop`.
  - Update `canvas.style.filter` and `canvas.style.opacity` **only** when computed values change, eliminating forced style invalidation on every frame in the `requestAnimationFrame` loop.
- **Background Image Caching & Error Handling**:
  - Add `onload` and `onerror` handlers when setting `bgImg.src` to prevent constant recreation of `Image` objects or canvas rendering glitches during failed image loads.
- **Theme Variables**:
  - Expose CSS variables (`--wm-bg`, `--wm-color`, etc.) on root container elements to enable smooth CSS transitions without causing unnecessary React re-renders or canvas frame drops.

### 2.3 Storage Resilience & Security Hardening (`src/utils/file.ts`, `nginx.conf`, `Dockerfile`)
- **File Upload Limits & Storage Resilience**:
  - Enforce a 5MB maximum file size check in `readImageAsDataUrl` in `src/utils/file.ts`.
  - Wrap `localStorage` writes in `src/stores/settingsStore.ts` with error handling to catch `QuotaExceededError` gracefully.
- **Security Headers (`nginx.conf`)**:
  - Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS).
  - Add `X-Permitted-Cross-Domain-Policies "none"`.
  - Enforce strict `Content-Security-Policy` with standard `self`, data/blob image sources, and service worker workers.
- **Container Hardening (`Dockerfile`)**:
  - Maintain non-root execution (`USER nginx`) with explicit `/tmp` permissions and security healthchecks.

---

## 3. Verification & Testing Strategy

1. **Unit & Integration Tests**:
   - Run `npm run test` and verify that all 16 tests pass and that Vitest does not scan `.worktrees/`.
2. **Linting & Type Check**:
   - Run `npm run lint` and `npm run build` to confirm zero TypeScript compile or ESLint errors.
3. **Security Audit**:
   - Run `npm audit` to verify resolution of vulnerability reports.
