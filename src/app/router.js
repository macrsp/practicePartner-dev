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

export function createRouter({ initialRoute = ROUTES.WORKSPACE, onRouteChange } = {}) {
  if (!VALID_ROUTES.has(initialRoute)) {
    throw new Error(`Unknown route "${initialRoute}".`);
  }

  state.currentRoute = initialRoute;
  state.routeContext = null;

  function navigate(route, routeContext = null) {
    if (!VALID_ROUTES.has(route)) {
      throw new Error(`Unknown route "${route}".`);
    }

    state.currentRoute = route;
    state.routeContext = routeContext;
    onRouteChange?.({ route, routeContext });
  }

  return {
    navigate,
    getCurrentRoute: () => state.currentRoute,
    getRouteContext: () => state.routeContext,
  };
}