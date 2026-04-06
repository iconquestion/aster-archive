# Pull Request

Thank you for contributing.

When filling out this PR, please keep the description clear and restrained, and avoid putting direct level answers, hidden paths, or critical puzzle reveals in the title or other highly visible places. In this project, many things that look like mere implementation details are also part of the gameplay, so please also note whether this change affects the original puzzle intent.

## Summary

Briefly explain what changed and why.

## Background and Motivation

What problem does this change solve, or what does it improve?

If there is an existing Issue or Discussion, you can link it here.

## Type of Change

Keep or extend whatever applies:

- [ ] Bug fix
- [ ] Documentation update
- [ ] Test addition or adjustment
- [ ] Page content or presentation update
- [ ] Back-end / API behavior change
- [ ] Deployment, runtime, or architecture change
- [ ] New level or gameplay proposal
- [ ] Other

## Affected Area

Which parts are mainly affected by this change?

- [ ] `public/` static pages or assets
- [ ] `src/` back-end logic
- [ ] `test/` tests
- [ ] documentation
- [ ] deployment or port / protocol behavior
- [ ] other

If useful, add the related levels, routes, directories, or files.

## Design Intent and Spoiler Boundary

Please explain the following:

- Is this change fixing a bug, improving docs, or intentionally changing gameplay, presentation, or hint flow?
- Does it change a level’s intended solution path, core concept, or pacing?
- Does it involve hidden paths, answers, key hints, or implementation details that should not be described too openly?

If there is spoiler risk, please describe the issue in a way that does not unnecessarily damage the play experience.

## Validation

Explain how you verified the change. Fill in what applies:

- [ ] Ran `npm test`
- [ ] Started the project locally and manually checked the relevant pages
- [ ] Verified the related API responses
- [ ] Verified Cookie / Header / Method behavior
- [ ] Verified WebSocket behavior
- [ ] Verified Trailer behavior
- [ ] Verified HTTP/2 behavior
- [ ] Did not run tests, with reason explained below

Additional notes:

```text
Describe the actual validation steps you performed, including routes, pages, or any special environment involved.
```

## Documentation and Maintenance Sync

If this change affects any of the following, please confirm whether they were updated too:

- [ ] README
- [ ] `construction.md`
- [ ] `101-solutions.md`
- [ ] contributing, security, or other collaboration docs
- [ ] no documentation update needed

If you did not update docs and believe that is fine for now, please briefly explain why.

## Additional Notes

Use this section for anything reviewers should know, for example:

- what order is best for reviewing the changes
- which parts are intentionally written this way to preserve puzzle feel or presentation intent
- what is intentionally left for a follow-up PR
