/**
 * @role controller
 * @owns section CRUD, focused-section navigation, section playback boundaries, completion tracking, and track-scoped section browsing
 * @not-owns folder persistence, raw track enumeration, activity CRUD, or waveform rendering internals
 * @notes This controller coordinates with track loading when a section references another track.
 */

import {
  addPlayLog,
  addSection,
  deleteSection,
  getSectionsByProfile,
  updateSection,
} from "../../persistence/db.js";
import { state } from "../../app/state.js";
import { elements } from "../../shared/shell-ui.js";
import { showAlert, showConfirm, showPrompt } from "../../shared/dialog.js";
import {
  calculateMastery,
  createSectionLabel,
  normalizeSectionRecord,
  sortSections,
} from "../../shared/utils.js";
import { renderSections } from "./sections-ui.js";

export function createSectionsController({
  audio,
  selectTrackByIndex,
  refreshSelectionUi,
  refreshMasteryUi,
  syncPlaybackUi,
  renderActivityList,
  handleError,
}) {
  async function refreshSections() {
    if (!state.currentProfileId) {
      state.allSections = [];
      state.visibleSections = [];
      renderSectionList();
      refreshMasteryUi();
      renderActivityList();
      return;
    }

    const sections = await getSectionsByProfile(state.currentProfileId);
    state.allSections = sections.map(normalizeSectionRecord).sort(sortSections);

    if (!state.allSections.some((section) => section.id === state.focusedSectionId)) {
      state.focusedSectionId = null;
    }

    if (!state.allSections.some((section) => section.id === state.currentPlayingSectionId)) {
      state.currentPlayingSectionId = null;
    }

    renderSectionList();
    refreshMasteryUi();
    renderActivityList();
  }

  function getVisibleSections() {
    const currentTrackName = state.currentTrack?.name;

    if (!currentTrackName) {
      return [];
    }

    return state.allSections.filter((section) => section.trackName === currentTrackName);
  }

  function getActiveVisibleSectionId(visibleSections) {
    if (visibleSections.some((section) => section.id === state.currentPlayingSectionId)) {
      return state.currentPlayingSectionId;
    }

    if (visibleSections.some((section) => section.id === state.focusedSectionId)) {
      return state.focusedSectionId;
    }

    return null;
  }

  function renderSectionList() {
    const visibleSections = getVisibleSections();
    state.visibleSections = visibleSections;

    renderSections({
      sections: visibleSections,
      activeSectionId: getActiveVisibleSectionId(visibleSections),
      currentTrackName: state.currentTrack?.name ?? null,
      onFocus: (sectionId) => {
        void focusSection(sectionId);
      },
      onPlay: (sectionId) => {
        void playSectionById(sectionId);
      },
      onDelete: (sectionId) => {
        void removeSection(sectionId);
      },
    });
  }

  async function saveSelectionAsSection() {
    try {
      if (!state.currentProfileId) {
        await showAlert("Select a profile first.");
        return;
      }

      if (!state.currentTrack) {
        await showAlert("Pick a track first.");
        return;
      }

      if (state.selection.start == null || state.selection.end == null) {
        await showAlert("Drag on the waveform to mark a section before saving.");
        return;
      }

      const start = Math.min(state.selection.start, state.selection.end);
      const end = Math.max(state.selection.start, state.selection.end);

      if (Math.abs(end - start) < 0.05) {
        await showAlert("The selected section is too short.");
        return;
      }

      const label = await showPrompt("Optional name for this section:", {
        title: "Save Section",
        placeholder: "e.g. Tricky passage, Coda, mm. 32–40",
      });

      if (label === null) {
        return;
      }

      const sectionId = await addSection({
        profileId: state.currentProfileId,
        trackName: state.currentTrack.name,
        label: label.trim() || null,
        start,
        end,
        playCount: 0,
        mastery: 0,
        lastPlayed: 0,
        createdAt: Date.now(),
      });

      state.focusedSectionId = sectionId;
      await refreshSections();
    } catch (error) {
      handleError(error);
    }
  }

  async function focusSection(sectionId) {
    try {
      const section = state.allSections.find((item) => item.id === sectionId);

      if (!section) {
        return;
      }

      state.focusedSectionId = section.id;
      state.selection = {
        start: section.start,
        end: section.end,
      };

      const matchingTrackIndex = state.tracks.findIndex((track) => track.name === section.trackName);

      if (matchingTrackIndex !== -1 && state.currentTrack?.name !== section.trackName) {
        await selectTrackByIndex(matchingTrackIndex, { preserveSelection: true });
      }

      refreshSelectionUi();
      renderSectionList();
      refreshMasteryUi();
    } catch (error) {
      handleError(error);
    }
  }

  async function ensureTrackLoadedForSection(section) {
    const trackIndex = state.tracks.findIndex((track) => track.name === section.trackName);

    if (trackIndex === -1) {
      await showAlert(
        `Track "${section.trackName}" is not available in the currently selected folder.`,
      );
      return false;
    }

    if (state.currentTrack?.name !== section.trackName) {
      await selectTrackByIndex(trackIndex, { preserveSelection: true });
    }

    return true;
  }

  async function playSectionById(sectionId) {
    try {
      const section = state.allSections.find((item) => item.id === sectionId);

      if (!section) {
        return;
      }

      const ready = await ensureTrackLoadedForSection(section);

      if (!ready) {
        return;
      }

      state.currentPlayingSectionId = section.id;
      state.focusedSectionId = section.id;
      state.selection = {
        start: section.start,
        end: section.end,
      };

      refreshSelectionUi();
      renderSectionList();
      refreshMasteryUi();

      audio.currentTime = section.start;
      syncPlaybackUi();
      await audio.play();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleAudioBoundary() {
    if (!state.currentPlayingSectionId) {
      return;
    }

    const activeSection = state.allSections.find(
      (section) => section.id === state.currentPlayingSectionId,
    );

    if (!activeSection) {
      return;
    }

    if (audio.currentTime < activeSection.end) {
      return;
    }

    if (elements.loopToggle.checked) {
      audio.currentTime = activeSection.start;
      syncPlaybackUi();
      return;
    }

    audio.pause();
    audio.currentTime = activeSection.end;
    syncPlaybackUi();

    const completedSectionId = state.currentPlayingSectionId;
    state.currentPlayingSectionId = null;
    renderSectionList();

    await finalizeSectionPlay(completedSectionId);
  }

  async function finalizeSectionPlay(sectionId) {
    const section = state.allSections.find((item) => item.id === sectionId);

    if (!section) {
      return;
    }

    const now = Date.now();
    const updatedSection = {
      ...section,
      playCount: section.playCount + 1,
      lastPlayed: now,
      mastery: calculateMastery(section, now),
    };

    await updateSection(updatedSection);
    await addPlayLog({
      sectionId,
      timestamp: now,
      speed: audio.playbackRate,
    });

    state.focusedSectionId = sectionId;
    await refreshSections();
  }

  async function removeSection(sectionId) {
    try {
      const section = state.allSections.find((item) => item.id === sectionId);

      if (!section) {
        return;
      }

      const confirmed = await showConfirm(`Delete section ${createSectionLabel(section)}?`, {
        title: "Delete Section",
        confirmLabel: "Delete",
      });

      if (!confirmed) {
        return;
      }

      if (state.currentPlayingSectionId === sectionId) {
        audio.pause();
        state.currentPlayingSectionId = null;
      }

      if (state.focusedSectionId === sectionId) {
        state.focusedSectionId = null;
      }

      await deleteSection(sectionId);
      await refreshSections();
    } catch (error) {
      handleError(error);
    }
  }

  return {
    refreshSections,
    renderSectionList,
    saveSelectionAsSection,
    focusSection,
    playSectionById,
    handleAudioBoundary,
    removeSection,
  };
}