/**
 * @role controller
 * @owns one-activity-at-a-time practice state and temporary in-practice selection state
 * @not-owns activity persistence, Today-list ordering, or workspace section CRUD
 * @notes The executable practice-mode surface is deferred; this controller provides the initial state shape.
 */

import { state } from "../../app/state.js";

export function createPracticeModeController() {
  function openPracticeIndex(index) {
    state.currentPracticeIndex = Number.isInteger(index) ? index : null;
    state.practiceSelection = {
      start: null,
      end: null,
    };
  }

  function setPracticeSelection(selection) {
    state.practiceSelection = {
      start: Number.isFinite(selection?.start) ? selection.start : null,
      end: Number.isFinite(selection?.end) ? selection.end : null,
    };
  }

  function clearPracticeSelection() {
    state.practiceSelection = {
      start: null,
      end: null,
    };
  }

  return {
    openPracticeIndex,
    setPracticeSelection,
    clearPracticeSelection,
  };
}