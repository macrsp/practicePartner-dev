/**
 * @role renderer
 * @owns current-plan summary messaging and current-plan item list rendering
 * @not-owns plan persistence, plan mutation rules, or activity launch behavior
 * @notes Keep this file presentation-only.
 */

import { describeActivity, getActivityUseState } from "../activities/activities-ui.js";

export function renderPlan({
  elements,
  currentProfileId,
  plan,
  planItems,
  activitiesById,
  tracks,
  sectionsById,
  onUseActivity,
  onRemoveItem,
}) {
  elements.planName.textContent = plan?.name ?? "Current Plan";
  elements.planList.innerHTML = "";

  if (!currentProfileId) {
    elements.planSummary.textContent = "Select a profile to work on a practice plan.";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Select a profile to create and manage the current practice plan.";
    elements.planList.appendChild(empty);
    return;
  }

  elements.planSummary.textContent = planItems.length
    ? `${planItems.length} activity item${planItems.length === 1 ? "" : "s"} in the current plan.`
    : "No activities in the current plan yet.";

  if (!planItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Use Add to Plan from the activity library below to build the current practice plan.";
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