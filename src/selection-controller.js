/**
 * @role controller
 * @owns A/B selection state, waveform selection sync, mastery display refresh, selection display refresh
 * @not-owns saved-section persistence, track loading, or profile management
 * @notes Keep this controller focused on selection semantics and related UI.
 */

import { state } from "./state.js";
import { setMasteryDisplay, setSelectionDisplay } from "./ui.js";

export function createSelectionController({ audio, waveform, renderSectionList }) {
  function refreshSelectionUi() {
    waveform.setSelection(state.selection);
    setSelectionDisplay(state.selection.start, state.selection.end);
  }

  function refreshMasteryUi() {
    const focusedSection =
      state.sections.find((section) => section.id === state.currentPlayingSectionId) ||
      state.sections.find((section) => section.id === state.focusedSectionId) ||
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

  function setSelectionMarker(key) {
    if (!state.currentTrack) {
      window.alert("Pick a track first.");
      return;
    }

    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    state.selection = {
      ...state.selection,
      [key]: currentTime,
    };

    refreshSelectionUi();
    clearFocusedSectionForManualSelection();
  }

  return {
    refreshSelectionUi,
    refreshMasteryUi,
    handleWaveformSelectionChange,
    setSelectionMarker,
  };
}