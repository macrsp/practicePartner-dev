/**
 * @role controller
 * @owns folder picking, remembered-folder restore/reconnect, track enumeration, track selection, audio source loading, playback-rate updates, and waveform playback sync
 * @not-owns section CRUD, activity CRUD, plan CRUD, profile management, or low-level IndexedDB helpers
 * @notes Keep folder persistence delegated to music-folder-store.js.
 */

import { state } from "../../app/state.js";
import { compareByName, isSupportedAudioFile, summarizeTrackCount } from "../../shared/utils.js";
import { renderTracks, setSpeedDisplay, setTrackCount } from "./tracks-ui.js";
import {
  getRememberedMusicFolder,
  rememberLastTrackName,
  rememberMusicFolder,
} from "./music-folder-store.js";

export function createTracksController({
  audio,
  refreshSelectionUi,
  renderSectionList,
  refreshMasteryUi,
  renderActivityList,
  renderPlanList,
  renderWorkspaceActivityActions,
  handleError,
}) {
  let workspace = null;

  async function attachWorkspace(nextWorkspace) {
    workspace = nextWorkspace;
    renderWorkspaceUi();

    if (state.currentTrack && workspace?.waveform) {
      await workspace.waveform.loadFile(state.currentTrack.file);
      syncWaveformPlaybackPosition();
    } else if (workspace?.waveform) {
      workspace.waveform.clear();
    }
  }

  function detachWorkspace() {
    workspace = null;
  }

  async function restoreRememberedFolder() {
    try {
      const remembered = await getRememberedMusicFolder();

      if (!remembered.handle) {
        return;
      }

      state.currentFolderHandle = remembered.handle;
      state.currentFolderName = remembered.name || remembered.handle.name || null;

      const permissionState = await queryDirectoryPermission(remembered.handle);

      if (permissionState === "granted") {
        await loadTracksFromDirectory(remembered.handle, {
          preferredTrackName: remembered.lastTrackName,
        });
        return;
      }

      showRememberedFolderStatus();
    } catch (error) {
      console.warn("Unable to restore remembered music folder.", error);
      state.trackStatusText = "No folder selected.";
      renderWorkspaceUi();
    }
  }

  async function pickMusicFolder() {
    try {
      if (!window.showDirectoryPicker) {
        throw new Error("This browser does not support folder selection.");
      }

      const remembered = await getRememberedMusicFolder();

      if (state.currentFolderHandle && !state.tracks.length) {
        const permissionState = await queryDirectoryPermission(state.currentFolderHandle);

        if (permissionState === "granted") {
          await loadTracksFromDirectory(state.currentFolderHandle, {
            preferredTrackName: remembered.lastTrackName,
          });
          return;
        }

        const requestedState = await requestDirectoryPermission(state.currentFolderHandle);

        if (requestedState === "granted") {
          await loadTracksFromDirectory(state.currentFolderHandle, {
            preferredTrackName: remembered.lastTrackName,
          });
          return;
        }
      }

      const previousTrackName = state.currentTrack?.name ?? remembered.lastTrackName ?? null;
      const directoryHandle = await window.showDirectoryPicker();

      await rememberSelectedMusicFolder(directoryHandle);
      await loadTracksFromDirectory(directoryHandle, {
        preferredTrackName: previousTrackName,
      });
    } catch (error) {
      handleError(error);
    }
  }

  async function rememberSelectedMusicFolder(directoryHandle) {
    state.currentFolderHandle = directoryHandle;
    state.currentFolderName = directoryHandle.name ?? null;
    await rememberMusicFolder(directoryHandle);
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
    state.trackStatusText = summarizeTrackCount(nextTracks.length);

    renderWorkspaceUi();
    renderActivityList();
    renderPlanList();

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
    state.trackStatusText = `${folderName} Click Pick Music Folder to reconnect.`;
    renderWorkspaceUi();
  }

  async function selectTrackByIndex(index, { preserveSelection = false, cueAtTime = null } = {}) {
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

    renderWorkspaceUi();

    await loadAudioFile(track.file);

    if (workspace?.waveform) {
      await workspace.waveform.loadFile(track.file);
    }

    await rememberLastTrackName(track.name);

    if (Number.isFinite(cueAtTime)) {
      audio.currentTime = Math.max(0, cueAtTime);
    }

    syncWaveformPlaybackPosition();
    refreshSelectionUi();
    renderSectionList();
    refreshMasteryUi();
    renderActivityList();
    renderPlanList();
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

    if (workspace?.waveform) {
      workspace.waveform.clear();
    }

    renderWorkspaceUi();
    refreshSelectionUi();
    renderSectionList();
    refreshMasteryUi();
    renderActivityList();
    renderPlanList();
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

    audio.playbackRate = state.playbackRate;
  }

  function releaseCurrentTrackUrl() {
    if (!state.currentTrackUrl) {
      return;
    }

    URL.revokeObjectURL(state.currentTrackUrl);
    state.currentTrackUrl = null;
  }

  function setSpeed(value) {
    state.playbackRate = value;
    audio.playbackRate = value;

    if (workspace) {
      workspace.speed.value = String(value);
      setSpeedDisplay(workspace, value);
    }
  }

  function syncWaveformPlaybackPosition() {
    if (!workspace?.waveform) {
      return;
    }

    workspace.waveform.setPlaybackTime(Number.isFinite(audio.currentTime) ? audio.currentTime : null);
  }

  function renderWorkspaceUi() {
    if (!workspace) {
      return;
    }

    renderTracks(workspace, state.tracks, state.currentTrack?.name ?? null);
    setTrackCount(workspace, state.trackStatusText);
    workspace.speed.value = String(state.playbackRate);
    setSpeedDisplay(workspace, state.playbackRate);
    renderWorkspaceActivityActions?.();
  }

  return {
    attachWorkspace,
    detachWorkspace,
    restoreRememberedFolder,
    pickMusicFolder,
    selectTrackByIndex,
    clearCurrentTrack,
    releaseCurrentTrackUrl,
    setSpeed,
    syncWaveformPlaybackPosition,
  };
}