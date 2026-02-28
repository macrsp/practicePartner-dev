import { state } from "./state.js";
import { elements, renderTracks, setSpeedDisplay, setTrackCount } from "./ui.js";
import { compareByName, isSupportedAudioFile, summarizeTrackCount } from "./utils.js";

export function createTracksController({
  audio,
  waveform,
  refreshSelectionUi,
  renderSectionList,
  refreshMasteryUi,
  handleError,
}) {
  async function pickMusicFolder() {
    try {
      if (!window.showDirectoryPicker) {
        throw new Error("This browser does not support folder selection.");
      }

      const previousTrackName = state.currentTrack?.name ?? null;
      const directoryHandle = await window.showDirectoryPicker();
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

      const nextIndex = previousTrackName
        ? nextTracks.findIndex((track) => track.name === previousTrackName)
        : 0;

      await selectTrackByIndex(nextIndex >= 0 ? nextIndex : 0);
    } catch (error) {
      handleError(error);
    }
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

  return {
    pickMusicFolder,
    selectTrackByIndex,
    clearCurrentTrack,
    releaseCurrentTrackUrl,
    setSpeed,
  };
}