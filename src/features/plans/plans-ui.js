/**
 * @role renderer
 * @owns planner plan-picker rendering, current-plan summary messaging, and current-plan item list rendering for the planner view
 * @not-owns plan persistence, plan mutation rules, or activity launch behavior
 * @notes Keep this file presentation-only.
 */

import { describeActivity, getActivityUseState } from "../activities/activities-ui.js";

let activeDragPlanItemId = null;

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
  onReorderItem,
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
    row.className = "section-row plan-item-row";
    row.dataset.planItemId = String(planItem.id);

    if (!useState.interactive) {
      row.classList.add("is-static");
    }

    const dragBar = document.createElement("div");
    dragBar.className = "card-drag-bar";
    dragBar.draggable = true;
    dragBar.setAttribute("role", "button");
    dragBar.setAttribute("tabindex", "0");
    dragBar.setAttribute("aria-label", "Drag to reorder");

    const dragIcon = document.createElement("span");
    dragIcon.className = "card-drag-icon";
    dragIcon.textContent = "≡";

    dragBar.appendChild(document.createElement("span")); // left spacer
    dragBar.appendChild(dragIcon);

    // Ensure the bar doesn't trigger row click behavior.
    dragBar.addEventListener("click", (event) => event.stopPropagation());
    dragBar.addEventListener("mousedown", (event) => event.stopPropagation());
    dragBar.addEventListener("pointerdown", (event) => event.stopPropagation());

    dragBar.addEventListener("dragstart", (event) => {
      activeDragPlanItemId = planItem.id;
      row.classList.add("is-dragging");

      try {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(planItem.id));

        const rowRect = row.getBoundingClientRect();
        const pointerOffsetX = Math.max(0, event.clientX - rowRect.left);
        const pointerOffsetY = Math.max(0, event.clientY - rowRect.top);

        event.dataTransfer.setDragImage(row, pointerOffsetX, pointerOffsetY);
      } catch {
        // no-op: some browsers can throw if dataTransfer is unavailable
      }
    });

    dragBar.addEventListener("dragend", () => {
      activeDragPlanItemId = null;
      row.classList.remove("is-dragging");
      row.classList.remove("drop-before", "drop-after");
    });

    const body = document.createElement("div");
    body.className = "plan-item-body";

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

    body.appendChild(main);
    body.appendChild(actions);

    row.appendChild(dragBar);
    row.appendChild(body);

    // Drop target behavior (row body is a target; only the drag bar is draggable).
    if (onReorderItem) {
      row.addEventListener("dragover", (event) => {
        if (!activeDragPlanItemId) {
          return;
        }

        event.preventDefault();

        const rect = row.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;

        row.classList.toggle("drop-before", before);
        row.classList.toggle("drop-after", !before);

        try {
          event.dataTransfer.dropEffect = "move";
        } catch {
          // ignore
        }
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drop-before", "drop-after");
      });

      row.addEventListener("drop", (event) => {
        event.preventDefault();

        const draggedIdRaw =
          (event.dataTransfer && event.dataTransfer.getData("text/plain")) || null;
        const draggedId = Number(draggedIdRaw || activeDragPlanItemId);
        const targetId = planItem.id;

        row.classList.remove("drop-before", "drop-after");

        if (!Number.isFinite(draggedId) || draggedId === targetId) {
          return;
        }

        const rect = row.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;

        onReorderItem(draggedId, targetId, { before });
      });
    }

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