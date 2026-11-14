import { parseDeviceCodeLine } from "@/agentMode/session/useBackendAuthState";

describe("useBackendAuthState", () => {
  describe("parseDeviceCodeLine()", () => {
    it("reads the one-time code from a colored codex --device-auth line (https://github.com/ORee1000/obsidian-copilot/issues/1)", () => {
      expect(parseDeviceCodeLine("   \u001b[94mHQ3F-OGNXC\u001b[0m")).toBe("HQ3F-OGNXC");
    });

    it("ignores URLs, prose and other output", () => {
      expect(parseDeviceCodeLine("   https://auth.openai.com/codex/device")).toBeNull();
      expect(parseDeviceCodeLine("2. Enter this one-time code (expires in 15 minutes)")).toBeNull();
      expect(parseDeviceCodeLine("")).toBeNull();
    });
  });
});
