/**
 * @role renderer-support
 * @owns persistent shell element lookup and shell-level navigation state
 * @not-owns route-owned element lookup, feature rendering logic, or application state transitions
 * @notes Keep this file limited to shell-level element access.
 */

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

export function getShellElements() {
  return {
    routeMount: getElement("routeMount"),
    profileSelect: getElement("profileSelect"),
    newProfile: getElement("newProfile"),
    workspaceNav: getElement("workspaceNav"),
    plannerNav: getElement("plannerNav"),
    audio: getElement("audio"),
  };
}

export function setActiveShellRoute(elements, route) {
  const navMap = new Map([
    ["workspace", elements.workspaceNav],
    ["planner", elements.plannerNav],
  ]);

  navMap.forEach((button, buttonRoute) => {
    const isActive = buttonRoute === route;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}