/**
 * @role controller
 * @owns folder picking, remembered-folder restore/reconnect, track enumeration, track selection, route-local player loading, and playback-rate persistence
 * @not-owns section CRUD, activity CRUD, plan CRUD, profile management, or waveform-player rendering internals
 * @notes Keep folder persistence delegated to music-folder-store.js.
 */

import { state } from "../../app/state.js";
import { compareByName, isSupportedAudioFile, summarizeTrackCount } from "../../shared/utils.js";
import { renderTracks, setTrackCount } from "./tracks-ui.js";
import {
  getRememberedMusicFolder,
  rememberLastTrackName,
  rememberMusicFolder,
} from "./music-folder-store.js";

export function createTracksController({
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

    workspace.player.setPlaybackRate(state.playbackRate);
    workspace.player.setLoopEnabled(state.loopEnabled);

    if (state.currentTrack) {
      await workspace.player.loadFile(state.currentTrack.file);

      if (state.currentPlayingSectionId) {
        const activeSection = state.allSections.find(
          (section) => section.id === state.currentPlayingSectionId,
        );

        if (activeSection) {
          workspace.player.seek(activeSection.start);
        }
      }
    } else {
      workspace.player.clear();
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

    state.currentPlayingSectionId = null;
    state.currentTrack = track;

    if (!preserveSelection) {
      state.selection = { start: null, end: null };
      state.focusedSectionId = null;
    }

    renderWorkspaceUi();

    if (workspace?.player) {
      await workspace.player.loadFile(track.file);

      if (Number.isFinite(cueAtTime)) {
        workspace.player.seek(Math.max(0, cueAtTime));
      }
    }

    await rememberLastTrackName(track.name);

    refreshSelectionUi();
    renderSectionList();
    refreshMasteryUi();
    renderActivityList();
    renderPlanList();
  }

  function clearCurrentTrack() {
    state.currentPlayingSectionId = null;
    state.currentTrack = null;
    state.selection = { start: null, end: null };
    state.focusedSectionId = null;

    if (workspace?.player) {
      workspace.player.clear();
    }

    renderWorkspaceUi();
    refreshSelectionUi();
    renderSectionList();
    refreshMasteryUi();
    renderActivityList();
    renderPlanList();
  }

  function setSpeed(value) {
    state.playbackRate = value;

    if (workspace?.player) {
      workspace.player.setPlaybackRate(value);
    }
  }

  function renderWorkspaceUi() {
    if (!workspace) {
      return;
    }

    renderTracks(workspace, state.tracks, state.currentTrack?.name ?? null);
    setTrackCount(workspace, state.trackStatusText);
    renderWorkspaceActivityActions?.();
  }

  return {
    attachWorkspace,
    detachWorkspace,
    restoreRememberedFolder,
    pickMusicFolder,
    selectTrackByIndex,
    clearCurrentTrack,
    setSpeed,
  };
}