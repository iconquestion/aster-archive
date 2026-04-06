# Security Policy

## Scope

This repository contains the source code and content for `Aster Archive`, a Web-based puzzle game. Because the project itself includes intentionally misleading clues, hidden paths, and challenge logic, not every unusual behavior should be treated as a security vulnerability.

This document is only about issues that affect the real safety, integrity, or availability of the project, the server, or its users.

## What Counts as a Security Issue

Please report issues such as:

- Remote code execution or command injection
- Directory traversal outside intended challenge scope
- Unauthorized access to server files, credentials, logs, or deployment secrets
- Access to unrelated private data stored on the server
- Authentication or authorization flaws that affect site administration or infrastructure
- SSRF, unsafe proxy behavior, or internal service exposure beyond intended challenge design
- Denial of service issues that can significantly disrupt normal availability
- Vulnerabilities in deployment or runtime configuration that impact the real host environment
- Dependency vulnerabilities that create meaningful risk in the actual deployed project

## What Usually Does Not Count

The following usually do not count as security vulnerabilities by themselves:

- Intended puzzle solutions
- Hidden flags, misleading comments, or challenge backdoors that are part of level design
- Discovering the next level through normal reverse engineering of the game
- Accessing challenge endpoints in ways that are explicitly part of gameplay
- Weaknesses that exist only inside a level’s intended puzzle boundary
- Content mistakes, broken clues, or logic bugs that affect puzzle quality rather than real security
- Issues that only affect your own local fork or custom deployment

If you are unsure whether something is an intended puzzle mechanic or a real vulnerability, it is still fine to ask.

## Reporting

Please report security issues privately.

Preferred contact:

- Email: `mojavenight@qq.com`

If the issue is clearly sensitive, please do not open a public GitHub Issue first.

When reporting, please include:

- A clear description of the problem
- Steps to reproduce
- Affected URL, route, file, or component
- Impact assessment
- Proof of concept if available
- Suggested fix, if you have one

## Response Expectations

This is a personally maintained project, so response time is best-effort rather than guaranteed.

In general, valid reports will be handled in this order:

- Issues that affect the real server or private data
- Issues that allow abuse of infrastructure or availability
- Issues that affect normal users
- Lower-risk implementation flaws

If a report is accepted as a real security issue, I will try to verify it, fix it, and deploy an update as reasonably quickly as possible.

## Disclosure

Please avoid public disclosure until the issue has been confirmed and a fix or mitigation has had reasonable time to land.

Because this project is also a puzzle game, premature public disclosure may do two kinds of harm at once:

- create real operational risk
- unintentionally spoil challenge content

Responsible disclosure is appreciated.

## Safe Harbor

If you act in good faith, avoid harming users or infrastructure, avoid accessing unrelated private data, and report the issue responsibly, I will treat your research as helpful security work.

Please do not:

- exfiltrate unnecessary data
- damage, delete, or alter data
- intentionally degrade service availability
- pivot into unrelated systems
- publicly dump secrets or private findings before coordination

## Notes About This Project

`Aster Archive` intentionally includes challenge mechanics involving HTTP behavior, APIs, headers, protocols, and other Web details. Some behaviors that would be alarming in a normal site may be deliberate inside a level.

That said, deliberate game design does not extend to the real host environment, deployment secrets, unrelated files, or infrastructure outside intended gameplay boundaries. Those remain out of scope for the game and in scope for security reporting.
