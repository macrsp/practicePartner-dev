import { DEFAULT_PROFILE_NAME } from "./constants.js";
import { addProfile, getAllProfiles } from "./db.js";
import { state } from "./state.js";
import { renderProfiles } from "./ui.js";

export function createProfilesController({ refreshSections, handleError }) {
  async function ensureDefaultProfile() {
    const profiles = await getAllProfiles();

    if (!profiles.length) {
      await addProfile({ name: DEFAULT_PROFILE_NAME });
    }
  }

  async function refreshProfiles() {
    const profiles = await getAllProfiles();
    state.profiles = profiles;

    if (!profiles.length) {
      state.currentProfileId = null;
      renderProfiles([], null);
      await refreshSections();
      return;
    }

    if (!profiles.some((profile) => profile.id === state.currentProfileId)) {
      state.currentProfileId = profiles[0].id;
    }

    renderProfiles(profiles, state.currentProfileId);
    await refreshSections();
  }

  async function createProfile() {
    try {
      const name = window.prompt("Profile name?");
      const trimmed = name?.trim();

      if (!trimmed) {
        return;
      }

      const profileId = await addProfile({ name: trimmed });
      state.currentProfileId = profileId;
      await refreshProfiles();
    } catch (error) {
      handleError(error);
    }
  }

  function setCurrentProfileId(profileId) {
    state.currentProfileId = profileId;
    state.focusedSectionId = null;
    state.currentPlayingSectionId = null;
  }

  return {
    ensureDefaultProfile,
    refreshProfiles,
    createProfile,
    setCurrentProfileId,
  };
}