# CI, Release, and Docker Publishing Design

## Objective

Add GitHub Actions automation that validates every proposed change, enforces
Conventional Commits locally and in CI, creates semantic releases from commits
on `main`, and publishes the production image to Docker Hub for Linux AMD64 and
ARM64.

## Current Project Context

Watchman is a React 18, TypeScript, and Vite application managed with npm. The
repository already provides scripts for ESLint, Vitest, and the production
build, plus a multi-stage production Dockerfile that serves the static bundle
with Nginx. There are no existing GitHub Actions workflows or Git history on
the current `main` branch.

## Workflow Architecture

### Continuous Integration

`.github/workflows/ci.yml` runs for pull requests targeting `main` and pushes
to `main`. It contains two required jobs:

1. Commit validation fetches the complete relevant Git history and runs
   Commitlint over every commit introduced by the pull request or push. Merge,
   revert, and semantic-version tag commits use Commitlint's standard ignore
   behavior.
2. Code quality installs dependencies with `npm ci`, then runs `npm run lint`,
   `npm test`, and `npm run build`.

Both jobs must succeed for the CI workflow to succeed. The release workflow
only consumes successful CI completions for `main`.

### Pull Request Titles

`.github/workflows/pr-title.yml` validates pull request titles against the
Conventional Commits format. This keeps squash-merge commit messages compatible
with the release rules. Valid examples include `feat: add clock mode`,
`fix(canvas): correct scaling`, and `chore(ci): update actions`.

### Release and Docker Publication

`.github/workflows/release.yml` starts from a successful completion of the CI
workflow on `main`. It has write access to repository contents and serializes
release runs without cancelling a release already in progress.

Semantic Release reads the complete `main` history and applies these rules:

- `fix` produces a patch release.
- `perf` and `revert` produce a patch release.
- `feat` produces a minor release.
- `BREAKING CHANGE` or a `!` breaking marker produces a major release.
- `build`, `chore`, `ci`, `docs`, `refactor`, `style`, and `test` do not create
  a SemVer release unless they include a breaking change.

When a release is required, Semantic Release updates `package.json` and
`package-lock.json`, updates `CHANGELOG.md`, creates a release commit, creates a
`vX.Y.Z` Git tag, and publishes a GitHub Release. The generated release commit
contains `[skip ci]` so that it cannot recursively start another CI and release
cycle. npm package publication is disabled.

After version analysis, Docker Buildx builds the existing production
Dockerfile for `linux/amd64` and `linux/arm64` and pushes a manifest list to
Docker Hub. Every successful release workflow publishes:

- `${DOCKERHUB_USERNAME}/watchman:latest`

When Semantic Release creates a version, the same image also receives:

- `${DOCKERHUB_USERNAME}/watchman:X.Y.Z`
- `${DOCKERHUB_USERNAME}/watchman:X.Y`
- `${DOCKERHUB_USERNAME}/watchman:X`

This means a valid non-release commit such as `docs` or `chore` still refreshes
`latest` after CI, while immutable and compatibility version tags are only
created for an actual SemVer release.

## Local Commit Validation

Commitlint uses `@commitlint/config-conventional` as the single shared rule set.
Husky installs a `commit-msg` hook through the npm `prepare` script. The
`commit-msg` hook, rather than the earlier `pre-commit` lifecycle point, is used
because it receives the path to the completed commit message. It runs the same
Commitlint configuration used by CI and blocks invalid local commits.

The repository adds these development tools:

- `@commitlint/cli`
- `@commitlint/config-conventional`
- `husky`
- `semantic-release` and the explicit Semantic Release plugins needed for
  commit analysis, release notes, changelog, npm version updates, Git commits,
  and GitHub Releases

## Credentials and Permissions

Repository maintainers must define two GitHub Actions secrets:

- `DOCKERHUB_USERNAME`: the Docker Hub account or organization that owns the
  `watchman` repository.
- `DOCKERHUB_TOKEN`: a Docker Hub access token with permission to push that
  repository.

The release workflow uses the automatically provided `GITHUB_TOKEN` with
`contents: write` for the release commit, tag, and GitHub Release. Other
workflows receive only the read permissions they need. Secrets are only used in
the trusted workflow that runs after CI on `main`; pull request workflows never
receive Docker Hub credentials.

## Failure Handling

- A Commitlint, lint, test, or build failure prevents release and image
  publication.
- Missing or invalid Docker Hub credentials fail at login before any image is
  pushed.
- Failure to build either architecture fails the multi-platform publication;
  no successful workflow is reported with a partial target set.
- Semantic Release exits without a versioned tag when no release-producing
  commit exists, but the verified `main` snapshot is still eligible for the
  `latest` Docker tag.
- Release concurrency prevents overlapping automation from racing to create
  the same version or tag.

## Verification

The implementation is complete when all of the following pass:

1. Commitlint accepts representative `feat`, `fix`, and `chore(scope)` messages
   and rejects a message without a Conventional Commit type.
2. `npm ci`, `npm run lint`, `npm test`, and `npm run build` succeed from a clean
   dependency installation.
3. The production Dockerfile builds successfully.
4. The GitHub Actions YAML and Semantic Release configuration parse correctly,
   reference pinned major action versions, and expose only the required
   permissions and secrets.
5. The README documents the commit convention, release behavior, Docker image
   tags, and required GitHub secrets.

## Files

- Create `.github/workflows/ci.yml` for commit validation and code quality.
- Create `.github/workflows/pr-title.yml` for pull request title validation.
- Create `.github/workflows/release.yml` for Semantic Release and Docker Hub.
- Create `commitlint.config.js` for Conventional Commit rules.
- Create `.husky/commit-msg` for local message validation.
- Create `.releaserc.json` for release rules and plugins.
- Create `CHANGELOG.md` when the first release is produced; it is maintained by
  Semantic Release thereafter.
- Modify `package.json` and `package-lock.json` for tools and hook setup.
- Modify `Dockerfile` to use the lockfile-backed clean npm installation.
- Modify `README.md` with contributor, release, image, and secret setup.
