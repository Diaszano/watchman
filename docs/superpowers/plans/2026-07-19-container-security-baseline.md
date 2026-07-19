# Container Security Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship reproducible Node.js 24 LTS and NGINX 1.30.3 containers that run NGINX without root, expose only localhost by default, and are rejected by CI if runtime or vulnerability checks fail.

**Architecture:** Keep the existing two-stage static build, but pin both base images by digest and replace the NGINX defaults with a complete project-owned non-root configuration on port 8080. Encode the live-container and resolved-Compose contracts in focused scripts, then run those checks and a pinned Trivy scan before the reusable release workflow is eligible to publish.

**Tech Stack:** Docker and Docker Compose, Node.js 24 LTS Alpine, NGINX 1.30.3 Alpine Slim, Bash, Node.js assertions, GitHub Actions, Trivy.

## Global Constraints

- Production build base: `node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd`.
- Production runtime base: `nginx:1.30.3-alpine-slim@sha256:d5b51cfc7d55fc7a7bcf4d1d577b9c3738331df56d68f0b1d8ac9795b9470a5a`.
- NGINX must run as the existing `nginx` user, listen on container port 8080, and write runtime files only below `/tmp`.
- Production Compose must bind `127.0.0.1:8080:8080`, use a read-only root filesystem, enable `no-new-privileges`, and mount only `/tmp` as a writable temporary filesystem.
- Development Compose must bind `127.0.0.1:5173:5173`; Vite must remain reachable for HMR inside the container.
- CI must fail on fixable `HIGH` or `CRITICAL` final-image vulnerabilities and keep unfixed findings visible but non-blocking.
- Every modified third-party GitHub Action reference must be a full 40-character commit SHA with a nearby version comment.
- Do not upgrade Vite, Vitest, React, React Router, Zustand, the PWA plugin, or any other application dependency in this phase.
- Do not change Semantic Release rules, Docker Hub credentials, image tags, target architectures, or publication behavior.

---

## File Structure

- `.github/scripts/verify-container.sh`: owns black-box inspection of one built production image, including configured user, live process user, health, routing, cache, and security headers.
- `scripts/test-container-config.mjs`: owns static Dockerfile assertions and resolved Docker Compose assertions; it does not start containers.
- `Dockerfile`: owns the reproducible production build and non-root runtime image contract.
- `Dockerfile.dev`: owns the deterministic Node.js 24 development image.
- `nginx.conf`: owns the complete NGINX main, HTTP, and server configuration; no image-provided server template remains active.
- `docker-compose.yml`: owns local port publication and production runtime restrictions.
- `scripts/test-release-config.mjs`: owns assertions for release semantics, workflow Node versions, immutable action pins, and the required container gate.
- `.github/workflows/ci.yml`: owns code validation and the container security gate.
- `.github/workflows/pr-title.yml`: owns pull-request title validation under the same pinned Node.js/action baseline.
- `.github/workflows/release.yml`: owns unchanged release and Docker Hub publication behavior with pinned actions.
- `README.md`: owns operator-facing Docker usage and maintenance guidance.

### Task 1: Define the live production-container contract

**Files:**
- Create: `.github/scripts/verify-container.sh`

**Interfaces:**
- Consumes: exactly one Docker image reference as `$1`.
- Produces: exit code 0 only when the image and live container satisfy the non-root, port, health, routing, cache, and header contract; diagnostic container logs on failure.

- [ ] **Step 1: Write the failing black-box verification script**

Create `.github/scripts/verify-container.sh` with this complete content:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <image>" >&2
  exit 2
fi

image="$1"
container_id=""

fail() {
  echo "Container verification failed: $*" >&2
  return 1
}

cleanup() {
  status=$?
  if [[ -n "$container_id" ]]; then
    if [[ $status -ne 0 ]]; then
      docker logs "$container_id" >&2 || true
    fi
    docker rm --force "$container_id" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup EXIT

configured_user="$(docker image inspect --format '{{.Config.User}}' "$image")"
case "$configured_user" in
  ""|root|0|0:*) fail "image user must be explicitly non-root, got '${configured_user:-<empty>}'" ;;
esac

exposes_8080="$(docker image inspect --format '{{if index .Config.ExposedPorts "8080/tcp"}}yes{{end}}' "$image")"
[[ "$exposes_8080" == yes ]] || fail "image does not expose 8080/tcp"

container_id="$(docker run --detach \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 \
  "$image")"

health=""
for _ in {1..30}; do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id")"
  case "$health" in
    healthy) break ;;
    unhealthy|missing) fail "container health is $health" ;;
  esac
  sleep 1
done
[[ "$health" == healthy ]] || fail "container did not become healthy within 30 seconds"

docker top "$container_id" -eo user,comm | awk '
  NR > 1 { count += 1; if ($1 == "root" || $1 == "0") bad = 1 }
  END { exit(count == 0 || bad) }
' || fail "a live container process is missing or running as root"

published_address="$(docker port "$container_id" 8080/tcp | head -n 1)"
published_port="${published_address##*:}"
base_url="http://127.0.0.1:${published_port}"

[[ "$(curl --fail --silent --show-error "$base_url/health")" == "ok" ]] ||
  fail "health endpoint body must be 'ok'"

curl --fail --silent --show-error "$base_url/player" | grep -q 'id="root"' ||
  fail "SPA fallback did not serve the application shell"

missing_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$base_url/missing.js")"
[[ "$missing_status" == 404 ]] || fail "missing static asset returned $missing_status instead of 404"

headers="$(curl --silent --show-error --dump-header - --output /dev/null "$base_url/" |
  tr -d '\r' | tr '[:upper:]' '[:lower:]')"

assert_header() {
  local expected="$1"
  grep -Fqx "$expected" <<<"$headers" || fail "missing response header: $expected"
}

assert_header "x-content-type-options: nosniff"
assert_header "x-frame-options: deny"
assert_header "referrer-policy: no-referrer"
assert_header "permissions-policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), screen-wake-lock=(self)"
grep -Fq "content-security-policy: default-src 'self';" <<<"$headers" ||
  fail "missing restrictive Content-Security-Policy"
grep -Fq "cache-control: no-cache" <<<"$headers" ||
  fail "application shell must revalidate"
grep -Eq '^server: nginx/[0-9]' <<<"$headers" &&
  fail "Server header discloses the NGINX version"

index_html="$(curl --fail --silent --show-error "$base_url/")"
asset_path="$(sed -n 's|.*\(/assets/[^"[:space:]]*\).*|\1|p' <<<"$index_html" | head -n 1)"
[[ -n "$asset_path" ]] || fail "could not discover a fingerprinted asset"

asset_headers="$(curl --silent --show-error --dump-header - --output /dev/null "$base_url$asset_path" |
  tr -d '\r' | tr '[:upper:]' '[:lower:]')"
grep -Fqx "cache-control: public, max-age=31536000, immutable" <<<"$asset_headers" ||
  fail "fingerprinted asset is missing immutable caching"

echo "Container verification passed for $image"
```

Make the script executable:

```bash
chmod +x .github/scripts/verify-container.sh
```

- [ ] **Step 2: Run the contract against the current image and verify RED**

Run:

```bash
docker build --tag watchman:pre-hardening .
.github/scripts/verify-container.sh watchman:pre-hardening
```

Expected: the build succeeds, then verification fails with `image user must be explicitly non-root` because the current runtime has no explicit `USER`.

- [ ] **Step 3: Check shell syntax**

Run:

```bash
bash -n .github/scripts/verify-container.sh
```

Expected: exit code 0 with no output.

- [ ] **Step 4: Commit the executable failing contract**

```bash
git add .github/scripts/verify-container.sh
git commit -m "test(container): define hardened runtime contract"
```

### Task 2: Build the non-root production image

**Files:**
- Modify: `Dockerfile`
- Modify: `nginx.conf`
- Test: `.github/scripts/verify-container.sh`

**Interfaces:**
- Consumes: the existing npm lockfile and Vite build output contract at `/app/dist`.
- Produces: image user `nginx`, exposed port `8080/tcp`, `/health`, SPA fallback, static-file 404 behavior, immutable asset caching, and baseline browser headers.

- [ ] **Step 1: Replace the production Dockerfile**

Replace `Dockerfile` with:

```dockerfile
# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd
ARG NGINX_IMAGE=nginx:1.30.3-alpine-slim@sha256:d5b51cfc7d55fc7a7bcf4d1d577b9c3738331df56d68f0b1d8ac9795b9470a5a

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NGINX_IMAGE} AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:8080/health"]

ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Replace the project-owned NGINX configuration**

Replace `nginx.conf` with:

```nginx
worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent" "$http_x_forwarded_for"';
  access_log /dev/stdout main;

  sendfile on;
  keepalive_timeout 65;
  server_tokens off;

  client_body_temp_path /tmp/client_temp;
  proxy_temp_path /tmp/proxy_temp;
  fastcgi_temp_path /tmp/fastcgi_temp;
  uwsgi_temp_path /tmp/uwsgi_temp;
  scgi_temp_path /tmp/scgi_temp;

  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;

  server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header_inherit merge;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), screen-wake-lock=(self)" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'" always;

    location = /health {
      access_log off;
      default_type text/plain;
      add_header Cache-Control "no-store" always;
      return 200 "ok\n";
    }

    location = /index.html {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location = /manifest.webmanifest {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location = /sw.js {
      add_header Cache-Control "no-cache" always;
      try_files $uri =404;
    }

    location ^~ /assets/ {
      add_header Cache-Control "public, max-age=31536000, immutable" always;
      try_files $uri =404;
    }

    location ~* "\.[a-z0-9]{1,16}$" {
      try_files $uri =404;
    }

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
```

- [ ] **Step 3: Build and validate the NGINX configuration**

Run:

```bash
docker build --pull --tag watchman:security-test .
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m watchman:security-test nginx -t
```

Expected: the image builds with Node `v24.18.0`; `nginx -t` reports that syntax is okay and the configuration test is successful.

- [ ] **Step 4: Run the live contract and verify GREEN**

Run:

```bash
.github/scripts/verify-container.sh watchman:security-test
```

Expected: `Container verification passed for watchman:security-test`.

- [ ] **Step 5: Commit the hardened production runtime**

```bash
git add Dockerfile nginx.conf
git commit -m "feat(docker): harden production runtime"
```

### Task 3: Secure Compose and modernize the development image

**Files:**
- Create: `scripts/test-container-config.mjs`
- Modify: `Dockerfile.dev`
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: Docker Compose JSON output from `docker compose config --format json` and the pinned base strings in both Dockerfiles.
- Produces: a zero-dependency Node.js configuration test; localhost-only production/development ports; production read-only and `no-new-privileges` settings.

- [ ] **Step 1: Write the failing resolved-configuration test**

Create `scripts/test-container-config.mjs` with:

```javascript
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const NODE_IMAGE =
  'node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd';
const NGINX_IMAGE =
  'nginx:1.30.3-alpine-slim@sha256:d5b51cfc7d55fc7a7bcf4d1d577b9c3738331df56d68f0b1d8ac9795b9470a5a';

const composeConfig = (...extraArgs) => {
  const result = spawnSync(
    'docker',
    ['compose', ...extraArgs, 'config', '--format', 'json'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

const port = (service, target) =>
  service.ports.find((entry) => entry.target === target && entry.protocol === 'tcp');

const dockerfile = await readFile('Dockerfile', 'utf8');
assert.match(dockerfile, new RegExp(NODE_IMAGE.replaceAll('.', '\\.')));
assert.match(dockerfile, new RegExp(NGINX_IMAGE.replaceAll('.', '\\.')));
assert.match(dockerfile, /^USER nginx$/m);
assert.match(dockerfile, /^EXPOSE 8080$/m);

const developmentDockerfile = await readFile('Dockerfile.dev', 'utf8');
assert.match(developmentDockerfile, new RegExp(NODE_IMAGE.replaceAll('.', '\\.')));
assert.match(developmentDockerfile, /^RUN npm ci$/m);
assert.doesNotMatch(developmentDockerfile, /^RUN npm install$/m);

const production = composeConfig();
const web = production.services.web;
const webPort = port(web, 8080);
assert.ok(webPort, 'web must publish container port 8080');
assert.equal(webPort.host_ip, '127.0.0.1');
assert.equal(webPort.published, '8080');
assert.equal(web.read_only, true);
assert.ok(web.security_opt.includes('no-new-privileges:true'));
assert.ok(web.tmpfs.some((entry) => entry.startsWith('/tmp:')));

const development = composeConfig('--profile', 'dev');
const dev = development.services.dev;
const devPort = port(dev, 5173);
assert.ok(devPort, 'dev must publish container port 5173');
assert.equal(devPort.host_ip, '127.0.0.1');
assert.equal(devPort.published, '5173');

console.log('Container configuration verification passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node scripts/test-container-config.mjs
```

Expected: FAIL because `Dockerfile.dev` still uses Node 22/`npm install` and Compose still targets port 80 without `host_ip`, `read_only`, `security_opt`, or `tmpfs`.

- [ ] **Step 3: Replace the development Dockerfile**

Replace `Dockerfile.dev` with:

```dockerfile
# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd

FROM ${NODE_IMAGE}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 4: Replace the Compose configuration**

Replace `docker-compose.yml` with:

```yaml
# Default: `docker compose up --build` -> production on http://localhost:8080
# Dev with HMR: `docker compose --profile dev up --build` -> http://localhost:5173
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '127.0.0.1:8080:8080'
    read_only: true
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp:size=16m,mode=1777
    restart: unless-stopped

  dev:
    profiles: ['dev']
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - '127.0.0.1:5173:5173'
    volumes:
      - .:/app
      - /app/node_modules
```

- [ ] **Step 5: Run resolved-configuration and hardened Compose smoke tests**

Run:

```bash
node scripts/test-container-config.mjs
docker compose config --quiet
docker compose up --detach --build web
curl --fail --silent http://127.0.0.1:8080/health
docker compose down
```

Expected: the Node test prints `Container configuration verification passed`; Compose configuration is valid; the health probe prints `ok`; the service stops cleanly.

- [ ] **Step 6: Commit Compose and development hardening**

```bash
git add Dockerfile.dev docker-compose.yml scripts/test-container-config.mjs
git commit -m "feat(docker): secure compose and development"
```

### Task 4: Enforce the container baseline in GitHub Actions

**Files:**
- Modify: `scripts/test-release-config.mjs`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/pr-title.yml`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `.github/scripts/verify-container.sh`, `scripts/test-container-config.mjs`, image tag `watchman:ci`, and existing Docker Hub/release inputs.
- Produces: required `container` CI job; Node.js 24 across workflows; immutable action references; release eligibility only after the container gate passes.

- [ ] **Step 1: Add failing workflow-security assertions**

Near the imports in `scripts/test-release-config.mjs`, add these exact constants:

```javascript
const ACTIONS = {
  checkout: 'actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10',
  setupNode: 'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38',
  dockerLogin: 'docker/login-action@af1e73f918a031802d376d3c8bbc3fe56130a9b0',
  setupQemu: 'docker/setup-qemu-action@96fe6ef7f33517b61c61be40b68a1882f3264fb8',
  setupBuildx: 'docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c',
  buildPush: 'docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a',
  trivy: 'aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25',
};
```

Replace the existing release-action assertions with:

```javascript
assert.equal(step('Checkout repository').uses, ACTIONS.checkout);
assert.equal(step('Set up Node.js').uses, ACTIONS.setupNode);
assert.equal(step('Set up Node.js').with['node-version'], 24);
assert.equal(step('Log in to Docker Hub').uses, ACTIONS.dockerLogin);
assert.equal(step('Set up QEMU').uses, ACTIONS.setupQemu);
assert.equal(step('Set up Docker Buildx').uses, ACTIONS.setupBuildx);
```

Replace the build-push action assertion with:

```javascript
assert.equal(buildPush.uses, ACTIONS.buildPush);
```

Immediately after loading `ciWorkflow`, add:

```javascript
assert.equal(ciWorkflow.jobs.commitlint.steps[0].uses, ACTIONS.checkout);
assert.equal(ciWorkflow.jobs.commitlint.steps[1].uses, ACTIONS.setupNode);
assert.equal(ciWorkflow.jobs.commitlint.steps[1].with['node-version'], 24);
assert.equal(ciWorkflow.jobs.quality.steps[0].uses, ACTIONS.checkout);
assert.equal(ciWorkflow.jobs.quality.steps[1].uses, ACTIONS.setupNode);
assert.equal(ciWorkflow.jobs.quality.steps[1].with['node-version'], 24);

const containerJob = ciWorkflow.jobs.container;
assert.equal(containerJob.needs, 'quality');
assert.equal(containerJob.permissions.contents, 'read');
const containerStep = (name) => containerJob.steps.find((entry) => entry.name === name);
assert.equal(containerStep('Checkout repository').uses, ACTIONS.checkout);
assert.equal(containerStep('Set up Node.js').uses, ACTIONS.setupNode);
assert.equal(containerStep('Set up Node.js').with['node-version'], 24);
assert.equal(containerStep('Verify container configuration').run, 'node scripts/test-container-config.mjs');
assert.equal(containerStep('Build production image').run, 'docker build --pull --tag watchman:ci .');
assert.equal(containerStep('Verify production container').run, '.github/scripts/verify-container.sh watchman:ci');

const trivy = containerStep('Scan production image');
assert.equal(trivy.uses, ACTIONS.trivy);
assert.equal(trivy.with['image-ref'], 'watchman:ci');
assert.equal(trivy.with['exit-code'], '1');
assert.equal(trivy.with['ignore-unfixed'], true);
assert.equal(trivy.with.severity, 'CRITICAL,HIGH');
assert.ok(ciWorkflow.jobs.release.needs.includes('container'));

const prTitleWorkflow = load(await readFile('.github/workflows/pr-title.yml', 'utf8'));
const prTitleSteps = prTitleWorkflow.jobs.commitlint.steps;
assert.equal(prTitleSteps[0].uses, ACTIONS.checkout);
assert.equal(prTitleSteps[1].uses, ACTIONS.setupNode);
assert.equal(prTitleSteps[1].with['node-version'], 24);
```

- [ ] **Step 2: Run the release/workflow test and verify RED**

Run:

```bash
npm run test:release
```

Expected: FAIL because workflows still use mutable major tags, Node 22, and have no `container` job.

- [ ] **Step 3: Replace the CI workflow**

Replace `.github/workflows/ci.yml` with:

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
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: Set up Node.js
        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
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

  quality:
    name: Lint, test, and build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout repository
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6

      - name: Set up Node.js
        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Test release configuration
        run: npm run test:release

      - name: Build
        run: npm run build

  container:
    name: Container security
    needs: quality
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6

      - name: Set up Node.js
        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: 24

      - name: Verify container configuration
        run: node scripts/test-container-config.mjs

      - name: Build production image
        run: docker build --pull --tag watchman:ci .

      - name: Verify production container
        run: .github/scripts/verify-container.sh watchman:ci

      - name: Scan production image
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
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [commitlint, quality, container]
    permissions:
      contents: write
    uses: ./.github/workflows/release.yml
    secrets:
      DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
      DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
```

- [ ] **Step 4: Pin and modernize the pull-request title workflow**

In `.github/workflows/pr-title.yml`, make these exact replacements and add the timeout below `runs-on`:

```yaml
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6

      - name: Set up Node.js
        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: 24
          cache: npm
```

Leave its triggers, permissions, install command, title environment variable, and Commitlint command unchanged.

- [ ] **Step 5: Pin and modernize the release workflow without changing behavior**

In `.github/workflows/release.yml`, set `timeout-minutes: 45` below `runs-on`, set `node-version: 24`, and use these exact action references:

```yaml
      - name: Checkout repository
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6

      - name: Set up Node.js
        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
        with:
          node-version: 24
          cache: npm

      - name: Log in to Docker Hub
        uses: docker/login-action@af1e73f918a031802d376d3c8bbc3fe56130a9b0 # v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@96fe6ef7f33517b61c61be40b68a1882f3264fb8 # v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c # v4

      - name: Build and push image
        uses: docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a # v7
```

Retain every existing `with`, environment, release-tag, Semantic Release, and Docker-tag field below those steps.

- [ ] **Step 6: Run workflow tests and verify GREEN**

Run:

```bash
npm run test:release
node scripts/test-container-config.mjs
```

Expected: both commands exit 0; the first is silent except Semantic Release dependency output, and the second prints `Container configuration verification passed`.

- [ ] **Step 7: Commit the workflow security gate**

```bash
git add scripts/test-release-config.mjs .github/workflows/ci.yml .github/workflows/pr-title.yml .github/workflows/release.yml
git commit -m "fix(ci): enforce container security baseline"
```

### Task 5: Document and fully verify the hardened container path

**Files:**
- Modify: `README.md`
- Verify: all files changed in Tasks 1–4

**Interfaces:**
- Consumes: the final Compose commands, ports, runtime guarantees, and digest maintenance process.
- Produces: operator documentation and final evidence that application, container, Compose, CI configuration, and vulnerability gates pass together.

- [ ] **Step 1: Replace the README Docker section**

Replace the content from `## Docker` through the paragraph immediately before `### Docker Hub publication` with:

````markdown
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
````

- [ ] **Step 2: Run the clean application verification suite**

Run:

```bash
npm ci
npm run test:commits
npm run lint
npm test
npm run test:release
npm run build
```

Expected: all commands exit 0; Vitest reports 2 passing files and 8 passing tests; Vite produces `dist/`.

- [ ] **Step 3: Run production image, Compose, and development smoke checks**

Run:

```bash
bash -n .github/scripts/verify-container.sh
node scripts/test-container-config.mjs
docker build --pull --tag watchman:security-test .
.github/scripts/verify-container.sh watchman:security-test
docker compose config --quiet
docker compose --profile dev build dev
docker compose --profile dev up --detach dev
curl --retry 20 --retry-connrefused --retry-delay 1 --fail --silent http://127.0.0.1:5173/ >/dev/null
docker compose --profile dev down
```

Expected: every command exits 0; production verification prints its pass message; the development root becomes reachable within 20 retries; Compose removes the test services cleanly.

- [ ] **Step 4: Run the pinned final-image vulnerability gate**

Run:

```bash
docker run --rm \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume watchman-trivy-cache:/root/.cache/trivy \
  ghcr.io/aquasecurity/trivy:0.72.0@sha256:cffe3f5161a47a6823fbd23d985795b3ed72a4c806da4c4df16266c02accdd6f \
  image --exit-code 1 --ignore-unfixed --severity CRITICAL,HIGH watchman:security-test
```

Expected: Trivy exits 0 with zero fixable `HIGH` or `CRITICAL` findings.

- [ ] **Step 5: Review the final diff and repository state**

Run:

```bash
git diff --check
git status --short
git diff --stat HEAD~4
```

Expected: no whitespace errors; only `README.md` remains uncommitted before the
documentation commit; the stat covers the container script, configuration
test, Docker/NGINX/Compose files, workflows, workflow test, and README.

- [ ] **Step 6: Commit the operator documentation**

```bash
git add README.md
git commit -m "docs(docker): document hardened containers"
```

- [ ] **Step 7: Confirm the final worktree and commit series**

Run:

```bash
git status --short --branch
git log --oneline -7
```

Expected: the worktree is clean and the five implementation commits appear
above the two design/specification commits.
