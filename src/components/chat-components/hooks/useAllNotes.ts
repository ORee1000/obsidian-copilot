import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { TFile } from "obsidian";
import { notesAtom } from "@/state/vaultDataAtoms";
import { settingsStore, useSettingsValue } from "@/settings/model";
import { isPrivatePath } from "@/privateFolders";

export function useAllNotes(): TFile[] {
  const allNotes = useAtomValue(notesAtom, { store: settingsStore });
  const settings = useSettingsValue();

  return useMemo(
    () =>
      allNotes
        .filter((note) => !isPrivatePath(note.path, settings))
        .sort((a, b) => b.stat.ctime - a.stat.ctime),
    [allNotes, settings]
  );
}
