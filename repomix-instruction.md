<!--
  @role repository-instructions
  @owns repository-wide AI guidance, implementation-session rules, code-editing response-shape rules, requirement traceability rules, and process rules for keeping ownership metadata current
  @not-owns feature-planning process, planning-session behavior, or per-file implementation details that belong in planning-context.md or file headers
  @notes For comment-capable files, file headers are the authoritative source of per-file ownership. planning-context.md is the authoritative source for accepted product requirements and active feature deltas.
-->

# Repository Instructions

## How this repository is used with AI

The repository uses two distinct artifacts for AI-assisted work:

- `planning-context.md` for accepted product requirements and the currently agreed feature delta
- `repo-context.xml` for implementation-oriented repository context

In implementation sessions:

1. A generated `repo-context.xml` file is pasted into a chat session.
2. The user asks for a feature, bug fix, or refactor.
3. The AI uses the repository context together with `planning-context.md`, when present, to understand accepted requirements and the active feature delta.
4. Respond with complete file contents for every file that changes.
5. Do not return diff hunks unless explicitly requested.
6. Preserve the automated `repo-context.xml` workflow unless the request explicitly changes it.

## Source of truth

Use the following ownership split:

- `planning-context.md` is the source of truth for product requirements, including the accepted baseline and any currently agreed feature delta.
- `repomix-instruction.md` is the source of truth for repository-wide implementation rules, response shape, requirement traceability rules, and maintenance conventions.
- File headers are the source of truth for per-file ownership for comment-capable files.
- The current codebase remains the source of truth for actual implementation details.

Do not treat speculative ideas, aspirational roadmap items, or earlier conversational brainstorming as requirements unless they have been explicitly accepted into `planning-context.md`.

## Repo constraints

- This is a static browser app with no build step.
- `index.html` contains markup only.
- `styles.css` contains styling only.
- Prefer browser-native APIs over added dependencies.
- Preserve compatibility with the existing IndexedDB database when possible.
- File-level ownership rules live in file headers for comment-capable files and are the authoritative source for deciding where changes belong.
- Comment-capable files include source files, stylesheets, HTML files, workflow YAML files, markdown instruction files, and repository dotfiles such as `.gitignore`.
- `repomix.config.json` is a strict JSON file and should not receive comment headers; if it ever needs architectural notes, document them here.

## Use of planning context during implementation

When `planning-context.md` is present in the implementation context:

- treat accepted baseline requirements as stable unless the user explicitly asks to change them
- treat the current planning delta as the only active requirement change surface
- use requirement IDs, statuses, and allocations from `planning-context.md` when available
- preserve the distinction between unchanged baseline requirements and feature-specific changes
- do not silently reinterpret or renegotiate accepted requirements during implementation

If implementation reveals that an accepted requirement is infeasible, contradictory, or materially more complex than expected:

- say so explicitly
- identify the affected requirement
- explain the constraint or tradeoff
- ask to update planning rather than silently changing behavior

## Requirement definition and traceability

Product requirements are defined in `planning-context.md`.

Requirements must be:
- expressed as user-observable behavior or user-available capability
- implementation-agnostic
- stable across refactors
- allocated to product areas if helpful, but not split by code file

Requirements must not be defined as:
- file responsibilities
- modules, classes, functions, APIs, or data stores
- browser or storage implementation details
- internal architecture choices

File headers may include requirement traceability metadata, such as requirement IDs affected by that file.

Requirement traceability in file headers is for implementation mapping only. File headers do not define or redefine product requirements.

## File header convention

For comment-capable files, keep a short header at the top of the file using this shape:

- `@role`: what kind of module or file this is
- `@owns`: what this file is responsible for
- `@not-owns`: what should be changed elsewhere
- `@reqs`: optional requirement IDs this file materially contributes to
- `@notes`: optional short maintenance guidance

Keep headers concise and high-signal. Do not turn them into long prose blocks.

Use `@reqs` for requirement traceability only. Do not use it to redefine product requirements or to imply that requirements are owned by individual files.

## Keeping ownership metadata current

- When adding, removing, renaming, or moving a comment-capable file, update its header in the same change.
- When introducing a new architectural component such as a controller, store, service, renderer, adapter, or utility module, add or update the relevant file header immediately.
- When a file’s responsibility changes materially, update its `@owns` and `@not-owns` header entries in the same change.
- When a file materially begins or stops contributing to a traced requirement, update its `@reqs` metadata in the same change if that metadata is present in the repository.
- When a new file becomes part of the regular edit surface for future work, give it a header when the file format supports comments.
- Apply the same header discipline to comment-capable non-code files, including workflow files, markdown docs, and repository dotfiles.
- If a file format does not support comments, keep any necessary ownership guidance here in `repomix-instruction.md`.
- Treat this instruction file as the source of repository-wide rules, and treat file headers as the source of per-file ownership rules and optional requirement traceability.

## Change preferences

- Favor small, composable modules over a single large file.
- Avoid frameworks and build tooling unless explicitly requested.
- Keep the app easy to edit by copy/pasting full files from chat responses.
- Minimize comprehensive refactors, but if a change drives a reorganization propose the minimal sensible refactor.

## Expected response shape for code changes

- Group output by file path.
- Return the full contents of each changed file.
- Keep explanations brief unless the user asks for deeper design rationale.