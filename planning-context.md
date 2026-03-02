<!--
  @role planning-context
  @owns collaborative planning context, accepted product requirement baseline, current planning delta, decision records, and implementation handoff summaries
  @not-owns repository-wide implementation rules, response-shape rules, and per-file ownership details that belong in repomix-instruction.md
  @notes Human readability comes first. Treat accepted baseline requirements as stable unless explicitly changed. Do not keep speculative roadmap items here.
-->

# Planning Context

This file is the lightweight planning artifact for this repository.

It exists to support collaborative feature planning before implementation begins. It should stay concise, current, and decision-oriented. It is not a replacement for source code or `repo-context.xml`; it is the planning layer above them.

---

## Purpose

Use this file to:

* describe the product and current UX at a planning level
* capture accepted product requirements and active proposed changes
* document open questions, decisions, and tradeoffs for the current feature
* define feature-specific planning constraints
* create a stable handoff into implementation

Use `repo-context.xml` or file-level code context when the conversation moves from planning into implementation.

---

## Product Summary

This repository contains a browser-based music practice app for section-based repetition, track-focused section work, reusable practice activities, and a lightweight planner-to-workspace practice flow.

Core capabilities currently include:

* selecting a music folder from the local filesystem
* choosing tracks from that folder
* marking A/B points on a waveform
* controlling playback from the workspace waveform player
* saving sections per profile
* replaying saved sections
* looping saved sections
* tracking play count and mastery
* creating reusable named activities
* building a current practice plan from those activities
* launching playable activities from the Planner into the Workspace

The product should favor fast practice flow, clear visual feedback, and low-friction continuity.

---

## Product Goals

The app should help a learner practice efficiently by making it easy to:

* load personal practice audio
* identify and save difficult passages
* replay passages repeatedly
* track repetition and progress
* organize and revisit what to practice with minimal friction

The UX should optimize for clarity and speed during active practice.

---

## Source Of Truth

This file is the source of truth for **planning**.

Repository structure, implementation boundaries, code-editing rules, and per-file ownership are defined elsewhere and should not be duplicated here as stable reference material.

Use this file for:

* user-facing behavior
* workflow intent
* state expectations
* requirement status
* open questions
* decisions
* tradeoffs
* feature-specific planning constraints

---

## Requirement Authoring Rules

Requirements in this file must follow these rules:

* Requirements must be written in terms of user-observable behavior or user-available capability.
* Requirements must not be phrased as implementation details, file structure, APIs, storage mechanisms, browser internals, or module responsibilities.
* Requirement IDs remain stable once introduced.
* Accepted baseline requirements should remain conservative and reflect currently accepted product behavior.
* The only future-oriented requirements allowed in this file are the ones in the current planning delta for the feature actively being planned.

---

## Current Product Regions

The current product is organized around these major regions:

1. Header / app identity
2. Profile controls
3. Workspace-local waveform player
4. Workspace route
5. Folder selection and track selection
6. A/B marking and save controls
7. Waveform display and selection interaction
8. Saved sections list and section actions
9. Planner route
10. Activity library and activity actions
11. Current practice plan

---

## Primary User Flows

### 1. Load Music And Choose Track

* User picks a music folder.
* App enumerates supported audio files.
* User selects a track.
* App loads the audio and waveform.

### 2. Create A Saved Section

* User loads a track in the Workspace.
* User marks A and B from waveform drag.
* User saves the selected range as a section under the active profile.

### 3. Focus And Replay A Saved Section

* User loads a track in the Workspace.
* App shows saved sections for the selected track.
* User selects a saved section.
* App focuses the associated time range.
* User plays the section from the workspace waveform player.
* App loops or completes playback according to settings.

### 4. Create A Reusable Activity

* User creates a named activity under the active profile from the Planner.
* The activity targets either a whole track, a saved section, or a freeform custom reference.
* For track-based and section-based work, the user can create activities from current workspace context and later manage them from the Planner.
* For non-library material, the user can create a named freeform activity directly.

### 5. Build The Current Practice Plan

* User opens the Planner.
* User browses reusable activities for the active profile.
* User adds activities to the current plan.
* User can remove items from the current plan.

### 6. Launch A Playable Activity Into The Workspace

* User clicks Use on an activity or plan item in the Planner.
* App navigates to the Workspace.
* If the activity targets a whole track, the app loads that track in the Workspace.
* If the activity targets a saved section, the app loads the associated track when needed, focuses that section, and cues playback at the section start.
* If the target cannot be resolved, the app provides clear feedback.

### 7. Refresh And Resume Context

* User reloads the page.
* App restores persisted context where possible.
* App should preserve continuity without confusing the user.

---

## Product State Model

The most important product-level states are:

### Identity / Scope

* active profile
* saved sections for active profile
* reusable activities for active profile
* current plan for active profile

### Navigation

* workspace route active
* planner route active

### Music Source

* no folder known
* folder known but permission not currently granted
* folder available and readable

### Track Context

* no tracks loaded
* tracks loaded
* current track selected
* current track unavailable in current folder

### Selection State

* no selection
* valid waveform range selected
* saved section focused
* saved section armed for playback

### Playback State

* idle
* playing full track context
* playing saved section
* looping saved section
* paused at position
* ended

### Waveform State

* no waveform loaded
* waveform loading
* waveform visible
* waveform selection active
* playback position visible

### Activity State

* no activities
* activities available
* selected activity
* selected activity playable in the workspace
* selected activity not directly playable in the workspace

### Plan State

* no plan items
* current plan exists
* current plan has items
* plan item references unavailable or deleted activity

---

## Requirement Status Rules

Use these statuses consistently:

* **Implemented**: accepted and already reflected in the code
* **Accepted target**: accepted for the current feature, but implementation is expected to catch up
* **Under discussion**: actively being planned, not yet accepted
* **Deferred**: intentionally postponed within the current feature discussion
* **Rejected**: explicitly not doing this within the current feature discussion

---

## Accepted Product Requirement Baseline

### Implemented

* **REQ-001 - Profile selection**

  * Allocation: Profiles
  * The user can select a practice profile.

* **REQ-002 - Profile creation**

  * Allocation: Profiles
  * The user can create a new practice profile.

* **REQ-003 - Profile-scoped saved work**

  * Allocation: Profiles
  * Saved sections, reusable activities, and current-plan state are scoped to the active profile.

* **REQ-004 - Music folder selection**

  * Allocation: Music source
  * The user can choose a local music folder as the source of practice tracks.

* **REQ-005 - Supported audio track loading**

  * Allocation: Music source
  * The app loads supported audio files from the selected folder and presents them as selectable tracks.

* **REQ-006 - Folder continuity across refresh**

  * Allocation: Music source
  * The app remembers the previously selected music folder and can reconnect to it after refresh, including showing reconnect guidance when permission is needed again.

* **REQ-007 - Last-track continuity**

  * Allocation: Music source
  * When possible, the app restores or reselects the most recently used track from the remembered music folder.

* **REQ-008 - Track selection**

  * Allocation: Track playback
  * The user can select a loaded track for practice.

* **REQ-009 - Playback speed control**

  * Allocation: Track playback
  * The user can adjust playback speed for the current track.

* **REQ-011 - Waveform-based selection**

  * Allocation: Selection and waveform
  * The user can create or adjust a practice range by dragging on the waveform.

* **REQ-012 - Visible selection feedback**

  * Allocation: Selection and waveform
  * The app displays the current A/B selection clearly in both text form and on the waveform.

* **REQ-013 - Visible playback position on waveform**

  * Allocation: Selection and waveform
  * While a track is loaded, the waveform shows the current playback position and played progress.

* **REQ-014 - Save selected section**

  * Allocation: Saved sections
  * The user can save a valid selected range as a practice section for the current track and profile.

* **REQ-015 - Browse saved sections**

  * Allocation: Saved sections
  * The user can view saved sections for the currently selected track within the active profile.

* **REQ-016 - Focus saved section**

  * Allocation: Saved sections
  * The user can select a saved section and have its range become the current focus.

* **REQ-017 - Delete saved section**

  * Allocation: Saved sections
  * The user can delete a saved section.

* **REQ-018 - Play saved section**

  * Allocation: Saved sections
  * The user can play a saved section from its start point.

* **REQ-019 - Loop saved section**

  * Allocation: Saved sections
  * The user can loop playback of a saved section.

* **REQ-020 - Cross-track section playback**

  * Allocation: Saved sections
  * If a saved section belongs to another currently available track, the app can load that track and play the section there.

* **REQ-021 - Practice history tracking**

  * Allocation: Practice adaptation
  * The app tracks section practice activity over time.

* **REQ-022 - Section mastery visibility**

  * Allocation: Practice adaptation
  * The app shows a mastery value for the currently focused or playing section.

* **REQ-024 - Clear empty and missing-state messaging**

  * Allocation: User feedback and recovery
  * The app provides clear guidance when required prerequisites are missing, such as no folder, no track, no selection, or no saved sections.

* **REQ-025 - Missing-track recovery feedback**

  * Allocation: User feedback and recovery
  * If a saved section or activity refers to a track that is not available in the current folder, the app clearly informs the user.

* **REQ-026 - Reusable named practice activities**

  * Allocation: Practice planning
  * The user can create reusable, nameable practice activities scoped to the active profile.

* **REQ-027 - Activity target types**

  * Allocation: Practice planning
  * A practice activity can target a whole track, a saved section, or a freeform custom reference.

* **REQ-028 - Freeform custom activity target**

  * Allocation: Practice planning
  * For non-library practice material, the user can create a named activity by entering a freeform reference instead of choosing an existing track or section.

* **REQ-035 - Browse reusable activities**

  * Allocation: Practice planning
  * The user can view reusable activities for the active profile from the Planner.

* **REQ-036 - Planner-to-workspace activity launch**

  * Allocation: Practice execution
  * When an activity targets a whole track or a saved section, the user can use that activity from the Planner and the app navigates to the Workspace and loads or focuses the associated track or section there.

* **REQ-037 - Workspace and Planner navigation**

  * Allocation: Navigation and workflow
  * The user can move between a Workspace view and a separate Planner view, with playback controls living in the Workspace rather than in persistent shell chrome.

* **REQ-038 - Current practice plan**

  * Allocation: Practice planning
  * The user has a persisted current practice plan for each profile.

* **REQ-039 - Plan composition from activities**

  * Allocation: Practice planning
  * The user can add reusable activities to the current practice plan and remove them later.

### Accepted target

* None currently.

---

## Current Planning Delta

### Add

* None currently.

### Change

* None currently.

### Remove

* None currently.

### Under-discussion items

* None currently.

### Deferred

* **REQ-023 - Adaptive next-section selection**

  * Allocation: Practice adaptation
  * Deferred. The current implementation does not include an Adaptive Next control.

* **REQ-029 - Today practice list**

  * Allocation: Practice planning
  * Deferred. The current implementation uses a single current plan rather than a Today list.

* **REQ-030 - Separate practice mode**

  * Allocation: Practice execution
  * Deferred. The current implementation uses the Workspace rather than a separate execution mode.

* **REQ-031 - Workspace and separate practice-mode navigation**

  * Allocation: Navigation and workflow
  * Deferred. The current navigation split is Workspace and Planner, not Workspace and a separate practice mode.

* **REQ-032 - Single-activity practice execution**

  * Allocation: Practice execution
  * Deferred. The current implementation launches activities into the Workspace rather than a dedicated one-at-a-time execution surface.

* **REQ-033 - Playable activity launch as its own mode**

  * Allocation: Practice execution
  * Deferred. Playable activities currently navigate into the existing Workspace rather than opening a distinct practice mode.

* **REQ-034 - Lightweight in-practice region selection**

  * Allocation: Practice execution
  * Deferred with practice mode.

* named multi-plan management UX beyond the single current/default plan
* practice categories as first-class user-managed entities
* song sets and set-based activity targets
* ratings in an eventual practice-mode slice
* timers and timer-driven stop or notification behavior in an eventual practice-mode slice
* saving new sections directly from a future practice mode

### Rejected

* **REQ-010 - A/B point marking from playback**

  * Allocation: Selection and waveform
  * Rejected for the workspace surface. Waveform interaction is the primary way to define A/B selection there.

* overloading sections so they become the universal practice activity model
* keeping separate Mark A and Mark B buttons on the main workspace screen as the primary section-selection flow

---

## Decision Record

### Accepted Decisions

* The app now uses separate Workspace and Planner views.
* Playback controls live inside the Workspace waveform player rather than in persistent shell chrome.
* Saved sections are shown only for the currently selected track in the Workspace.
* Activities are reusable entities and should not be treated as plan-local only.
* Activities are explicitly nameable.
* Sections remain specialized saved passages associated with tracks; they are valid activity targets but are not themselves activities.
* Activity target types in the current implementation are track, saved section, and freeform custom reference.
* Activities are managed from the Planner rather than from the Workspace.
* The Planner currently exposes a single persisted current/default plan per profile.
* The data model should remain open to multiple named plans later, but multi-plan management is not part of the current UX.
* Playable activities function as planner-to-workspace shortcuts that load or focus the relevant track or section using the existing Workspace controls.
* For a section-targeted activity, Use must leave the user ready to play that section immediately from the workspace player.

### Rejected Or Deferred Directions

* A dedicated Today practice list remains deferred.
* A separate practice mode remains deferred.
* One-activity-at-a-time execution UI remains deferred.
* In-practice temporary region selection remains deferred with practice mode.
* Adaptive next-section selection remains deferred.
* Early introduction of song sets, categories, timers, ratings, and full named-plan management remains deferred.

---

## Open Questions

* None currently.

---

## Current Planning Focus

### Status

* There is no active planning delta at the moment.
* The most recently completed slice introduced a separate Planner route, moved activity management there, added a persisted current plan per profile, and localized playback controls to the Workspace waveform player.
* The Workspace remains the execution surface for track and section playback.
* The current implementation does not include a separate practice mode.

### Current Product Shape

* The user selects a profile from persistent shell controls.
* The app provides a Workspace route for track loading, waveform selection, route-local playback control, and saved-section management.
* The app provides a Planner route for activity management and current-plan composition.
* The user creates reusable activities in the Planner, using current workspace context when relevant.
* The user adds activities to a current plan in the Planner.
* The user uses playable activities from the Planner to navigate into the Workspace and load or focus the relevant target there.
* Freeform activities remain reusable references rather than directly playable items.

### Important Edge Cases Still Relevant

* a saved-section activity may reference a section that has been deleted
* a track-targeted or section-targeted activity may reference a track that is unavailable in the currently connected folder
* a custom activity target has no playable media
* a current-plan item may reference an activity that no longer exists
* activity launch into the Workspace must remain distinct from any future dedicated practice mode
* if no track is selected in the Workspace, the section area needs clear messaging that sections are track-specific
* the Planner needs clear distinction between reusable activities and current-plan items so the two concepts do not blur

---

## Most Recent Completed Slice

### Feature Summary

* Introduced a mounted-route architecture with separate Workspace and Planner views.
* Moved activity creation and activity browsing out of the Workspace and into the Planner.
* Added a persisted current/default practice plan per profile, backed by reusable activities.
* Added planner-to-workspace activity launch behavior.
* Fixed section-targeted activity use so it cues the section in the Workspace and leaves the user ready to play that section immediately.
* Moved playback controls into a workspace-local waveform player and removed shell-owned transport.

### Requirement Impact

* Updated REQ-035 so activity browsing now lives in the Planner.
* Updated REQ-036 so activity use now explicitly launches from Planner to Workspace.
* Updated REQ-037 so navigation no longer implies persistent shell-owned transport.
* Added REQ-038 and REQ-039 as implemented baseline behavior.
* Kept REQ-023 and REQ-029 through REQ-034 deferred.

### User-Facing Behavior

* The user switches between Workspace and Planner with route navigation.
* The Workspace owns track loading, waveform selection, saved-section management, and playback controls.
* The Planner owns reusable activity management and current-plan composition.
* Clicking Use on a playable activity from the Planner navigates to the Workspace and loads or focuses the target there.
* Clicking Use on a section-targeted activity cues playback at the section start and arms the section boundary behavior.
* The current plan is persisted per profile and can contain multiple activity items, while the UI still presents only one current/default plan.

### Persistence / User Continuity Impact

* Existing profile, folder, track, section, and play-history continuity remain intact.
* Activities remain profile-scoped persisted planning state.
* The current/default plan and its items are now persisted per profile.
* Activity and plan-item usability still depends on current music-folder availability when playable media is required.
* Playback continuity is route-local to the Workspace rather than shell-persistent across Planner and Workspace.

---

## Planning Heuristics

During planning, emphasize:

* user goals
* user-visible behavior
* workflows
* states and transitions
* edge cases
* error handling
* tradeoffs

De-emphasize:

* exact function names
* exact code structure
* implementation mechanics that do not materially affect planning

---

## Update Discipline

When editing this file collaboratively:

* keep it cumulative
* remove stale conclusions
* preserve useful context
* avoid transcript-like accumulation
* prefer the current best understanding over historical discussion residue
* update requirement status deliberately rather than implicitly
* do not silently reinterpret accepted baseline requirements

---

## Planning Workflow

The default planning workflow for this repository is:

1. The user pastes this file into a chat session and describes the feature, pain point, or desired change.
2. The AI classifies the request against the accepted baseline.
3. The discussion stays at the product / UX / planning level first.
4. The AI returns cumulative file updates.
5. The user and AI iterate until the plan is satisfactory.
6. The updated `planning-context.md` is committed to the repository.
7. The repo context generation flow includes this file in `repo-context.xml`.
8. A later implementation session uses the updated planning context plus relevant code context.

---

## Instructions To AI

### Role

Act as a collaborative product, UX, and technical planning partner. Optimize for clarity, feasibility, and cumulative decision quality. Do not jump directly into implementation unless the user clearly asks to move into code changes.

### Default Behavior

1. Start from the existing contents of this file.
2. Treat this file as the source of truth for planning unless the user explicitly supersedes part of it.
3. Classify each new request first as:

   * unchanged baseline behavior
   * a modification to accepted baseline requirements
   * a new proposed requirement for the current feature
   * a clarification of an open question

4. Discuss requests first in terms of:

   * user goals
   * pain points
   * workflows
   * states
   * tradeoffs
   * risks
   * open questions

5. Return cumulative file updates rather than isolated patch fragments unless the user explicitly asks for diffs.
6. Prefer updating existing sections over scattering redundant notes.
7. Distinguish clearly between confirmed facts, assumptions, recommendations, and open questions.

### Baseline And Delta Rules

* Treat items in **Accepted Product Requirement Baseline** as stable unless the user explicitly asks to change them.
* Do not silently renegotiate or reinterpret accepted baseline requirements.
* Use **Current Planning Delta** as the active surface for requirement changes.
* Do not add speculative roadmap items unless they are part of the feature currently being planned.

### Output Rules

When proposing an update to this file:

* update relevant sections in place
* keep wording crisp and specific
* remove stale or superseded statements
* avoid duplication
* keep low-level implementation detail out unless it materially affects planning
* preserve requirement IDs once introduced