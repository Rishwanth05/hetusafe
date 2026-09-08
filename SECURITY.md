# Security Policy

## Scope

Hetusafe handles real user data including GPS coordinates, photographs, and account credentials. We take vulnerability reports seriously and appreciate responsible disclosure.

This policy covers the Hetusafe web application, API, and any services that process or store user data.

## In-Scope Focus Areas

Given the nature of this application, we are especially interested in reports involving:

- Authentication bypasses or session forgery
- Unauthorised access to other users' location data or photographs
- EXIF or GPS metadata leaking from uploaded images
- Privilege escalation (e.g. gaining admin access as a regular user)
- Injection vulnerabilities (SQL, XSS, command injection)
- Insecure direct object references on user or report endpoints
- Exposure of sensitive data through misconfigured access controls

## Out of Scope

- Denial-of-service attacks
- Social engineering or phishing
- Vulnerabilities in upstream third-party providers — please report those directly to the respective vendor
- Scanner output without a working proof of concept
- Issues already documented in open GitHub issues or Dependabot alerts

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

## Disclosure Policy

We follow a coordinated disclosure model. We ask that you give us a reasonable amount of time to address the vulnerability before any public disclosure. We aim to resolve critical issues within 30 days of a confirmed report.
