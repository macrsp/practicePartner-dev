/**
 * @role controller
 * @owns waveform-driven selection state, mastery display refresh, and selection display refresh
 * @not-owns saved-section persistence, track loading, or profile management
 * @notes Keep this controller focused on selection semantics and related UI.
 */

import { state } from "../../app/state.js";
import { setMasteryDisplay, setSelectionDisplay } from "./sections-ui.js";

export function createSelectionController({ renderSectionList }) {
  let workspace = null;

  function attachWorkspace(nextWorkspace) {
    workspace = nextWorkspace;
    refreshSelectionUi();
    refreshMasteryUi();
  }

  function detachWorkspace() {
    workspace = null;
  }

  function refreshSelectionUi() {
    if (!workspace) {
      return;
    }

    workspace.waveform.setSelection(state.selection);
    setSelectionDisplay(workspace, state.selection.start, state.selection.end);
  }

  function refreshMasteryUi() {
    if (!workspace) {
      return;
    }

    const focusedSection =
      state.allSections.find((section) => section.id === state.currentPlayingSectionId) ||
      state.allSections.find((section) => section.id === state.focusedSectionId) ||
      null;

    setMasteryDisplay(workspace, focusedSection?.mastery ?? null);
  }

  function clearFocusedSectionForManualSelection() {
    if (state.currentPlayingSectionId == null && state.focusedSectionId == null) {
      return;
    }

    state.currentPlayingSectionId = null;
    state.focusedSectionId = null;
    renderSectionList();
    refreshMasteryUi();
  }

  function handleWaveformSelectionChange(selection) {
    state.selection = selection;

    if (workspace) {
      setSelectionDisplay(workspace, selection.start, selection.end);
    }

    clearFocusedSectionForManualSelection();
  }

  return {
    attachWorkspace,
    detachWorkspace,
    refreshSelectionUi,
    refreshMasteryUi,
    handleWaveformSelectionChange,
  };
}