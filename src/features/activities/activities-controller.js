/**
 * @role controller
 * @owns reusable-activity state refresh, CRUD orchestration, planner library rendering, workspace activity shortcut rendering, and activity launch-to-workspace behavior
 * @not-owns track/section internals, plan persistence, or low-level IndexedDB helpers
 * @notes Keep this controller focused on activity CRUD, planner-library refresh, workspace shortcut state, and workspace launch flows.
 */

import { state } from "../../app/state.js";
import {
  addActivity,
  deleteActivity,
  getActivitiesByProfile,
  updateActivity,
} from "../../persistence/activity-store.js";
import { ACTIVITY_TARGET_TYPES } from "../../shared/constants.js";
import { showConfirm, showPrompt } from "../../shared/dialog.js";
import { createSectionLabel } from "../../shared/utils.js";
import { renderActivities } from "./activities-ui.js";

const VALID_TARGET_TYPES = new Set(Object.values(ACTIVITY_TARGET_TYPES));

export function createActivitiesController({
  selectTrackByIndex,
  cueSectionById,
  navigateToWorkspace,
  addActivityToCurrentPlan,
  renderPlanList,
  handleError,
} = {}) {
  let planner = null;
  let workspace = null;

  function attachPlanner(nextPlanner) {
    planner = nextPlanner;
    renderActivityList();
  }

  function detachPlanner() {
    planner = null;
  }

  function attachWorkspace(nextWorkspace) {
    workspace = nextWorkspace;
    renderWorkspaceActions();
  }

  function detachWorkspace() {
    workspace = null;
  }

  async function refreshActivities() {
    if (!state.currentProfileId) {
      state.activities = [];
      state.selectedActivityId = null;
      renderActivityList();
      renderPlanList?.();
      renderWorkspaceActions();
      return [];
    }

    const activities = await getActivitiesByProfile(state.currentProfileId);
    state.activities = [...activities].sort(sortActivities);

    if (!state.activities.some((activity) => activity.id === state.selectedActivityId)) {
      state.selectedActivityId = null;
    }

    renderActivityList();
    renderPlanList?.();
    renderWorkspaceActions();
    return state.activities;
  }

  function renderActivityList() {
    if (!planner) {
      return;
    }

    const sectionsById = new Map(state.allSections.map((section) => [section.id, section]));

    renderActivities({
      elements: planner,
      currentProfileId: state.currentProfileId,
      activities: state.activities,
      selectedActivityId: state.selectedActivityId,
      tracks: state.tracks,
      sectionsById,
      onUse: (activityId) => {
        void activateActivity(activityId);
      },
      onDelete: (activityId) => {
        void removeActivity(activityId);
      },
      onAddToPlan: addActivityToCurrentPlan
        ? (activityId) => {
            void addActivityToCurrentPlan(activityId);
          }
        : null,
    });
  }

  function renderWorkspaceActions() {
    if (!workspace) {
      return;
    }

    const currentSection = getFocusedSection();
    const hasProfile = Boolean(state.currentProfileId);
    const hasTrack = Boolean(state.currentTrack);

    workspace.activityContextSummary.textContent = getWorkspaceActivitySummary({
      hasProfile,
      hasTrack,
      currentSection,
    });

    workspace.createTrackActivity.disabled = !hasProfile || !hasTrack;
    workspace.createSectionActivity.disabled = !hasProfile || !currentSection;
  }

  async function createActivity(input) {
    try {
      ensureActiveProfile();
      validateActivityInput(input);

      const activityId = await addActivity({
        profileId: state.currentProfileId,
        name: input.name.trim(),
        targetType: input.targetType,
        trackName: input.trackName ?? null,
        sectionId: input.sectionId ?? null,
        customReference: input.customReference?.trim() ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await refreshActivities();
      state.selectedActivityId = activityId;
      renderActivityList();
      renderPlanList?.();
      return activityId;
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function saveActivity(activity) {
    try {
      ensureActiveProfile();
      validateActivityInput(activity);

      await updateActivity({
        ...activity,
        updatedAt: Date.now(),
      });

      await refreshActivities();
    } catch (error) {
      handleError?.(error);
    }
  }

  async function createTrackActivityFromCurrentTrack() {
    try {
      ensureActiveProfile();

      if (!state.currentTrack) {
        throw new Error("Pick a track first.");
      }

      const name = await showPrompt("Activity name:", {
        title: "Create Track Activity",
        defaultValue: state.currentTrack.name,
      });
      const trimmed = name?.trim();

      if (!trimmed) {
        return null;
      }

      return createActivity({
        name: trimmed,
        targetType: ACTIVITY_TARGET_TYPES.TRACK,
        trackName: state.currentTrack.name,
      });
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function createSectionActivityFromFocusedSection() {
    try {
      ensureActiveProfile();

      const section = getFocusedSection();

      if (!section) {
        throw new Error("Select a saved section first.");
      }

      const defaultName = `${section.trackName} ${createSectionLabel(section)}`;
      const name = await showPrompt("Activity name:", {
        title: "Create Section Activity",
        defaultValue: defaultName,
      });
      const trimmed = name?.trim();

      if (!trimmed) {
        return null;
      }

      return createActivity({
        name: trimmed,
        targetType: ACTIVITY_TARGET_TYPES.SECTION,
        sectionId: section.id,
      });
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function createCustomActivity() {
    try {
      ensureActiveProfile();

      const name = await showPrompt("Activity name:", { title: "Add Custom Activity" });
      const trimmed = name?.trim();

      if (!trimmed) {
        return null;
      }

      const customReference = await showPrompt("Custom reference:", {
        title: "Add Custom Activity",
        placeholder: "e.g. Scales in D major, Bow exercises",
      });
      const trimmedRef = customReference?.trim();

      if (!trimmedRef) {
        return null;
      }

      return createActivity({
        name: trimmed,
        targetType: ACTIVITY_TARGET_TYPES.CUSTOM,
        customReference: trimmedRef,
      });
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function activateActivity(activityId) {
    try {
      const activity = state.activities.find((item) => item.id === activityId);

      if (!activity) {
        return;
      }

      state.selectedActivityId = activity.id;
      renderActivityList();
      renderPlanList?.();

      if (activity.targetType === ACTIVITY_TARGET_TYPES.CUSTOM) {
        throw new Error("This activity is a custom reference and is not directly playable.");
      }

      await navigateToWorkspace?.();

      if (activity.targetType === ACTIVITY_TARGET_TYPES.TRACK) {
        const trackIndex = state.tracks.findIndex((track) => track.name === activity.trackName);

        if (trackIndex === -1) {
          throw new Error(
            `Track "${activity.trackName}" is not available in the currently selected folder.`,
          );
        }

        await selectTrackByIndex(trackIndex, { cueAtTime: 0 });
        return;
      }

      if (activity.targetType === ACTIVITY_TARGET_TYPES.SECTION) {
        const section = state.allSections.find((item) => item.id === activity.sectionId);

        if (!section) {
          throw new Error("This activity references a saved section that no longer exists.");
        }

        const prepared = await cueSectionById(section.id);

        if (!prepared) {
          return;
        }

        return;
      }
    } catch (error) {
      handleError?.(error);
    }
  }

  async function removeActivity(activityId) {
    try {
      const activity = state.activities.find((item) => item.id === activityId);

      if (!activity) {
        return;
      }

      const confirmed = await showConfirm(`Delete activity "${activity.name}"?`, {
        title: "Delete Activity",
        confirmLabel: "Delete",
      });

      if (!confirmed) {
        return;
      }

      await deleteActivity(activityId);

      if (state.selectedActivityId === activityId) {
        state.selectedActivityId = null;
      }

      await refreshActivities();
    } catch (error) {
      handleError(error);
    }
  }

  return {
    attachPlanner,
    detachPlanner,
    attachWorkspace,
    detachWorkspace,
    refreshActivities,
    renderActivityList,
    renderWorkspaceActions,
    createActivity,
    saveActivity,
    createTrackActivityFromCurrentTrack,
    createSectionActivityFromFocusedSection,
    createCustomActivity,
    activateActivity,
    removeActivity,
  };
}

function ensureActiveProfile() {
  if (!state.currentProfileId) {
    throw new Error("Select a profile first.");
  }
}

function getFocusedSection() {
  const targetSectionId = state.currentPlayingSectionId ?? state.focusedSectionId;

  if (targetSectionId == null) {
    return null;
  }

  return state.allSections.find((section) => section.id === targetSectionId) ?? null;
}

function getWorkspaceActivitySummary({ hasProfile, hasTrack, currentSection }) {
  if (!hasProfile) {
    return "Select a profile to create activities from the current workspace context.";
  }

  if (!hasTrack) {
    return "Pick a track to create a track activity.";
  }

  if (currentSection) {
    return `Ready to create from ${state.currentTrack.name} or ${createSectionLabel(currentSection)}.`;
  }

  return `Ready to create from ${state.currentTrack.name}. Focus a saved section to enable section activity creation.`;
}

function validateActivityInput(input) {
  if (!input?.name?.trim()) {
    throw new Error("Activity name is required.");
  }

  if (!VALID_TARGET_TYPES.has(input.targetType)) {
    throw new Error("Activity target type is invalid.");
  }

  if (input.targetType === ACTIVITY_TARGET_TYPES.TRACK && !input.trackName) {
    throw new Error("Track activities require a track.");
  }

  if (input.targetType === ACTIVITY_TARGET_TYPES.SECTION && !input.sectionId) {
    throw new Error("Section activities require a saved section.");
  }

  if (input.targetType === ACTIVITY_TARGET_TYPES.CUSTOM && !input.customReference?.trim()) {
    throw new Error("Custom activities require a reference.");
  }
}

function sortActivities(a, b) {
  return (
    (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    a.id - b.id
  );
}