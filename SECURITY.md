# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Please use GitHub's private vulnerability reporting to disclose security issues
responsibly:

1. Go to the [Security tab](https://github.com/diaszano/watchman/security/advisories/new)
2. Click **"Report a vulnerability"**
3. Fill in the details described below

### What to Include

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions
- Potential impact assessment
- Suggested fix (if any)

## Response Timeline

| Action                          | Target    |
| ------------------------------- | --------- |
| Acknowledgement of report       | 48 hours  |
| Initial assessment              | 72 hours  |
| Resolution for critical issues  | 7 days    |
| Resolution for non-critical     | 30 days   |

We will keep you informed of our progress throughout the process.

## Disclosure Policy

We follow a **coordinated disclosure** approach:

1. The reporter submits the vulnerability privately.
2. We confirm and assess the impact.
3. We develop and test a fix.
4. We release the fix and publish a security advisory.
5. The reporter is credited (unless anonymity is preferred).

We ask that you do not publicly disclose the vulnerability until a fix has been
released.

## Security Measures

This project implements the following security hardening:

- **Content Security Policy (CSP)** — restrictive `default-src 'self'` policy
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy`
- **Non-root Docker containers** — runtime user is `nginx`, never `root`
- **Read-only filesystem** — production containers use `read_only: true`
- **Pinned dependencies** — Docker base images pinned to immutable SHA digests,
  GitHub Actions pinned to commit SHAs
- **Trivy vulnerability scanning** — CI gates on fixable HIGH/CRITICAL CVEs
- **SBOM generation** — Software Bill of Materials attached to every release
- **`no-new-privileges`** — Docker security option prevents privilege escalation
- **Dependabot** — automated dependency updates for npm, Docker, and GitHub
  Actions
