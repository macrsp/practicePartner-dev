/**
 * @role renderer
 * @owns activity-list rendering, activity summary messaging, and presentation helpers for activity UI
 * @not-owns activity persistence, workspace state transitions, or focus behavior
 * @notes Keep this file focused on presentation helpers and activity UI rendering.
 */

import { ACTIVITY_TARGET_TYPES } from "../../shared/constants.js";
import { elements } from "../../shared/shell-ui.js";
import { createSectionLabel } from "../../shared/utils.js";

export function getActivityTargetLabel(targetType) {
  switch (targetType) {
    case ACTIVITY_TARGET_TYPES.TRACK:
      return "Track";
    case ACTIVITY_TARGET_TYPES.SECTION:
      return "Saved section";
    case ACTIVITY_TARGET_TYPES.CUSTOM:
      return "Custom";
    default:
      return "Unknown";
  }
}

export function describeActivity(activity, { tracks = [], sectionsById = new Map() } = {}) {
  if (!activity) {
    return "";
  }

  switch (activity.targetType) {
    case ACTIVITY_TARGET_TYPES.TRACK: {
      const isAvailable = tracks.some((track) => track.name === activity.trackName);
      return `${getActivityTargetLabel(activity.targetType)} • ${activity.trackName ?? "—"}${
        isAvailable ? "" : " • unavailable in current folder"
      }`;
    }

    case ACTIVITY_TARGET_TYPES.SECTION: {
      const section = sectionsById.get(activity.sectionId);

      if (!section) {
        return `${getActivityTargetLabel(activity.targetType)} • no longer exists`;
      }

      const isTrackAvailable = tracks.some((track) => track.name === section.trackName);

      return `${getActivityTargetLabel(activity.targetType)} • ${section.trackName} • ${createSectionLabel(section)}${
        isTrackAvailable ? "" : " • track unavailable in current folder"
      }`;
    }

    case ACTIVITY_TARGET_TYPES.CUSTOM:
      return `${getActivityTargetLabel(activity.targetType)} • ${activity.customReference ?? "Custom reference"}`;

    default:
      return activity.name ?? "";
  }
}

export function renderActivities({
  currentProfileId,
  activities,
  selectedActivityId,
  tracks,
  sectionsById,
  onUse,
  onDelete,
}) {
  elements.activityList.innerHTML = "";

  if (!currentProfileId) {
    elements.activitySummary.textContent = "Select a profile to manage reusable activities.";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Select a profile to create and browse reusable activities.";
    elements.activityList.appendChild(empty);
    return;
  }

  elements.activitySummary.textContent = activities.length
    ? `Showing ${activities.length} reusable activit${activities.length === 1 ? "y" : "ies"} in this profile.`
    : "No reusable activities in this profile yet.";

  if (!activities.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "Use the buttons above to add the current track, the focused saved section, or a custom reference.";
    elements.activityList.appendChild(empty);
    return;
  }

  activities.forEach((activity) => {
    const useState = getActivityUseState(activity, sectionsById);

    const row = document.createElement("div");
    row.className = "section-row";
    if (activity.id === selectedActivityId) {
      row.classList.add("is-active");
    }
    if (!useState.interactive) {
      row.classList.add("is-static");
    }

    const main = document.createElement("div");
    main.className = "section-main";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = activity.name;

    const meta = document.createElement("div");
    meta.className = "section-meta";
    meta.textContent = describeActivity(activity, { tracks, sectionsById });

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "section-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = useState.label;
    useButton.disabled = !useState.interactive;
    useButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (useState.interactive) {
        onUse(activity.id);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onDelete(activity.id);
    });

    actions.appendChild(useButton);
    actions.appendChild(deleteButton);

    row.appendChild(main);
    row.appendChild(actions);

    if (useState.interactive) {
      row.addEventListener("click", () => onUse(activity.id));
    }

    elements.activityList.appendChild(row);
  });
}

function getActivityUseState(activity, sectionsById) {
  if (activity.targetType === ACTIVITY_TARGET_TYPES.CUSTOM) {
    return {
      interactive: false,
      label: "Reference only",
    };
  }

  if (
    activity.targetType === ACTIVITY_TARGET_TYPES.SECTION &&
    !sectionsById.has(activity.sectionId)
  ) {
    return {
      interactive: false,
      label: "Unavailable",
    };
  }

  return {
    interactive: true,
    label: "Use",
  };
}