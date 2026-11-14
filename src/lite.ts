import type { CopilotSettings } from "@/settings/model";

// Copilot Lite drops Copilot Plus, Miyo and Brevilabs services; every Lite deviation keys off this flag.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const COPILOT_LITE = true;

// Lite installs beside upstream Copilot so the community updater never replaces it.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export const COPILOT_PLUGIN_ID = COPILOT_LITE ? "copilot-lite" : "copilot";

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
