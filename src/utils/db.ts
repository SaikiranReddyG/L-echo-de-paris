/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Story, SessionAttempt, AppSettings } from "../types";
import { builtInStories } from "../data/builtInStories";

const DB_NAME = "FrenchTypingAppDB";
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains("stories")) {
        db.createObjectStore("stories", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
  });
}

export async function initDB(): Promise<void> {
  const db = await openDB();
  
  // Seed built-in stories if none exist
  const tx = db.transaction("stories", "readwrite");
  const store = tx.objectStore("stories");
  
  const existingCount = await new Promise<number>((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (existingCount === 0) {
    for (const story of builtInStories) {
      await new Promise<void>((resolve, reject) => {
        const req = store.add(story);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
    console.log("DB Pre-seeded with built-in stories.");
  }

  // Pre-seed default settings
  const settingsTx = db.transaction("settings", "readwrite");
  const settingsStore = settingsTx.objectStore("settings");
  
  const hasSettings = await new Promise<boolean>((resolve) => {
    const req = settingsStore.get("config");
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });

  if (!hasSettings) {
    const defaultSettings: AppSettings = {
      audioSpeed: "normal",
      ttsApiKey: "",
      theme: "dark",
      soundEffects: true
    };
    settingsStore.put({ key: "config", value: defaultSettings });
  }
}

// STORIES API
export async function getStories(): Promise<Story[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("stories", "readonly");
    const store = tx.objectStore("stories");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Story[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStory(story: Story): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("stories", "readwrite");
    const store = tx.objectStore("stories");
    const req = store.put(story);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteStory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("stories", "readwrite");
    const store = tx.objectStore("stories");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// SESSIONS/ATTEMPTS API
export async function getSessions(): Promise<SessionAttempt[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly");
    const store = tx.objectStore("sessions");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as SessionAttempt[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(session: SessionAttempt): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const req = store.put(session);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// SETTINGS API
export async function getSettings(): Promise<AppSettings> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const req = store.get("config");
    req.onsuccess = () => {
      if (req.result && req.result.value) {
        resolve(req.result.value as AppSettings);
      } else {
        resolve({
          audioSpeed: "normal",
          ttsApiKey: "",
          theme: "dark",
          soundEffects: true
        });
      }
    };
    req.onerror = () => {
      resolve({
        audioSpeed: "normal",
        ttsApiKey: "",
        theme: "dark",
        soundEffects: true
      });
    };
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    const req = store.put({ key: "config", value: settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// RESET ALL DATA
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  const stores = ["stories", "sessions", "settings"];
  const tx = db.transaction(stores, "readwrite");
  
  for (const storeName of stores) {
    tx.objectStore(storeName).clear();
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = async () => {
      // Re-seed built-in templates
      await initDB();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// EXPORT / IMPORT
export async function dbExportJSON(): Promise<string> {
  const stories = await getStories();
  const sessions = await getSessions();
  const settings = await getSettings();

  const exportObj = {
    version: 1,
    exportedAt: Date.now(),
    stories: stories.filter(s => !s.isBuiltIn), // only export user-created stories
    sessions,
    settings
  };

  return JSON.stringify(exportObj, null, 2);
}

export async function dbImportJSON(jsonStr: string): Promise<{ importedStories: number; importedSessions: number }> {
  const data = JSON.parse(jsonStr);
  if (!data || data.version !== 1) {
    throw new Error("Invalid import database file format.");
  }

  const db = await openDB();

  let importedStories = 0;
  let importedSessions = 0;

  // Import custom stories
  if (Array.isArray(data.stories)) {
    const tx = db.transaction("stories", "readwrite");
    const store = tx.objectStore("stories");
    for (const story of data.stories) {
      if (story && story.id) {
        // Ensure marked as custom, in case it isn't
        story.isBuiltIn = false;
        await new Promise<void>((resolve) => {
          const req = store.put(story);
          req.onsuccess = () => {
            importedStories++;
            resolve();
          };
          req.onerror = () => resolve(); // skip errors
        });
      }
    }
  }

  // Import sessions
  if (Array.isArray(data.sessions)) {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    for (const session of data.sessions) {
      if (session && session.id) {
        await new Promise<void>((resolve) => {
          const req = store.put(session);
          req.onsuccess = () => {
            importedSessions++;
            resolve();
          };
          req.onerror = () => resolve();
        });
      }
    }
  }

  // Import settings (if present)
  if (data.settings) {
    await saveSettings(data.settings);
  }

  return { importedStories, importedSessions };
}
