/**
 * @role renderer
 * @owns profile-select rendering
 * @not-owns profile state transitions, persistence, or validation
 * @notes Keep this file presentation-only.
 */

export function renderProfiles(profileSelect, profiles, currentProfileId) {
  profileSelect.innerHTML = "";

  if (!profiles.length) {
    const option = document.createElement("option");
    option.textContent = "No profiles";
    option.disabled = true;
    option.selected = true;
    profileSelect.appendChild(option);
    profileSelect.disabled = true;
    return;
  }

  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = String(profile.id);
    option.textContent = profile.name;
    profileSelect.appendChild(option);
  });

  profileSelect.disabled = false;
  profileSelect.value = String(currentProfileId);
}