/**
 * @role persistence-layer
 * @owns IndexedDB opening, upgrades, transactions, and shared store helpers
 * @not-owns business rules, UI updates, or controller orchestration
 * @notes Preserve compatibility with existing user data whenever possible.
 */

import { DB_NAME, DB_VERSION, STORES } from "../shared/constants.js";

let dbPromise = null;

export function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const transaction = event.target.transaction;

      const profilesStore = database.objectStoreNames.contains(STORES.PROFILES)
        ? transaction.objectStore(STORES.PROFILES)
        : database.createObjectStore(STORES.PROFILES, {
            keyPath: "id",
            autoIncrement: true,
          });

      const sectionsStore = database.objectStoreNames.contains(STORES.SECTIONS)
        ? transaction.objectStore(STORES.SECTIONS)
        : database.createObjectStore(STORES.SECTIONS, {
            keyPath: "id",
            autoIncrement: true,
          });

      const playsStore = database.objectStoreNames.contains(STORES.PLAYS)
        ? transaction.objectStore(STORES.PLAYS)
        : database.createObjectStore(STORES.PLAYS, {
            keyPath: "id",
            autoIncrement: true,
          });

      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, {
          keyPath: "key",
        });
      }

      const activitiesStore = database.objectStoreNames.contains(STORES.ACTIVITIES)
        ? transaction.objectStore(STORES.ACTIVITIES)
        : database.createObjectStore(STORES.ACTIVITIES, {
            keyPath: "id",
            autoIncrement: true,
          });

      if (!profilesStore.indexNames.contains("byName")) {
        profilesStore.createIndex("byName", "name", { unique: false });
      }

      if (!sectionsStore.indexNames.contains("byProfileId")) {
        sectionsStore.createIndex("byProfileId", "profileId", { unique: false });
      }

      if (!sectionsStore.indexNames.contains("byProfileAndTrack")) {
        sectionsStore.createIndex("byProfileAndTrack", ["profileId", "trackName"], {
          unique: false,
        });
      }

      if (!playsStore.indexNames.contains("bySectionId")) {
        playsStore.createIndex("bySectionId", "sectionId", { unique: false });
      }

      if (!activitiesStore.indexNames.contains("byProfileId")) {
        activitiesStore.createIndex("byProfileId", "profileId", { unique: false });
      }

      if (!activitiesStore.indexNames.contains("byProfileAndTargetType")) {
        activitiesStore.createIndex("byProfileAndTargetType", ["profileId", "targetType"], {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export function runRequest(storeName, mode, action) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let request;
        let result;

        try {
          request = action(store);
        } catch (error) {
          reject(error);
          return;
        }

        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => reject(request.error);
        }

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () =>
          reject(transaction.error || request?.error || new Error("IndexedDB transaction failed."));
        transaction.onabort = () =>
          reject(transaction.error || request?.error || new Error("IndexedDB transaction aborted."));
      }),
  );
}

export function getAllProfiles() {
  return runRequest(STORES.PROFILES, "readonly", (store) => store.getAll());
}

export function addProfile(profile) {
  return runRequest(STORES.PROFILES, "readwrite", (store) => store.add(profile));
}

export function getSectionsByProfile(profileId) {
  return runRequest(STORES.SECTIONS, "readonly", (store) =>
    store.index("byProfileId").getAll(IDBKeyRange.only(profileId)),
  );
}

export function addSection(section) {
  return runRequest(STORES.SECTIONS, "readwrite", (store) => store.add(section));
}

export function updateSection(section) {
  return runRequest(STORES.SECTIONS, "readwrite", (store) => store.put(section));
}

export function deleteSection(sectionId) {
  return runRequest(STORES.SECTIONS, "readwrite", (store) => store.delete(sectionId));
}

export function addPlayLog(play) {
  return runRequest(STORES.PLAYS, "readwrite", (store) => store.add(play));
}

export function getSetting(key) {
  return runRequest(STORES.SETTINGS, "readonly", (store) => store.get(key)).then(
    (record) => record?.value,
  );
}

export function setSetting(key, value) {
  return runRequest(STORES.SETTINGS, "readwrite", (store) => store.put({ key, value }));
}