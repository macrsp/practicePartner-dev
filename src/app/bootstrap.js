/**
 * @role composition-root
 * @owns app bootstrap, shared-service composition, shell event wiring, router initialization, and global error handling
 * @not-owns route markup, feature business logic, or per-route DOM lookup
 * @notes Keep this file thin; route modules own route DOM and route-local listeners.
 */

import { openDatabase } from "../persistence/db.js";
import { showAlert } from "../shared/dialog.js";
import { getShellElements, setActiveShellRoute } from "../shared/shell-ui.js";
import { createActivitiesController } from "../features/activities/activities-controller.js";
import { createPlansController } from "../features/plans/plans-controller.js";
import { createProfilesController } from "../features/profiles/profiles-controller.js";
import { createSectionsController } from "../features/sections/sections-controller.js";
import { createSelectionController } from "../features/sections/selection-controller.js";
import { createTracksController } from "../features/tracks/tracks-controller.js";
import { createRouter, ROUTES } from "./router.js";
import { renderWorkspaceRoute } from "../routes/workspace/workspace-route.js";
import { renderPlannerRoute } from "../routes/planner/planner-route.js";

const shell = getShellElements();
const audio = shell.audio;

let router;
let sectionsController;
let activitiesController;
let plansController;

const selectionController = createSelectionController({
  renderSectionList: () => sectionsController.renderSectionList(),
});

const tracksController = createTracksController({
  audio,
  refreshSelectionUi: () => selectionController.refreshSelectionUi(),
  renderSectionList: () => sectionsController.renderSectionList(),
  refreshMasteryUi: () => selectionController.refreshMasteryUi(),
  renderActivityList: () => activitiesController.renderActivityList(),
  renderPlanList: () => plansController.renderPlanList(),
  handleError,
});

sectionsController = createSectionsController({
  audio,
  selectTrackByIndex: (...args) => tracksController.selectTrackByIndex(...args),
  refreshSelectionUi: () => selectionController.refreshSelectionUi(),
  refreshMasteryUi: () => selectionController.refreshMasteryUi(),
  syncPlaybackUi: () => tracksController.syncWaveformPlaybackPosition(),
  renderActivityList: () => activitiesController.renderActivityList(),
  renderPlanList: () => plansController.renderPlanList(),
  handleError,
});

activitiesController = createActivitiesController({
  selectTrackByIndex: (...args) => tracksController.selectTrackByIndex(...args),
  cueSectionById: (...args) => sectionsController.cueSectionById(...args),
  navigateToWorkspace: () => router?.navigate(ROUTES.WORKSPACE),
  addActivityToCurrentPlan: (...args) => plansController.addActivityToCurrentPlan(...args),
  renderPlanList: () => plansController.renderPlanList(),
  handleError,
});

plansController = createPlansController({
  activateActivity: (...args) => activitiesController.activateActivity(...args),
  handleError,
});

const profilesController = createProfilesController({
  profileSelect: shell.profileSelect,
  refreshSections: () => sectionsController.refreshSections(),
  refreshActivities: () => activitiesController.refreshActivities(),
  refreshPlans: () => plansController.refreshPlans(),
  handleError,
});

const services = {
  audio,
  shell,
  selectionController,
  tracksController,
  sectionsController,
  activitiesController,
  plansController,
};

router = createRouter({
  routeMount: shell.routeMount,
  routes: {
    [ROUTES.WORKSPACE]: (context) =>
      renderWorkspaceRoute({
        ...context,
        services,
      }),
    [ROUTES.PLANNER]: (context) =>
      renderPlannerRoute({
        ...context,
        services,
      }),
  },
  onRouteChange: (route) => {
    setActiveShellRoute(shell, route);
  },
});

bindShellEvents();
bootstrap().catch(handleError);

async function bootstrap() {
  await openDatabase();
  await profilesController.ensureDefaultProfile();
  await profilesController.refreshProfiles();
  await tracksController.restoreRememberedFolder();
  await router.renderCurrentRoute();
}

function bindShellEvents() {
  shell.workspaceNav.addEventListener("click", () => {
    void router.navigate(ROUTES.WORKSPACE);
  });

  shell.plannerNav.addEventListener("click", () => {
    void router.navigate(ROUTES.PLANNER);
  });

  shell.profileSelect.addEventListener("change", async (event) => {
    profilesController.setCurrentProfileId(Number(event.target.value));
    await profilesController.refreshProfiles();
  });

  shell.newProfile.addEventListener("click", () => {
    void profilesController.createProfile();
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
    router.destroy();
  });
}

async function handleError(error) {
  if (!error || error.name === "AbortError") {
    return;
  }

  console.error(error);
  await showAlert(error.message || "Something went wrong.");
}