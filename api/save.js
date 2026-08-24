import { checkPassword } from "../lib/auth.js";
import { validateSite } from "../lib/validate.js";
import { generateAll } from "../lib/generate.js";
import { commitFiles, readJsonFile } from "../lib/github.js";

// POST { password, site, images? }
//   images: optional array of { path, base64 } for any cover images uploaded
//           this session (already resized/encoded client-side).
//
// Regenerates every output file from `site`, diffs against the previous
// content/site.json (fetched fresh from GitHub, not trusted from the client)
// to find case studies that were deleted, and commits everything that
// actually changed as one atomic commit. Vercel's existing GitHub integration
// picks up the push and redeploys — this endpoint never talks to Vercel
// directly.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { password, site, images } = req.body || {};
  if (!checkPassword(password)) {
    res.status(401).json({ ok: false, error: "Incorrect password" });
    return;
  }

  const errors = validateSite(site);
  if (errors.length) {
    res.status(400).json({ ok: false, error: "Validation failed", details: errors });
    return;
  }

  try {
    const previousSite = await readJsonFile("content/site.json");
    const previousSlugs = new Set((previousSite?.caseStudies || []).map((cs) => cs.slug));
    const currentSlugs = new Set(site.caseStudies.map((cs) => cs.slug));
    const removedSlugs = [...previousSlugs].filter((slug) => !currentSlugs.has(slug));

    const generated = generateAll(site);
    const textFiles = {
      "content/site.json": JSON.stringify(site, null, 2) + "\n",
      ...generated,
    };

    const imageFiles = {};
    for (const img of images || []) {
      if (!img || typeof img.path !== "string" || typeof img.base64 !== "string") continue;
      if (!img.path.startsWith("images/")) continue; // only ever write into images/
      imageFiles[img.path] = img.base64;
    }

    const deletePaths = removedSlugs.map((slug) => `${slug}.html`);

    const dryRun = process.env.DRY_RUN === "true";
    const message = `Update site content via admin panel (${[...currentSlugs].join(", ")})`;

    const result = await commitFiles({ textFiles, imageFiles, deletePaths, message, dryRun });
    res.status(200).json(result);
  } catch (e) {
    const status = e.status === 409 ? 409 : 500;
    res.status(status).json({ ok: false, error: e.message });
  }
}
