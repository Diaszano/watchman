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
configuration. The `.codex/`, `.claude/`, and `.agents/` directories are local
tooling rather than shared project configuration and must remain untracked.

## Design

### Git Ignore Rules

Organize `.gitignore` into documented categories:

- dependencies: `node_modules/`;
- build and test output: `dist/`, `dev-dist/`, `coverage/`, and
  `*.tsbuildinfo`;
- caches and logs: common Vite, ESLint, npm, Yarn, and pnpm artifacts;
- environment overrides: `.env` and `.env.*`, with `.env.example` explicitly
  allowed;
- editor and operating-system metadata: common JetBrains, VS Code, Vim,
  macOS, and Windows artifacts;
- local agent tooling: `.claude/`, `.codex/`, and `.agents/`.

Rules remain scoped to generated or machine-specific files. Source code,
tests, lockfiles, documentation, Docker files, and shared configuration remain
eligible for version control.

### Docker Ignore Rules

The `.dockerignore` uses the same generated and local-artifact categories and
also removes repository-only data from the build context:

- Git history and GitHub automation;
- local agent, editor, and operating-system files;
- host dependencies, previous builds, coverage, caches, and logs;
- local environment files;
- repository documentation and development metadata not consumed by either
  Docker stage.

The context must continue to include `package.json`, `package-lock.json`,
`src/`, `public/`, `index.html`, TypeScript/Vite configuration, and
`nginx.conf`. Test files under `src/` remain included because the TypeScript
build configuration may type-check them.

## Safety and Compatibility

- Keep `.env.example` available to Git and Docker if it is added later.
- Do not ignore lockfiles or shared configuration.
- Do not use broad source-extension patterns.
- Do not depend on negating a file inside an ignored parent directory, because
  Git cannot re-include it unless the parent path is also traversable.
- Keep the ignore files readable through comments and stable category order.

## Verification

The change is complete when:

1. `git check-ignore` confirms representative dependencies, build artifacts,
   logs, environment overrides, editor files, and local agent directories are
   ignored.
2. `git check-ignore` confirms representative application, lockfile, Docker,
   and shared configuration files are not ignored.
3. Docker's effective context still contains every file referenced by `COPY`
   instructions and every source/configuration input required by
   `npm run build`.
4. The existing production build succeeds.

## Files

- Modify `.gitignore`.
- Modify `.dockerignore`.
