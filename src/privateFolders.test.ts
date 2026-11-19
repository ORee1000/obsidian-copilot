import { Notice } from "obsidian";
import * as settingsModel from "@/settings/model";
import {
  assertNotPrivate,
  getPrivateFolders,
  isPrivatePath,
  noticePrivateBlocked,
  parsePrivateFolders,
  PrivateFolderError,
} from "@/privateFolders";

jest.mock("@/settings/model", () => ({
  getSettings: jest.fn(),
}));

const settingsWith = (privateFolders?: string) =>
  ({ privateFolders }) as Parameters<typeof getPrivateFolders>[0];

describe("privateFolders", () => {
  beforeEach(() => {
    (settingsModel.getSettings as jest.Mock).mockReturnValue(
      settingsWith("Developing Notes/00-Agent-Memory")
    );
  });

  describe("parsePrivateFolders()", () => {
    it("splits on newlines and commas, trims slashes and whitespace, and dedupes", () => {
      expect(parsePrivateFolders(" /A/B/ \n C, A/B \n\n")).toEqual(["A/B", "C"]);
    });

    it("returns no folders for an empty or missing value", () => {
      expect(parsePrivateFolders("")).toEqual([]);
      expect(parsePrivateFolders(undefined)).toEqual([]);
    });
  });

  describe("getPrivateFolders()", () => {
    it("reads the private folders from the current settings by default", () => {
      expect(getPrivateFolders()).toEqual(["Developing Notes/00-Agent-Memory"]);
    });

    it("reads the private folders from explicit settings when given", () => {
      expect(getPrivateFolders(settingsWith("X\nY"))).toEqual(["X", "Y"]);
    });
  });

  describe("isPrivatePath()", () => {
    it("matches the folder itself and every path below it, ignoring case (https://github.com/ORee1000/obsidian-copilot/issues/1)", () => {
      expect(isPrivatePath("Developing Notes/00-Agent-Memory")).toBe(true);
      expect(isPrivatePath("Developing Notes/00-Agent-Memory/claude/x.md")).toBe(true);
      expect(isPrivatePath("developing notes/00-agent-memory/README.md")).toBe(true);
    });

    it("does not match siblings that only share a name prefix", () => {
      expect(isPrivatePath("Developing Notes/00-Agent-Memory-old/x.md")).toBe(false);
      expect(isPrivatePath("Developing Notes/Business-System-Dev/00-Index.md")).toBe(false);
    });

    it("matches nothing when no private folders are set or the path is empty", () => {
      expect(isPrivatePath("anything.md", settingsWith(""))).toBe(false);
      expect(isPrivatePath("")).toBe(false);
      expect(isPrivatePath(undefined)).toBe(false);
    });
  });

  describe("assertNotPrivate()", () => {
    it("throws a PrivateFolderError naming the path for a private note", () => {
      expect(() => assertNotPrivate("Developing Notes/00-Agent-Memory/a.md")).toThrow(
        PrivateFolderError
      );
      expect(() => assertNotPrivate("Developing Notes/00-Agent-Memory/a.md")).toThrow(
        "Developing Notes/00-Agent-Memory/a.md"
      );
    });

    it("does nothing for an ordinary note", () => {
      expect(() => assertNotPrivate("Notes/a.md")).not.toThrow();
    });
  });

  describe("noticePrivateBlocked()", () => {
    it("shows one notice for a burst of blocked notes instead of one per note (https://github.com/ORee1000/obsidian-copilot/issues/1)", () => {
      const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
      (Notice as unknown as jest.Mock).mockClear();
      noticePrivateBlocked("Developing Notes/00-Agent-Memory/a.md");
      noticePrivateBlocked("Developing Notes/00-Agent-Memory/b.md");
      expect(Notice).toHaveBeenCalledTimes(1);
      now.mockReturnValue(1_010_000);
      noticePrivateBlocked("Developing Notes/00-Agent-Memory/c.md");
      expect(Notice).toHaveBeenCalledTimes(2);
      now.mockRestore();
    });
  });
});
