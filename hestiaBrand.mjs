import fs from "node:fs";

// The fork ships as "Hestia" with no "copilot" left in anything it shows, stores or names. Rebranding at
// bundle time keeps upstream's sources untouched, so rebases don't conflict on hundreds of strings.
// https://github.com/ORee1000/obsidian-copilot/issues/1
const STANDALONE_WORD = /\bCopilot\b/g;

// Module specifiers must keep resolving to upstream's file names, and these are other parties' names.
// https://github.com/ORee1000/obsidian-copilot/issues/1
const KEEP = [
  /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\w*\s*(?:<[^>]*>)?\(\s*|^\s*import\s+|\bjest\.\w+\(\s*)(["'])[^"'\n]+\1/gm,
  /https?:\/\/[^\s"'`)<>]+/g,
  /(?:logancyang|Brevilabs|ORee1000)\/obsidian-copilot[\w-]*/g,
  /github-copilot/g,
  /obsidiancopilot|obcopilot/g,
  /OPENARTIFACTS_CLIENT_ID = "obsidian-copilot"/g,
  /"X-Pplx-Integration": "obsidian-copilot"/g,
];

export function rebrand(source) {
  const kept = [];
  let out = source;
  for (const pattern of KEEP) {
    out = out.replace(pattern, (match) => {
      kept.push(match);
      return `\u0000${kept.length - 1}\u0000`;
    });
  }
  out = out.replace(STANDALONE_WORD, "Hestia").replace(/copilot/g, "hestia");
  // eslint-disable-next-line no-control-regex -- restores the placeholders inserted above
  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => kept[Number(index)]);
}

export default {
  name: "hestia-brand",
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/].*\.tsx?$/ }, async (args) => {
      if (/\.(test|stories)\.tsx?$/.test(args.path)) return null;
      const source = await fs.promises.readFile(args.path, "utf8");
      return { contents: rebrand(source), loader: args.path.endsWith("x") ? "tsx" : "ts" };
    });
    build.onEnd(async () => {
      const css = await fs.promises.readFile("styles.css", "utf8");
      await fs.promises.writeFile("styles.css", rebrand(css));
    });
  },
};
