/**
 * @role controller
 * @owns folder picking, remembered-folder restore/reconnect, track enumeration, track selection, audio source loading, playback-rate updates, and waveform playback sync
 * @not-owns section CRUD, profile management, or low-level IndexedDB helpers
 * @notes Keep folder persistence delegated to music-folder-store.js.
 */

import { state } from "../../app/state.js";
import { elements } from "../../shared/shell-ui.js";
import { compareByName, isSupportedAudioFile, summarizeTrackCount } from "../../shared/utils.js";
import { renderTracks, setSpeedDisplay, setTrackCount } from "./tracks-ui.js";
import {
  getRememberedMusicFolder,
  rememberLastTrackName,
  rememberMusicFolder,
} from "./music-folder-store.js";

export function createTracksController({
  audio,
  waveform,
  refreshSelectionUi,
  renderSectionList,
  refreshMasteryUi,
  handleError,
}) {
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
      setTrackCount("No folder selected.");
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
    await rememberLastTrackName(track.name);
    syncWaveformPlaybackPosition();

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

  return {
    restoreRememberedFolder,
    pickMusicFolder,
    selectTrackByIndex,
    clearCurrentTrack,
    releaseCurrentTrackUrl,
    setSpeed,
    syncWaveformPlaybackPosition,
  };
}