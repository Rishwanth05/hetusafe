# Security Policy

## Scope

Project SAVE handles real user data including GPS coordinates, photographs, and account credentials. We take vulnerability reports seriously and appreciate responsible disclosure.

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
