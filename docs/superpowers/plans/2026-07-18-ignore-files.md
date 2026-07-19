# Git and Docker Ignore Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal Git and Docker ignore rules with a readable, project-specific set that excludes local/generated artifacts without removing build inputs.

**Architecture:** `.gitignore` defines the version-control boundary for this React/Vite project, while `.dockerignore` defines the narrower production and development image build context. Both files use matching categories where possible, and Docker adds repository-only exclusions while retaining all inputs consumed by TypeScript, Vite, npm, and Nginx.

**Tech Stack:** Git ignore patterns, Docker ignore patterns, npm, TypeScript, Vite, Docker BuildKit

## Global Constraints

- Treat `.codex/`, `.claude/`, `.agents/`, and `.superpowers/` as local tooling.
- Preserve `package-lock.json` and all shared project configuration in Git.
- Preserve `package.json`, `package-lock.json`, `src/`, `public/`, `index.html`, TypeScript/Vite configuration, and `nginx.conf` in the Docker context.
- Keep test files under `src/` in the Docker context because TypeScript may type-check them.
- Ignore only the Vite local environment overrides `.env`, `.env.local`, and `.env.*.local`.
- Keep `.env.example`, `.env.production`, and `.env.development` eligible for Git and Docker as potential shared build inputs.
- Keep ordinary `.local` files, including `src/settings.local`, eligible for Git and Docker.
- Do not add dependencies or change application behavior.

---

## File Map

- `.gitignore`: excludes generated output, secrets/local environment overrides, machine metadata, and local agent configuration from version control.
- `.dockerignore`: excludes files that are not inputs to either Docker build stage, reducing context size and preventing local data from reaching the builder.

### Task 1: Define and Verify the Ignore Boundaries

**Files:**

- Modify: `.gitignore`
- Modify: `.dockerignore`
- Modify: `docs/superpowers/specs/2026-07-18-ignore-files-design.md`
- Modify: `docs/superpowers/plans/2026-07-18-ignore-files.md`

**Interfaces:**

- Consumes: repository paths and the `COPY` inputs declared by `Dockerfile` and `Dockerfile.dev`.
- Produces: Git exclusion rules and Docker build-context exclusion rules.

- [ ] **Step 1: Demonstrate gaps in the current Git rules**

Run:

```bash
git check-ignore -q -- tsconfig.tsbuildinfo
git check-ignore -q -- .codex/config.toml
```

Expected: both commands exit with status `1`, showing that TypeScript incremental output and local Codex configuration are not currently ignored.

- [ ] **Step 2: Replace `.gitignore` with categorized project rules**

Set `.gitignore` to:

```gitignore
# Dependencies
node_modules/

# Build and test output
dist/
dev-dist/
coverage/
*.tsbuildinfo

# Tool caches and temporary files
.vite/
.eslintcache
.cache/
.temp/
.tmp/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment overrides
.env
.env.local
.env.*.local

# Editors
.idea/
.vscode/
*.swp
*.swo
*~

# Operating systems
.DS_Store
Thumbs.db

# Local agent tooling
.claude/
.codex/
.agents/
.superpowers/
```

- [ ] **Step 3: Verify ignored and preserved Git paths**

Run:

```bash
git check-ignore -v -- \
  node_modules/react/package.json \
  dist/index.html \
  coverage/index.html \
  tsconfig.tsbuildinfo \
  debug.log \
  .env \
  .env.local \
  .env.production.local \
  .idea/workspace.xml \
  .codex/config.toml \
  .claude/settings.json \
  .agents/local.toml

for preserved_path in \
  package.json \
  package-lock.json \
  src/App.tsx \
  Dockerfile \
  nginx.conf \
  .env.example \
  .env.production \
  .env.development \
  src/settings.local
do
  if git check-ignore -q --no-index -- "$preserved_path"; then
    echo "A required or shared project file is incorrectly ignored: $preserved_path" >&2
    exit 1
  fi
done
```

Expected: the first command prints a matching rule for every local/generated path, including `.env`, `.env.local`, and `.env.production.local`. The per-path guard exits zero without printing an error, proving that `.env.example`, `.env.production`, `.env.development`, `src/settings.local`, and the other required project files remain eligible.

- [ ] **Step 4: Replace `.dockerignore` with the narrowed build context**

Set `.dockerignore` to:

```dockerignore
# Version control and repository automation
.git/
.gitignore
.github/

# Local agent tooling
.claude/
.codex/
.agents/
.superpowers/

# Dependencies and generated output
node_modules/
dist/
dev-dist/
coverage/
*.tsbuildinfo

# Tool caches, temporary files, and logs
.vite/
.eslintcache
.cache/
.temp/
.tmp/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment overrides
.env
.env.local
.env.*.local

# Editors and operating systems
.idea/
.vscode/
*.swp
*.swo
*~
.DS_Store
Thumbs.db

# Repository-only documentation and tooling
docs/
README.md
LICENSE*
.prettierrc*
eslint.config.*

# Docker definitions are supplied directly to the builder
.dockerignore
Dockerfile*
docker-compose*.yml
docker-compose*.yaml
compose*.yml
compose*.yaml
```

- [ ] **Step 5: Verify build inputs and the effective Docker context**

Run:

```bash
npm run build
docker build --check .
docker build --tag watchman:ignore-files-test .
```

Expected: Vite completes the production build, BuildKit reports no Dockerfile validation errors, and the production image builds successfully. Success proves that the narrowed context still contains the npm manifests, application source, build configuration, and `nginx.conf` required by both Docker stages.

- [ ] **Step 6: Review the exact scope and commit the ignore files**

Run:

```bash
git diff --check -- \
  .gitignore \
  .dockerignore \
  docs/superpowers/specs/2026-07-18-ignore-files-design.md \
  docs/superpowers/plans/2026-07-18-ignore-files.md
git diff -- \
  .gitignore \
  .dockerignore \
  docs/superpowers/specs/2026-07-18-ignore-files-design.md \
  docs/superpowers/plans/2026-07-18-ignore-files.md
git status --short
git add \
  .gitignore \
  .dockerignore \
  docs/superpowers/specs/2026-07-18-ignore-files-design.md \
  docs/superpowers/plans/2026-07-18-ignore-files.md
git commit -m "fix: preserve shared environment files"
```

Expected: no whitespace errors are reported; the diff contains only the approved environment-boundary correction and synchronized documentation; unrelated untracked application files remain unstaged; the commit contains exactly `.gitignore`, `.dockerignore`, the design document, and the implementation plan.
