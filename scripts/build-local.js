// Local, no-network sanity check: regenerate every output file from
// content/site.json and write it into __generated__/ so it can be diffed
// against the live root files before any API/GitHub code is wired up.
//
// Usage: node scripts/build-local.js

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateAll } from "../lib/generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "__generated__");

const site = JSON.parse(readFileSync(join(root, "content", "site.json"), "utf8"));
mkdirSync(outDir, { recursive: true });

const files = generateAll(site);
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content, "utf8");
  console.log("wrote", name, `(${content.length} bytes)`);
}
