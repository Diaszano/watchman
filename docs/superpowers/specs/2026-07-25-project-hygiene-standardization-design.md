# Project Hygiene Standardization Design

## Goal

Bring the repository's operational hygiene closer to the relevant conventions in
the sibling BufBear project, while retaining the requirements and style of this
React/Vite application.

## Scope

- Strengthen Git and Docker build-context exclusions.
- Make local Node and editor behavior reproducible.
- Define which files Prettier formats and provide a check-only command for CI
  and contributors.
- Align documented setup with the reproducible installation policy already used
  by CI and Docker.

The work deliberately excludes wholesale adoption of BufBear's ESLint setup,
dependency changes, and application behavior changes.

## Design

### Git working tree

Extend `.gitignore` with generated test output, test reports, temporary files,
credentials and local environment variants. Explicitly preserve committed
environment examples. Ignore local IDE, agent, MCP, and worktree metadata when
it is not repository configuration.

The patterns will be specific enough that source, documentation, and shared
configuration remain trackable.

### Docker build context

Update `.dockerignore` to omit the same local-only material relevant to Docker:
worktrees, credentials, local environment files, reports, caches, and tool
metadata. Keep files required by the existing Dockerfiles and build commands in
the context. This reduces transfer size and prevents accidental inclusion of
secrets without changing the image contents expected by the application.

### Runtime and editor conventions

Add `.nvmrc` with Node 24, matching CI and the Docker base images. Add
`.editorconfig` to normalize charset, LF line endings, final newlines, and
indentation while allowing the existing Prettier configuration to remain the
source of formatting style.

Add `.prettierignore` for dependencies, generated files, build output,
coverage, lock files, and local tooling metadata. Retain Watchman's existing
Prettier style choices rather than copying BufBear's width or quote policy.

### Package scripts and documentation

Broaden the formatting targets to the project's maintained code and
configuration/documentation formats, respecting `.prettierignore`. Add
`format:check`, which uses Prettier's check mode and can run in CI or locally
without modifying files.

Update README setup guidance to state Node 24 and use `npm ci` as the default
reproducible installation command. Keep `npm install` only where it is clearly
the intended dependency-update workflow, if needed.

### Verification

After implementation, verify the expanded ignore behavior, then run
`npm run format:check`, linting, tests, production build, and a Docker build
when Docker is available. Any formatting changes required by the new coverage
will be intentional and limited to files selected by the revised script.

## Non-goals

- Rework the ESLint architecture or import BufBear's type-aware lint rules.
- Change package versions, application code, or container security behavior.
- Add new CI jobs unless the existing workflow needs only a small command
  alignment to use the new check.
