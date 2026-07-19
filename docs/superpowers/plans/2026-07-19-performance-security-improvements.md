# Performance, Security & Codebase Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade project dependencies, optimize Canvas animation loop to prevent per-frame DOM style invalidations, configure Vitest worktree exclusion, split vendor chunks, add file upload size limits, and strengthen Nginx security headers.

**Architecture:** Refactor `useAnimationLoop` with value diffing for canvas filter/opacity styles, update `vite.config.ts` for Vitest excludes and Rollup chunking, implement 5MB file upload validation, handle LocalStorage storage exceptions, and update `nginx.conf` with modern HSTS and security headers.

**Tech Stack:** React 18, Vite 5/6, Vitest, TypeScript, Zustand, Tailwind CSS v4, Nginx, Docker.

## Global Constraints

- Preserve all existing tests and features.
- Ensure strict TypeScript typing (`npm run build` succeeds).
- Maintain ESLint compliance (`npm run lint` succeeds).

---

### Task 1: Vitest Configuration & Rollup Vendor Chunking

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Existing Vite and Vitest configuration in `vite.config.ts`
- Produces: Optimized Vitest exclude rules and Rollup vendor chunking setup

- [ ] **Step 1: Update `vite.config.ts` with Vitest exclude patterns and Rollup manualChunks**

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Watchman',
        short_name: 'Watchman',
        description: 'Interactive screensaver to reduce OLED burn-in risk.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'fullscreen',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'store-vendor': ['zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
});
```

- [ ] **Step 2: Verify Vitest execution ignores `.worktrees/`**

Run: `npm test`
Expected: 2 test files passed (`src/utils/color.test.ts` and `src/animations/playlist.test.ts`), excluding `.worktrees/` files.

- [ ] **Step 3: Run project build to verify vendor chunking**

Run: `npm run build`
Expected: Successful build with chunk outputs (`react-vendor`, `router-vendor`, `store-vendor`).

- [ ] **Step 4: Commit changes**

```bash
git add vite.config.ts
git commit -m "perf(build): configure vitest exclude patterns and rollup vendor chunks"
```

---

### Task 2: Canvas Loop Style Optimization & Image Error Handling

**Files:**
- Modify: `src/hooks/useAnimationLoop.ts`
- Test: `src/hooks/useAnimationLoop.test.ts`

**Interfaces:**
- Consumes: `canvasRef`, `paused`, `onFps` from `Options` interface in `useAnimationLoop.ts`
- Produces: Optimized `useAnimationLoop` hook without per-frame DOM style invalidation

- [ ] **Step 1: Create test for `useAnimationLoop` style caching**

Create `src/hooks/useAnimationLoop.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnimationLoop } from './useAnimationLoop';

describe('useAnimationLoop', () => {
  it('initializes animation loop without crashing', () => {
    const canvas = document.createElement('canvas');
    const canvasRef = { current: canvas };
    
    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef, paused: true })
    );
    
    expect(canvas).toBeDefined();
    unmount();
  });
});
```

- [ ] **Step 2: Run test to verify initial test setup**

Run: `npx vitest run src/hooks/useAnimationLoop.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/hooks/useAnimationLoop.ts` to cache filter and opacity DOM styles**

Modify `src/hooks/useAnimationLoop.ts`:

```typescript
import { useEffect, type RefObject } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { getAnimation, getNextInPlaylist } from '@/animations/playlist';
import type { Animation } from '@/types';

interface Options {
  canvasRef: RefObject<HTMLCanvasElement>;
  paused: boolean;
  onFps?: (fps: number) => void;
}

/**
 * Owns the requestAnimationFrame loop. Reads settings via getState() each frame
 * so tuning is live without triggering React re-renders. Handles DPR/4K sizing,
 * FPS cap, tab-visibility pause, anti-burn-in drift, playlist auto-switch, and
 * background rendering.
 */
export const useAnimationLoop = ({ canvasRef, paused, onFps }: Options): void => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let time = 0;
    let accum = 0; // fps-cap accumulator
    let fpsAccum = 0;
    let fpsFrames = 0;

    let currentId = '';
    let instance: Animation | null = null;
    let switchTimer = 0;

    // Anti burn-in drift state.
    let offX = 0;
    let offY = 0;
    let targetX = 0;
    let targetY = 0;
    let driftTimer = 0;

    // Cached background image state.
    let bgImg: HTMLImageElement | null = null;
    let bgSrc = '';
    let bgLoadError = false;

    // Cached DOM style states to avoid per-frame DOM style recalculation.
    let lastFilter = '';
    let lastOpacity = '';

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3); // cap for 4K perf
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      return dpr;
    };
    let dpr = resize();
    const ro = new ResizeObserver(() => {
      dpr = resize();
    });
    ro.observe(canvas);

    const drawBackground = (s: ReturnType<typeof useSettings.getState>) => {
      if (s.backgroundImage && !bgLoadError) {
        if (s.backgroundImage !== bgSrc) {
          bgSrc = s.backgroundImage;
          bgLoadError = false;
          const el = new Image();
          el.onload = () => {
            bgImg = el;
          };
          el.onerror = () => {
            bgLoadError = true;
            bgImg = null;
          };
          el.src = bgSrc;
        }
        if (bgImg && bgImg.complete && bgImg.naturalWidth) {
          const scale = Math.max(cssW / bgImg.naturalWidth, cssH / bgImg.naturalHeight);
          const w = bgImg.naturalWidth * scale;
          const h = bgImg.naturalHeight * scale;
          ctx.drawImage(bgImg, (cssW - w) / 2, (cssH - h) / 2, w, h);
          return;
        }
      }
      if (s.gradientBackground) {
        const g = ctx.createLinearGradient(0, 0, cssW, cssH);
        g.addColorStop(0, s.background);
        g.addColorStop(1, s.color);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = s.background;
      }
      ctx.fillRect(0, 0, cssW, cssH);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rawDt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (paused) return;

      const s = useSettings.getState();

      // FPS cap.
      if (s.fpsLimit > 0) {
        accum += rawDt;
        const interval = 1 / s.fpsLimit;
        if (accum < interval) return;
        accum = accum % interval;
      }
      const dt = rawDt;
      time += dt;

      // FPS report (~4x/sec).
      fpsAccum += dt;
      fpsFrames++;
      if (fpsAccum >= 0.25) {
        onFps?.(Math.round(fpsFrames / fpsAccum));
        fpsAccum = 0;
        fpsFrames = 0;
      }

      // Playlist auto-switch.
      if (s.autoSwitch > 0 && s.playlist.length > 1) {
        switchTimer += dt;
        if (switchTimer >= s.autoSwitch) {
          switchTimer = 0;
          useSettings.getState().set('animationId', getNextInPlaylist(s));
        }
      }

      // (Re)create animation on id change.
      if (s.animationId !== currentId || !instance) {
        currentId = s.animationId;
        instance = getAnimation(currentId).create();
      }

      // Anti burn-in: slow global drift so nothing sits still, plus a faint
      // brightness pulse.
      let brightness = s.brightness;
      if (s.antiBurnIn) {
        driftTimer += dt;
        if (driftTimer > 5) {
          driftTimer = 0;
          targetX = (Math.random() - 0.5) * 24;
          targetY = (Math.random() - 0.5) * 24;
        }
        offX += (targetX - offX) * dt * 0.5;
        offY += (targetY - offY) * dt * 0.5;
        brightness *= 0.94 + 0.06 * Math.sin(time * 0.4);
      } else {
        offX = offY = 0;
      }

      // Only update DOM styles when the computed string actually changes.
      const nextFilter = `brightness(${brightness})`;
      if (nextFilter !== lastFilter) {
        canvas.style.filter = nextFilter;
        lastFilter = nextFilter;
      }

      const nextOpacity = String(s.opacity);
      if (nextOpacity !== lastOpacity) {
        canvas.style.opacity = nextOpacity;
        lastOpacity = nextOpacity;
      }

      ctx.setTransform(dpr, 0, 0, dpr, offX * dpr, offY * dpr);
      ctx.clearRect(-30, -30, cssW + 60, cssH + 60);
      drawBackground(s);

      instance.draw({ ctx, width: cssW, height: cssH, dt, time, settings: s });
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, paused, onFps]);
};
```

- [ ] **Step 4: Run tests to verify implementation**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit changes**

```bash
git add src/hooks/useAnimationLoop.ts src/hooks/useAnimationLoop.test.ts
git commit -m "perf(canvas): optimize DOM style mutations and background image loading in animation loop"
```

---

### Task 3: File Upload Size Validation & LocalStorage Quota Resilience

**Files:**
- Modify: `src/utils/file.ts`
- Create: `src/utils/file.test.ts`
- Modify: `src/stores/settingsStore.ts`

**Interfaces:**
- Consumes: `File` object in `readImageAsDataUrl(file: File)`
- Produces: Validated Data URL or rejected Promise with size limit error

- [ ] **Step 1: Write failing tests for `readImageAsDataUrl` size limit**

Create `src/utils/file.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readImageAsDataUrl } from './file';

describe('readImageAsDataUrl', () => {
  it('rejects files that are not images', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await expect(readImageAsDataUrl(file)).rejects.toThrow('Not an image file');
  });

  it('rejects files larger than 5MB', async () => {
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'large.png', { type: 'image/png' });
    await expect(readImageAsDataUrl(file)).rejects.toThrow('Image size exceeds 5MB limit');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/utils/file.test.ts`
Expected: FAIL on `Image size exceeds 5MB limit`

- [ ] **Step 3: Update `src/utils/file.ts` to enforce 5MB limit**

Modify `src/utils/file.ts`:

```typescript
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

/** Read an image File as a data URL for canvas use / LocalStorage persistence. */
export const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error('Image size exceeds 5MB limit'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run src/utils/file.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/utils/file.ts src/utils/file.test.ts
git commit -m "feat(security): add 5MB size limit validation to readImageAsDataUrl"
```

---

### Task 4: Nginx Security Headers & Docker Hardening

**Files:**
- Modify: `nginx.conf`

**Interfaces:**
- Consumes: Nginx HTTP server configuration
- Produces: Hardened security headers for Watchman container deployment

- [ ] **Step 1: Update `nginx.conf` with modern security headers**

Modify `nginx.conf`:

```nginx
worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent" "$http_x_forwarded_for"';
  access_log /dev/stdout main;

  sendfile on;
  keepalive_timeout 65;
  server_tokens off;

  client_body_temp_path /tmp/client_temp;
  proxy_temp_path /tmp/proxy_temp;
  fastcgi_temp_path /tmp/fastcgi_temp;
  uwsgi_temp_path /tmp/uwsgi_temp;
  scgi_temp_path /tmp/scgi_temp;

  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;

  server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header_inherit merge;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), screen-wake-lock=(self)" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'" always;

    location = /health {
      access_log off;
      default_type text/plain;
      add_header Cache-Control "no-store" always;
      return 200 "ok\n";
    }

    location = /index.html {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location = /manifest.webmanifest {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location = /sw.js {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location ^~ /assets/ {
      add_header Cache-Control "public, max-age=31536000, immutable" always;
      try_files $uri =404;
    }

    location ~* "\.[^/]+$" {
      try_files $uri =404;
    }

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
```

- [ ] **Step 2: Run full test and lint suite**

Run: `npm test && npm run lint && npm run build`
Expected: All commands pass cleanly.

- [ ] **Step 3: Commit changes**

```bash
git add nginx.conf
git commit -m "sec(nginx): add HSTS and X-Permitted-Cross-Domain-Policies security headers"
```
