/**
 * @role renderer
 * @owns Today-list labeling helpers and future list rendering helpers
 * @not-owns ordering behavior, persistence, or practice execution
 * @notes This file is intentionally thin until the Today-list surface is wired.
 */

export function describeTodayListItem(item, activityName = "Unknown activity") {
  if (!item) {
    return "";
  }

  const order = Number.isFinite(item.sortOrder) ? item.sortOrder + 1 : "—";
  return `${order}. ${activityName}`;
}