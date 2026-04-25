# Contributing

Thank you for your interest in `Aster Archive`.

This repository is a personally maintained Web puzzle game project. It contains site code, level content, puzzle design, documentation, and a number of implementation choices that reflect the author’s own style. Because of that, contributing here is not exactly the same as contributing to a generic tool library or framework.

Before submitting changes, it helps to understand what this project is trying to be. It is not simply trying to become “more standard,” “more enterprise,” or “more like a conventional product.” A large part of the project is about turning webpages, protocols, and front-end/back-end details into gameplay. Some things that look unusual may be deliberate parts of a level.

## What Kind of Contributions Are Welcome

The following kinds of contributions are welcome:

- fixing clear implementation bugs
- improving page issues that affect normal play
- fixing unintended API behavior
- adding or improving tests
- improving documentation clarity
- improving deployment, maintenance, or structural documentation
- proposing new level ideas, puzzle directions, or presentation concepts
- improving accessibility and baseline usability without breaking design intent

If you are unsure whether an idea is a good fit, opening a Discussion first is usually the safer option.

## Changes That Should Usually Be Discussed First

Please do not open a PR without prior discussion if the change would:

- heavily rewrite an existing level
- directly change a level’s intended solution path or core concept
- move the whole project to a different tech stack
- flatten design choices that were intentionally kept for puzzle or stylistic reasons
- publicly reveal hidden content in ways that damage the play experience
- perform large-scale formatting changes based only on personal preference
- force all pages into a uniform visual template that clashes with the current project style

This project allows room for subjectivity and does not aim to feel completely productized. Contributions should help it become more stable, clearer, and more interesting, rather than turning it into a different project.

## Before You Start

If your change is small, such as fixing an obvious bug, correcting a typo, or improving a short piece of documentation, you can usually submit it directly.

If your change affects any of the following, please consider opening an Issue or Discussion first:

- level gameplay
- page copy
- hint design
- API behavior
- deployment method
- project structure
- licensing, documentation policy, or public-content boundaries

Aligning on direction early is usually much better than explaining everything after the work is already done.

## Principles to Keep in Mind

### Preserve Level Intent

Many pages, APIs, response behaviors, and directory structures are not just implementation details. They are also part of the puzzle. Before changing something, try to decide whether it is actually a bug or an intentional part of the level.

### Keep Changes Small

Prefer small, focused contributions. A PR should ideally solve one problem or address one category of change. That makes review easier and reduces the chance of accidentally damaging existing levels.

### Avoid Spoiling Answers

If your work touches level answers, hidden paths, key hints, or back-end logic that reveals solutions, please be careful about how much you expose in public. Avoid putting direct solutions into titles, commit messages, or PR descriptions whenever possible.

### Keep Documentation Useful for Maintenance

If your change affects back-end behavior, request paths, special protocol-based gameplay, deployment, or testing, please update the related documentation as well. The project already has separate architecture and solution documents. README should remain a high-level entry point, not a dump of everything.

### Respect the Existing Style

This project allows pages to feel different from one another, and it allows a certain amount of hand-built texture in implementation. Contributions do not need to flatten everything into perfect uniformity, but they should avoid introducing changes that clearly disrupt the project’s current rhythm.

## Repository Overview

If you are new to the repository, this is the rough layout:

- `public/`: homepage, start page, level pages, scripts, fonts, styles, and other static resources
- `src/`: Node/Express entry point and level implementations that need back-end behavior
- `test/`: tests for key back-end levels
- `docs/architecture/system-architecture.md`: architecture overview
- `docs/gameplay/level-solutions.md`: solution notes based on the current implementation

If you plan to change deployment, request flow, port usage, or protocol-specific behavior, please read `docs/architecture/system-architecture.md` first.

## Local Run and Test

Basic startup:

```bash
npm install
npm start
```

Run tests:

```bash
npm test
```

Please note that not everything in this project can be validated by simply opening pages locally. Some levels and tests depend on back-end behavior, HTTPS, WebSocket, Trailer, or HTTP/2 features, so “the page opens” is not the same as “the gameplay still works correctly.”

## Contributing New Levels

If you want to contribute a new level, it is better not to submit a full implementation immediately. Please first explain:

- what this level is mainly testing
- what the player is expected to notice
- how it differs from earlier levels
- whether it depends on back-end behavior or special protocols
- whether it overlaps with existing mechanics
- where you expect its difficulty to sit

This project benefits more from levels that have a clear role, natural presentation, and a good place in the overall progression than from isolated clever ideas.

## Communication

If you have suggestions, ideas, or a larger change in mind, GitHub Discussions is usually the best place to start.  
If you found a concrete issue or trackable task, GitHub Issues is the better fit.

You can also contact the author by email:

- `mojavenight@qq.com`

## Licensing

By contributing, you agree that your contribution may be distributed under the repository’s existing licensing model:

- code: `AGPL-3.0`
- non-code content: `CC BY-NC-SA 4.0`

For details, see:

- [LICENSE](./LICENSE)
- [LICENSE-CC-BY-NC-SA-4.0](./LICENSE-CC-BY-NC-SA-4.0)

If your contribution contains both code and creative content, please assume that each part will fall under the repository’s current dual-licensing structure.

## Final Note

This is not a repository that aims for total neutrality or total standardization. It keeps the author’s perspective, the personality of individual levels, and some intentionally non-generic expression. Because of that, the best contributions are usually not the ones that make it look more like some other project, but the ones that help it become a fuller version of what it is already trying to be.
