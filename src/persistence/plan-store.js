/**
 * @role persistence-helper
 * @owns plan and plan-item specific IndexedDB access
 * @not-owns plan mutation rules, current-plan selection policy, or planner UI behavior
 * @notes Keep this module storage-focused; controllers should decide behavior.
 */

import { STORES } from "../shared/constants.js";
import { runRequest } from "./db.js";

export function getPlansByProfile(profileId) {
  return runRequest(STORES.PLANS, "readonly", (store) =>
    store.index("byProfileId").getAll(IDBKeyRange.only(profileId)),
  );
}

export function addPlan(plan) {
  return runRequest(STORES.PLANS, "readwrite", (store) => store.add(plan));
}

export function updatePlan(plan) {
  return runRequest(STORES.PLANS, "readwrite", (store) => store.put(plan));
}

export function getPlanItemsByPlanId(planId) {
  return runRequest(STORES.PLAN_ITEMS, "readonly", (store) =>
    store.index("byPlanId").getAll(IDBKeyRange.only(planId)),
  );
}

export function addPlanItem(planItem) {
  return runRequest(STORES.PLAN_ITEMS, "readwrite", (store) => store.add(planItem));
}

export function updatePlanItem(planItem) {
  return runRequest(STORES.PLAN_ITEMS, "readwrite", (store) => store.put(planItem));
}

export function deletePlanItem(planItemId) {
  return runRequest(STORES.PLAN_ITEMS, "readwrite", (store) => store.delete(planItemId));
}