# Container Security Baseline Design

## Objective

Modernize Watchman's production and development containers around the current
Node.js LTS and NGINX stable releases, reduce the production attack surface,
run the web server without root privileges, and add automated evidence that the
container remains healthy and free of fixable high or critical vulnerabilities.

This is the first remediation phase from the July 2026 project audit. It is
deliberately limited to container, web-server, Compose, and container-CI
concerns so that application dependency upgrades and frontend behavior fixes
can be reviewed independently.

## Current Project Context

Watchman is a client-side React and Vite application. Its production image uses
a Node 22 Alpine build stage and an NGINX 1.27 Alpine runtime stage. NGINX runs
with its image default of root and listens on port 80. The Compose file claims
that production is available on `localhost:8080`, but publishes host port 80.
It also exposes both production and development services on every host network
interface.

The current runtime scan reports fixable critical, high, and medium operating
system vulnerabilities. The tested NGINX 1.30.3 Alpine Slim image reports no
fixable medium, high, or critical findings, but still requires explicit
non-root configuration. The existing web response also discloses the NGINX
version and lacks browser security headers.

## User Stories

- As an operator, I want a small, reproducible production image so that
  deployments contain only the files required to serve Watchman.
- As an operator, I want the container to run without root privileges so that a
  web-server compromise has fewer capabilities.
- As a local developer, I want the documented Compose URLs to match the actual
  published ports and to be bound to localhost by default.
- As a maintainer, I want CI to reject an unhealthy, privileged, or critically
  vulnerable image before it can be released.
- As a browser user, I want baseline response protections without breaking the
  SPA, PWA, local image backgrounds, or static assets.

## Architecture

### Production Build

The production Dockerfile remains a two-stage build:

1. A Node.js 24 LTS Alpine stage installs the lockfile with `npm ci` and runs
   the existing production build.
2. An NGINX 1.30.3 Alpine Slim stage receives only the generated `dist/`
   directory and the server configuration.

Both base images use an explicit version and immutable image digest. The
human-readable tag documents the intended release line while the digest makes
the selected filesystem reproducible. Updating a digest is an intentional
maintenance change that must pass the same vulnerability gate.

The runtime image contains no Node.js runtime, source tree, package manager
cache, or development dependencies.

### Non-Root Runtime

NGINX runs as the image's existing `nginx` user and listens on unprivileged port
8080. Its PID and temporary paths are redirected to locations writable by that
user. Only the minimum required directories receive ownership or write access;
the application files remain read-only.

The project supplies the complete runtime NGINX configuration and starts NGINX
directly, instead of relying on image entrypoint templates that attempt to
rewrite configuration at container startup. This makes read-only execution and
the required writable paths explicit.

The image exposes port 8080 and defines a healthcheck against a dedicated
`/health` endpoint. That endpoint returns a small static success response and
does not depend on the SPA bundle.

### NGINX Routing and Response Policy

The server preserves history-based SPA navigation by falling back to
`index.html` only for application routes. Requests for missing files that have
an extension return `404` rather than receiving HTML under a misleading asset
content type.

Caching is split by content type:

- fingerprinted `/assets/` files receive long-lived immutable caching;
- `index.html`, `manifest.webmanifest`, and the service worker revalidate;
- the health endpoint is not cached.

NGINX continues to compress suitable text responses and disables version
tokens. All normal application responses include these baseline headers:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- a restrictive `Permissions-Policy` that permits only capabilities Watchman
  currently uses, including `screen-wake-lock=(self)`;
- a Content Security Policy limited to same-origin scripts, styles, workers,
  and manifests, while allowing `data:` and `blob:` images required for local
  user-selected backgrounds.

The CSP is verified against the built application before adoption. If a
browser feature requires a narrowly broader directive, the implementation must
document and test that exception instead of adding a general wildcard.

## Compose and Development Experience

The production Compose service publishes `127.0.0.1:8080:8080`. It enables
`no-new-privileges`, uses a read-only root filesystem, and provides explicit
temporary filesystems only for NGINX runtime paths that need writes. Its
existing restart policy remains.

The development Dockerfile moves to Node.js 24 LTS Alpine, uses `npm ci`, and
keeps Vite listening on the container interface for HMR. Compose publishes that
service as `127.0.0.1:5173:5173`, preventing unintended LAN exposure while
preserving the documented local URL and source bind mount.

The README describes the production and development commands, ports, local-only
default bindings, runtime user, and image maintenance policy.

## Continuous Integration and Supply-Chain Controls

The normal code-quality job continues to use `npm ci`, lint, tests, and the
production build under Node.js 24 LTS. A container validation job then:

1. builds the production image;
2. inspects its configured user and fails if it is empty, root, or UID 0;
3. starts the image with the hardened runtime settings;
4. waits for the healthcheck and probes the application and `/health`;
5. verifies the required security and cache headers;
6. verifies SPA navigation succeeds while a missing static file returns 404;
7. validates the resolved Compose configuration;
8. scans the resulting image with Trivy and fails on fixable `HIGH` or
   `CRITICAL` vulnerabilities.

The actions used by the modified CI path are pinned to full commit SHAs. The
Trivy scanner image or action is also pinned immutably. A nearby version comment
keeps those references understandable and maintainable.

The release workflow adopts Node.js 24 LTS and pins the actions it already uses
to immutable commits, but its release semantics, Docker Hub credentials,
multi-platform targets, tags, and publication behavior do not change.

## Error Handling and Operational Behavior

- A failed application build stops before the runtime image is assembled.
- NGINX configuration validation is part of the image build or verification,
  so invalid configuration cannot pass CI.
- A container that never becomes healthy fails validation with its logs shown
  for diagnosis.
- Header, routing, non-root, Compose, or vulnerability-policy failures each
  produce a focused CI error rather than being hidden in the release job.
- The vulnerability gate ignores unfixed findings because the project cannot
  remediate them through a base-image update, but the scan report remains
  visible for maintainers.
- Publishing remains downstream of successful CI, so a failed container gate
  cannot produce a Docker Hub image.

## Testing Strategy

Implementation follows a test-first sequence for behavior that can regress:

1. Add a shell-based container verification script with assertions that fail
   against the current image: non-root user, port 8080, health endpoint,
   security headers, asset 404 behavior, and SPA fallback.
2. Update the Docker and NGINX configuration until those assertions pass.
3. Add resolved-Compose assertions for localhost bindings, read-only mode,
   `no-new-privileges`, and required temporary filesystems.
4. Run Trivy against the locally built final image with the same severity and
   fixed-vulnerability policy used by CI.
5. Run the existing clean install, lint, unit tests, build, configuration
   parsing, and workflow syntax checks to detect unrelated regressions.
6. Exercise the development profile to confirm Vite is reachable through
   localhost and HMR startup still succeeds.

## Success Criteria

The phase is complete when:

1. The production image builds from Node.js 24 LTS Alpine and runs on NGINX
   1.30.3 Alpine Slim, with both bases pinned by digest.
2. Image inspection and a live process check confirm that NGINX does not run as
   root and listens on port 8080.
3. Production is reachable at `http://localhost:8080` and development at
   `http://localhost:5173`, both bound to `127.0.0.1` by default.
4. The live container becomes healthy, serves application routes, returns 404
   for missing static files, and sends the specified headers and cache policy.
5. The production Compose service runs successfully with a read-only root
   filesystem and `no-new-privileges`.
6. Trivy reports no fixable high or critical vulnerabilities in the final
   image.
7. CI and release tooling use Node.js 24 LTS, and all modified external actions
   and scanner references use immutable SHAs or digests.
8. Existing lint, unit tests, production build, release configuration tests,
   and Docker publication behavior remain valid.

## Out of Scope

- Major upgrades to Vite, Vitest, React, React Router, Zustand, or the PWA
  plugin.
- Remediation of the frontend animation, opacity, upload-size, accessibility,
  theme, wake-lock, or missing-favicon findings.
- Changes to application features, persisted settings, visual design, or the
  custom-logo workflow.
- Changes to semantic-version rules, Docker Hub naming, release tags, supported
  architectures, or credentials.
- Adding image signing, SBOM publication, or provenance attestations; these are
  candidates for a later supply-chain phase.

## Expected Files

- Modify `Dockerfile` and `Dockerfile.dev` for pinned Node.js 24 and NGINX
  1.30.3 bases and the non-root runtime.
- Modify `nginx.conf` for port 8080, writable runtime paths, health, routing,
  caching, compression, and security headers.
- Modify `docker-compose.yml` for localhost port bindings and runtime
  hardening.
- Add a focused script under `.github/scripts/` for repeatable live-container
  verification.
- Modify `.github/workflows/ci.yml` to run the container checks and scan.
- Modify `.github/workflows/pr-title.yml` to use Node.js 24 and immutable
  action references.
- Modify `.github/workflows/release.yml` to use Node.js 24 and immutable action
  references without altering release behavior.
- Modify `scripts/test-release-config.mjs` to enforce the new workflow runtime,
  action pins, and container gate.
- Modify `README.md` to document the container behavior and maintenance model.
