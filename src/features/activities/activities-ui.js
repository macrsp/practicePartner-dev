/**
 * @role renderer
 * @owns activity-label formatting and presentation helpers for activity UI
 * @not-owns activity persistence, workspace state transitions, or focus behavior
 * @notes Keep this file focused on presentation helpers for activity UI.
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