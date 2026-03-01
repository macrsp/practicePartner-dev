/**
 * @role shared-runtime-state
 * @owns in-memory application state shared across features
 * @not-owns persistence, validation rules, or DOM rendering
 * @notes Keep this as plain data; behavior belongs in controllers or helpers.
 */

export const state = {
  currentRoute: "workspace",
  routeContext: null,

  profiles: [],
  currentProfileId: null,

  currentFolderHandle: null,
  currentFolderName: null,
  tracks: [],
  currentTrack: null,
  currentTrackUrl: null,

  allSections: [],
  sections: [],
  selection: {
    start: null,
    end: null,
  },
  focusedSectionId: null,
  currentPlayingSectionId: null,

  activities: [],
  todayListItems: [],
  currentPracticeIndex: null,
  practiceSelection: {
    start: null,
    end: null,
  },
};