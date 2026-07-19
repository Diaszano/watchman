# Watchman

<p align="center">
  <a href="https://hub.docker.com/r/diaszano/watchman">
    <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Docker Image Version" src="https://img.shields.io/docker/v/diaszano/watchman?style=flat-square&logo=docker">
  </a>
  <a href="https://github.com/diaszano/watchman/pkgs/container/watchman">
    <img alt="GHCR" src="https://img.shields.io/badge/GHCR-available-blue?style=flat-square&logo=github">
  </a>
</p>

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

| Key     | Action             |
| ------- | ------------------ |
| `F`     | Toggle fullscreen  |
| `Space` | Pause / resume     |
| `Esc`   | Exit fullscreen    |
| `S`     | Toggle settings    |
| `N`     | Next animation     |
| `P`     | Previous animation |

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

## Contributing

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add a new capability
fix(canvas): correct rendering behavior
chore(ci): maintain automation
```

`npm install` configures the Husky `commit-msg` hook. The same rules are checked against every pull request commit in CI.

---

## Docker

Run the hardened production image locally:

```bash
docker compose up --build      # http://localhost:8080
```

Run the Vite development server with HMR inside a container:

```bash
docker compose --profile dev up --build   # http://localhost:5173
```

Both Compose services bind to `127.0.0.1` by default, so they are not exposed
to other devices on the network. Add an explicit reverse proxy or change the
host binding when remote access is intentional.

## Production deployment

`Dockerfile` uses a reproducible multi-stage build: Node.js 24 LTS compiles the
static bundle, then NGINX 1.30.3 Alpine Slim serves only `dist/`. The runtime
runs as the non-root `nginx` user on port 8080, provides `/health`, uses a
read-only root filesystem under Compose, and sends baseline browser security
headers. `nginx.conf` also handles compression, immutable caching for
fingerprinted assets, SPA fallback, and revalidation for the application shell
and PWA metadata.

Base image tags are pinned to immutable digests in `Dockerfile` and
`Dockerfile.dev`. When updating a digest, rebuild the image and run the local
container verification and Trivy scan before publishing it.

### Docker Hub publication

Every successful push to `main` publishes a multi-architecture image for `linux/amd64` and `linux/arm64` as `<dockerhub-user>/watchman:latest`. When the commits produce a semantic release, the image also receives `X.Y.Z`, `X.Y`, and `X` tags.

Conventional Commits determine the next version: `fix`, `perf`, and `revert` create a patch; `feat` creates a minor; and a breaking change creates a major. The release workflow updates the npm version files and changelog, creates the Git tag, and publishes the GitHub Release automatically.

Repository administrators must create these GitHub Actions secrets:

| Secret               | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub account or organization that owns `watchman` |
| `DOCKERHUB_TOKEN`    | Docker Hub access token with push permission            |

Before the first publication, create the Docker Hub repository `watchman` under the account or organization named by `DOCKERHUB_USERNAME`.

The repository must allow GitHub Actions to write repository contents so Semantic Release can push the release commit and tag to `main`.

When protecting `main`, require the `Commit messages`, `Lint, test, and build`, and `Pull request title` checks, while allowing the GitHub Actions release identity to push the generated release commit and tag.

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
