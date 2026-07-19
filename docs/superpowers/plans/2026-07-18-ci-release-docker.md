# CI, Release, and Docker Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions CI, Conventional Commit enforcement, automatic Semantic Release versioning, and multi-architecture Docker Hub publication for Watchman.

**Architecture:** A primary CI workflow validates commit history and application quality, then calls a reusable trusted release workflow only for successful pushes to `main`. Commitlint provides one rule set for CI, PR titles, and the local Husky `commit-msg` hook; Semantic Release owns SemVer, package version files, changelog, Git tags, and GitHub Releases; Docker Buildx publishes the verified source for AMD64 and ARM64.

**Tech Stack:** GitHub Actions, Node.js 22, npm, Commitlint, Husky, Semantic Release, Docker Buildx, QEMU, Docker Hub.

## Global Constraints

- CI runs for pull requests targeting `main` and pushes to `main`.
- Release and Docker publication run only after both commit validation and application quality succeed on a push to `main`.
- Conventional Commit rules are shared by local hooks, commit-range CI, and pull request title validation.
- Release rules are: `fix`, `perf`, and `revert` produce patch; `feat` produces minor; breaking changes produce major; `build`, `chore`, `ci`, `docs`, `refactor`, `style`, and `test` do not release unless breaking.
- Semantic Release updates `package.json`, `package-lock.json`, and `CHANGELOG.md`, creates `vX.Y.Z`, and publishes a GitHub Release without publishing to npm.
- Docker publishes `${DOCKERHUB_USERNAME}/watchman:latest` on every successful `main` run and adds `X.Y.Z`, `X.Y`, and `X` tags when a SemVer release is created.
- Docker targets are exactly `linux/amd64` and `linux/arm64`.
- GitHub secrets are named exactly `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.
- Third-party Actions use the current stable major versions: `actions/checkout@v6`, `actions/setup-node@v6`, `docker/login-action@v4`, `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, and `docker/build-push-action@v7`.

---

## File Map

- `.gitignore`: excludes local assistant settings and TypeScript incremental build output from the repository baseline.
- `package.json`: exposes setup and configuration-test scripts and declares CI/release development tools.
- `package-lock.json`: locks the exact dependency graph used by `npm ci` and Docker.
- `commitlint.config.js`: exports the shared Conventional Commits rule set.
- `.husky/commit-msg`: rejects invalid commit messages before Git completes a local commit.
- `scripts/test-commitlint.sh`: executable contract test for accepted and rejected commit messages.
- `.github/scripts/validate-commits.sh`: validates either a normal Git range or all history on an initial push.
- `.github/workflows/ci.yml`: runs commit validation and quality jobs, then calls the reusable release workflow on successful `main` pushes.
- `.github/workflows/pr-title.yml`: validates pull request titles using the shared Commitlint configuration.
- `.releaserc.json`: defines release branches, SemVer rules, version-file updates, changelog generation, Git commit/tag behavior, and GitHub Release publication.
- `scripts/test-release-config.mjs`: verifies the release policy and required Docker workflow contract without contacting GitHub or Docker Hub.
- `.github/workflows/release.yml`: performs the trusted release and multi-platform Docker Hub push.
- `Dockerfile`: switches the production build stage from `npm install` to deterministic `npm ci`.
- `README.md`: documents commit rules, automatic releases, Docker tags, and repository secret setup.

---

### Task 1: Establish a Clean Repository Baseline

**Files:**

- Modify: `.gitignore`
- Add to Git: all existing application, test, Docker, and configuration files not excluded by `.gitignore`

**Interfaces:**

- Consumes: the existing untracked Watchman source tree.
- Produces: a reproducible Git baseline that GitHub Actions can check out and build.

- [ ] **Step 1: Extend build and local-tool exclusions**

Append these exact entries to `.gitignore`:

```gitignore
*.tsbuildinfo
.claude/
```

- [ ] **Step 2: Verify ignored artifacts are excluded**

Run:

```bash
git status --short --ignored
```

Expected: `.claude/`, `node_modules/`, `dist/`, `.DS_Store`, and `tsconfig.tsbuildinfo` are marked `!!`; the application files remain `??`.

- [ ] **Step 3: Reinstall and verify the existing application from its lockfile**

Run:

```bash
npm ci
npm run lint
npm test
npm run build
```

Expected: dependency installation succeeds, ESLint exits zero, Vitest reports all existing tests passing, and Vite produces `dist/`.

- [ ] **Step 4: Stage only the clean project baseline**

Run:

```bash
git add .
git status --short
```

Expected: application, Docker, npm, and project configuration files are staged; `.claude/`, `node_modules/`, `dist/`, `.DS_Store`, and `tsconfig.tsbuildinfo` are absent.

- [ ] **Step 5: Commit the baseline**

```bash
git commit -m "chore: add watchman project baseline"
```

Expected: Git creates a Conventional Commit containing the existing application source.

---

### Task 2: Add Shared Commit Validation and the Local Hook

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/test-commitlint.sh`
- Create: `commitlint.config.js`
- Create: `.husky/commit-msg`

**Interfaces:**

- Consumes: commit messages on standard input or the Git message file path supplied by Husky.
- Produces: `npm run test:commits`; default-exported Commitlint configuration; installed `commit-msg` hook.

- [ ] **Step 1: Install the commit and release toolchain**

Run:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky semantic-release @semantic-release/changelog @semantic-release/commit-analyzer @semantic-release/git @semantic-release/github @semantic-release/npm @semantic-release/release-notes-generator conventional-changelog-conventionalcommits
```

Expected: `package.json` and `package-lock.json` contain the resolved tools and npm exits zero.

- [ ] **Step 2: Write the Commitlint contract test**

Create executable `scripts/test-commitlint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

valid_messages=(
  "feat: add clock mode"
  "fix(canvas): correct scaling"
  "chore(ci): update actions"
)

for message in "${valid_messages[@]}"; do
  printf '%s\n' "$message" | npx --no -- commitlint
done

if printf '%s\n' "update pipeline" | npx --no -- commitlint; then
  echo "Expected an invalid commit message to be rejected" >&2
  exit 1
fi
```

Run:

```bash
chmod +x scripts/test-commitlint.sh
./scripts/test-commitlint.sh
```

Expected: FAIL because Commitlint has no conventional rule configuration yet and accepts `update pipeline`.

- [ ] **Step 3: Add the shared Commitlint configuration**

Create `commitlint.config.js`:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
};
```

- [ ] **Step 4: Wire npm and Husky**

Add these scripts to the existing `scripts` object in `package.json` without changing the existing commands:

```json
"prepare": "husky",
"test:commits": "bash scripts/test-commitlint.sh"
```

Create executable `.husky/commit-msg`:

```bash
npx --no -- commitlint --edit "$1"
```

Run:

```bash
chmod +x .husky/commit-msg
npm run prepare
```

Expected: Husky configures `.husky` as the repository hooks path.

- [ ] **Step 5: Verify valid, invalid, and real hook behavior**

Run:

```bash
npm run test:commits
printf '%s\n' "feat: validate hook" > /tmp/watchman-valid-commit
.husky/commit-msg /tmp/watchman-valid-commit
printf '%s\n' "invalid message" > /tmp/watchman-invalid-commit
! .husky/commit-msg /tmp/watchman-invalid-commit
```

Expected: all commands exit zero as a group; the invalid message prints Commitlint errors.

- [ ] **Step 6: Commit shared validation**

```bash
git add package.json package-lock.json commitlint.config.js .husky/commit-msg scripts/test-commitlint.sh
git commit -m "feat(ci): enforce conventional commits locally"
```

---

### Task 3: Add CI Commit, Code, and Pull Request Validation

**Files:**

- Create: `.github/scripts/validate-commits.sh`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pr-title.yml`

**Interfaces:**

- Consumes: `validate-commits.sh <from-sha> <to-sha>` where an all-zero or empty `from-sha` denotes an initial push.
- Produces: GitHub status checks named `Commit messages`, `Lint, test, and build`, and `Pull request title`; successful `main` CI calls `.github/workflows/release.yml`.

- [ ] **Step 1: Write the commit-range validator**

Create executable `.github/scripts/validate-commits.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

from_sha="${1:-}"
to_sha="${2:-HEAD}"
zero_sha="0000000000000000000000000000000000000000"

if [[ -z "$from_sha" || "$from_sha" == "$zero_sha" ]]; then
  root_sha="$(git rev-list --max-parents=0 "$to_sha" | tail -n 1)"
  git show --quiet --format=%B "$root_sha" | npx --no -- commitlint

  if [[ "$root_sha" != "$to_sha" ]]; then
    npx --no -- commitlint --from "$root_sha" --to "$to_sha" --verbose
  fi
else
  npx --no -- commitlint --from "$from_sha" --to "$to_sha" --verbose
fi
```

Run:

```bash
chmod +x .github/scripts/validate-commits.sh
.github/scripts/validate-commits.sh 0000000000000000000000000000000000000000 HEAD
```

Expected: every repository commit is printed as valid and the command exits zero.

- [ ] **Step 2: Prove the normal range path validates the latest commit**

Run:

```bash
.github/scripts/validate-commits.sh HEAD^ HEAD
```

Expected: the latest Conventional Commit is validated and the command exits zero.

- [ ] **Step 3: Create the main CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  commitlint:
    name: Commit messages
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate commit messages
        env:
          FROM_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}
          TO_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
        run: .github/scripts/validate-commits.sh "$FROM_SHA" "$TO_SHA"

  quality:
    name: Lint, test, and build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

  release:
    name: Release and publish
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [commitlint, quality]
    permissions:
      contents: write
    uses: ./.github/workflows/release.yml
    secrets: inherit
```

- [ ] **Step 4: Create pull request title validation**

Create `.github/workflows/pr-title.yml`:

```yaml
name: Pull Request Title

on:
  pull_request:
    branches: [main]
    types: [opened, edited, synchronize, reopened]

permissions:
  contents: read

jobs:
  commitlint:
    name: Pull request title
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate pull request title
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: printf '%s\n' "$PR_TITLE" | npx --no -- commitlint
```

- [ ] **Step 5: Validate workflow syntax and local quality**

Run:

```bash
npx prettier --check ".github/workflows/*.yml"
npm run test:commits
npm run lint
npm test
npm run build
```

Expected: Prettier parses both workflow files and all project checks pass. `ci.yml` may reference the not-yet-created reusable release workflow until Task 4 is committed; both tasks land before the branch is pushed.

- [ ] **Step 6: Commit CI validation**

```bash
git add .github/scripts/validate-commits.sh .github/workflows/ci.yml .github/workflows/pr-title.yml
git commit -m "feat(ci): add validation workflows"
```

---

### Task 4: Add Semantic Release and Multi-Architecture Docker Publication

**Files:**

- Modify: `package.json`
- Create: `scripts/test-release-config.mjs`
- Create: `.releaserc.json`
- Create: `.github/workflows/release.yml`
- Modify: `Dockerfile`

**Interfaces:**

- Consumes: successful `workflow_call` from `ci.yml`, `GITHUB_TOKEN`, `DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN`.
- Produces: release commit, `vX.Y.Z` tag, GitHub Release, `${DOCKERHUB_USERNAME}/watchman:latest`, and conditional `X.Y.Z`, `X.Y`, and `X` image tags.

- [ ] **Step 1: Write the release configuration contract test**

Create `scripts/test-release-config.mjs`:

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('.releaserc.json', 'utf8'));
const plugin = (name) =>
  config.plugins.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === name);

assert.deepEqual(config.branches, ['main']);
assert.equal(config.tagFormat, 'v${version}');

const analyzer = plugin('@semantic-release/commit-analyzer');
assert.ok(Array.isArray(analyzer));
const rules = new Map(analyzer[1].releaseRules.map(({ type, release }) => [type, release]));
assert.equal(rules.get('feat'), 'minor');
assert.equal(rules.get('fix'), 'patch');
assert.equal(rules.get('perf'), 'patch');
assert.equal(rules.get('revert'), 'patch');
for (const type of ['build', 'chore', 'ci', 'docs', 'refactor', 'style', 'test']) {
  assert.equal(rules.get(type), false);
}

const npmPlugin = plugin('@semantic-release/npm');
assert.equal(npmPlugin[1].npmPublish, false);

const gitPlugin = plugin('@semantic-release/git');
assert.deepEqual(gitPlugin[1].assets, ['CHANGELOG.md', 'package.json', 'package-lock.json']);
assert.match(gitPlugin[1].message, /\[skip ci\]/);

const workflow = await readFile('.github/workflows/release.yml', 'utf8');
for (const requiredText of [
  'linux/amd64,linux/arm64',
  'DOCKERHUB_USERNAME',
  'DOCKERHUB_TOKEN',
  'docker/setup-qemu-action@v4',
  'docker/setup-buildx-action@v4',
  'docker/build-push-action@v7',
]) {
  assert.ok(workflow.includes(requiredText), `Missing release workflow contract: ${requiredText}`);
}
```

Add this script to `package.json`:

```json
"test:release": "node scripts/test-release-config.mjs"
```

Run:

```bash
npm run test:release
```

Expected: FAIL with `ENOENT` because `.releaserc.json` and the release workflow do not exist yet.

- [ ] **Step 2: Configure Semantic Release**

Create `.releaserc.json`:

```json
{
  "branches": ["main"],
  "tagFormat": "v${version}",
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "release": "minor" },
          { "type": "fix", "release": "patch" },
          { "type": "perf", "release": "patch" },
          { "type": "revert", "release": "patch" },
          { "type": "build", "release": false },
          { "type": "chore", "release": false },
          { "type": "ci", "release": false },
          { "type": "docs", "release": false },
          { "type": "refactor", "release": false },
          { "type": "style", "release": false },
          { "type": "test", "release": false }
        ]
      }
    ],
    ["@semantic-release/release-notes-generator", { "preset": "conventionalcommits" }],
    ["@semantic-release/changelog", { "changelogTitle": "# Changelog" }],
    ["@semantic-release/npm", { "npmPublish": false }],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json", "package-lock.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

- [ ] **Step 3: Create the trusted reusable release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release and Docker

on:
  workflow_call:
    secrets:
      DOCKERHUB_USERNAME:
        required: true
      DOCKERHUB_TOKEN:
        required: true

permissions:
  contents: write

concurrency:
  group: release-${{ github.repository }}-main
  cancel-in-progress: false

jobs:
  release:
    name: Semantic release and Docker Hub
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Read current release tag
        id: previous-release
        shell: bash
        run: echo "tag=$(git tag --list 'v[0-9]*' --sort=-v:refname | head -n 1)" >> "$GITHUB_OUTPUT"

      - name: Create semantic release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm exec semantic-release

      - name: Resolve published version
        id: release
        shell: bash
        env:
          PREVIOUS_TAG: ${{ steps.previous-release.outputs.tag }}
        run: |
          current_tag="$(git tag --list 'v[0-9]*' --sort=-v:refname | head -n 1)"
          if [[ -n "$current_tag" && "$current_tag" != "$PREVIOUS_TAG" ]]; then
            echo "published=true" >> "$GITHUB_OUTPUT"
            echo "version=${current_tag#v}" >> "$GITHUB_OUTPUT"
          else
            echo "published=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Build Docker tags
        id: docker-tags
        shell: bash
        env:
          IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/watchman
          RELEASE_PUBLISHED: ${{ steps.release.outputs.published }}
          VERSION: ${{ steps.release.outputs.version }}
        run: |
          {
            echo 'tags<<EOF'
            echo "${IMAGE}:latest"
            if [[ "$RELEASE_PUBLISHED" == "true" ]]; then
              major="${VERSION%%.*}"
              remainder="${VERSION#*.}"
              minor="${remainder%%.*}"
              echo "${IMAGE}:${VERSION}"
              echo "${IMAGE}:${major}.${minor}"
              echo "${IMAGE}:${major}"
            fi
            echo 'EOF'
          } >> "$GITHUB_OUTPUT"

      - name: Log in to Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Build and push image
        uses: docker/build-push-action@v7
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.docker-tags.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 4: Make the production container installation deterministic**

In the build stage of `Dockerfile`, replace:

```dockerfile
RUN npm install
```

with:

```dockerfile
RUN npm ci
```

- [ ] **Step 5: Run release and workflow contract tests**

Run:

```bash
npm run test:release
npx prettier --check ".github/workflows/*.yml" ".releaserc.json"
```

Expected: the release policy assertions pass and Prettier parses all workflow and release configuration files.

- [ ] **Step 6: Build the production image locally**

Run:

```bash
docker build --tag watchman:ci-test .
docker image inspect watchman:ci-test --format '{{.Config.Healthcheck.Test}}'
```

Expected: the build succeeds and inspection prints the Nginx healthcheck command. Multi-platform manifest publication remains a GitHub Actions integration check because the local command must not push to Docker Hub.

- [ ] **Step 7: Commit release and container publication**

```bash
git add package.json .releaserc.json scripts/test-release-config.mjs .github/workflows/release.yml Dockerfile
git commit -m "feat(ci): automate releases and docker publishing"
```

---

### Task 5: Document Contributor and Repository Setup

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: implemented npm scripts, workflows, secret names, and image tagging policy.
- Produces: operator instructions sufficient to enable Docker Hub publication and contributor instructions sufficient to create accepted commits.

- [ ] **Step 1: Add contributor commit guidance**

Add this section after `Other scripts`:

````markdown
## Contributing

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add a new capability
fix(canvas): correct rendering behavior
chore(ci): maintain automation
```

`npm install` configures the Husky `commit-msg` hook. The same rules are checked against every pull request commit in CI.
````

- [ ] **Step 2: Document image tags and release automation**

Add this content under `Production deployment`:

```markdown
### Docker Hub publication

Every successful push to `main` publishes a multi-architecture image for `linux/amd64` and `linux/arm64` as `<dockerhub-user>/watchman:latest`. When the commits produce a semantic release, the image also receives `X.Y.Z`, `X.Y`, and `X` tags.

Conventional Commits determine the next version: `fix`, `perf`, and `revert` create a patch; `feat` creates a minor; and a breaking change creates a major. The release workflow updates the npm version files and changelog, creates the Git tag, and publishes the GitHub Release automatically.

Repository administrators must create these GitHub Actions secrets:

| Secret               | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub account or organization that owns `watchman` |
| `DOCKERHUB_TOKEN`    | Docker Hub access token with push permission            |

The repository must allow GitHub Actions to write repository contents so Semantic Release can push the release commit and tag to `main`.
```

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
npm ci
npm run test:commits
npm run test:release
npm run lint
npm test
npm run build
npx prettier --check ".github/workflows/*.yml" ".releaserc.json" "README.md"
docker build --tag watchman:ci-test .
git diff --check
```

Expected: all commands exit zero; Vitest reports all tests passing; Vite and Docker builds complete; Prettier and Git report no syntax or whitespace errors.

- [ ] **Step 4: Review permissions and secret boundaries**

Run:

```bash
rg -n "permissions:|contents: write|DOCKERHUB_|pull_request:|workflow_call:" .github/workflows
```

Expected: only the trusted release path has `contents: write` and Docker Hub secrets; pull request jobs have read-only contents access.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md
git commit -m "docs(ci): document releases and docker hub"
```

---

## GitHub Setup After Push

These are repository-owner actions and are not performed by local code:

1. Create the Docker Hub repository `watchman` under the account or organization stored in `DOCKERHUB_USERNAME`.
2. Create a Docker Hub access token with push permission.
3. Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as GitHub Actions repository secrets.
4. In GitHub Actions settings, grant workflows read and write repository permissions.
5. Protect `main` with the `Commit messages`, `Lint, test, and build`, and `Pull request title` checks while allowing the GitHub Actions release identity to push the generated release commit.
