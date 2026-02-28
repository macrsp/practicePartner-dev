# Repository Instructions

## How this repository is used with AI

1. A generated `repo-context.xml` file is pasted into a chat session.
2. The user asks for a feature, bug fix, or refactor.
3. Respond with complete file contents for every file that changes.
4. Do not return diff hunks unless explicitly requested.
5. Preserve the automated `repo-context.xml` workflow unless the request explicitly changes it.

## Repo constraints

- This is a static browser app with no build step.
- `repo-context.xml` is generated automatically on non-`main` branch pushes and committed back to that same branch.
- `repo-context.xml` should not be edited manually.
- Favor browser-native APIs over added dependencies unless explicitly requested.

## Change preferences

- Favor small, composable modules over a single large file.
- Preserve compatibility with the existing IndexedDB database when possible.
- Avoid frameworks and build tooling unless explicitly requested.
- Keep the app easy to edit by copy/pasting full files from chat responses.

## Expected response shape for code changes

- Group output by file path.
- Return the full contents of each changed file.
- Keep explanations brief unless the user asks for deeper design rationale.
