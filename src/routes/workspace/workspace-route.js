/**
 * @role route-renderer
 * @owns workspace-route markup, route-scoped element lookup, workspace event wiring, and workspace cleanup
 * @not-owns shell chrome, track/section business logic, or shell-level playback UI
 * @notes This route renders workspace-owned source selection, waveform-player playback, and contextual activity creation shortcuts without showing the full activity library.
 */

import { state } from "../../app/state.js";
import { createWaveformPlayer } from "../../shared/waveform.js";

export async function renderWorkspaceRoute({ mountEl, services }) {
  const routeRoot = document.createElement("div");
  routeRoot.className = "route-page workspace-page";
  routeRoot.innerHTML = `
    <section class="card">
      <div class="section-header">
        <div>
          <h2>Workspace</h2>
          <p class="small">
            Load a track, focus a saved section, and practice directly from the waveform player.
          </p>
        </div>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="card workspace-main-card">
        <div class="panel-block">
          <div class="section-header section-header-compact">
            <div>
              <h2>Track Setup</h2>
              <p class="small">Choose a folder and select a track.</p>
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
        </div>

        <div class="panel-block">
          <div class="section-header section-header-compact">
            <div>
              <h2>Waveform Player</h2>
              <p class="small">Click to seek, drag to mark A/B, and control playback here.</p>
            </div>
          </div>

          <div data-workspace-el="playerMount"></div>
        </div>

        <div class="panel-block">
          <div class="section-header section-header-compact">
            <div>
              <h2>Selection & Sections</h2>
              <p class="small">Review mastery and save the current waveform selection.</p>
            </div>
          </div>

          <div class="row">
            <div class="mastery-pill">
              Mastery <span data-workspace-el="masteryDisplay">—</span>
            </div>
            <button type="button" data-workspace-el="saveSection">Save Section</button>
          </div>
        </div>
      </section>

      <div class="sidebar-stack">
        <section class="card">
          <div class="section-header">
            <div>
              <h2>Activity Shortcuts</h2>
              <p class="small">
                Create reusable activities from the current workspace context without opening the library.
              </p>
            </div>
          </div>

          <div class="planner-summary-bar">
            <div class="small" data-workspace-el="activityContextSummary"></div>
          </div>

          <div class="section-actions">
            <button type="button" class="secondary" data-workspace-el="createTrackActivity">
              Create from Track
            </button>
            <button type="button" class="secondary" data-workspace-el="createSectionActivity">
              Create from Section
            </button>
          </div>
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
      </div>
    </div>
  `;

  mountEl.replaceChildren(routeRoot);

  const elements = getWorkspaceElements(routeRoot);
  const player = createWaveformPlayer({
    mountEl: elements.playerMount,
    initialPlaybackRate: state.playbackRate,
    initialLoopEnabled: state.loopEnabled,
    onSelectionChange: (selection) => {
      services.selectionController.handleWaveformSelectionChange(selection);
    },
    onPlaybackRateChange: (value) => {
      services.tracksController.setSpeed(value);
    },
    onLoopChange: (enabled) => {
      state.loopEnabled = enabled;
    },
    onPlaybackBoundsComplete: () => {
      void services.sectionsController.handlePlaybackBoundsComplete();
    },
  });

  const workspace = {
    ...elements,
    player,
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

  const handleCreateTrackActivity = () => {
    void services.activitiesController.createTrackActivityFromCurrentTrack();
  };

  const handleCreateSectionActivity = () => {
    void services.activitiesController.createSectionActivityFromFocusedSection();
  };

  elements.pickFolder.addEventListener("click", handlePickFolder);
  elements.trackSelect.addEventListener("change", handleTrackChange);
  elements.saveSection.addEventListener("click", handleSaveSection);
  elements.createTrackActivity.addEventListener("click", handleCreateTrackActivity);
  elements.createSectionActivity.addEventListener("click", handleCreateSectionActivity);

  services.selectionController.attachWorkspace(workspace);
  services.sectionsController.attachWorkspace(workspace);
  await services.tracksController.attachWorkspace(workspace);
  services.activitiesController.attachWorkspace(workspace);

  return {
    cleanup() {
      elements.pickFolder.removeEventListener("click", handlePickFolder);
      elements.trackSelect.removeEventListener("change", handleTrackChange);
      elements.saveSection.removeEventListener("click", handleSaveSection);
      elements.createTrackActivity.removeEventListener("click", handleCreateTrackActivity);
      elements.createSectionActivity.removeEventListener("click", handleCreateSectionActivity);

      services.activitiesController.detachWorkspace();
      services.tracksController.detachWorkspace();
      services.sectionsController.detachWorkspace();
      services.selectionController.detachWorkspace();
      player.destroy();
    },
  };
}

export function getWorkspaceElements(routeRoot) {
  return {
    pickFolder: getRequiredElement(routeRoot, "pickFolder"),
    trackSelect: getRequiredElement(routeRoot, "trackSelect"),
    trackCount: getRequiredElement(routeRoot, "trackCount"),
    masteryDisplay: getRequiredElement(routeRoot, "masteryDisplay"),
    saveSection: getRequiredElement(routeRoot, "saveSection"),
    activityContextSummary: getRequiredElement(routeRoot, "activityContextSummary"),
    createTrackActivity: getRequiredElement(routeRoot, "createTrackActivity"),
    createSectionActivity: getRequiredElement(routeRoot, "createSectionActivity"),
    playerMount: getRequiredElement(routeRoot, "playerMount"),
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