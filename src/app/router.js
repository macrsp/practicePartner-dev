/**
 * @role route-coordinator
 * @owns surface-level route state and route transitions between workspace, Today list, and practice mode
 * @not-owns feature-specific rendering or persistence
 * @notes The current implementation keeps route state lightweight until additional surfaces are wired.
 */

import { state } from "./state.js";

export const ROUTES = {
  WORKSPACE: "workspace",
  TODAY_LIST: "today-list",
  PRACTICE_MODE: "practice-mode",
};

const VALID_ROUTES = new Set(Object.values(ROUTES));