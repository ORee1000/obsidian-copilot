import { createVaultReportSaver } from "@/utils/reportUpload.vault";

jest.mock("@/settings/copilotFolder", () => ({
  getEffectiveCopilotFolder: () => "copilot",
}));

function fakeAdapter(existing: string[] = []) {
  const folders = new Set(existing);
  const files = new Map<string, ArrayBuffer>();
  return {
    folders,
    files,
    exists: jest.fn(async (path: string) => folders.has(path) || files.has(path)),
    mkdir: jest.fn(async (path: string) => {
      folders.add(path);
    }),
    writeBinary: jest.fn(async (path: string, data: ArrayBuffer) => {
      files.set(path, data);
    }),
  };
}

describe("reportUpload.vault", () => {
  describe("createVaultReportSaver()", () => {
    const now = () => new Date("2026-11-14T10:20:30.456Z");
    const attempt = { body: new Uint8Array([1, 2, 3]).buffer, idempotencyKey: "k" };

    it("writes the report zip under the Copilot folder and returns its vault path as the report id (https://github.com/ORee1000/obsidian-copilot/issues/1)", async () => {
      const adapter = fakeAdapter();
      const result = await createVaultReportSaver(adapter, now)(attempt);

      expect(result).toEqual({
        reportId: "copilot/reports/copilot-report-2026-11-14T10-20-30-456Z.zip",
        expiresAt: "",
      });
      expect(adapter.folders.has("copilot/reports")).toBe(true);
      expect(adapter.files.get(result.reportId)).toBe(attempt.body);
    });

    it("reuses an existing reports folder without recreating it", async () => {
      const adapter = fakeAdapter(["copilot/reports"]);
      await createVaultReportSaver(adapter, now)(attempt);

      expect(adapter.mkdir).not.toHaveBeenCalled();
    });
  });
});
