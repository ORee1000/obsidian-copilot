import { getEffectiveCopilotFolder } from "@/settings/copilotFolder";
import { type ReportUploader } from "@/utils/reportUpload";
import { normalizePath, type DataAdapter } from "obsidian";

export const REPORTS_SUBFOLDER = "reports";

function reportStamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

// Lite has no report service; the zip stays in the vault so it can be downloaded and attached to the fork's issue.
// https://github.com/ORee1000/obsidian-copilot/issues/1
export function createVaultReportSaver(
  adapter: Pick<DataAdapter, "exists" | "mkdir" | "writeBinary">,
  now: () => Date = () => new Date()
): ReportUploader {
  return async (attempt) => {
    const folder = normalizePath(`${getEffectiveCopilotFolder()}/${REPORTS_SUBFOLDER}`);
    if (!(await adapter.exists(folder))) {
      await adapter.mkdir(folder);
    }
    const path = normalizePath(`${folder}/copilot-report-${reportStamp(now())}.zip`);
    await adapter.writeBinary(path, attempt.body);
    return { reportId: path, expiresAt: "" };
  };
}
