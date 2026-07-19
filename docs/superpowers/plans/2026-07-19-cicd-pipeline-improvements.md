# CI/CD Pipeline Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Otimizar os workflows do GitHub Actions adicionando controle de concorrência (`concurrency`), verificação de dependências em PRs (`dependency-review`) e paralelização das etapas de qualidade (`lint`, `test`, `test-release`, `build`).

**Architecture:** Refatorar `.github/workflows/ci.yml` e `.github/workflows/pr-title.yml` para incluir concorrência, adicionar job de revisão de dependências e decompor o job `quality` em 4 jobs paralelos isolados que alimentam o job de verificação de container.

**Tech Stack:** GitHub Actions (YAML), Node.js 24, Trivy, Docker.

## Global Constraints

- Manter compatibilidade total com os scripts existentes em `.github/scripts/` e `scripts/`.
- Garantir que todos os workflows passem na validação sintática do YAML.
- Manter o escopo mínimo de permissões (`permissions: contents: read`).

---

### Task 1: Concurrency Control & Dependency Review Action

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/pr-title.yml`

**Interfaces:**
- Consumes: Eventos de PR e push no GitHub Actions
- Produces: Cancelamento automático de execuções obsoletas e bloqueio de dependências vulneráveis em PRs

- [ ] **Step 1: Add concurrency block and dependency-review job to `.github/workflows/ci.yml`**

Modify `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  dependency-review:
    name: Dependency Review
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Dependency Review
        uses: actions/dependency-review-action@5a2ee3f3262075055743bea0b591632737651a44 # v4.5.0

  commitlint:
    name: Commit messages
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate commit messages
        env:
          FROM_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}
          TO_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
        run: .github/scripts/validate-commits.sh "$FROM_SHA" "$TO_SHA"

      - name: Validate PR target branch policy
        if: github.event_name == 'pull_request' && github.base_ref == 'main'
        run: |
          if [[ "${{ github.head_ref }}" != "dev" && "${{ github.head_ref }}" != "development" ]]; then
            echo "::error::Only pull requests coming from the 'dev' (or 'development') branch are allowed to be merged into 'main'."
            exit 1
          fi
```

- [ ] **Step 2: Add concurrency block to `.github/workflows/pr-title.yml`**

Modify `.github/workflows/pr-title.yml`:

```yaml
name: Pull Request Title

on:
  pull_request:
    branches: [main, dev]
    types: [opened, edited, synchronize, reopened]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  commitlint:
    name: Pull request title
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate pull request title
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: printf '%s\n' "$PR_TITLE" | npx --no -- commitlint
```

- [ ] **Step 3: Commit changes**

```bash
git add .github/workflows/ci.yml .github/workflows/pr-title.yml
git commit -m "ci: add concurrency control and dependency review action"
```

---

### Task 2: Quality Jobs Parallelization in `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Node.js 24 environment & npm dependencies
- Produces: Parallelized execution of `lint`, `test`, `test-release`, and `build` jobs feeding into `container` job

- [ ] **Step 1: Refactor `ci.yml` to split quality job into parallel jobs (`lint`, `test`, `test-release`, `build`)**

Update `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  dependency-review:
    name: Dependency Review
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Dependency Review
        uses: actions/dependency-review-action@5a2ee3f3262075055743bea0b591632737651a44 # v4.5.0

  commitlint:
    name: Commit messages
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate commit messages
        env:
          FROM_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}
          TO_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
        run: .github/scripts/validate-commits.sh "$FROM_SHA" "$TO_SHA"

      - name: Validate PR target branch policy
        if: github.event_name == 'pull_request' && github.base_ref == 'main'
        run: |
          if [[ "${{ github.head_ref }}" != "dev" && "${{ github.head_ref }}" != "development" ]]; then
            echo "::error::Only pull requests coming from the 'dev' (or 'development') branch are allowed to be merged into 'main'."
            exit 1
          fi

  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint

  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Test
        run: npm test

  test-release:
    name: Test release configuration
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Test release configuration
        run: npm run test:release

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build

  container:
    name: Container security
    needs: [lint, test, test-release, build]
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Set up Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24

      - name: Verify container configuration
        run: node scripts/test-container-config.mjs

      - name: Build production image
        run: docker build --pull --tag watchman:ci .

      - name: Verify production container
        run: .github/scripts/verify-container.sh watchman:ci

      - name: Report all HIGH/CRITICAL vulnerabilities
        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
        with:
          scan-type: image
          image-ref: watchman:ci
          format: table
          exit-code: '0'
          ignore-unfixed: false
          vuln-type: os,library
          severity: CRITICAL,HIGH

      - name: Gate on fixable HIGH/CRITICAL vulnerabilities
        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
        with:
          scan-type: image
          image-ref: watchman:ci
          format: table
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: os,library
          severity: CRITICAL,HIGH

  release:
    name: Release and publish
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev')
    needs: [commitlint, lint, test, test-release, build, container]
    permissions:
      contents: write
      packages: write
    uses: ./.github/workflows/release.yml
    secrets:
      DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
      DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
```

- [ ] **Step 2: Verify local npm test, lint, test:release and build**

Run: `npm run lint && npm test && npm run test:release && npm run build`
Expected: All steps complete with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: parallelize quality jobs (lint, test, test-release, build)"
```
