# Security Policy

## Scope

Hetusafe handles real user data including GPS coordinates, photographs, and account credentials. We take vulnerability reports seriously and appreciate responsible disclosure.

## Implemented Protections

These controls are already in place. Reports about bypasses, implementation flaws, or gaps are still welcome — the presence of a control doesn't mean it's implemented correctly everywhere.

- **Authentication:** Two-factor login via OTP email. Access tokens are short-lived JWTs; refresh tokens are stored server-side and rotated on use.
- **Session revocation:** Logout and password changes immediately blacklist the access token in Redis. WebSocket connections go through the same blacklist check on handshake.
- **Rate limiting:** Auth endpoints, the login path, OTP resend, and the contact form all have per-IP rate limits backed by Redis.
- **Input validation:** All request bodies are validated with Zod schemas before handlers run. Request body size is capped. XSS-prone fields are sanitised before storage.
- **Media handling:** Uploaded images are validated by magic bytes (not the Content-Type header), stripped of all metadata, and re-encoded before reaching object storage.
- **CSRF:** State-changing routes require a double-submit cookie CSRF token.
- **Privilege escalation:** Admin routes enforce both JWT authentication and role verification on every request.
- **SQL injection:** All database queries use parameterised statements via the `pg` driver.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by email to:

**arishwanthreddy@gmail.com**

Include in your report:
- A clear description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or a detailed walkthrough)
- The affected endpoint, component, or feature
- Any suggested remediation if you have one

## What to Expect

| Stage | Timeline |
|-------|----------|
| Initial acknowledgement | Within 48 hours |
| Triage and severity assessment | Within 5 business days |
| Status update | Every 7 days until resolved |
| Fix and disclosure | Coordinated with the reporter |

We will credit researchers who report valid vulnerabilities in release notes, unless they prefer to remain anonymous.

## Areas of Particular Concern

Given the nature of this application, we are especially interested in reports involving:

- Authentication bypasses or token forgery
- Unauthorised access to other users' location data or photographs
- EXIF/GPS metadata leaking from uploaded images
- Privilege escalation to the admin role
- Injection vulnerabilities (SQL, XSS, command)
- Insecure direct object references on user or report endpoints

## Out of Scope

- Vulnerabilities in third-party services (AWS, Render, SendGrid, Firebase) — report those directly to the respective vendor
- Denial-of-service attacks
- Social engineering or phishing
- Issues already documented in open GitHub issues or the Dependabot alerts

## Disclosure Policy

We follow a coordinated disclosure model. We ask that you give us a reasonable amount of time to address the vulnerability before any public disclosure. We aim to resolve critical issues within 30 days of a confirmed report.
