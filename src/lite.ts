import type { CopilotSettings } from "@/settings/model";

// Copilot Lite drops Copilot Plus, Miyo and Brevilabs services; every Lite deviation keys off this flag.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const COPILOT_LITE = true;

// Lite installs beside upstream Copilot so the community updater never replaces it.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const COPILOT_PLUGIN_ID = COPILOT_LITE ? "hestia" : "copilot";

// The Lite build ships as "Hestia", obsidian-web's built-in agent workspace.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const PRODUCT_NAME = COPILOT_LITE ? "Hestia" : "Copilot";

export function branded(text: string): string {
  return COPILOT_LITE ? text.replace(/\bCopilot\b/g, PRODUCT_NAME) : text;
}

// Hestia mark: a hearth arch with a flame (flame from Lucide, ISC), 100x100 for Obsidian's addIcon.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const HEARTH_ICON_SVG = `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="8" d="M20 86V48a30 30 0 0 1 60 0v38"/><path stroke-width="8" d="M8 86h84"/><g transform="translate(26 36) scale(2)"><path stroke-width="4" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></g></g>`;

export const LITE_REPORT_REPO = "ORee1000/obsidian-copilot";

export const LITE_HIDDEN_SETTINGS_TABS: ReadonlySet<string> = new Set([
  "miyo",
  "selfhost",
  "connectors",
]);

export const LITE_UNAVAILABLE_MESSAGE = "This feature is not part of Copilot Lite.";

// Pinned on load and on every update so an old data.json or a stray setter cannot revive a removed feature.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export function applyLiteSettings<T extends Partial<CopilotSettings>>(settings: T): T {
  if (!COPILOT_LITE) return settings;
  return {
    ...settings,
    plusLicenseKey: "",
    isPlusUser: false,
    isPaidUser: false,
    entitlementToken: "",
    entitlementExpiresAt: 0,
    enableSelfHostMode: false,
    enableMiyo: false,
    enableMiyoSearchSkill: false,
    enableMiyoDocumentProcessing: false,
  };
}
