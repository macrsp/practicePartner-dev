/**
 * @role persistence-helper
 * @owns persistence and retrieval of remembered folder handle, folder name, and last track name
 * @not-owns folder picking, permission prompts, track enumeration, or UI updates
 * @notes Keep this module storage-focused; controllers should decide behavior.
 */

import { SETTINGS_KEYS } from "./constants.js";
import { getSetting, setSetting } from "./db.js";

export async function getRememberedMusicFolder() {
  const [handle, name, lastTrackName] = await Promise.all([
    getSetting(SETTINGS_KEYS.MUSIC_FOLDER_HANDLE),
    getSetting(SETTINGS_KEYS.MUSIC_FOLDER_NAME),
    getSetting(SETTINGS_KEYS.LAST_TRACK_NAME),
  ]);

  return {
    handle: handle ?? null,
    name: name ?? null,
    lastTrackName: lastTrackName ?? null,
  };
}

export async function rememberMusicFolder(directoryHandle) {
  await Promise.all([
    setSetting(SETTINGS_KEYS.MUSIC_FOLDER_HANDLE, directoryHandle),
    setSetting(SETTINGS_KEYS.MUSIC_FOLDER_NAME, directoryHandle?.name ?? null),
  ]);
}

export async function rememberLastTrackName(trackName) {
  await setSetting(SETTINGS_KEYS.LAST_TRACK_NAME, trackName ?? null);
}