import { checkPassword } from "../lib/auth.js";
import { validateSite } from "../lib/validate.js";
import { generateIndexHtml, generateCaseStudyHtml } from "../lib/generate.js";

// Renders one page from a draft `site` object with no GitHub calls at all —
// used by the admin panel's "Preview" button so edits can be checked before
// they're ever committed. Deliberately shares generate.js with api/save.js
// so preview and the real saved output can never drift apart.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { password, site, target } = req.body || {};
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
    if (!target || target.type === "index") {
      res.status(200).json({ ok: true, html: generateIndexHtml(site) });
      return;
    }
    if (target.type === "caseStudy") {
      const index = site.caseStudies.findIndex((cs) => cs.slug === target.slug);
      if (index === -1) {
        res.status(400).json({ ok: false, error: `No case study with slug "${target.slug}"` });
        return;
      }
      const html = generateCaseStudyHtml(site, site.caseStudies[index], index);
      res.status(200).json({ ok: true, html });
      return;
    }
    res.status(400).json({ ok: false, error: `Unknown preview target type "${target.type}"` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
