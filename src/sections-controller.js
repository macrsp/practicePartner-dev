import {
  addPlayLog,
  addSection,
  deleteSection,
  getSectionsByProfile,
  updateSection,
} from "./db.js";
import { state } from "./state.js";
import { elements, renderSections } from "./ui.js";
import {
  calculateMastery,
  chooseAdaptiveSection,
  createSectionLabel,
  normalizeSectionRecord,
  sortSections,
} from "./utils.js";

export function createSectionsController({
  audio,
  selectTrackByIndex,
  refreshSelectionUi,
  refreshMasteryUi,
  handleError,
}) {
  async function refreshSections() {
    if (!state.currentProfileId) {
      state.sections = [];
      renderSectionList();
      refreshMasteryUi();
      return;
    }

    const sections = await getSectionsByProfile(state.currentProfileId);
    state.sections = sections.map(normalizeSectionRecord).sort(sortSections);

    if (!state.sections.some((section) => section.id === state.focusedSectionId)) {
      state.focusedSectionId = null;
    }

    if (!state.sections.some((section) => section.id === state.currentPlayingSectionId)) {
      state.currentPlayingSectionId = null;
    }

    renderSectionList();
    refreshMasteryUi();
  }

  function renderSectionList() {
    renderSections({
      sections: state.sections,
      activeSectionId: state.currentPlayingSectionId ?? state.focusedSectionId,
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
        window.alert("Select a profile first.");
        return;
      }

      if (!state.currentTrack) {
        window.alert("Pick a track first.");
        return;
      }

      if (state.selection.start == null || state.selection.end == null) {
        window.alert("Mark both A and B before saving a section.");
        return;
      }

      const start = Math.min(state.selection.start, state.selection.end);
      const end = Math.max(state.selection.start, state.selection.end);

      if (Math.abs(end - start) < 0.05) {
        window.alert("The selected section is too short.");
        return;
      }

      const sectionId = await addSection({
        profileId: state.currentProfileId,
        trackName: state.currentTrack.name,
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
      const section = state.sections.find((item) => item.id === sectionId);

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
      window.alert(
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
      const section = state.sections.find((item) => item.id === sectionId);

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
      await audio.play();
    } catch (error) {
      handleError(error);
    }
  }

  async function playAdaptiveSection() {
    try {
      if (!state.sections.length) {
        window.alert("There are no saved sections for this profile yet.");
        return;
      }

      const nextSection = chooseAdaptiveSection(state.sections);

      if (!nextSection) {
        return;
      }

      await playSectionById(nextSection.id);
    } catch (error) {
      handleError(error);
    }
  }

  async function handleAudioBoundary() {
    if (!state.currentPlayingSectionId) {
      return;
    }

    const activeSection = state.sections.find(
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
      return;
    }

    audio.pause();
    audio.currentTime = activeSection.end;

    const completedSectionId = state.currentPlayingSectionId;
    state.currentPlayingSectionId = null;
    renderSectionList();

    await finalizeSectionPlay(completedSectionId);
  }

  async function finalizeSectionPlay(sectionId) {
    const section = state.sections.find((item) => item.id === sectionId);

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
      const section = state.sections.find((item) => item.id === sectionId);

      if (!section) {
        return;
      }

      const confirmed = window.confirm(`Delete section ${createSectionLabel(section)}?`);

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
    playAdaptiveSection,
    handleAudioBoundary,
    removeSection,
  };
}