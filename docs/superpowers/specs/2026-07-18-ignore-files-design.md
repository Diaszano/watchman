# Git and Docker Ignore Files Design

## Objective

Improve the repository's `.gitignore` and `.dockerignore` so local artifacts do
not enter version control or the Docker build context, while preserving every
file required to develop, test, and build Watchman.

## Current Context

Watchman is a React 18, TypeScript, and Vite application managed with npm. Its
production Dockerfile builds the application with Node.js and copies `dist/`
into an Nginx runtime image. The current ignore files only cover dependencies,
basic build outputs, coverage, local files, and macOS metadata.

The working tree also contains TypeScript incremental output and local agent
configuration. The `.codex/`, `.claude/`, `.agents/`, and `.superpowers/`
directories are local tooling rather than shared project configuration and
must remain untracked.

## Design

### Git Ignore Rules

Organize `.gitignore` into documented categories:

- dependencies: `node_modules/`;
- build and test output: `dist/`, `dev-dist/`, `coverage/`, and
  `*.tsbuildinfo`;
- caches and logs: common Vite, ESLint, npm, Yarn, and pnpm artifacts;
- local environment overrides: `.env`, `.env.local`, and `.env.*.local`;
- editor and operating-system metadata: common JetBrains, VS Code, Vim,
  macOS, and Windows artifacts;
- local agent tooling: `.claude/`, `.codex/`, `.agents/`, and `.superpowers/`.

Rules remain scoped to generated or machine-specific files. Source code,
tests, lockfiles, documentation, Docker files, and shared configuration remain
eligible for version control.

### Docker Ignore Rules

The `.dockerignore` uses the same generated and local-artifact categories and
also removes repository-only data from the build context:

- Git history and GitHub automation;
- local agent, editor, and operating-system files;
- host dependencies, previous builds, coverage, caches, and logs;
- local environment overrides: `.env`, `.env.local`, and `.env.*.local`;
- repository documentation and development metadata not consumed by either
  Docker stage.

The context must continue to include `package.json`, `package-lock.json`,
`src/`, `public/`, `index.html`, TypeScript/Vite configuration, and
`nginx.conf`. Test files under `src/` remain included because the TypeScript
build configuration may type-check them.

## Safety and Compatibility

- Keep `.env.example`, `.env.production`, and `.env.development` available to
  Git and Docker as potential shared build inputs.
- Keep ordinary files ending in `.local`, such as `src/settings.local`,
  available to Git and Docker; only Vite's explicit local environment override
  names are excluded.
- Do not ignore lockfiles or shared configuration.
- Do not use broad source-extension patterns.
- Do not depend on negating a file inside an ignored parent directory, because
  Git cannot re-include it unless the parent path is also traversable.
- Keep the ignore files readable through comments and stable category order.

## Verification

The change is complete when:

1. `git check-ignore` confirms representative dependencies, build artifacts,
   logs, `.env`, `.env.local`, `.env.production.local`, editor files, and local
   agent directories are ignored.
2. `git check-ignore` confirms representative application, lockfile, Docker,
   and shared configuration files are not ignored, including `.env.example`,
   `.env.production`, `.env.development`, and `src/settings.local`.
3. Docker's effective context still contains every file referenced by `COPY`
   instructions and every source/configuration input required by
   `npm run build`.
4. The existing production build succeeds.

## Files

- Modify `.gitignore`.
- Modify `.dockerignore`.
- Modify `docs/superpowers/specs/2026-07-18-ignore-files-design.md`.
- Modify `docs/superpowers/plans/2026-07-18-ignore-files.md`.
