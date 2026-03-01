/**
 * @role renderer
 * @owns profile-select rendering
 * @not-owns profile state transitions, persistence, or validation
 * @notes Keep this file presentation-only.
 */

import { elements } from "../../shared/shell-ui.js";

export function renderProfiles(profiles, currentProfileId) {
  elements.profileSelect.innerHTML = "";

  if (!profiles.length) {
    const option = document.createElement("option");
    option.textContent = "No profiles";
    option.disabled = true;
    option.selected = true;
    elements.profileSelect.appendChild(option);
    elements.profileSelect.disabled = true;
    return;
  }

  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = String(profile.id);
    option.textContent = profile.name;
    elements.profileSelect.appendChild(option);
  });

  elements.profileSelect.disabled = false;
  elements.profileSelect.value = String(currentProfileId);
}