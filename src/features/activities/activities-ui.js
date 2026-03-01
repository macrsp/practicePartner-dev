/**
 * @role renderer
 * @owns activity-label formatting and future activity-list presentation helpers
 * @not-owns activity persistence, routing, or Today list logic
 * @notes This file is intentionally thin until the activity UI surface is wired.
 */

import { ACTIVITY_TARGET_TYPES } from "../../shared/constants.js";

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

export function describeActivity(activity) {
  if (!activity) {
    return "";
  }

  switch (activity.targetType) {
    case ACTIVITY_TARGET_TYPES.TRACK:
      return `${activity.name} • Track: ${activity.trackName ?? "—"}`;
    case ACTIVITY_TARGET_TYPES.SECTION:
      return `${activity.name} • Saved section`;
    case ACTIVITY_TARGET_TYPES.CUSTOM:
      return `${activity.name} • ${activity.customReference ?? "Custom reference"}`;
    default:
      return activity.name ?? "";
  }
}