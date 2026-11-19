import { Notice } from "obsidian";
import { getSettings, type CopilotSettings } from "@/settings/model";

export const PRIVATE_FOLDER_MESSAGE =
  "This note is in a folder that is private to Hestia (Settings › Basic › Private folders), so it was not read or sent to the model.";

export class PrivateFolderError extends Error {
  constructor(readonly path: string) {
    super(`${PRIVATE_FOLDER_MESSAGE} (${path})`);
    this.name = "PrivateFolderError";
  }
}

function normalizeFolder(folder: string): string {
  return folder
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function parsePrivateFolders(value: string | undefined | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map(normalizeFolder)
        .filter((folder) => folder.length > 0)
    )
  );
}

export function getPrivateFolders(settings: Partial<CopilotSettings> = getSettings()): string[] {
  return parsePrivateFolders(settings?.privateFolders);
}

export function isPrivatePath(
  path: string | undefined | null,
  settings: Partial<CopilotSettings> = getSettings()
): boolean {
  if (!path) return false;
  const target = normalizeFolder(path).toLowerCase();
  return getPrivateFolders(settings).some((folder) => {
    const root = folder.toLowerCase();
    return target === root || target.startsWith(`${root}/`);
  });
}

export function assertNotPrivate(path: string | undefined | null): void {
  if (path && isPrivatePath(path)) throw new PrivateFolderError(path);
}

let lastNoticeAt = 0;

// One notice per burst, so attaching a whole private folder does not stack a dozen toasts. https://github.com/ORee1000/obsidian-copilot/issues/1
export function noticePrivateBlocked(path: string): void {
  const now = Date.now();
  if (now - lastNoticeAt < 3000) return;
  lastNoticeAt = now;
  new Notice(`Hestia: "${path}" is in a private folder and was not read.`);
}
