/**
 * @role shared-constants
 * @owns database names, schema versions, store names, settings keys, and shared feature constants
 * @not-owns runtime state, persistence behavior, or UI logic
 * @notes Update DB_VERSION only for intentional IndexedDB schema changes.
 */

export const DB_NAME = "suzukiDB_v4";
export const DB_VERSION = 4;

export const STORES = {
  PROFILES: "profiles",
  SECTIONS: "sections",
  PLAYS: "plays",
  SETTINGS: "settings",
  ACTIVITIES: "activities",
  TODAY_LIST: "todayList",
};

export const SETTINGS_KEYS = {
  MUSIC_FOLDER_HANDLE: "musicFolderHandle",
  MUSIC_FOLDER_NAME: "musicFolderName",
  LAST_TRACK_NAME: "lastTrackName",
};

export const DEFAULT_PROFILE_NAME = "Default";

export const SUPPORTED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
];

export const ACTIVITY_TARGET_TYPES = {
  TRACK: "track",
  SECTION: "section",
  CUSTOM: "custom",
};