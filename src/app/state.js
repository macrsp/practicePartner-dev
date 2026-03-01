/**
 * @role shared-runtime-state
 * @owns in-memory application state shared across features
 * @not-owns persistence, validation rules, or DOM rendering
 * @notes Keep this as plain data; behavior belongs in controllers or helpers.
 */

export const state = {
  profiles: [],
  currentProfileId: null,

  currentFolderHandle: null,
  currentFolderName: null,
  tracks: [],
  currentTrack: null,
  currentTrackUrl: null,

  allSections: [],
  visibleSections: [],
  selection: {
    start: null,
    end: null,
  },
  focusedSectionId: null,
  currentPlayingSectionId: null,

  activities: [],
  selectedActivityId: null,
};