jest.unmock("@/lite");

import {
  applyLiteSettings,
  branded,
  COPILOT_LITE,
  COPILOT_PLUGIN_ID,
  HEARTH_ICON_SVG,
  LITE_HIDDEN_SETTINGS_TABS,
  PRODUCT_NAME,
} from "@/lite";
import { COPILOT_SETTINGS_TAB_IDS } from "@/settings/settingsTabs";

describe("lite", () => {
  describe("applyLiteSettings()", () => {
    it("turns off license, Plus, Self-Host and Miyo settings so removed features cannot come back (https://github.com/ORee1000/obsidian-copilot/issues/1)", () => {
      const result = applyLiteSettings({
        plusLicenseKey: "key",
        isPlusUser: true,
        isPaidUser: true,
        entitlementToken: "token",
        entitlementExpiresAt: 123,
        enableSelfHostMode: true,
        enableMiyo: true,
        enableMiyoSearchSkill: true,
        enableMiyoDocumentProcessing: true,
        copilotFolder: "copilot",
      });

      expect(result).toEqual({
        plusLicenseKey: "",
        isPlusUser: false,
        isPaidUser: false,
        entitlementToken: "",
        entitlementExpiresAt: 0,
        enableSelfHostMode: false,
        enableMiyo: false,
        enableMiyoSearchSkill: false,
        enableMiyoDocumentProcessing: false,
        copilotFolder: "copilot",
      });
    });
  });

  it("builds as Hearth under its own plugin id", () => {
    expect(COPILOT_LITE).toBe(true);
    expect(COPILOT_PLUGIN_ID).toBe("hearth");
    expect(PRODUCT_NAME).toBe("Hearth");
    expect(HEARTH_ICON_SVG).toContain('stroke="currentColor"');
  });

  describe("branded()", () => {
    it("names the product Hearth in user-facing labels (https://github.com/ORee1000/obsidian-copilot/issues/1)", () => {
      expect(branded("Open Copilot Agent Chat window")).toBe("Open Hearth Agent Chat window");
      expect(branded("Copilot settings")).toBe("Hearth settings");
      expect(branded("Trigger quick command")).toBe("Trigger quick command");
    });
  });

  it("hides only settings tabs that exist", () => {
    for (const id of LITE_HIDDEN_SETTINGS_TABS) {
      expect(COPILOT_SETTINGS_TAB_IDS).toContain(id);
    }
  });
});
