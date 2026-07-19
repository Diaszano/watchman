# Watchman

An interactive, browser-based screensaver that keeps your display visually active to help reduce the risk of **OLED burn-in** — while looking good doing it. Fully written in TypeScript.

Ten animation modes, live-tunable settings, an anti burn-in engine, playlists, PWA/offline support, and one-command Docker deployment.

---

## Features

- **10 animation modes** — DVD Logo, Digital Clock, Particle System, Floating Bubbles, Starfield (parallax), Matrix Rain, Neon Lines, Geometric Shapes, Custom Logo (image upload), Custom Text.
- **Anti burn-in engine** — global drift, brightness pulsing, and per-mode motion so nothing sits static.
- **Live configuration** — speed, object count, size, colors, background (solid / gradient / image), opacity, brightness, FPS cap. Every control updates in real time.
- **Automatic playlist** — pick favorites, set a switch interval, sequential or random.
- **Screen Wake Lock API** — keeps the display awake while protection runs; auto-reacquires; degrades gracefully with a notice when unsupported.
- **Fullscreen API**, **keyboard shortcuts**, **auto-hiding UI**, and an optional **FPS monitor**.
- **Persistent preferences** — everything is saved to LocalStorage and restored on next visit.
- **Light / dark themes** and **English / Português** i18n.
- **PWA** — installable, offline-capable via service worker.
- **High-DPI / 4K / ultrawide** aware (DPR-scaled canvas, capped for performance).

## Screenshots

> _Placeholder — add screenshots or a GIF here._
>
> `docs/home.png` · `docs/player.png`

## Keyboard shortcuts

| Key   | Action              |
| ----- | ------------------- |
| `F`   | Toggle fullscreen   |
| `Space` | Pause / resume    |
| `Esc` | Exit fullscreen     |
| `S`   | Toggle settings     |
| `N`   | Next animation      |
| `P`   | Previous animation  |

## Tech stack

TypeScript · React 18 · Vite · Tailwind CSS v4 · React Router · Zustand · Vitest · ESLint · Prettier · Docker · Nginx.

---

## Installation

```bash
npm install
```

### Development

```bash
npm run dev        # Vite dev server (HMR) at http://localhost:5173
```

### Other scripts

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run lint       # ESLint
npm run format     # Prettier
npm test           # Vitest
```

---

## Docker

Production build served by Nginx — the only command you need:

```bash
docker compose up --build      # http://localhost:8080
```

Dev server with hot reload inside a container:

```bash
docker compose --profile dev up --build   # http://localhost:5173
```

## Production deployment

`Dockerfile` is a multi-stage build: Node compiles the static bundle, then Nginx serves it (`nginx.conf` handles gzip, asset caching, SPA fallback, and no-cache for the service worker). Point any static host or reverse proxy at the `dist/` output, or ship the image.

---

## Architecture

The render pipeline is intentionally **canvas-first and React-light**: React owns the shell (routing, settings UI, overlays); a single `requestAnimationFrame` loop owns all pixels.

- `useAnimationLoop` reads settings via `zustand`'s `getState()` **each frame**, so tuning is instant without React re-renders. It handles DPR sizing, the FPS cap, tab-visibility pause, background rendering, and the anti burn-in drift — in one place, so every animation benefits.
- Each **animation is an independent module** exposing a factory `() => { draw(frame) }`. State lives in the closure and resets on switch. Adding one is a new file plus a single line in `animations/index.ts` (open/closed).
- **Settings** are one strongly-typed store persisted to LocalStorage via `zustand/middleware`.

### Folder structure

```text
src/
 ├── animations/   # one module per mode + registry + playlist logic
 ├── components/   # reusable UI (Button, controls, SettingsPanel, canvas…)
 ├── hooks/        # useAnimationLoop, useWakeLock, useFullscreen, keyboard, theme, i18n
 ├── layouts/      # page shells
 ├── pages/        # HomePage, PlayerPage
 ├── services/     # i18n dictionary
 ├── stores/       # settingsStore (zustand + persist)
 ├── styles/       # Tailwind entry
 ├── types/        # shared types (Settings, Animation, AnimationFrame)
 ├── utils/        # math, color, file helpers
 └── App.tsx
```

---

## License

MIT
