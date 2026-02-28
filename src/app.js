import { openDatabase } from "./db.js";
import { elements, renderTracks, setTrackCount } from "./ui.js";
import { createProfilesController } from "./profiles-controller.js";
import { createSectionsController } from "./sections-controller.js";
import { createSelectionController } from "./selection-controller.js";
import { createTracksController } from "./tracks-controller.js";
import { createWaveform } from "./waveform.js";

const audio = elements.audio;

let selectionController;
let sectionsController;
let tracksController;

const waveform = createWaveform({
  mountEl: elements.waveformMount,
  onSelectionChange: (selection) => {
    selectionController.handleWaveformSelectionChange(selection);
  },
});

selectionController = createSelectionController({
  audio,
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

  elements.markA.addEventListener("click", () => {
    selectionController.setSelectionMarker("start");
  });

  elements.markB.addEventListener("click", () => {
    selectionController.setSelectionMarker("end");
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
    void sectionsController.handleAudioBoundary();
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