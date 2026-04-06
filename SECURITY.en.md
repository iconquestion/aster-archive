# Security Policy

## Scope

This repository contains the source code and content for `Aster Archive`, a Web-based puzzle game. Because the project intentionally uses webpage details, API behavior, and protocol mechanics as part of its gameplay, not every unusual behavior should be treated as a security vulnerability.

This document is only about issues that affect the real security, integrity, availability, deployment environment, or real users of the project.

## What Counts as a Security Issue

Please report issues such as:

- remote code execution or command injection
- directory traversal outside the intended challenge boundary
- unauthorized access to server files, logs, credentials, or deployment secrets
- access to unrelated private data stored on the server
- authentication or authorization flaws that affect administration, deployment, or infrastructure
- SSRF, unsafe proxy behavior, or internal service exposure beyond intended design
- denial-of-service issues that can significantly affect availability
- deployment or runtime configuration flaws that impact the real host environment
- dependency vulnerabilities that create meaningful risk in the actual deployed project

## What Usually Does Not Count

The following usually do not count as security vulnerabilities by themselves:

- intended puzzle solutions
- hidden clues, misleading hints, or backdoor-like mechanics that are part of level design
- discovering the next level through normal reverse engineering or observation
- accessing challenge endpoints in ways that are explicitly part of gameplay
- weaknesses that exist only within the intended puzzle boundary of a level
- content mistakes, broken hints, or logic flaws that affect puzzle quality rather than real security
- issues that only affect your own local fork or custom deployment

If you are unsure whether something is an intended puzzle mechanic or a real vulnerability, it is still fine to ask first.

## Reporting

Please report security issues privately whenever possible.

Preferred contact:

- Email: `mojavenight@qq.com`

If the issue clearly involves sensitive information, real infrastructure risk, or an undisclosed vulnerability, please do not open a public GitHub Issue first.

When reporting, please include:

- a description of the problem
- steps to reproduce
- affected URL, route, file, or component
- impact assessment
- proof of concept or key evidence
- a suggested fix if you have one

## Response and Handling

This is a personally maintained project, so response time is best-effort rather than guaranteed.

Valid reports will generally be handled in the following order:

- issues affecting the real server, deployment environment, or private data
- issues that can be used to abuse infrastructure or availability
- issues that affect normal users
- lower-risk implementation flaws

If a report is confirmed to be a real security issue, I will try to verify it, fix it, and deploy an update as reasonably quickly as possible.

## Disclosure

Please avoid public disclosure until the issue has been confirmed and given reasonable time for mitigation or a fix.

Because this is also a puzzle project, premature public disclosure may cause two kinds of harm at once:

- real operational or infrastructure risk
- unintended spoiler damage to the play experience

Responsible disclosure is appreciated.

## Security Research Boundaries

If you act in good faith, avoid harming the service, avoid accessing unrelated private data, avoid affecting other users, and report issues responsibly, I will treat your work as helpful security research.

Please do not:

- extract data unrelated to demonstrating the issue
- delete, alter, or damage data
- intentionally degrade service availability
- pivot into unrelated systems
- publicly dump secrets, sensitive information, or full details before coordination

## Notes Specific to This Project

`Aster Archive` intentionally turns HTTP behavior, API design, headers, and protocol details into gameplay. Some things that would look alarming in a normal site may be deliberate inside a level.

That said, deliberate game design only applies within the intended game boundary. It does not extend to the real host environment, deployment credentials, unrelated files, unrelated services, or infrastructure outside intended gameplay. Anything beyond that boundary remains within scope for security reporting.
