import { COPILOT_LITE } from "@/lite";
import type { App } from "obsidian";
import { v4 as uuidv4, validate as validateUuid, version as uuidVersion } from "uuid";

const DEVICE_ID_STORAGE_KEY = "obsidian-copilot:device-id:v1";

const FALLBACK_DEVICE_ID = "unknown";

const cachedDeviceIds = new WeakMap<App, string>();

// Hosted in obsidian-web, agents run on the server, so every browser shares one profile of agent
// paths; a per-browser id made each new browser lose the OpenCode and Codex setup.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const SERVER_DEVICE_ID = "00000000-0000-4000-8000-000000000000";

function isServerHosted(): boolean {
  return COPILOT_LITE && typeof window !== "undefined" && "__server" in window;
}

export function getDeviceId(app: App): string {
  if (isServerHosted()) return SERVER_DEVICE_ID;
  const cachedDeviceId = cachedDeviceIds.get(app);
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const existing = app.loadLocalStorage(DEVICE_ID_STORAGE_KEY);
    if (typeof existing === "string" && existing.length > 0) {
      cachedDeviceIds.set(app, existing);
      return existing;
    }

    const id = uuidv4();
    app.saveLocalStorage(DEVICE_ID_STORAGE_KEY, id);
    if (app.loadLocalStorage(DEVICE_ID_STORAGE_KEY) !== id) {
      cachedDeviceIds.set(app, FALLBACK_DEVICE_ID);
      return FALLBACK_DEVICE_ID;
    }
    cachedDeviceIds.set(app, id);
    return id;
  } catch {
    cachedDeviceIds.set(app, FALLBACK_DEVICE_ID);
    return FALLBACK_DEVICE_ID;
  }
}

export function getPersistedDeviceId(app: App): string {
  const id = getDeviceId(app);
  // Uploads reject non-UUID identities, and accepting a cached but unpersisted identity would give a fresh rate-limit bucket after every restart.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/202
  if (
    !validateUuid(id) ||
    uuidVersion(id) !== 4 ||
    app.loadLocalStorage(DEVICE_ID_STORAGE_KEY) !== id
  ) {
    throw new Error("A persisted UUIDv4 device identifier is required.");
  }
  return id;
}
