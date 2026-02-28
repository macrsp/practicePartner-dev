import { DEFAULT_PROFILE_NAME, SETTINGS_KEYS } from "./constants.js";
import {
  addPlayLog,
  addProfile,
  addSection,
  deleteSection,
  getAllProfiles,
  getSectionsByProfile,
  getSetting,
  openDatabase,
  setSetting,
  updateSection,
} from "./db.js";
import { state } from "./state.js";
import {
  elements,
  renderProfiles,
  renderSections,
  renderTracks,
  setMasteryDisplay,
  setSelectionDisplay,
  setSpeedDisplay,
  setTrackCount,
} from "./ui.js";
import {
  calculateMastery,
  chooseAdaptiveSection,
  compareByName,
  createSectionLabel,
  isSupportedAudioFile,
  normalizeSectionRecord,
  sortSections,
  summarizeTrackCount,
} from "./utils.js";
import { createWaveform } from "./waveform.js";

const audio = elements.audio;

const waveform = createWaveform({
  mountEl: elements.waveformMount,
  onSelectionChange: handleWaveformSelectionChange,
});

bindEvents();
bootstrap().catch(handleError);

async function bootstrap() {
  await openDatabase();
  await ensureDefaultProfile();

  renderTracks([], null);
  setTrackCount("No folder selected.");
  setSpeed(Number(elements.speed.value));

  await refreshProfiles();
  await restoreMusicFolder();
  refreshSelectionUi();
}

function bindEvents() {
  elements.profileSelect.addEventListener("change", async (event) => {
    state.currentProfileId = Number(event.target.value);
    state.focusedSectionId = null;
    state.currentPlayingSectionId = null;
    await refreshSections();
  });

  elements.newProfile.addEventListener("click", () => {
    void createProfile();
  });

  elements.pickFolder.addEventListener("click", () => {
    void pickMusicFolder();
  });

  elements.trackSelect.addEventListener("change", (event) => {
    const nextIndex = Number(event.target.value);
    void selectTrackByIndex(nextIndex);
  });

  elements.markA.addEventListener("click", () => {
    setSelectionMarker("start");
  });

  elements.markB.addEventListener("click", () => {
    setSelectionMarker("end");
  });

  elements.saveSection.addEventListener("click", () => {
    void saveSelectionAsSection();
  });

  elements.adaptivePlay.addEventListener("click", () => {
    void playAdaptiveSection();
  });

  elements.speed.addEventListener("input", (event) => {
    setSpeed(Number(event.target.value));
  });

  audio.addEventListener("timeupdate", () => {
    syncWaveformPlaybackPosition();
    void handleAudioBoundary();
  });
  audio.addEventListener("loadedmetadata", syncWaveformPlaybackPosition);
  audio.addEventListener("seeked", syncWaveformPlaybackPosition);
  audio.addEventListener("pause", syncWaveformPlaybackPosition);
  audio.addEventListener("ended", syncWaveformPlaybackPosition);

  window.addEventListener("unload", releaseCurrentTrackUrl);
}

async function ensureDefaultProfile() {
  const profiles = await getAllProfiles();

  if (!profiles.length) {
    await addProfile({ name: DEFAULT_PROFILE_NAME });
  }
}

async function refreshProfiles() {
  const profiles = await getAllProfiles();
  state.profiles = profiles;

  if (!profiles.length) {
    state.currentProfileId = null;
    renderProfiles([], null);
    await refreshSections();
    return;
  }

  if (!profiles.some((profile) => profile.id === state.currentProfileId)) {
    state.currentProfileId = profiles[0].id;
  }

  renderProfiles(profiles, state.currentProfileId);
  await refreshSections();
}

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

async function createProfile() {
  try {
    const name = window.prompt("Profile name?");
    const trimmed = name?.trim();

    if (!trimmed) {
      return;
    }

    const profileId = await addProfile({ name: trimmed });
    state.currentProfileId = profileId;
    await refreshProfiles();
  } catch (error) {
    handleError(error);
  }
}

async function restoreMusicFolder() {
  try {
    const [directoryHandle, folderName, lastTrackName] = await Promise.all([
      getSetting(SETTINGS_KEYS.MUSIC_FOLDER_HANDLE),
      getSetting(SETTINGS_KEYS.MUSIC_FOLDER_NAME),
      getSetting(SETTINGS_KEYS.LAST_TRACK_NAME),
    ]);

    if (!directoryHandle) {
      return;
    }

    state.currentFolderHandle = directoryHandle;
    state.currentFolderName = folderName || directoryHandle.name || null;

    const permissionState = await queryDirectoryPermission(directoryHandle);

    if (permissionState === "granted") {
      await loadTracksFromDirectory(directoryHandle, {
        preferredTrackName: lastTrackName ?? null,
      });
      return;
    }

    showRememberedFolderStatus();
  } catch (error) {
    console.warn("Unable to restore remembered music folder.", error);
    showRememberedFolderStatus();
  }
}

async function pickMusicFolder() {
  try {
    if (!window.showDirectoryPicker) {
      throw new Error("This browser does not support folder selection.");
    }

    if (state.currentFolderHandle && !state.tracks.length) {
      const preferredTrackName = await getSetting(SETTINGS_KEYS.LAST_TRACK_NAME);
      const permissionState = await queryDirectoryPermission(state.currentFolderHandle);

      if (permissionState === "granted") {
        await loadTracksFromDirectory(state.currentFolderHandle, {
          preferredTrackName: preferredTrackName ?? null,
        });
        return;
      }

      const requestedState = await requestDirectoryPermission(state.currentFolderHandle);

      if (requestedState === "granted") {
        await loadTracksFromDirectory(state.currentFolderHandle, {
          preferredTrackName: preferredTrackName ?? null,
        });
        return;
      }
    }

    const previousTrackName =
      state.currentTrack?.name ?? (await getSetting(SETTINGS_KEYS.LAST_TRACK_NAME));
    const directoryHandle = await window.showDirectoryPicker();

    await rememberMusicFolder(directoryHandle);
    await loadTracksFromDirectory(directoryHandle, {
      preferredTrackName: previousTrackName ?? null,
    });
  } catch (error) {
    handleError(error);
  }
}

async function rememberMusicFolder(directoryHandle) {
  state.currentFolderHandle = directoryHandle;
  state.currentFolderName = directoryHandle.name ?? null;

  await Promise.all([
    setSetting(SETTINGS_KEYS.MUSIC_FOLDER_HANDLE, directoryHandle),
    setSetting(SETTINGS_KEYS.MUSIC_FOLDER_NAME, state.currentFolderName),
  ]);
}

async function loadTracksFromDirectory(directoryHandle, { preferredTrackName = null } = {}) {
  const nextTracks = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind !== "file" || !isSupportedAudioFile(name)) {
      continue;
    }

    const file = await handle.getFile();
    nextTracks.push({ name, file });
  }

  nextTracks.sort(compareByName);
  state.tracks = nextTracks;

  renderTracks(state.tracks, null);
  setTrackCount(summarizeTrackCount(nextTracks.length));

  if (!nextTracks.length) {
    clearCurrentTrack();
    return;
  }

  const nextIndex = preferredTrackName
    ? nextTracks.findIndex((track) => track.name === preferredTrackName)
    : 0;

  await selectTrackByIndex(nextIndex >= 0 ? nextIndex : 0);
}

async function queryDirectoryPermission(directoryHandle) {
  if (!directoryHandle?.queryPermission) {
    return "prompt";
  }

  return directoryHandle.queryPermission({ mode: "read" });
}

async function requestDirectoryPermission(directoryHandle) {
  if (!directoryHandle?.requestPermission) {
    return "granted";
  }

  return directoryHandle.requestPermission({ mode: "read" });
}

function showRememberedFolderStatus() {
  const folderName = state.currentFolderName
    ? `Remembered folder: ${state.currentFolderName}.`
    : "Folder remembered.";
  setTrackCount(`${folderName} Click Pick Music Folder to reconnect.`);
}

async function selectTrackByIndex(index, { preserveSelection = false } = {}) {
  const track = state.tracks[index];

  if (!track) {
    return;
  }

  audio.pause();
  state.currentPlayingSectionId = null;
  state.currentTrack = track;

  if (!preserveSelection) {
    state.selection = { start: null, end: null };
    state.focusedSectionId = null;
  }

  renderTracks(state.tracks, track.name);

  await Promise.all([loadAudioFile(track.file), waveform.loadFile(track.file)]);
  waveform.setPlaybackTime(audio.currentTime);
  await setSetting(SETTINGS_KEYS.LAST_TRACK_NAME, track.name);

  refreshSelectionUi();
  renderSectionList();
  refreshMasteryUi();
}

function clearCurrentTrack() {
  audio.pause();
  state.currentPlayingSectionId = null;
  state.currentTrack = null;
  state.selection = { start: null, end: null };
  state.focusedSectionId = null;

  releaseCurrentTrackUrl();
  audio.removeAttribute("src");
  audio.load();

  waveform.clear();
  renderTracks(state.tracks, null);
  refreshSelectionUi();
  renderSectionList();
  refreshMasteryUi();
}

async function loadAudioFile(file) {
  releaseCurrentTrackUrl();

  const objectUrl = URL.createObjectURL(file);
  state.currentTrackUrl = objectUrl;

  await new Promise((resolve, reject) => {
    const onLoadedMetadata = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(audio.error || new Error(`Unable to load audio file "${file.name}".`));
    };

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);

    audio.src = objectUrl;
    audio.load();
  });

  audio.playbackRate = Number(elements.speed.value);
}

function releaseCurrentTrackUrl() {
  if (!state.currentTrackUrl) {
    return;
  }

  URL.revokeObjectURL(state.currentTrackUrl);
  state.currentTrackUrl = null;
}

function setSpeed(value) {
  audio.playbackRate = value;
  setSpeedDisplay(value);
}

function syncWaveformPlaybackPosition() {
  waveform.setPlaybackTime(Number.isFinite(audio.currentTime) ? audio.currentTime : null);
}

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
    syncWaveformPlaybackPosition();
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
    syncWaveformPlaybackPosition();
    return;
  }

  audio.pause();
  audio.currentTime = activeSection.end;
  syncWaveformPlaybackPosition();

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

function handleError(error) {
  if (!error || error.name === "AbortError") {
    return;
  }

  console.error(error);
  window.alert(error.message || "Something went wrong.");
}