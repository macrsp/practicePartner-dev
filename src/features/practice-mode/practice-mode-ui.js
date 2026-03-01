/**
 * @role renderer
 * @owns practice-mode labeling helpers and future practice-surface rendering helpers
 * @not-owns practice execution, routing, or activity persistence
 * @notes This file is intentionally thin until the practice-mode surface is wired.
 */

export function getPracticeAvailabilityMessage(isPlayable) {
  return isPlayable ? "Playable activity" : "Non-playable activity";
}