# Watchman

<p align="center">
  <strong>English</strong> · <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

<p align="center">
  <img src="public/logo.png" alt="Watchman" width="480">
</p>

<p align="center">
  <a href="https://github.com/Diaszano/watchman/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/Diaszano/watchman/actions/workflows/ci.yml/badge.svg?branch=main">
  </a>
  <a href="https://github.com/Diaszano/watchman/releases">
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/Diaszano/watchman?style=flat-square">
  </a>
  <a href="LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/github/license/Diaszano/watchman?style=flat-square">
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
- **Anti burn-in engine** — subtle global drift affecting both canvas and background (with an oversized margin to prevent exposed edges), plus per-mode motion to reduce OLED image retention risk (software drift reduces retention risk but cannot guarantee total burn-in prevention; true black background remains available).
- **Live configuration** — speed, object count, size, colors, background (solid / gradient / image), opacity (canvas), brightness (entire scene: background + canvas, while HUD controls remain unaffected), FPS cap. Every control updates in real time.
- **Per-animation relevant controls** — each mode only surfaces the settings that affect it.
- **Automatic playlist** — pick favorites, set a switch interval, sequential or random.
- **Screen Wake Lock API** — keeps the display awake while protection runs; auto-reacquires; degrades gracefully with a notice when unsupported.
- **Fullscreen API**, **keyboard shortcuts**, **auto-hiding UI**, and an optional **FPS monitor**.
- **In-app keyboard shortcut overlay** — press `H` at any time to see every shortcut.
- **Persistent preferences** — settings are saved to LocalStorage, while uploaded images stay in IndexedDB.
- **Light / dark themes** — the light theme is fully functional — and **English / Português** i18n.
- **Accessible settings dialog** — native dialog semantics and keyboard focus management.
- **PWA** — installable, offline-capable via service worker.
- **High-DPI / 4K / ultrawide** aware (DPR-scaled canvas, capped for performance).

## Rendering

The canvas follows the display's device pixel ratio, capped at 2 for predictable performance on high-resolution screens. Use the FPS limit setting (30, 60, 120, or unlimited) to balance smoothness and power use. Uploaded background and logo images stay in this browser through IndexedDB and are limited to 5 MiB, up to 8192 px per side and 16.7 megapixels (16,777,216 pixels) each.

## Screenshots

| Home                   | Player                     |
| ---------------------- | -------------------------- |
| ![Home](docs/home.png) | ![Player](docs/player.png) |

## Keyboard shortcuts

| Key       | Action                   |
| --------- | ------------------------ |
| `F`       | Toggle fullscreen        |
| `Space`   | Pause / resume           |
| `Esc`     | Exit fullscreen          |
| `S`       | Toggle settings          |
| `N`       | Next animation           |
| `P`       | Previous animation       |
| `H` / `?` | Toggle shortcuts overlay |

`Esc` also closes the settings panel when it is open.

## Tech stack

TypeScript · React 19 · Vite · Tailwind CSS v4 · Zustand · Vitest · Biome · Prettier · Docker · Nginx.

---

## Installation

Requires Node.js 24 (run `nvm use` when nvm is installed).

```bash
git clone https://github.com/Diaszano/watchman.git
cd watchman
npm ci
```

Use `npm install` only when intentionally changing dependencies, because it updates `package-lock.json`.

### Development

```bash
npm run dev        # Vite dev server (HMR) at http://localhost:5173
```

### Other scripts

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run lint       # Biome linter
npm run format     # Prettier
npm run format:check # verify Prettier formatting without modifying files
npm test           # Vitest
npm run test:watch # Vitest watch mode
npm run test:commits # validate local commit messages
npm run test:release # validate the release configuration
npm run test:ci-security # validate branch policy and required checks
npm run audit:production # audit runtime dependencies
```

## Contributing

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add a new capability
fix(canvas): correct rendering behavior
chore(ci): maintain automation
```

`npm ci` configures the Husky `commit-msg` hook. The same rules are checked against every pull request commit in CI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, branch policy, and pull request checklist.

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

For remote deployment, serve the app over HTTPS, usually through a reverse
proxy. [Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock)
and the [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
require a secure context: changing the host binding alone does not enable
them over HTTP at a LAN IP address. Browsers treat `http://localhost` as
trustworthy, so the local examples above remain valid. HTTPS meets the
transport requirement; browser support and permissions still determine
availability, and PWA installation is browser-dependent.

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

### Container image publication

Every successful push to `main` publishes stable multi-architecture images for `linux/amd64` and `linux/arm64` to GitHub Container Registry (`ghcr.io`) with the `latest` tag. When the commits produce a semantic release, the images also receive `X.Y.Z`, `X.Y`, and `X` tags.

Pushes to `dev` publish the moving `dev` tag to GHCR. Commits that qualify for a semantic release also publish an exact prerelease tag such as `X.Y.Z-dev.N`.

Conventional Commits determine the next version: `fix`, `perf`, and `revert` create a patch; `feat` creates a minor; and a breaking change creates a major. The release workflow creates the Git tag and publishes the GitHub Release automatically.

Keep the default GitHub Actions permissions read-only. The release workflow explicitly requests contents and packages write access to create tags, GitHub Releases, and GHCR images.

Protect `main` and `dev` with pull requests and the `Commit messages`, `Lint, test, and build`, and `Pull request title` checks. The aggregate check also requires the production dependency audit, dependency review on PRs, release configuration, and container security. Promotions to `main` must originate from this repository’s `dev` or `development` branch.

---

## Architecture

The render pipeline is intentionally **canvas-first and React-light**: React owns the shell (routing, settings UI, overlays, and background); a single `requestAnimationFrame` loop drives animation pixels.

- `useAnimationLoop` reads settings via `zustand`'s `getState()` **each frame**, so tuning is instant without React re-renders. It handles DPR sizing, the FPS cap, tab-visibility pause, and coordinates anti burn-in drift across both canvas and background.
- Each **animation is an independent module** exposing a factory `() => { draw(frame) }`. State lives in the closure and resets on switch. Adding one requires a module, a registry entry in `src/animations/index.ts`, and English/Portuguese names in `src/services/i18n.ts`; see the [animation contribution guide](CONTRIBUTING.md#adding-an-animation).
- **Navigation** uses the browser's native hash routing, keeping the two-page flow dependency-free.
- **Settings** are one strongly-typed store persisted to LocalStorage via `zustand/middleware`; uploaded images are stored separately in IndexedDB.

### Folder structure

```text
src/
 ├── animations/   # one module per mode + registry + playlist logic
 ├── components/   # reusable UI (Button, controls, SettingsPanel, canvas…)
 ├── hooks/        # animation loop, wake lock, fullscreen, keyboard, images, i18n
 ├── pages/        # HomePage, PlayerPage
 ├── services/     # i18n dictionary and browser image storage
 ├── stores/       # settingsStore (zustand + persist)
 ├── styles/       # Tailwind entry
 ├── types/        # shared types (Settings, Animation, AnimationFrame)
 ├── utils/        # math and color helpers
 └── App.tsx
```

---

## Security

To report a vulnerability privately, see the [security policy](SECURITY.md). Run `npm audit` to inspect development tools too; `npm run audit:production` checks runtime dependencies.

## License

MIT
