/**
 * @role persistence-helper
 * @owns activity-specific IndexedDB access
 * @not-owns activity validation, UI behavior, or practice execution
 * @notes Keep this module storage-focused; controllers should decide behavior.
 */

import { STORES } from "../shared/constants.js";
import { runRequest } from "./db.js";

export function getActivitiesByProfile(profileId) {
  return runRequest(STORES.ACTIVITIES, "readonly", (store) =>
    store.index("byProfileId").getAll(IDBKeyRange.only(profileId)),
  );
}

export function getActivityById(activityId) {
  return runRequest(STORES.ACTIVITIES, "readonly", (store) => store.get(activityId));
}

export function addActivity(activity) {
  return runRequest(STORES.ACTIVITIES, "readwrite", (store) => store.add(activity));
}

export function updateActivity(activity) {
  return runRequest(STORES.ACTIVITIES, "readwrite", (store) => store.put(activity));
}

export function deleteActivity(activityId) {
  return runRequest(STORES.ACTIVITIES, "readwrite", (store) => store.delete(activityId));
}