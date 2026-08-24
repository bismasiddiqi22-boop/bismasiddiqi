import { validateSite, slugify } from "../lib/validate.js";

let password = null;
let site = null;
const pendingImages = new Map(); // slug -> { path, base64 }

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- login ----------

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const candidate = $("#loginPassword").value;
  const errEl = $("#loginError");
  errEl.hidden = true;
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: candidate }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Login failed");
    password = candidate;
    sessionStorage.setItem("admin_password", candidate);
    await boot();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

async function tryAutoLogin() {
  const saved = sessionStorage.getItem("admin_password");
  if (!saved) return;
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: saved }),
    });
    if (res.ok) {
      password = saved;
      await boot();
    } else {
      sessionStorage.removeItem("admin_password");
    }
  } catch {
    // ignore, fall back to manual login
  }
}

async function boot() {
  const res = await fetch("/content/site.json", { cache: "no-store" });
  site = await res.json();
  $("#loginScreen").hidden = true;
  $("#editorScreen").hidden = false;
  renderHero();
  renderNumbers();
  renderAbout();
  renderCaseStudies();
}

// ---------- hero ----------

function renderHero() {
  $("#heroEyebrow").value = site.hero.eyebrow;
  $("#heroLine1").value = site.hero.titleLines[0];
  $("#heroLine2").value = site.hero.titleLines[1];
  $("#heroLine3").value = site.hero.titleLines[2];
  $("#heroIsOpen").checked = site.hero.availability.isOpen;
  $("#heroPillText").value = site.hero.availability.pillText;
  $("#heroMetaText").value = site.hero.availability.metaText;
}

function collectHero() {
  site.hero.eyebrow = $("#heroEyebrow").value.trim();
  site.hero.titleLines = [$("#heroLine1").value.trim(), $("#heroLine2").value.trim(), $("#heroLine3").value.trim()];
  site.hero.availability.isOpen = $("#heroIsOpen").checked;
  site.hero.availability.pillText = $("#heroPillText").value.trim();
  site.hero.availability.metaText = $("#heroMetaText").value.trim();
}

// ---------- numbers (fixed 4 rows) ----------

function renderNumbers() {
  const list = $("#numbersList");
  list.innerHTML = "";
  site.numbers.forEach((n, i) => {
    const row = document.createElement("div");
    row.className = "repeat-row";
    row.innerHTML = `
      <div class="repeat-row-fields">
        <select class="num-type">
          <option value="single"${n.type === "single" ? " selected" : ""}>Single (e.g. 20+)</option>
          <option value="range"${n.type === "range" ? " selected" : ""}>Range (e.g. 7–10)</option>
        </select>
        <input type="text" class="num-values" placeholder="value / from-to" value="${
          n.type === "range" ? `${n.from}-${n.to}` : `${n.value}${n.suffix || ""}`
        }">
        <input type="text" class="num-label" placeholder="Label (use <br>)" value="${escapeAttr(n.label)}">
      </div>`;
    list.appendChild(row);
  });
}

function collectNumbers() {
  const rows = $$(".repeat-row", $("#numbersList"));
  site.numbers = rows.map((row) => {
    const type = $(".num-type", row).value;
    const valuesRaw = $(".num-values", row).value.trim();
    const label = $(".num-label", row).value.trim();
    if (type === "range") {
      const [from, to] = valuesRaw.split("-").map((s) => parseInt(s.trim(), 10));
      return { type, from, to, suffix: "", label };
    }
    const m = valuesRaw.match(/^(\d+)(.*)$/);
    return { type, value: m ? parseInt(m[1], 10) : parseInt(valuesRaw, 10) || 0, suffix: m ? m[2] : "", label };
  });
}

// ---------- about ----------

function renderAbout() {
  const pEl = $("#aboutParagraphs");
  pEl.innerHTML = "";
  site.about.paragraphs.forEach((p, i) => pEl.appendChild(makeRemovableRow(
    `<textarea rows="3" class="about-p">${escapeHtml(p)}</textarea>`,
    () => site.about.paragraphs.splice(i, 1) || renderAbout()
  )));

  const eEl = $("#aboutExperience");
  eEl.innerHTML = "";
  site.about.experience.forEach((exp, i) => eEl.appendChild(makeRemovableRow(
    `<div class="repeat-row-fields">
       <input type="text" class="exp-company" placeholder="Company" value="${escapeAttr(exp.company)}">
       <input type="text" class="exp-role" placeholder="Role" value="${escapeAttr(exp.role)}">
       <input type="text" class="exp-year" placeholder="Year (e.g. Present)" value="${escapeAttr(exp.year)}">
     </div>`,
    () => { site.about.experience.splice(i, 1); renderAbout(); }
  )));

  const sEl = $("#aboutSkills");
  sEl.innerHTML = "";
  site.about.skills.forEach((skill, i) => sEl.appendChild(makeRemovableRow(
    `<input type="text" class="about-skill" value="${escapeAttr(skill)}">`,
    () => { site.about.skills.splice(i, 1); renderAbout(); }
  )));
}

function makeRemovableRow(innerHtml, onRemove) {
  const row = document.createElement("div");
  row.className = "repeat-row";
  row.innerHTML = innerHtml + `<button type="button" class="remove-btn" title="Remove">✕</button>`;
  $(".remove-btn", row).addEventListener("click", onRemove);
  return row;
}

$('[data-add="paragraph"]').addEventListener("click", () => {
  site.about.paragraphs.push("");
  renderAbout();
});
$('[data-add="experience"]').addEventListener("click", () => {
  site.about.experience.push({ company: "", role: "", year: "" });
  renderAbout();
});
$('[data-add="skill"]').addEventListener("click", () => {
  site.about.skills.push("");
  renderAbout();
});

function collectAbout() {
  site.about.paragraphs = $$(".about-p").map((el) => el.value.trim()).filter(Boolean);
  site.about.experience = $$(".repeat-row", $("#aboutExperience")).map((row) => ({
    company: $(".exp-company", row).value.trim(),
    role: $(".exp-role", row).value.trim(),
    year: $(".exp-year", row).value.trim(),
  }));
  site.about.skills = $$(".about-skill").map((el) => el.value.trim()).filter(Boolean);
}

// ---------- case studies ----------

function renderCaseStudies() {
  const list = $("#caseStudiesList");
  list.innerHTML = "";
  const tpl = $("#caseStudyTemplate");

  site.caseStudies.forEach((cs, i) => {
    const node = tpl.content.cloneNode(true);
    const card = $(".cs-card", node);
    card.dataset.index = i;
    $(".cs-card-title-label", card).textContent = `${String(i + 1).padStart(2, "0")} — ${cs.cardTitle || "(untitled)"}`;

    $(".f-slug", card).value = cs.slug;
    $(".f-cardMeta", card).value = cs.cardMeta;
    $(".f-cardTitle", card).value = cs.cardTitle;
    $(".f-cardTags", card).value = cs.cardTags.join(", ");
    $(".f-stat0-num", card).value = cs.cardStats[0].num;
    $(".f-stat0-label", card).value = cs.cardStats[0].label;
    $(".f-stat1-num", card).value = cs.cardStats[1].num;
    $(".f-stat1-label", card).value = cs.cardStats[1].label;
    $(".f-coverPreview", card).src = "/" + cs.coverImage;
    $(".f-cardVisualOverlay", card).value = cs.cardVisualOverlay || "";

    $(".f-heroEyebrow", card).value = cs.heroEyebrow;
    $(".f-heroTitle", card).value = cs.heroTitle;
    $(".f-heroTagline", card).value = cs.heroTagline;
    $(".f-heroTags", card).value = cs.heroTags.join(", ");

    [0, 1, 2, 3].forEach((j) => {
      $(`.f-sb${j}-label`, card).value = cs.sidebar[j]?.label || "";
      $(`.f-sb${j}-value`, card).value = cs.sidebar[j]?.value || "";
    });

    $(".f-bodyMarkdown", card).value = cs.bodyMarkdown;

    $(".f-seo-title", card).value = cs.seo.title;
    $(".f-seo-description", card).value = cs.seo.description;
    $(".f-seo-keywords", card).value = cs.seo.keywords;
    $(".f-seo-ogTitle", card).value = cs.seo.ogTitle;
    $(".f-seo-twitterTitle", card).value = cs.seo.twitterTitle;
    $(".f-seo-ogDescription", card).value = cs.seo.ogDescription;
    $(".f-seo-twitterDescription", card).value = cs.seo.twitterDescription;
    $(".f-seo-llmsSummary", card).value = cs.seo.llmsSummary;
    $(".f-seo-jsonLdHeadline", card).value = cs.seo.jsonLdHeadline;
    $(".f-seo-jsonLdDescription", card).value = cs.seo.jsonLdDescription;
    $(".f-seo-jsonLdAbout", card).value = cs.seo.jsonLdAbout;

    $('[data-action="up"]', card).addEventListener("click", () => moveCaseStudy(i, -1));
    $('[data-action="down"]', card).addEventListener("click", () => moveCaseStudy(i, 1));
    $('[data-action="toggle"]', card).addEventListener("click", (e) => {
      const body = $(".cs-card-body", card);
      body.hidden = !body.hidden;
      e.target.textContent = body.hidden ? "Edit" : "Collapse";
    });
    $('[data-action="delete"]', card).addEventListener("click", () => {
      if (!confirm(`Delete the "${cs.cardTitle}" case study? This removes its page and its card from the homepage.`)) return;
      site.caseStudies.splice(i, 1);
      pendingImages.delete(cs.slug);
      renderCaseStudies();
    });
    $('[data-action="preview"]', card).addEventListener("click", () => previewCaseStudy(i));

    $(".f-coverFile", card).addEventListener("change", (e) => handleCoverUpload(e, card, i));

    list.appendChild(node);
  });
}

function moveCaseStudy(index, delta) {
  collectCaseStudies();
  const target = index + delta;
  if (target < 0 || target >= site.caseStudies.length) return;
  const [item] = site.caseStudies.splice(index, 1);
  site.caseStudies.splice(target, 0, item);
  renderCaseStudies();
}

$("#addCaseStudyBtn").addEventListener("click", () => {
  const title = prompt("Case study title (e.g. \"Acme Inc\")?");
  if (!title) return;
  const slug = slugify(title);
  site.caseStudies.push({
    slug,
    coverImage: `images/${slug}/cover.webp`,
    cardVisualOverlay: null,
    cardMeta: "",
    cardTitle: title,
    cardTags: ["TAG"],
    cardStats: [{ num: "", label: "" }, { num: "", label: "" }],
    seo: {
      title: `${title} Case Study | Bisma Siddiqi`,
      description: "",
      keywords: "",
      ogTitle: `${title} Case Study`,
      ogDescription: "",
      twitterTitle: `${title} Case Study`,
      twitterDescription: "",
      jsonLdHeadline: title,
      jsonLdDescription: "",
      jsonLdAbout: "",
      llmsSummary: "",
    },
    heroEyebrow: "",
    heroTitle: title,
    heroTagline: "",
    heroTags: ["TAG"],
    sidebar: [
      { label: "INDUSTRY", value: "" },
      { label: "ROLE", value: "" },
      { label: "SURFACES", value: "" },
      { label: "MY ROLE", value: "" },
    ],
    bodyMarkdown: "## The challenge\n\n\n\n## My role\n\n\n\n## What we built\n\n- \n\n## Outcomes\n\n- \n\n## Built with\n\n",
  });
  renderCaseStudies();
});

async function handleCoverUpload(e, card, index) {
  const file = e.target.files[0];
  if (!file) return;
  const slug = $(".f-slug", card).value.trim() || site.caseStudies[index].slug;

  const bitmap = await createImageBitmap(file);
  const targetW = 1600, targetH = 900;
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  // cover-fit crop, matching the site's background-size:cover convention
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = targetW / targetH;
  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = bitmap.height;
    sw = sh * dstRatio;
    sx = (bitmap.width - sw) / 2;
    sy = 0;
  } else {
    sw = bitmap.width;
    sh = sw / dstRatio;
    sx = 0;
    sy = (bitmap.height - sh) / 2;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const { blob, ext } = await encodeCanvas(canvas, file.type);
  const base64 = await blobToBase64(blob);
  const path = `images/${slug}/cover.${ext}`;

  pendingImages.set(slug, { path, base64 });
  site.caseStudies[index].coverImage = path;
  $(".f-coverPreview", card).src = URL.createObjectURL(blob);
}

function encodeCanvas(canvas, fallbackMime) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, ext: "webp" });
        } else {
          canvas.toBlob(
            (fallbackBlob) => {
              const ext = fallbackMime.includes("png") ? "png" : "jpg";
              resolve({ blob: fallbackBlob, ext });
            },
            fallbackMime.includes("png") ? "image/png" : "image/jpeg",
            0.85
          );
        }
      },
      "image/webp",
      0.82
    );
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function collectCaseStudies() {
  const cards = $$(".cs-card", $("#caseStudiesList"));
  site.caseStudies = cards.map((card) => {
    const csv = (sel) => $(sel, card).value.split(",").map((s) => s.trim()).filter(Boolean);
    const overlay = $(".f-cardVisualOverlay", card).value.trim();
    return {
      slug: $(".f-slug", card).value.trim(),
      coverImage: site.caseStudies[Number(card.dataset.index)]?.coverImage || "",
      cardVisualOverlay: overlay || null,
      cardMeta: $(".f-cardMeta", card).value.trim(),
      cardTitle: $(".f-cardTitle", card).value.trim(),
      cardTags: csv(".f-cardTags"),
      cardStats: [
        { num: $(".f-stat0-num", card).value.trim(), label: $(".f-stat0-label", card).value.trim() },
        { num: $(".f-stat1-num", card).value.trim(), label: $(".f-stat1-label", card).value.trim() },
      ],
      seo: {
        title: $(".f-seo-title", card).value.trim(),
        description: $(".f-seo-description", card).value.trim(),
        keywords: $(".f-seo-keywords", card).value.trim(),
        ogTitle: $(".f-seo-ogTitle", card).value.trim(),
        ogDescription: $(".f-seo-ogDescription", card).value.trim(),
        twitterTitle: $(".f-seo-twitterTitle", card).value.trim(),
        twitterDescription: $(".f-seo-twitterDescription", card).value.trim(),
        jsonLdHeadline: $(".f-seo-jsonLdHeadline", card).value.trim(),
        jsonLdDescription: $(".f-seo-jsonLdDescription", card).value.trim(),
        jsonLdAbout: $(".f-seo-jsonLdAbout", card).value.trim(),
        llmsSummary: $(".f-seo-llmsSummary", card).value.trim(),
      },
      heroEyebrow: $(".f-heroEyebrow", card).value.trim(),
      heroTitle: $(".f-heroTitle", card).value.trim(),
      heroTagline: $(".f-heroTagline", card).value.trim(),
      heroTags: csv(".f-heroTags"),
      sidebar: [0, 1, 2, 3].map((j) => ({
        label: $(`.f-sb${j}-label`, card).value.trim(),
        value: $(`.f-sb${j}-value`, card).value.trim(),
      })),
      bodyMarkdown: $(".f-bodyMarkdown", card).value,
    };
  });
}

async function previewCaseStudy(index) {
  collectAllIntoSite();
  const cs = site.caseStudies[index];
  const res = await fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, site, target: { type: "caseStudy", slug: cs.slug } }),
  });
  const data = await res.json();
  if (!data.ok) {
    alert("Preview failed: " + (data.error || "unknown error") + (data.details ? "\n" + data.details.join("\n") : ""));
    return;
  }
  $("#previewFrame").srcdoc = data.html;
  $("#previewOverlay").hidden = false;
}

$("#previewClose").addEventListener("click", () => {
  $("#previewOverlay").hidden = true;
});

// ---------- save ----------

function collectAllIntoSite() {
  collectHero();
  collectNumbers();
  collectAbout();
  collectCaseStudies();
}

async function save() {
  collectAllIntoSite();
  const errors = validateSite(site);
  const statusEls = [$("#saveStatus"), $("#saveStatusFooter")];
  const btns = [$("#saveBtn"), $("#saveBtnFooter")];

  if (errors.length) {
    statusEls.forEach((el) => { el.textContent = "Fix before saving: " + errors[0]; el.className = "save-status err"; });
    console.error("Validation errors:", errors);
    return;
  }

  btns.forEach((b) => (b.disabled = true));
  statusEls.forEach((el) => { el.textContent = "Saving…"; el.className = "save-status"; });

  const images = Array.from(pendingImages.values());

  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, site, images }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Save failed (${res.status})`);
    }
    pendingImages.clear();
    if (data.noop) {
      statusEls.forEach((el) => { el.textContent = "Nothing changed."; el.className = "save-status ok"; });
    } else {
      statusEls.forEach((el) => {
        el.textContent = "Saved — live in about 30–60 seconds as Vercel redeploys.";
        el.className = "save-status ok";
      });
    }
  } catch (err) {
    statusEls.forEach((el) => { el.textContent = err.message; el.className = "save-status err"; });
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

$("#saveBtn").addEventListener("click", save);
$("#saveBtnFooter").addEventListener("click", save);

// ---------- helpers ----------

function escapeAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

tryAutoLogin();
