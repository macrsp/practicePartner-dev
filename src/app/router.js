/**
 * @role router
 * @owns current-route state, route rendering into the mount point, cleanup of previous routes, and hash-based route syncing
 * @not-owns shell chrome, route-local markup, or feature business logic
 * @notes Keep route orchestration minimal and browser-native.
 */

export const ROUTES = {
  WORKSPACE: "workspace",
  PLANNER: "planner",
};

export function createRouter({
  routeMount,
  routes,
  onRouteChange = () => {},
  initialRoute = ROUTES.WORKSPACE,
  syncHash = true,
}) {
  let currentRoute = resolveRoute(parseHashRoute(window.location.hash), routes, initialRoute);
  let currentParams = null;
  let cleanupCurrentRoute = null;
  let ignoreNextHashChange = false;

  if (syncHash && !window.location.hash) {
    syncRouteHash(currentRoute, { replace: true });
  }

  function handleHashChange() {
    if (ignoreNextHashChange) {
      ignoreNextHashChange = false;
      return;
    }

    const nextRoute = resolveRoute(parseHashRoute(window.location.hash), routes, initialRoute);

    if (nextRoute === currentRoute) {
      return;
    }

    currentRoute = nextRoute;
    currentParams = null;
    void renderCurrentRoute();
  }

  if (syncHash) {
    window.addEventListener("hashchange", handleHashChange);
  }

  async function navigate(route, params = null) {
    const nextRoute = resolveRoute(route, routes, initialRoute);

    if (nextRoute === currentRoute && params === currentParams) {
      if (syncHash) {
        syncRouteHash(currentRoute);
      }
      return;
    }

    currentRoute = nextRoute;
    currentParams = params;
    await renderCurrentRoute();

    if (syncHash) {
      syncRouteHash(currentRoute);
    }
  }

  async function renderCurrentRoute() {
    const renderRoute = routes[currentRoute];

    if (!renderRoute) {
      throw new Error(`Unknown route: ${currentRoute}`);
    }

    if (typeof cleanupCurrentRoute === "function") {
      await cleanupCurrentRoute();
      cleanupCurrentRoute = null;
    }

    routeMount.innerHTML = "";
    onRouteChange(currentRoute, currentParams);

    const result = await renderRoute({
      mountEl: routeMount,
      route: currentRoute,
      params: currentParams,
    });

    cleanupCurrentRoute = typeof result === "function" ? result : result?.cleanup ?? null;
  }

  function destroy() {
    if (syncHash) {
      window.removeEventListener("hashchange", handleHashChange);
    }

    if (typeof cleanupCurrentRoute === "function") {
      void cleanupCurrentRoute();
      cleanupCurrentRoute = null;
    }
  }

  function syncRouteHash(route, { replace = false } = {}) {
    const nextHash = buildRouteHash(route);

    if (window.location.hash === nextHash) {
      return;
    }

    if (replace) {
      window.history.replaceState(null, "", nextHash);
      return;
    }

    ignoreNextHashChange = true;
    window.location.hash = nextHash;
  }

  return {
    navigate,
    renderCurrentRoute,
    destroy,
    getCurrentRoute: () => currentRoute,
    getCurrentParams: () => currentParams,
  };
}

function parseHashRoute(hashValue) {
  const normalized = String(hashValue || "").replace(/^#/, "").trim();

  if (!normalized) {
    return null;
  }

  return normalized.split("?")[0];
}

function resolveRoute(route, routes, fallbackRoute) {
  return route && routes[route] ? route : fallbackRoute;
}

function buildRouteHash(route) {
  return `#${route}`;
}