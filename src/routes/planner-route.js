/**
 * @role route-renderer
 * @owns planner-route markup, route-scoped element lookup, planner event wiring, and planner cleanup
 * @not-owns shell chrome, activity business rules, or plan persistence rules
 * @notes This route hosts activity management and the current plan surface.
 */

export function renderPlannerRoute({ mountEl, services }) {
  const routeRoot = document.createElement("div");
  routeRoot.className = "route-page planner-page";
  routeRoot.innerHTML = `
    <section class="card">
      <div class="section-header">
        <div>
          <h2>Planner</h2>
          <p class="small">
            Build the current practice plan from reusable activities, then launch items into the workspace.
          </p>
        </div>
      </div>
    </section>

    <div class="planner-grid">
      <section class="card">
        <div class="section-header">
          <div>
            <h2>Current Plan</h2>
            <div class="small plan-name" data-planner-el="planName">Current Plan</div>
            <div class="small" data-planner-el="planSummary"></div>
          </div>
        </div>

        <div class="section-list" data-planner-el="planList"></div>
      </section>

      <section class="card">
        <div class="section-header">
          <div>
            <h2>Activity Library</h2>
            <div class="small" data-planner-el="activitySummary"></div>
          </div>

          <div class="section-actions">
            <button type="button" class="secondary" data-planner-el="addTrackActivity">
              Add Current Track
            </button>
            <button type="button" class="secondary" data-planner-el="addSectionActivity">
              Add Focused Section
            </button>
            <button type="button" class="secondary" data-planner-el="addCustomActivity">
              Add Custom
            </button>
          </div>
        </div>

        <div class="section-list" data-planner-el="activityList"></div>
      </section>
    </div>
  `;

  mountEl.replaceChildren(routeRoot);

  const elements = getPlannerElements(routeRoot);

  const handleAddTrackActivity = () => {
    void services.activitiesController.createTrackActivityFromCurrentTrack();
  };

  const handleAddSectionActivity = () => {
    void services.activitiesController.createSectionActivityFromFocusedSection();
  };

  const handleAddCustomActivity = () => {
    void services.activitiesController.createCustomActivity();
  };

  elements.addTrackActivity.addEventListener("click", handleAddTrackActivity);
  elements.addSectionActivity.addEventListener("click", handleAddSectionActivity);
  elements.addCustomActivity.addEventListener("click", handleAddCustomActivity);

  services.plansController.attachPlanner(elements);
  services.activitiesController.attachPlanner(elements);

  return {
    cleanup() {
      elements.addTrackActivity.removeEventListener("click", handleAddTrackActivity);
      elements.addSectionActivity.removeEventListener("click", handleAddSectionActivity);
      elements.addCustomActivity.removeEventListener("click", handleAddCustomActivity);

      services.activitiesController.detachPlanner();
      services.plansController.detachPlanner();
    },
  };
}

export function getPlannerElements(routeRoot) {
  return {
    planName: getRequiredElement(routeRoot, "planName"),
    planSummary: getRequiredElement(routeRoot, "planSummary"),
    planList: getRequiredElement(routeRoot, "planList"),
    activitySummary: getRequiredElement(routeRoot, "activitySummary"),
    activityList: getRequiredElement(routeRoot, "activityList"),
    addTrackActivity: getRequiredElement(routeRoot, "addTrackActivity"),
    addSectionActivity: getRequiredElement(routeRoot, "addSectionActivity"),
    addCustomActivity: getRequiredElement(routeRoot, "addCustomActivity"),
  };
}

function getRequiredElement(routeRoot, name) {
  const element = routeRoot.querySelector(`[data-planner-el="${name}"]`);

  if (!element) {
    throw new Error(`Missing planner element: ${name}`);
  }

  return element;
}