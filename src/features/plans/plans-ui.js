/**
 * @role renderer
 * @owns planner plan-picker rendering, current-plan summary messaging, and current-plan item list rendering for the planner view
 * @not-owns plan persistence, plan mutation rules, or activity launch behavior
 * @notes Keep this file presentation-only.
 */

import { describeActivity, getActivityUseState } from "../activities/activities-ui.js";

export function renderPlan({
  elements,
  currentProfileId,
  plans,
  currentPlanId,
  plan,
  planItems,
  activitiesById,
  tracks,
  sectionsById,
  onUseActivity,
  onRemoveItem,
}) {
  renderPlanPicker(elements, {
    currentProfileId,
    plans,
    currentPlanId,
  });

  elements.planName.textContent = plan?.name ?? "Current Plan";
  elements.planList.innerHTML = "";

  if (!currentProfileId) {
    elements.planSummary.textContent = "Select a profile to work on a practice plan.";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Select a profile to create, load, and manage practice plans.";
    elements.planList.appendChild(empty);
    return;
  }

  elements.planSummary.textContent = createPlanSummary(planItems.length, plans.length);

  if (!planItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Use Add to Plan from the activity library to build this plan, or save the current plan as a named plan for later.";
    elements.planList.appendChild(empty);
    return;
  }

  planItems.forEach((planItem, index) => {
    const activity = activitiesById.get(planItem.activityId) ?? null;
    const useState = activity
      ? getActivityUseState(activity, { tracks, sectionsById })
      : { interactive: false, label: "Unavailable" };

    const row = document.createElement("div");
    row.className = "section-row";

    if (!useState.interactive) {
      row.classList.add("is-static");
    }

    const main = document.createElement("div");
    main.className = "section-main";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = `${index + 1}. ${activity?.name ?? "Missing activity"}`;

    const meta = document.createElement("div");
    meta.className = "section-meta";
    meta.textContent = activity
      ? describeActivity(activity, { tracks, sectionsById })
      : "This plan item references an activity that no longer exists.";

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "section-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = useState.label;
    useButton.disabled = !useState.interactive || !activity;
    useButton.addEventListener("click", (event) => {
      event.stopPropagation();

      if (activity && useState.interactive) {
        onUseActivity(activity.id);
      }
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onRemoveItem(planItem.id);
    });

    actions.appendChild(useButton);
    actions.appendChild(removeButton);

    row.appendChild(main);
    row.appendChild(actions);

    if (activity && useState.interactive) {
      row.addEventListener("click", () => onUseActivity(activity.id));
    }

    elements.planList.appendChild(row);
  });
}

function renderPlanPicker(elements, { currentProfileId, plans, currentPlanId }) {
  elements.planSelect.innerHTML = "";

  if (!currentProfileId) {
    const option = document.createElement("option");
    option.textContent = "Select a profile";
    option.disabled = true;
    option.selected = true;
    elements.planSelect.appendChild(option);
    elements.planSelect.disabled = true;
    return;
  }

  if (!plans.length) {
    const option = document.createElement("option");
    option.textContent = "No plans";
    option.disabled = true;
    option.selected = true;
    elements.planSelect.appendChild(option);
    elements.planSelect.disabled = true;
    return;
  }

  plans.forEach((plan) => {
    const option = document.createElement("option");
    option.value = String(plan.id);
    option.textContent = plan.isDefault ? `${plan.name} • current` : plan.name;

    if (plan.id === currentPlanId) {
      option.selected = true;
    }

    elements.planSelect.appendChild(option);
  });

  elements.planSelect.disabled = false;
}

function createPlanSummary(planItemCount, planCount) {
  const itemText = `${planItemCount} activity item${planItemCount === 1 ? "" : "s"} in this plan`;
  const planText = `${planCount} saved plan${planCount === 1 ? "" : "s"}`;
  return `${itemText} • ${planText}.`;
}