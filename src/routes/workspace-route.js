/**
 * @role route-renderer
 * @owns workspace-route markup, route-scoped element lookup, workspace event wiring, and workspace cleanup
 * @not-owns shell chrome, track/section business logic, or persistent global transport
 * @notes This route renders only workspace-owned UI; activities live on the planner route.
 */

import { state } from "../../app/state.js";
import { createWaveform } from "../../shared/waveform.js";

export async function renderWorkspaceRoute({ mountEl, services }) {
  const routeRoot = document.createElement("div");
  routeRoot.className = "route-page workspace-page";
  routeRoot.innerHTML = `
    <section class="card">
      <div class="section-header">
        <div>
          <h2>Workspace</h2>
          <p class="small">
            Load a track, focus a saved section, and practice from the shared transport.
          </p>
        </div>
      </div>

      <div class="row">
        <button type="button" data-workspace-el="pickFolder">Pick Music Folder</button>
        <div class="small" data-workspace-el="trackCount">No folder selected.</div>
      </div>

      <div class="row">
        <label for="workspaceTrackSelect">Track</label>
        <select
          id="workspaceTrackSelect"
          data-workspace-el="trackSelect"
          aria-label="Track"
        ></select>
      </div>

      <div class="row">
        <label for="workspaceSpeed">Speed</label>
        <input
          id="workspaceSpeed"
          data-workspace-el="speed"
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value="${String(state.playbackRate)}"
        />
        <span class="mastery-pill" data-workspace-el="speedVal">${state.playbackRate.toFixed(2)}×</span>

        <label class="checkbox-label" for="workspaceLoopToggle">
          <input
            id="workspaceLoopToggle"
            data-workspace-el="loopToggle"
            type="checkbox"
            ${state.loopEnabled ? "checked" : ""}
          />
          Loop focused section
        </label>
      </div>

      <div class="row">
        <div class="mastery-pill" data-workspace-el="abDisplay">A — • B —</div>
        <div class="mastery-pill">
          Mastery <span data-workspace-el="masteryDisplay">—</span>
        </div>
        <button type="button" data-workspace-el="saveSection">Save Section</button>
      </div>

      <div class="waveform-wrap" data-workspace-el="waveformMount"></div>
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2>Saved Sections</h2>
          <p class="small" data-workspace-el="sectionSummary"></p>
        </div>
      </div>

      <div class="section-list" data-workspace-el="sectionList"></div>
    </section>
  `;

  mountEl.replaceChildren(routeRoot);

  const elements = getWorkspaceElements(routeRoot);
  const waveform = createWaveform({
    mountEl: elements.waveformMount,
    onSelectionChange: (selection) => {
      services.selectionController.handleWaveformSelectionChange(selection);
    },
  });

  const workspace = {
    ...elements,
    waveform,
  };

  const handlePickFolder = () => {
    void services.tracksController.pickMusicFolder();
  };

  const handleTrackChange = (event) => {
    const nextIndex = Number(event.target.value);
    void services.tracksController.selectTrackByIndex(nextIndex);
  };

  const handleSaveSection = () => {
    void services.sectionsController.saveSelectionAsSection();
  };

  const handleSpeedChange = (event) => {
    services.tracksController.setSpeed(Number(event.target.value));
  };

  const handleLoopChange = (event) => {
    state.loopEnabled = Boolean(event.target.checked);
  };

  elements.pickFolder.addEventListener("click", handlePickFolder);
  elements.trackSelect.addEventListener("change", handleTrackChange);
  elements.saveSection.addEventListener("click", handleSaveSection);
  elements.speed.addEventListener("input", handleSpeedChange);
  elements.loopToggle.addEventListener("change", handleLoopChange);

  services.selectionController.attachWorkspace(workspace);
  services.sectionsController.attachWorkspace(workspace);
  await services.tracksController.attachWorkspace(workspace);

  return {
    cleanup() {
      elements.pickFolder.removeEventListener("click", handlePickFolder);
      elements.trackSelect.removeEventListener("change", handleTrackChange);
      elements.saveSection.removeEventListener("click", handleSaveSection);
      elements.speed.removeEventListener("input", handleSpeedChange);
      elements.loopToggle.removeEventListener("change", handleLoopChange);

      services.tracksController.detachWorkspace();
      services.sectionsController.detachWorkspace();
      services.selectionController.detachWorkspace();
      waveform.destroy();
    },
  };
}

export function getWorkspaceElements(routeRoot) {
  return {
    pickFolder: getRequiredElement(routeRoot, "pickFolder"),
    trackSelect: getRequiredElement(routeRoot, "trackSelect"),
    trackCount: getRequiredElement(routeRoot, "trackCount"),
    speed: getRequiredElement(routeRoot, "speed"),
    speedVal: getRequiredElement(routeRoot, "speedVal"),
    loopToggle: getRequiredElement(routeRoot, "loopToggle"),
    abDisplay: getRequiredElement(routeRoot, "abDisplay"),
    masteryDisplay: getRequiredElement(routeRoot, "masteryDisplay"),
    saveSection: getRequiredElement(routeRoot, "saveSection"),
    waveformMount: getRequiredElement(routeRoot, "waveformMount"),
    sectionSummary: getRequiredElement(routeRoot, "sectionSummary"),
    sectionList: getRequiredElement(routeRoot, "sectionList"),
  };
}

function getRequiredElement(routeRoot, name) {
  const element = routeRoot.querySelector(`[data-workspace-el="${name}"]`);

  if (!element) {
    throw new Error(`Missing workspace element: ${name}`);
  }

  return element;
}