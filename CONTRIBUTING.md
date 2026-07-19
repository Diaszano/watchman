# Contributing to Watchman

Thank you for your interest in contributing to Watchman! This guide will help
you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Branch Strategy](#branch-strategy)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Testing](#testing)
- [Docker Development](#docker-development)
- [Architecture Notes](#architecture-notes)

## Development Setup

1. **Fork** the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/watchman.git
   cd watchman
   ```

2. **Install dependencies** (this also sets up Husky git hooks):

   ```bash
   npm install
   ```

3. **Start the dev server:**

   ```bash
   npm run dev        # Vite dev server with HMR at http://localhost:5173
   ```

## Coding Standards

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **ESLint** — run `npm run lint` to check for issues
- **Prettier** — run `npm run format` to auto-format code
- Configurations are in [eslint.config.js](eslint.config.js) and
  [.prettierrc.json](.prettierrc.json)

Please ensure both pass before submitting a PR:

```bash
npm run lint
npm run format
```

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).
A Husky `commit-msg` hook validates your commits automatically.

### Format

```
<type>(<optional scope>): <description>
```

### Examples

```
feat: add starfield animation mode
fix(canvas): correct DPI scaling on ultrawide monitors
docs: update Docker deployment instructions
chore(ci): upgrade Node.js to v24
test: add unit tests for playlist shuffle
refactor(store): simplify settings persistence logic
perf: reduce particle system memory allocations
```

### Types

| Type       | When to use                                  |
| ---------- | -------------------------------------------- |
| `feat`     | A new feature                                |
| `fix`      | A bug fix                                    |
| `docs`     | Documentation only                           |
| `style`    | Formatting, missing semicolons, etc.         |
| `refactor` | Code change that neither fixes nor adds      |
| `perf`     | Performance improvement                      |
| `test`     | Adding or updating tests                     |
| `build`    | Build system or external dependencies        |
| `ci`       | CI configuration                             |
| `chore`    | Maintenance tasks                            |
| `revert`   | Reverting a previous commit                  |

## Branch Strategy

1. **Fork** the repository
2. Create a **feature branch** from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
3. Make your changes and commit using Conventional Commits
4. Push to your fork and **open a Pull Request** against `main`

## Pull Request Guidelines

- **PR titles** must follow Conventional Commits (validated by CI)
- **CI must pass** — lint, test, build, and container security checks
- Include a clear **description** of your changes
- Reference related issues (e.g., `Closes #42`)
- Keep PRs focused — one feature or fix per PR
- Add/update tests when applicable

## Testing

Run the test suite:

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode for development
```

We use [Vitest](https://vitest.dev/) with
[Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
for React component tests.

When adding new features, please include relevant tests.

## Docker Development

Run the Vite dev server with HMR inside a container:

```bash
docker compose --profile dev up --build   # http://localhost:5173
```

Run the production image locally:

```bash
docker compose up --build                 # http://localhost:8080
```

Both services bind to `127.0.0.1` by default for security.

## Architecture Notes

Watchman uses a **canvas-first, React-light** approach:

- **React** owns the shell (routing, settings UI, overlays)
- A single `requestAnimationFrame` loop owns all pixel rendering
- **`useAnimationLoop`** reads settings each frame via `zustand`'s `getState()`
  for instant tuning without React re-renders
- Each **animation is an independent module** exposing a factory
  `() => { draw(frame) }` — state lives in the closure
- Adding a new animation = one new file + one line in `animations/index.ts`

See the [README](README.md) for the full architecture overview.

---

Thank you for helping make Watchman better! 🎬
