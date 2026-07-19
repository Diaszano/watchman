# Design Spec: CI/CD Pipeline Improvements (Watchman)

**Date**: 2026-07-19  
**Status**: Approved  

---

## 1. Overview & Goals

Watchman utilizes GitHub Actions workflows for continuous integration (`ci.yml`), PR title enforcement (`pr-title.yml`), and automated semantic releases (`release.yml`). This specification defines improvements to workflow concurrency, execution parallelization, dependency security auditing, and runner resource efficiency.

---

## 2. Architecture & Detailed Changes

### 2.1 Workflow Concurrency Management (`ci.yml`, `pr-title.yml`)
- Add a top-level `concurrency` block to `ci.yml` and `pr-title.yml`:
  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
- **Goal**: Automatically cancel outdated workflow runs when new commits are pushed to the same pull request or target branch (`dev` / `main`), saving runner minutes and delivering faster feedback.

### 2.2 Security Hardening & Dependency Review (`ci.yml`)
- Maintain minimal top-level permissions (`permissions: contents: read`).
- Add a `dependency-review` job triggered on `pull_request` using `actions/dependency-review-action@v4` to detect and block vulnerable dependencies added in PRs.

### 2.3 Quality Job Parallelization (`ci.yml`)
- Decompose the single sequential `quality` job into 4 parallel jobs:
  - `lint`: runs `npm run lint`
  - `test`: runs `npm test`
  - `test-release`: runs `npm run test:release`
  - `build`: runs `npm run build`
- All jobs reuse `actions/setup-node@v4` with `node-version: 24` and `cache: npm`.
- Update the downstream `container` job dependency matrix to:
  ```yaml
  needs: [lint, test, test-release, build]
  ```

---

## 3. Verification & Testing Strategy

1. **Local Workflow Validation**:
   - Verify syntax of `.github/workflows/ci.yml` and `.github/workflows/pr-title.yml`.
2. **Execution Check**:
   - Run `npm run lint`, `npm test`, `npm run test:release`, and `npm run build` locally to confirm all commands executed by the parallelized CI jobs continue to succeed cleanly.
