/**
 * @role route-renderer
 * @owns planner-route markup, route-scoped element lookup, planner event wiring, and planner cleanup
 * @not-owns shell chrome, activity business rules, or plan persistence rules
 * @notes This route hosts saved-plan loading, current-plan composition, and the activity library.
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
            Load saved plans, organize the current plan, and browse reusable activities.
          </p>
        </div>
      </div>
    </section>

    <div class="planner-grid">
      <section class="card">
        <div class="section-header">
          <div>
            <h2>Current Plan</h2>
            <p class="small">
              Choose a saved plan to load it as the current working plan for this profile.
            </p>
          </div>
        </div>

        <div class="planner-summary-bar planner-plan-toolbar">
          <div class="planner-field-group">
            <label for="plannerPlanSelect">Loaded Plan</label>
            <select
              id="plannerPlanSelect"
              class="planner-plan-select"
              data-planner-el="planSelect"
              aria-label="Loaded Plan"
            ></select>
          </div>

          <div class="section-actions">
            <button type="button" class="secondary" data-planner-el="savePlanAs">
              Save as New Plan
            </button>
          </div>
        </div>

        <div class="planner-summary-bar">
          <div>
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
            <p class="small">
              Reusable activities live here. Create track and section activities from the Workspace.
            </p>
          </div>

          <div class="section-actions">
            <button type="button" class="secondary" data-planner-el="addCustomActivity">
              Add Custom Activity
            </button>
          </div>
        </div>

        <div class="planner-summary-bar">
          <div class="small" data-planner-el="activitySummary"></div>
        </div>

        <div class="section-list" data-planner-el="activityList"></div>
      </section>
    </div>
  `;

  mountEl.replaceChildren(routeRoot);

  const elements = getPlannerElements(routeRoot);

  const handlePlanChange = (event) => {
    void services.plansController.setCurrentPlanId(Number(event.target.value));
  };

  const handleSavePlanAs = () => {
    void services.plansController.saveCurrentPlanAsNew();
  };

  const handleAddCustomActivity = () => {
    void services.activitiesController.createCustomActivity();
  };

  elements.planSelect.addEventListener("change", handlePlanChange);
  elements.savePlanAs.addEventListener("click", handleSavePlanAs);
  elements.addCustomActivity.addEventListener("click", handleAddCustomActivity);

  services.plansController.attachPlanner(elements);
  services.activitiesController.attachPlanner(elements);

  return {
    cleanup() {
      elements.planSelect.removeEventListener("change", handlePlanChange);
      elements.savePlanAs.removeEventListener("click", handleSavePlanAs);
      elements.addCustomActivity.removeEventListener("click", handleAddCustomActivity);

      services.activitiesController.detachPlanner();
      services.plansController.detachPlanner();
    },
  };
}

export function getPlannerElements(routeRoot) {
  return {
    planSelect: getRequiredElement(routeRoot, "planSelect"),
    savePlanAs: getRequiredElement(routeRoot, "savePlanAs"),
    planName: getRequiredElement(routeRoot, "planName"),
    planSummary: getRequiredElement(routeRoot, "planSummary"),
    planList: getRequiredElement(routeRoot, "planList"),
    activitySummary: getRequiredElement(routeRoot, "activitySummary"),
    activityList: getRequiredElement(routeRoot, "activityList"),
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