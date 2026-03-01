<!--
  @role planning-context
  @owns collaborative planning context, accepted product requirement baseline, current planning delta, decision records, and implementation handoff summaries
  @not-owns repository-wide implementation rules, response-shape rules, and per-file ownership details that belong in repomix-instruction.md or file headers
  @notes Human readability comes first. Treat accepted baseline requirements as stable unless explicitly changed. Do not keep speculative roadmap items here.
-->

# Planning Context

This file is the lightweight planning artifact for this repository.

It exists to support collaborative feature planning before implementation begins. It should stay concise, current, and decision-oriented. It is not a replacement for source code or `repo-context.xml`; it is the planning layer above them.

This file should contain:
- accepted current product requirements
- the actively discussed requirement delta for the current feature
- decisions, tradeoffs, and open questions needed to move the current feature into implementation

This file should **not** contain:
- speculative future roadmap items
- aspirational product vision items that are not part of the currently planned feature
- implementation details, APIs, module structure, or file-level ownership rules

If future ideas are useful during a planning conversation, they may be introduced temporarily in that conversation. They should only be added here if they become part of the currently agreed planning delta.

---

## Purpose

Use this file to:

- describe the product and current UX at a planning level
- capture accepted product requirements and active proposed changes
- document open questions, decisions, and tradeoffs for the current feature
- define feature-specific planning constraints
- create a stable handoff into implementation

Use `repo-context.xml` or file-level code context when the conversation moves from planning into implementation.

---

## Product Summary

This repository contains a browser-based music practice app for section-based repetition and adaptive practice.

Core capabilities currently include:

- selecting a music folder from the local filesystem
- choosing tracks from that folder
- marking A/B points on a waveform
- saving sections per profile
- replaying saved sections
- tracking play count and mastery
- adaptively selecting what to practice next

The product should favor fast practice flow, clear visual feedback, and low-friction continuity.

---

## Product Goals

The app should help a learner practice efficiently by making it easy to:

- load personal practice audio
- identify and save difficult passages
- replay passages repeatedly
- track repetition and progress
- choose what to practice next with minimal friction

The UX should optimize for clarity and speed during active practice.

---

## Source Of Truth

This file is the source of truth for **planning**.

Repository structure, implementation boundaries, code-editing rules, and per-file ownership are defined elsewhere and should not be duplicated here as stable reference material.

Use this file for:
- user-facing behavior
- workflow intent
- state expectations
- requirement status
- open questions
- decisions
- tradeoffs
- feature-specific planning constraints

Do not treat this file as the authoritative source for:
- exact module ownership
- exact file responsibilities
- exact code-editing protocol
- full repository technical constraints

If a planning topic depends on a technical constraint, reference it briefly in the current topic instead of restating the entire repository contract.

---

## Requirement Authoring Rules

Requirements in this file must follow these rules:

- Requirements must be written in terms of user-observable behavior or user-available capability.
- Requirements must not be phrased as implementation details, file structure, APIs, storage mechanisms, browser internals, or module responsibilities.
- Requirements may include an allocation to a product area, but must not be split by code file.
- Requirement IDs remain stable once introduced.
- Accepted baseline requirements should remain conservative and reflect currently accepted product behavior.
- The only future-oriented requirements allowed in this file are the ones in the current planning delta for the feature actively being planned.
- Do not keep speculative roadmap items, dream features, or long-range candidate ideas in this file once the session ends unless they have been explicitly accepted into the current planning delta.

---

## Current Product Regions

The current product is organized around these major regions:

1. Header / app identity
2. Profile controls
3. Folder selection and track selection
4. A/B marking and save controls
5. Playback and loop controls
6. Speed control
7. Waveform display and selection interaction
8. Saved sections list and section actions

---

## Primary User Flows

### 1. Load Music And Choose Track
- User picks a music folder.
- App enumerates supported audio files.
- User selects a track.
- App loads the audio and waveform.

### 2. Create A Saved Section
- User loads a track.
- User marks A and B from playback position or waveform drag.
- User saves the selected range as a section under the active profile.

### 3. Focus And Replay A Saved Section
- User selects a saved section.
- App focuses the associated time range.
- If needed, app loads the associated track.
- User plays the section.
- App loops or completes playback according to settings.

### 4. Adaptive Practice
- User asks for the next section adaptively.
- App selects a saved section based on low mastery / low recency / low play count.
- App loads the appropriate track and plays the section.

### 5. Refresh And Resume Context
- User reloads the page.
- App restores persisted context where possible.
- App should preserve continuity without confusing the user.

---

## Product State Model

The most important product-level states are:

### Identity / Scope
- active profile
- saved sections for active profile

### Music Source
- no folder known
- folder known but permission not currently granted
- folder available and readable

### Track Context
- no tracks loaded
- tracks loaded
- current track selected
- current track unavailable in current folder

### Selection State
- no selection
- only A marked
- only B marked
- valid A/B range selected

### Playback State
- idle
- playing full track context
- playing saved section
- looping saved section
- paused at position
- ended

### Waveform State
- no waveform loaded
- waveform loading
- waveform visible
- waveform selection active
- playback position visible

---

## Requirement Status Rules

Use these statuses consistently:

- **Implemented**: accepted and already reflected in the code
- **Accepted target**: accepted for the current feature, but implementation is expected to catch up
- **Under discussion**: actively being planned, not yet accepted
- **Deferred**: intentionally postponed within the current feature discussion
- **Rejected**: explicitly not doing this within the current feature discussion

Unless the user explicitly says otherwise:
- implemented requirements remain accepted baseline behavior
- accepted target requirements remain accepted only if they are part of the currently planned feature
- under-discussion items are the only active requirement change surface
- deferred and rejected items should not be silently reintroduced

Deferred or rejected items from a completed planning session should generally be removed from this file unless they remain necessary context for the active feature.

---

## Accepted Product Requirement Baseline

This section records accepted product requirements that should not be reinterpreted by default during future planning sessions.

### Implemented

- **REQ-001 — Profile selection**
  - Allocation: Profiles
  - The user can select a practice profile.

- **REQ-002 — Profile creation**
  - Allocation: Profiles
  - The user can create a new practice profile.

- **REQ-003 — Profile-scoped saved work**
  - Allocation: Profiles
  - Saved sections and related practice state are scoped to the active profile.

- **REQ-004 — Music folder selection**
  - Allocation: Music source
  - The user can choose a local music folder as the source of practice tracks.

- **REQ-005 — Supported audio track loading**
  - Allocation: Music source
  - The app loads supported audio files from the selected folder and presents them as selectable tracks.

- **REQ-006 — Folder continuity across refresh**
  - Allocation: Music source
  - The app remembers the previously selected music folder and can reconnect to it after refresh, including showing reconnect guidance when permission is needed again.

- **REQ-007 — Last-track continuity**
  - Allocation: Music source
  - When possible, the app restores or reselects the most recently used track from the remembered music folder.

- **REQ-008 — Track selection**
  - Allocation: Track playback
  - The user can select a loaded track for practice.

- **REQ-009 — Playback speed control**
  - Allocation: Track playback
  - The user can adjust playback speed for the current track.

- **REQ-010 — A/B point marking from playback**
  - Allocation: Selection and waveform
  - The user can mark A and B points using the current playback position.

- **REQ-011 — Waveform-based selection**
  - Allocation: Selection and waveform
  - The user can create or adjust a practice range by dragging on the waveform.

- **REQ-012 — Visible selection feedback**
  - Allocation: Selection and waveform
  - The app displays the current A/B selection clearly in both text form and on the waveform.

- **REQ-013 — Visible playback position on waveform**
  - Allocation: Selection and waveform
  - While a track is loaded, the waveform shows the current playback position and played progress.

- **REQ-014 — Save selected section**
  - Allocation: Saved sections
  - The user can save a valid selected range as a practice section for the current track and profile.

- **REQ-015 — Browse saved sections**
  - Allocation: Saved sections
  - The user can view saved sections for the active profile.

- **REQ-016 — Focus saved section**
  - Allocation: Saved sections
  - The user can select a saved section and have its range become the current focus.

- **REQ-017 — Delete saved section**
  - Allocation: Saved sections
  - The user can delete a saved section.

- **REQ-018 — Play saved section**
  - Allocation: Saved sections
  - The user can play a saved section from its start point.

- **REQ-019 — Loop saved section**
  - Allocation: Saved sections
  - The user can loop playback of a saved section.

- **REQ-020 — Cross-track section playback**
  - Allocation: Saved sections
  - If a saved section belongs to another currently available track, the app can load that track and play the section there.

- **REQ-021 — Practice history tracking**
  - Allocation: Practice adaptation
  - The app tracks section practice activity over time.

- **REQ-022 — Section mastery visibility**
  - Allocation: Practice adaptation
  - The app shows a mastery value for the currently focused or playing section.

- **REQ-023 — Adaptive next-section selection**
  - Allocation: Practice adaptation
  - The user can ask the app to choose the next section to practice adaptively from saved sections in the active profile.

- **REQ-024 — Clear empty and missing-state messaging**
  - Allocation: User feedback and recovery
  - The app provides clear guidance when required prerequisites are missing, such as no folder, no track, no selection, or no saved sections.

- **REQ-025 — Missing-track recovery feedback**
  - Allocation: User feedback and recovery
  - If a saved section refers to a track that is not available in the current folder, the app clearly informs the user.

### Accepted target
- None yet.

---

## Current Planning Delta

This section records only the requirement changes for the feature currently being planned.

If there is no active feature-planning topic, this section should remain empty.

### Add
- None yet.

### Change
- None yet.

### Remove
- None yet.

### Under-discussion items
- None yet.

### Deferred
- None yet.

### Rejected
- None yet.

---

## Decision Record

Use this section to record resolved planning decisions for the current or most recently completed feature in compact form.

### Accepted Decisions
- None yet.

### Rejected Or Deferred Directions
- None yet.

---

## Open Questions

Use this section as the active planning queue for the current feature only.

- None yet.

---

## Current Planning Focus

Use this section to summarize the feature or problem currently under discussion. Replace as planning moves to a new topic.

### Problem
- None yet.

### Desired Outcome
- None yet.

### Topic-Specific Constraints
- None yet.

### Proposed Direction
- None yet.

### Risks / Edge Cases
- None yet.

### Requirement Impact
- Unchanged baseline requirements: none identified yet.
- Baseline requirements proposed to change: none yet.
- New requirements proposed for the current feature: none yet.
- Open requirement questions: none yet.

### Definition Of Ready For Implementation
A planning topic is ready to move to implementation when:

- the user-visible behavior is specified
- major edge cases are identified
- success and failure states are described
- the affected requirements are clearly classified as unchanged, changed, added, removed, deferred, or rejected
- the current planning delta is explicit
- no major product-level ambiguity remains

---

## Implementation Handoff Template

When planning is complete, summarize the handoff in this form:

### Feature Summary
- ...

### Requirement Impact
- Unchanged baseline requirements: ...
- Changed baseline requirements: ...
- New requirements: ...
- Removed requirements: ...
- Deferred or rejected items: ...

### User-Facing Behavior
- ...

### Important States And Edge Cases
- ...

### Persistence / User Continuity Impact
- ...

### Likely Implementation Touchpoints
- ...

### Notes For Implementation
- ...

---

## Planning Heuristics

During planning, emphasize:

- user goals
- user-visible behavior
- workflows
- states and transitions
- edge cases
- error handling
- tradeoffs

De-emphasize:

- exact function names
- exact code structure
- implementation mechanics that do not materially affect planning

A good planning update should answer:

- what should the user see?
- what should happen next?
- what should be remembered?
- what can fail?
- how should failure be presented?
- what is explicitly out of scope?

Prefer plans that are:
- concrete
- compatible with the current app shape
- incremental
- easy to hand off into implementation later

---

## Update Discipline

When editing this file collaboratively:

- keep it cumulative
- remove stale conclusions
- preserve useful context
- avoid transcript-like accumulation
- prefer the current best understanding over historical discussion residue
- update requirement status deliberately rather than implicitly
- do not silently reinterpret accepted baseline requirements
- do not retain speculative future requirements after the planning session unless they are part of the current agreed feature delta

This file should read like a living planning brief, not like chat logs.

---

## Planning Workflow

The default planning workflow for this repository is:

1. The user pastes this file into a chat session and describes the feature, pain point, or desired change.
2. The AI first classifies the request against the accepted baseline:
   - unchanged baseline requirements
   - baseline requirements proposed to change
   - new proposed requirements for the current feature
   - open questions
3. The discussion stays at the product / UX / planning level first.
4. The AI returns cumulative updates to this file.
5. The user and AI iterate until the plan is satisfactory.
6. The updated `planning-context.md` is committed to the repository.
7. The repo context generation flow includes this file in `repo-context.xml`.
8. A later implementation session uses the updated planning context plus relevant code context.

A planning session should usually end with:
- a clear problem statement
- an agreed user-facing behavior
- accepted tradeoffs
- known edge cases
- a concrete handoff into implementation
- a clear requirement delta against the accepted baseline

When the planning session ends:
- requirements that were accepted and implemented should be promoted into the accepted baseline when appropriate
- requirements that were discussed but not accepted should generally be removed from this file
- speculative roadmap ideas should not be retained here unless they are part of the actively agreed feature plan

---

## Instructions To AI

When this file is pasted into a planning chat, follow these rules.

### Role

Act as a collaborative product, UX, and technical planning partner. Optimize for clarity, feasibility, and cumulative decision quality. Do not jump directly into implementation unless the user clearly asks to move into code changes.

### Default Behavior

1. Start from the existing contents of this file.
2. Treat this file as the source of truth for planning unless the user explicitly supersedes part of it.
3. Classify each new request first as:
   - unchanged baseline behavior
   - a modification to accepted baseline requirements
   - a new proposed requirement for the current feature
   - a clarification of an open question
4. Discuss requests first in terms of:
   - user goals
   - pain points
   - workflows
   - states
   - tradeoffs
   - risks
   - open questions
5. Return cumulative file updates rather than isolated patch fragments unless the user explicitly asks for diffs.
6. Prefer updating existing sections over scattering redundant notes.
7. Distinguish clearly between:
   - confirmed facts
   - assumptions
   - recommendations
   - open questions
8. Use repository-wide instructions and actual code context as the source of truth for implementation constraints rather than duplicating them here.

### Baseline And Delta Rules

- Treat items in **Accepted Product Requirement Baseline** as stable unless the user explicitly asks to change them.
- Do not silently renegotiate or reinterpret accepted baseline requirements.
- Use **Current Planning Delta** as the active surface for requirement changes.
- Do not add speculative future requirements, roadmap items, or aspirational ideas to this file unless they are part of the feature currently being planned.
- If the user brings future ideas into the conversation, use them only as discussion input unless the conversation explicitly promotes them into the current planning delta.
- When a requirement changes status, update that status explicitly.
- If a request conflicts with accepted baseline requirements, surface the conflict clearly before proposing edits.

### Requirement Rules

- Requirements must be expressed as user-observable behavior or user-available capability.
- Requirements must not be expressed as implementation details, APIs, data stores, files, classes, modules, or browser internals.
- Requirements may include an allocation to a product area, but must not be split by file.
- Preserve requirement IDs once introduced.

### Collaboration Rules

- Do not treat the first request as a final specification.
- Help the user shape the request into a better plan.
- When the request is underspecified, propose structured options.
- When the request seems risky, weak, or inconsistent, probe constructively and explain the tradeoff rather than dismissing it.
- Prefer decisions that preserve future flexibility unless there is a strong reason not to.
- Stay grounded in the actual product and repository context.

### Output Rules

When proposing an update to this file:

- update relevant sections in place
- keep wording crisp and specific
- remove stale or superseded statements
- avoid duplication
- prefer bullets and short sections over long prose
- keep low-level implementation detail out unless it materially affects planning
- preserve requirement IDs once introduced
- keep the file focused on accepted baseline plus the active feature delta

### Escalation Rule

Stay in planning mode until most of the following are true:

- the user-facing behavior is clear
- the important states and edge cases are identified
- the main tradeoffs are accepted
- the requirement delta is explicit
- the plan is concrete enough to map to implementation

Once those conditions are substantially satisfied, summarize the implementation handoff and only then move into code-editing mode if requested.