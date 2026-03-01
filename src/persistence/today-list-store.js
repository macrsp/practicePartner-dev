/**
 * @role persistence-helper
 * @owns Today-list-specific IndexedDB access
 * @not-owns Today-list validation, drag-and-drop behavior, or practice execution
 * @notes Keep this module storage-focused; controllers should decide behavior.
 */

import { STORES } from "../shared/constants.js";
import { runRequest } from "./db.js";

export function getTodayListByProfile(profileId) {
  return runRequest(STORES.TODAY_LIST, "readonly", (store) =>
    store.index("byProfileId").getAll(IDBKeyRange.only(profileId)),
  ).then((items) =>
    [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id),
  );
}

export function addTodayListItem(item) {
  return runRequest(STORES.TODAY_LIST, "readwrite", (store) => store.add(item));
}

export function updateTodayListItem(item) {
  return runRequest(STORES.TODAY_LIST, "readwrite", (store) => store.put(item));
}

export function deleteTodayListItem(itemId) {
  return runRequest(STORES.TODAY_LIST, "readwrite", (store) => store.delete(itemId));
}