/**
 * @role controller
 * @owns waveform-driven selection state, mastery display refresh, and selection display refresh
 * @not-owns saved-section persistence, track loading, or profile management
 * @notes Keep this controller focused on selection semantics and related UI.
 */

import { state } from "../../app/state.js";
import { setMasteryDisplay, setSelectionDisplay } from "./sections-ui.js";

export function createSelectionController({ waveform, renderSectionList }) {
  function refreshSelectionUi() {
    waveform.setSelection(state.selection);
    setSelectionDisplay(state.selection.start, state.selection.end);
  }

  function refreshMasteryUi() {
    const focusedSection =
      state.allSections.find((section) => section.id === state.currentPlayingSectionId) ||
      state.allSections.find((section) => section.id === state.focusedSectionId) ||
      null;

    setMasteryDisplay(focusedSection?.mastery ?? null);
  }

  function clearFocusedSectionForManualSelection() {
    if (state.currentPlayingSectionId || state.focusedSectionId == null) {
      return;
    }

    state.focusedSectionId = null;
    renderSectionList();
    refreshMasteryUi();
  }

  function handleWaveformSelectionChange(selection) {
    state.selection = selection;
    setSelectionDisplay(selection.start, selection.end);
    clearFocusedSectionForManualSelection();
  }

  return {
    refreshSelectionUi,
    refreshMasteryUi,
    handleWaveformSelectionChange,
  };
}