/**
 * @role composition-root
 * @owns app bootstrap, controller composition, DOM event wiring, and global error handling
 * @not-owns business logic for profiles, tracks, sections, activities, or persistence
 * @notes Keep this file thin; push feature logic into dedicated modules.
 */

import { openDatabase } from "../persistence/db.js";
import { createRouter } from "./router.js";
import { elements } from "../shared/shell-ui.js";
import { renderTracks, setTrackCount } from "../features/tracks/tracks-ui.js";
import { createProfilesController } from "../features/profiles/profiles-controller.js";
import { createSectionsController } from "../features/sections/sections-controller.js";
import { createSelectionController } from "../features/sections/selection-controller.js";
import { createTracksController } from "../features/tracks/tracks-controller.js";
import { createWaveform } from "../shared/waveform.js";

const audio = elements.audio;

let selectionController;
let sectionsController;
let tracksController;

createRouter();

const waveform = createWaveform({
  mountEl: elements.waveformMount,
  onSelectionChange: (selection) => {
    selectionController.handleWaveformSelectionChange(selection);
  },
});

selectionController = createSelectionController({
  waveform,
  renderSectionList: () => sectionsController.renderSectionList(),
});

tracksController = createTracksController({
  audio,
  waveform,
  refreshSelectionUi: () => selectionController.refreshSelectionUi(),
  renderSectionList: () => sectionsController.renderSectionList(),
  refreshMasteryUi: () => selectionController.refreshMasteryUi(),
  handleError,
});

sectionsController = createSectionsController({
  audio,
  selectTrackByIndex: (...args) => tracksController.selectTrackByIndex(...args),
  refreshSelectionUi: () => selectionController.refreshSelectionUi(),
  refreshMasteryUi: () => selectionController.refreshMasteryUi(),
  syncPlaybackUi: () => tracksController.syncWaveformPlaybackPosition(),
  handleError,
});

const profilesController = createProfilesController({
  refreshSections: () => sectionsController.refreshSections(),
  handleError,
});

bindEvents();
bootstrap().catch(handleError);

async function bootstrap() {
  await openDatabase();
  await profilesController.ensureDefaultProfile();

  renderTracks([], null);
  setTrackCount("No folder selected.");
  tracksController.setSpeed(Number(elements.speed.value));

  await profilesController.refreshProfiles();
  await tracksController.restoreRememberedFolder();
  selectionController.refreshSelectionUi();
}

function bindEvents() {
  elements.profileSelect.addEventListener("change", async (event) => {
    profilesController.setCurrentProfileId(Number(event.target.value));
    await sectionsController.refreshSections();
  });

  elements.newProfile.addEventListener("click", () => {
    void profilesController.createProfile();
  });

  elements.pickFolder.addEventListener("click", () => {
    void tracksController.pickMusicFolder();
  });

  elements.trackSelect.addEventListener("change", (event) => {
    const nextIndex = Number(event.target.value);
    void tracksController.selectTrackByIndex(nextIndex);
  });

  elements.saveSection.addEventListener("click", () => {
    void sectionsController.saveSelectionAsSection();
  });

  elements.adaptivePlay.addEventListener("click", () => {
    void sectionsController.playAdaptiveSection();
  });

  elements.speed.addEventListener("input", (event) => {
    tracksController.setSpeed(Number(event.target.value));
  });

  audio.addEventListener("timeupdate", () => {
    tracksController.syncWaveformPlaybackPosition();
    void sectionsController.handleAudioBoundary();
  });

  audio.addEventListener("loadedmetadata", () => {
    tracksController.syncWaveformPlaybackPosition();
  });

  audio.addEventListener("seeked", () => {
    tracksController.syncWaveformPlaybackPosition();
  });

  audio.addEventListener("pause", () => {
    tracksController.syncWaveformPlaybackPosition();
  });

  audio.addEventListener("ended", () => {
    tracksController.syncWaveformPlaybackPosition();
  });

  window.addEventListener("unload", () => {
    tracksController.releaseCurrentTrackUrl();
  });
}

function handleError(error) {
  if (!error || error.name === "AbortError") {
    return;
  }

  console.error(error);
  window.alert(error.message || "Something went wrong.");
}