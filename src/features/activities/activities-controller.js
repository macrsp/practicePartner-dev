/**
 * @role controller
 * @owns reusable-activity state refresh and CRUD orchestration
 * @not-owns Today list ordering, practice-mode execution, or DOM rendering
 * @notes This controller is scaffolded so later feature work can land without another structural move.
 */

import { state } from "../../app/state.js";
import {
  addActivity,
  deleteActivity,
  getActivitiesByProfile,
  updateActivity,
} from "../../persistence/activity-store.js";
import { ACTIVITY_TARGET_TYPES } from "../../shared/constants.js";

const VALID_TARGET_TYPES = new Set(Object.values(ACTIVITY_TARGET_TYPES));

export function createActivitiesController({ handleError } = {}) {
  async function refreshActivities() {
    if (!state.currentProfileId) {
      state.activities = [];
      return [];
    }

    const activities = await getActivitiesByProfile(state.currentProfileId);
    state.activities = activities;
    return activities;
  }

  async function createActivity(input) {
    try {
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
      return activityId;
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function saveActivity(activity) {
    try {
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

  async function removeActivity(activityId) {
    try {
      await deleteActivity(activityId);
      await refreshActivities();
    } catch (error) {
      handleError?.(error);
    }
  }

  return {
    refreshActivities,
    createActivity,
    saveActivity,
    removeActivity,
  };
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

  if (
    input.targetType === ACTIVITY_TARGET_TYPES.CUSTOM &&
    !input.customReference?.trim()
  ) {
    throw new Error("Custom activities require a reference.");
  }
}