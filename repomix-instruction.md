<!--
  @role repository-instructions
  @owns repository-wide AI guidance, response-shape rules, and process rules for keeping ownership metadata current
  @not-owns per-file implementation details that belong in file headers
  @notes For comment-capable files, file headers are the authoritative source of per-file ownership.
-->

# Repository Instructions

## How this repository is used with AI

1. A generated `repo-context.xml` file is pasted into a chat session.
2. The user asks for a feature, bug fix, or refactor.
3. Respond with complete file contents for every file that changes.
4. Do not return diff hunks unless explicitly requested.
5. Preserve the automated `repo-context.xml` workflow unless the request explicitly changes it.

## Repo constraints

- This is a static browser app with no build step.
- `index.html` contains markup only.
- `styles.css` contains styling only.
- Prefer browser-native APIs over added dependencies.
- Preserve compatibility with the existing IndexedDB database when possible.
- File-level ownership rules live in file headers for comment-capable files and are the authoritative source for deciding where changes belong.
- Comment-capable files include source files, stylesheets, HTML files, workflow YAML files, markdown instruction files, and repository dotfiles such as `.gitignore`.
- `repomix.config.json` is a strict JSON file and should not receive comment headers; if it ever needs architectural notes, document them here.

## File header convention

For comment-capable files, keep a short header at the top of the file using this shape:

- `@role`: what kind of module or file this is
- `@owns`: what this file is responsible for
- `@not-owns`: what should be changed elsewhere
- `@notes`: optional short maintenance guidance

Keep headers concise and high-signal. Do not turn them into long prose blocks.

## Keeping ownership metadata current

- When adding, removing, renaming, or moving a comment-capable file, update its header in the same change.
- When introducing a new architectural component such as a controller, store, service, renderer, adapter, or utility module, add or update the relevant file header immediately.
- When a file’s responsibility changes materially, update its `@owns` and `@not-owns` header entries in the same change.
- When a new file becomes part of the regular edit surface for future work, give it a header when the file format supports comments.
- Apply the same header discipline to comment-capable non-code files, including workflow files, markdown docs, and repository dotfiles.
- If a file format does not support comments, keep any necessary ownership guidance here in `repomix-instruction.md`.
- Treat this instruction file as the source of repository-wide rules, and treat file headers as the source of per-file ownership rules.

## Change preferences

- Favor small, composable modules over a single large file.
- Avoid frameworks and build tooling unless explicitly requested.
- Keep the app easy to edit by copy/pasting full files from chat responses.
- Minimize comprehensive refactors, but if a change drives a reorganization propose the minimal sensible refactor.

## Expected response shape for code changes

- Group output by file path.
- Return the full contents of each changed file.
- Keep explanations brief unless the user asks for deeper design rationale.