// Isomorphic validation for the site.json shape — imported both by admin.js
// (in the browser, before Save is even attempted) and by api/save.js (on the
// server, as the real gate). No Node-only APIs here on purpose.

const RESERVED_SLUGS = new Set([
  "admin", "api", "content", "lib", "scripts", "images", "fonts",
  "index", "styles", "script", "sitemap", "llms", "robots",
  "favicon", "og-image", "apple-touch-icon", "site",
]);

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** @returns {string[]} list of human-readable problems; empty = valid */
export function validateSite(site) {
  const errors = [];

  if (!site || typeof site !== "object") {
    return ["site is not an object"];
  }

  // --- hero ---
  const hero = site.hero;
  if (!hero) errors.push("hero is missing");
  else {
    if (!isNonEmptyString(hero.eyebrow)) errors.push("hero.eyebrow is required");
    if (!Array.isArray(hero.titleLines) || hero.titleLines.length !== 3 || !isStringArray(hero.titleLines)) {
      errors.push("hero.titleLines must be exactly 3 strings");
    }
    if (!hero.availability || typeof hero.availability.isOpen !== "boolean") {
      errors.push("hero.availability.isOpen must be true/false");
    }
    if (!isNonEmptyString(hero.availability?.pillText)) errors.push("hero.availability.pillText is required");
    if (!isNonEmptyString(hero.availability?.metaText)) errors.push("hero.availability.metaText is required");
  }

  // --- numbers ---
  if (!Array.isArray(site.numbers) || site.numbers.length !== 4) {
    errors.push("numbers must be exactly 4 entries (the layout is a fixed 4-cell grid)");
  } else {
    site.numbers.forEach((n, i) => {
      if (n.type !== "single" && n.type !== "range") errors.push(`numbers[${i}].type must be "single" or "range"`);
      if (n.type === "single" && typeof n.value !== "number") errors.push(`numbers[${i}].value must be a number`);
      if (n.type === "range" && (typeof n.from !== "number" || typeof n.to !== "number")) {
        errors.push(`numbers[${i}].from/to must be numbers`);
      }
      if (!isNonEmptyString(n.label)) errors.push(`numbers[${i}].label is required`);
    });
  }

  // --- about ---
  const about = site.about;
  if (!about) errors.push("about is missing");
  else {
    if (!Array.isArray(about.paragraphs) || about.paragraphs.length === 0 || !isStringArray(about.paragraphs)) {
      errors.push("about.paragraphs must be a non-empty list of strings");
    }
    if (!Array.isArray(about.experience) || about.experience.length === 0) {
      errors.push("about.experience must be a non-empty list");
    } else {
      about.experience.forEach((e, i) => {
        if (!isNonEmptyString(e.company)) errors.push(`about.experience[${i}].company is required`);
        if (!isNonEmptyString(e.role)) errors.push(`about.experience[${i}].role is required`);
        if (!isNonEmptyString(e.year)) errors.push(`about.experience[${i}].year is required`);
      });
    }
    if (!isStringArray(about.skills) || about.skills.length === 0) {
      errors.push("about.skills must be a non-empty list of strings");
    }
  }

  // --- caseStudies ---
  if (!Array.isArray(site.caseStudies) || site.caseStudies.length === 0) {
    errors.push("caseStudies must be a non-empty list");
  } else {
    const seenSlugs = new Set();
    site.caseStudies.forEach((cs, i) => {
      const where = `caseStudies[${i}]${cs.slug ? ` (${cs.slug})` : ""}`;

      if (!isNonEmptyString(cs.slug)) {
        errors.push(`${where}.slug is required`);
      } else {
        const clean = slugify(cs.slug);
        if (clean !== cs.slug) errors.push(`${where}.slug must be lowercase letters/numbers/hyphens only`);
        if (RESERVED_SLUGS.has(cs.slug)) errors.push(`${where}.slug "${cs.slug}" is reserved, pick another`);
        if (seenSlugs.has(cs.slug)) errors.push(`${where}.slug "${cs.slug}" is used by more than one case study`);
        seenSlugs.add(cs.slug);
      }

      if (!isNonEmptyString(cs.coverImage)) errors.push(`${where}.coverImage is required`);
      if (!isNonEmptyString(cs.cardMeta)) errors.push(`${where}.cardMeta is required`);
      if (!isNonEmptyString(cs.cardTitle)) errors.push(`${where}.cardTitle is required`);
      if (!isStringArray(cs.cardTags) || cs.cardTags.length === 0) errors.push(`${where}.cardTags must be a non-empty list`);
      if (!Array.isArray(cs.cardStats) || cs.cardStats.length !== 2) {
        errors.push(`${where}.cardStats must be exactly 2 entries`);
      } else {
        cs.cardStats.forEach((s, j) => {
          if (!isNonEmptyString(s.num)) errors.push(`${where}.cardStats[${j}].num is required`);
          if (!isNonEmptyString(s.label)) errors.push(`${where}.cardStats[${j}].label is required`);
        });
      }

      const seo = cs.seo;
      if (!seo) errors.push(`${where}.seo is missing`);
      else {
        [
          "title", "description", "keywords", "ogTitle", "ogDescription",
          "twitterTitle", "twitterDescription", "jsonLdHeadline", "jsonLdDescription",
          "jsonLdAbout", "llmsSummary",
        ].forEach((f) => {
          if (!isNonEmptyString(seo[f])) errors.push(`${where}.seo.${f} is required`);
        });
      }

      if (!isNonEmptyString(cs.heroEyebrow)) errors.push(`${where}.heroEyebrow is required`);
      if (!isNonEmptyString(cs.heroTitle)) errors.push(`${where}.heroTitle is required`);
      if (!isNonEmptyString(cs.heroTagline)) errors.push(`${where}.heroTagline is required`);
      if (!isStringArray(cs.heroTags) || cs.heroTags.length === 0) errors.push(`${where}.heroTags must be a non-empty list`);

      if (!Array.isArray(cs.sidebar) || cs.sidebar.length !== 4) {
        errors.push(`${where}.sidebar must be exactly 4 rows`);
      } else {
        cs.sidebar.forEach((r, j) => {
          if (!isNonEmptyString(r.label)) errors.push(`${where}.sidebar[${j}].label is required`);
          if (!isNonEmptyString(r.value)) errors.push(`${where}.sidebar[${j}].value is required`);
        });
      }

      if (!isNonEmptyString(cs.bodyMarkdown)) errors.push(`${where}.bodyMarkdown is required`);
    });
  }

  return errors;
}
