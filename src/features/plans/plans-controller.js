/**
 * @role controller
 * @owns current-plan bootstrap, current-plan item refresh, add/remove plan item orchestration, and planner current-plan rendering
 * @not-owns activity CRUD, activity launch behavior internals, or low-level IndexedDB helpers
 * @notes The current UX exposes one persisted current/default plan per profile while keeping the data model open to multiple plans later.
 */

import { state } from "../../app/state.js";
import { DEFAULT_PLAN_NAME } from "../../shared/constants.js";
import {
  addPlan,
  addPlanItem,
  deletePlanItem,
  getPlanItemsByPlanId,
  getPlansByProfile,
  updatePlan,
} from "../../persistence/plan-store.js";
import { renderPlan } from "./plans-ui.js";

export function createPlansController({ activateActivity, handleError } = {}) {
  let planner = null;

  function attachPlanner(nextPlanner) {
    planner = nextPlanner;
    renderPlanList();
  }

  function detachPlanner() {
    planner = null;
  }

  async function refreshPlans() {
    try {
      if (!state.currentProfileId) {
        state.plans = [];
        state.currentPlanId = null;
        state.planItems = [];
        renderPlanList();
        return null;
      }

      let plans = await getPlansByProfile(state.currentProfileId);

      if (!plans.length) {
        const now = Date.now();

        await addPlan({
          profileId: state.currentProfileId,
          name: DEFAULT_PLAN_NAME,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });

        plans = await getPlansByProfile(state.currentProfileId);
      }

      state.plans = [...plans].sort(sortPlans);

      if (!state.plans.some((plan) => plan.id === state.currentPlanId)) {
        state.currentPlanId =
          state.plans.find((plan) => plan.isDefault)?.id ?? state.plans[0]?.id ?? null;
      }

      await refreshPlanItems();
      return getCurrentPlan();
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function refreshPlanItems() {
    if (!state.currentPlanId) {
      state.planItems = [];
      renderPlanList();
      return [];
    }

    const planItems = await getPlanItemsByPlanId(state.currentPlanId);
    state.planItems = [...planItems].sort(sortPlanItems);
    renderPlanList();
    return state.planItems;
  }

  function renderPlanList() {
    if (!planner) {
      return;
    }

    const activitiesById = new Map(state.activities.map((activity) => [activity.id, activity]));
    const sectionsById = new Map(state.allSections.map((section) => [section.id, section]));

    renderPlan({
      elements: planner,
      currentProfileId: state.currentProfileId,
      plan: getCurrentPlan(),
      planItems: state.planItems,
      activitiesById,
      tracks: state.tracks,
      sectionsById,
      onUseActivity: (activityId) => {
        void activateActivity?.(activityId);
      },
      onRemoveItem: (planItemId) => {
        void removePlanItem(planItemId);
      },
    });
  }

  async function addActivityToCurrentPlan(activityId) {
    try {
      const activity = state.activities.find((item) => item.id === activityId);

      if (!activity) {
        throw new Error("That activity is no longer available.");
      }

      const currentPlan = await ensureCurrentPlan();
      const nextPosition = getNextPlanItemPosition(state.planItems);
      const now = Date.now();

      await addPlanItem({
        planId: currentPlan.id,
        activityId,
        position: nextPosition,
        createdAt: now,
        updatedAt: now,
      });

      await touchCurrentPlan(currentPlan);
      await refreshPlanItems();
    } catch (error) {
      handleError?.(error);
    }
  }

  async function removePlanItem(planItemId) {
    try {
      const planItem = state.planItems.find((item) => item.id === planItemId);

      if (!planItem) {
        return;
      }

      const currentPlan = getCurrentPlan();

      await deletePlanItem(planItemId);

      if (currentPlan) {
        await touchCurrentPlan(currentPlan);
      }

      await refreshPlanItems();
    } catch (error) {
      handleError?.(error);
    }
  }

  async function ensureCurrentPlan() {
    if (!state.currentProfileId) {
      throw new Error("Select a profile first.");
    }

    let currentPlan = getCurrentPlan();

    if (currentPlan) {
      return currentPlan;
    }

    await refreshPlans();
    currentPlan = getCurrentPlan();

    if (!currentPlan) {
      throw new Error("Unable to load the current plan.");
    }

    return currentPlan;
  }

  async function touchCurrentPlan(plan) {
    await updatePlan({
      ...plan,
      updatedAt: Date.now(),
    });

    state.plans = state.plans
      .map((item) => (item.id === plan.id ? { ...item, updatedAt: Date.now() } : item))
      .sort(sortPlans);
  }

  function getCurrentPlan() {
    return state.plans.find((plan) => plan.id === state.currentPlanId) ?? null;
  }

  return {
    attachPlanner,
    detachPlanner,
    refreshPlans,
    refreshPlanItems,
    renderPlanList,
    addActivityToCurrentPlan,
    removePlanItem,
  };
}

function sortPlans(a, b) {
  return (
    Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) ||
    (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    a.id - b.id
  );
}

function sortPlanItems(a, b) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
    a.id - b.id
  );
}

function getNextPlanItemPosition(planItems) {
  if (!planItems.length) {
    return 0;
  }

  return Math.max(...planItems.map((item) => item.position ?? -1)) + 1;
}