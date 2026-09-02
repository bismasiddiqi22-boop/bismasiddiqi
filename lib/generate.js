// Generates the static HTML/XML/txt files for the site from content/site.json.
//
// Escaping policy (deliberately simple): every text field in site.json is stored
// EXACTLY as it should appear in the final HTML — including any &amp;/&mdash;/&middot;
// entities and inline <strong>/<em>/<br> tags — and is emitted verbatim, with no
// escaping pass. This is a single-owner site (Bisma edits her own content through
// /admin), so there's no untrusted-input boundary to defend with auto-escaping;
// keeping every field verbatim is what lets the generator reproduce the
// hand-authored HTML byte-for-byte. Markdown case-study bodies are the one
// exception: they go through `marked`, which does its own correct HTML escaping
// for plain text while still passing through intentional raw tags like <strong>.

import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const ICON_SUN =
  '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5" y1="5" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19" y2="19"/><line x1="5" y1="19" x2="6.8" y2="17.2"/><line x1="17.2" y1="6.8" x2="19" y2="5"/></svg>';
const ICON_MOON =
  '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
const ICON_EMAIL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 6.5l8 6 8-6"/></svg>';
const ICON_LINKEDIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="7.2" r="0.9" fill="currentColor" stroke="none"/><line x1="7.5" y1="10.5" x2="7.5" y2="16.5"/><line x1="11" y1="10.5" x2="11" y2="16.5"/><path d="M11 14.3c0-1.7 1.1-2.8 2.4-2.8s2.3 1 2.3 2.6v2.4"/></svg>';

const SITE_URL = "https://bismasiddiqi.vercel.app";
const OWNER_EMAIL = "bismasiddiqi22@gmail.com";

function favicons() {
  return `<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#0C0C0B">`;
}

function ogTwitterTags({ type, title, description, url, twitterTitle, twitterDescription }) {
  return `<meta property="og:type" content="${type}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Bisma Siddiqi">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${twitterTitle != null ? twitterTitle : title}">
<meta name="twitter:description" content="${twitterDescription != null ? twitterDescription : description}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">`;
}

function navBar(homeHref, workHref, aboutHref, expHref) {
  return `<nav id="nav">
  <div class="nav-inner">
    <a href="${homeHref}" class="nav-logo">bisma</a>
    <div class="nav-links" id="navLinks">
      <a href="${workHref}">Work</a>
      <a href="${aboutHref}">About</a>
      <a href="${expHref}">Experience</a>
    </div>
    <div class="nav-actions">
      <button class="theme-toggle" id="themeToggle" aria-label="Switch to light theme">
        ${ICON_SUN}
        ${ICON_MOON}
      </button>
      <a href="mailto:${OWNER_EMAIL}" class="nav-cta js-open-contact">Let's Talk</a>
      <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
      </button>
    </div>
  </div>
</nav>`;
}

function contactSection() {
  return `<section id="contact" class="contact-section reveal">
    <p class="eyebrow">GET IN TOUCH</p>
    <h2 class="contact-title">Have a product that<br>needs direction?</h2>
    <a href="mailto:${OWNER_EMAIL}" class="contact-cta js-open-contact">
      Let's Talk <span class="cta-arrow">↗</span>
    </a>
    <p class="contact-email">${OWNER_EMAIL}</p>
  </section>`;
}

function footerModalScript() {
  return `<footer class="site-footer">
  <div class="footer-inner">
    <span class="footer-logo">bisma</span>
    <div class="footer-links">
      <a href="mailto:${OWNER_EMAIL}" aria-label="Email" title="Email">
        ${ICON_EMAIL}
      </a>
      <a href="https://www.linkedin.com/in/bisma-siddiqi" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">
        ${ICON_LINKEDIN}
      </a>
    </div>
    <span class="footer-copy">© <span id="year"></span> Bisma · Project Manager, BA &amp; Product</span>
  </div>
</footer>

<div class="modal-backdrop" id="contactModalBackdrop" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">
    <button class="modal-close" id="contactModalClose" aria-label="Close contact form" type="button">✕</button>
    <h3 id="contactModalTitle" class="modal-title">Let's talk</h3>
    <p class="modal-sub">Tell me a bit about your project and I'll get back to you.</p>
    <form id="contactForm" class="contact-form">
      <div class="form-field">
        <label for="cfName">Name</label>
        <input type="text" id="cfName" name="name" autocomplete="name" required>
      </div>
      <div class="form-field">
        <label for="cfPhone">Contact number</label>
        <div class="phone-field">
          <select class="phone-code" id="cfCountryCode" aria-label="Country code">
            <option value="+1" selected>&#127482;&#127480; +1</option>
            <option value="+44">&#127468;&#127463; +44</option>
            <option value="+353">&#127470;&#127466; +353</option>
            <option value="+49">&#127465;&#127466; +49</option>
            <option value="+33">&#127467;&#127479; +33</option>
            <option value="+31">&#127475;&#127473; +31</option>
            <option value="+34">&#127466;&#127480; +34</option>
            <option value="+39">&#127470;&#127481; +39</option>
            <option value="+971">&#127462;&#127466; +971</option>
            <option value="+966">&#127480;&#127462; +966</option>
            <option value="+974">&#127478;&#127462; +974</option>
            <option value="+965">&#127472;&#127484; +965</option>
            <option value="+973">&#127463;&#127469; +973</option>
            <option value="+968">&#127476;&#127474; +968</option>
            <option value="+92">&#127477;&#127472; +92</option>
          </select>
          <input type="tel" id="cfPhone" name="phone" autocomplete="tel">
        </div>
      </div>
      <div class="form-field">
        <label for="cfEmail">Email</label>
        <input type="email" id="cfEmail" name="email" autocomplete="email" required>
      </div>
      <div class="form-field">
        <label for="cfMessage">Description</label>
        <textarea id="cfMessage" name="message" rows="4" required></textarea>
      </div>
      <button type="submit" class="btn-primary modal-submit">Send message</button>
      <p class="modal-note">Opens your email app with this pre-filled, addressed to me.</p>
    </form>
  </div>
</div>

<div class="cursor-label" id="cursorLabel">View</div>

<script src="script.js"></script>`;
}

function heroSection(hero) {
  const [line1, line2, line3] = hero.titleLines;
  const pillClass = hero.availability.isOpen ? "pill available" : "pill";
  return `<section id="top" class="hero">
    <div class="hero-top">
      <p class="eyebrow reveal-line">${hero.eyebrow}</p>
    </div>
    <h1 class="hero-title">
      <span class="tl-wrap"><span class="tl">${line1}</span></span>
      <span class="tl-wrap"><span class="tl">${line2}</span></span>
      <span class="tl-wrap"><span class="tl">${line3}</span></span>
    </h1>
    <div class="hero-bottom">
      <div class="hero-left">
        <span class="${pillClass}">
          <span class="pill-dot"></span>
          ${hero.availability.pillText}
        </span>
        <span class="hero-meta">${hero.availability.metaText}</span>
      </div>
      <div class="hero-right">
        <a href="#work" class="btn-primary">View My Work</a>
      </div>
    </div>
    <div class="scroll-indicator">
      <span class="scroll-line"></span>
      <span>SCROLL</span>
    </div>
  </section>`;
}

function flowSection() {
  const words = ["Requirement", "Analysis", "Product", "Prototype", "Design", "Development", "QA", "Delivery"];
  const track = words.map((w) => `          <span class="flow-word">${w}</span><span class="flow-plus">+</span>`).join("\n");
  return `<section class="flow-section reveal">
    <h2 class="flow-heading">Where requirements<br>meet execution</h2>
    <div class="marquee-bordered" aria-hidden="true">
      <div class="marquee" data-speed-px="50">
        <div class="marquee-track">
${track}
        </div>
      </div>
    </div>
  </section>`;
}

function cardVisualStyle(cs) {
  // background-image (not the `background` shorthand) so this inline style
  // doesn't reset the .pcard-visual class's background-size/position to
  // their defaults — the shorthand would win over the stylesheet since
  // inline styles always beat external rules.
  const bg = cs.cardVisualOverlay
    ? `${cs.cardVisualOverlay}, url('${cs.coverImage}')`
    : `url('${cs.coverImage}')`;
  return `background-image: ${bg};`;
}

function pcard(cs, position) {
  const num = String(position + 1).padStart(2, "0");
  const tags = cs.cardTags.map((t) => `              <span class="tag">${t}</span>`).join("\n");
  const stats = cs.cardStats
    .map(
      (s) => `            <div class="pcard-stat">
              <span class="pcard-stat-num">${s.num}</span>
              <span class="pcard-stat-label">${s.label}</span>
            </div>`
    )
    .join("\n");
  return `      <a class="pcard reveal" data-tint="${cs.slug}" href="${cs.slug}.html">
        <div class="pcard-info">
          <div class="pcard-top">
            <span class="pcard-num">${num}</span>
          </div>
          <div class="pcard-mid">
            <p class="pcard-meta">${cs.cardMeta}</p>
            <h3 class="pcard-title">${cs.cardTitle}</h3>
            <div class="pcard-tags">
${tags}
            </div>
          </div>
          <div class="pcard-stats">
${stats}
          </div>
        </div>
        <div class="pcard-visual" style="${cardVisualStyle(cs)}">
          <span class="pcard-arrow" aria-hidden="true">↗</span>
        </div>
      </a>`;
}

function workGrid(caseStudies) {
  const cards = caseStudies.map((cs, i) => pcard(cs, i)).join("\n\n");
  return `<section id="work" class="work-section">
    <div class="section-head reveal">
      <p class="eyebrow">SELECTED WORK</p>
      <h2 class="section-title">Work</h2>
    </div>

    <div class="work-grid">

${cards}

    </div>
  </section>`;
}

function numbersSection(numbers) {
  const items = numbers
    .map((n) => {
      const val =
        n.type === "range"
          ? `<span class="count" data-to="${n.from}">0</span>–<span class="count" data-to="${n.to}">0</span>`
          : `<span class="count" data-to="${n.value}">0</span>${n.suffix || ""}`;
      return `      <div class="pmetric">
        <span class="pm-val">${val}</span>
        <span class="pm-label">${n.label}</span>
      </div>`;
    })
    .join("\n");
  return `<section class="numbers-section reveal">
    <p class="eyebrow center">A FEW NUMBERS</p>
    <div class="numbers-grid">
${items}
    </div>
  </section>`;
}

function howIWorkSection() {
  const steps = [
    "Discover", "Define", "Plan", "Prototype", "Design", "Build", "Validate", "Deliver",
  ];
  const items = steps
    .map(
      (s, i) =>
        `      <li class="step-item"><span class="step-num">${String(i + 1).padStart(2, "0")}</span><span class="step-name">${s}</span></li>`
    )
    .join("\n");
  return `<section class="howiwork-section reveal">
    <p class="eyebrow">HOW I WORK</p>
    <h2 class="section-title">My process</h2>

    <ol class="step-list">
${items}
    </ol>
  </section>`;
}

function aboutSection(about) {
  const paragraphs = about.paragraphs.map((p) => `        <p>${p}</p>`).join("\n");
  const experience = about.experience
    .map(
      (e) => `          <li class="exp-item">
            <div class="ei-l">
              <span class="ei-co">${e.company}</span>
              <span class="ei-role">${e.role}</span>
            </div>
            <span class="ei-yr">${e.year}</span>
          </li>`
    )
    .join("\n");
  const skills = about.skills.map((s) => `          <span class="skill-pill">${s}</span>`).join("\n");
  return `<section id="about" class="about-section">
    <p class="eyebrow reveal">MY STORY</p>
    <h2 class="about-title reveal">About Bisma</h2>

    <div class="about-grid">
      <div class="about-copy reveal">
${paragraphs}
      </div>

      <div id="experience" class="about-side reveal">
        <p class="eyebrow small">EXPERIENCE</p>
        <ul class="exp-list">
${experience}
        </ul>

        <p class="eyebrow small awards-label">SKILLS</p>
        <div class="pill-row skills-row">
${skills}
        </div>
      </div>
    </div>
  </section>`;
}

function aboutMeSection() {
  return `<section class="aboutme-section reveal">
    <h2 class="aboutme-title">More than a<br>project manager.</h2>
  </section>`;
}

// ---------- index.html ----------

export function generateIndexHtml(site) {
  const { hero, numbers, about, caseStudies } = site;
  const head = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bisma Siddiqi — Project Manager &amp; Business Analyst | Product Strategy</title>
<meta name="description" content="Bisma Siddiqi is a Project Manager and Business Analyst who turns complex requirements into products people use. Case studies from EdTech and luxury maritime SaaS platforms, working with teams across the USA, UK, Europe, and the Gulf.">
<meta name="keywords" content="Project Manager, Business Analyst, Product Manager, Product Strategy, Requirements Gathering, Product Architecture, EdTech, SaaS, Remote Project Manager">
<meta name="author" content="Bisma Siddiqi">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${SITE_URL}/">

${favicons()}

${ogTwitterTags({
  type: "website",
  title: "Bisma Siddiqi — Project Manager &amp; Business Analyst",
  description: "I turn complex requirements into products people use. Case studies in EdTech and luxury maritime SaaS, serving clients across the USA, UK, Europe, and the Gulf.",
  twitterDescription: "I turn complex requirements into products people use.",
  url: `${SITE_URL}/`,
})}

<link rel="preload" href="fonts/Syne-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": "Bisma Siddiqi",
    "alternateName": "Bisma",
    "url": "${SITE_URL}/",
    "image": "${SITE_URL}/og-image.png",
    "jobTitle": "Project Manager & Business Analyst",
    "description": "Project Manager and Business Analyst who turns complex requirements into products people use, working across EdTech, maritime SaaS, health tech, and healthcare marketplace products.",
    "email": "mailto:${OWNER_EMAIL}",
    "sameAs": ["https://www.linkedin.com/in/bisma-siddiqi"],
    "knowsAbout": ["Project Management", "Business Analysis", "Product Strategy", "Requirements Gathering", "Product Architecture", "Agile", "Quality Assurance"],
    "worksFor": { "@type": "Organization", "name": "Dot2Shape" },
    "areaServed": ["United States", "United Kingdom", "Europe", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"]
  }
}
</script>`;

  const body = `<div class="grain"></div>

${navBar("#top", "#work", "#about", "#experience")}

<main>

  <!-- HERO -->
  ${heroSection(hero)}

  <!-- MARQUEE: WHERE REQUIREMENTS MEET EXECUTION -->
  ${flowSection()}

  <!-- SELECTED WORK -->
  ${workGrid(caseStudies)}

  <!-- A FEW NUMBERS -->
  ${numbersSection(numbers)}

  <!-- HOW I WORK -->
  ${howIWorkSection()}

  <!-- ABOUT / EXPERIENCE -->
  ${aboutSection(about)}

  <!-- ABOUT ME CALLOUT -->
  ${aboutMeSection()}

  <!-- CONTACT -->
  ${contactSection()}

</main>

${footerModalScript()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>

${body}
</body>
</html>
`;
}

// ---------- case study pages ----------

function csHeroSection(cs) {
  const tags = cs.heroTags.map((t) => `      <span class="tag">${t}</span>`).join("\n");
  return `<section class="cs-hero">
    <a href="index.html#work" class="cs-back">&larr; Back to work</a>
    <p class="eyebrow">${cs.heroEyebrow}</p>
    <h1 class="cs-title">${cs.heroTitle}</h1>
    <p class="cs-tagline">${cs.heroTagline}</p>
    <div class="pcard-tags cs-tags">
${tags}
    </div>
  </section>`;
}

function csVisual(cs) {
  return `<div class="cs-visual" data-tint="${cs.slug}" role="img" aria-label="${cs.heroTitle} product visual" style="background-image:url('${cs.coverImage}');"></div>`;
}

function csSidebar(cs) {
  const rows = cs.sidebar
    .map((r) => `      <div><span class="eyebrow small">${r.label}</span><p>${r.value}</p></div>`)
    .join("\n");
  return `<aside class="cs-sidebar">
${rows}
    </aside>`;
}

function csProse(bodyMarkdown) {
  const html = marked.parse(bodyMarkdown).trim();
  const indented = html
    .split("\n")
    .map((line) => (line ? "      " + line : line))
    .join("\n");
  return `<div class="cs-prose">
${indented}
    </div>`;
}

function csNext(caseStudies, index) {
  const next = caseStudies[(index + 1) % caseStudies.length];
  return `<section class="cs-next">
    <a href="${next.slug}.html" class="cs-next-link">
      <span class="eyebrow small">NEXT CASE STUDY</span>
      <span class="cs-next-title">${next.heroTitle} &rarr;</span>
    </a>
  </section>`;
}

export function generateCaseStudyHtml(site, cs, index) {
  const canonical = `${SITE_URL}/${cs.slug}.html`;
  const head = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cs.seo.title}</title>
<meta name="description" content="${cs.seo.description}">
<meta name="keywords" content="${cs.seo.keywords}">
<meta name="author" content="Bisma Siddiqi">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">

${favicons()}

${ogTwitterTags({
  type: "article",
  title: cs.seo.ogTitle,
  description: cs.seo.ogDescription,
  twitterTitle: cs.seo.twitterTitle,
  twitterDescription: cs.seo.twitterDescription,
  url: canonical,
})}

<link rel="stylesheet" href="styles.css">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${cs.seo.jsonLdHeadline}",
  "description": "${cs.seo.jsonLdDescription}",
  "author": { "@type": "Person", "name": "Bisma Siddiqi", "url": "${SITE_URL}/" },
  "publisher": { "@type": "Person", "name": "Bisma Siddiqi" },
  "image": "${SITE_URL}/og-image.png",
  "url": "${canonical}",
  "about": "${cs.seo.jsonLdAbout}",
  "mainEntityOfPage": "${canonical}"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Bisma Siddiqi", "item": "${SITE_URL}/" },
    { "@type": "ListItem", "position": 2, "name": "Work", "item": "${SITE_URL}/#work" },
    { "@type": "ListItem", "position": 3, "name": "${cs.heroTitle}", "item": "${canonical}" }
  ]
}
</script>`;

  const body = `<div class="grain"></div>

${navBar("index.html", "index.html#work", "index.html#about", "index.html#experience")}

<main>

  ${csHeroSection(cs)}

  ${csVisual(cs)}

  <section class="cs-content">
    ${csSidebar(cs)}

    ${csProse(cs.bodyMarkdown)}
  </section>

  ${csNext(site.caseStudies, index)}

  ${contactSection()}

</main>

${footerModalScript()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>

${body}
</body>
</html>
`;
}

// ---------- sitemap.xml / llms.txt ----------

export function generateSitemapXml(site) {
  const urls = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...site.caseStudies.map(
      (cs) =>
        `  <url>\n    <loc>${SITE_URL}/${cs.slug}.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ),
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function generateLlmsTxt(site) {
  const bullets = site.caseStudies
    .map(
      (cs) =>
        `- [${cs.heroTitle}](${SITE_URL}/${cs.slug}.html): ${cs.seo.llmsSummary}`
    )
    .join("\n");
  return `# Bisma Siddiqi

> Project Manager and Business Analyst who turns complex requirements into products people use. Works across EdTech, luxury maritime SaaS, health tech, and healthcare marketplace products, with clients across the USA, UK, Europe, and the Gulf.

Bisma leads discovery, requirements gathering, product strategy, and product architecture, then coordinates design, engineering, and QA through delivery. She is available for remote project management, business analysis, and product work worldwide.

## Case studies

${bullets}

## Contact

- Email: ${OWNER_EMAIL}
- LinkedIn: https://www.linkedin.com/in/bisma-siddiqi
- Site: ${SITE_URL}/
`;
}

export function generateAll(site) {
  const out = {};
  out["index.html"] = generateIndexHtml(site);
  site.caseStudies.forEach((cs, i) => {
    out[`${cs.slug}.html`] = generateCaseStudyHtml(site, cs, i);
  });
  out["sitemap.xml"] = generateSitemapXml(site);
  out["llms.txt"] = generateLlmsTxt(site);
  return out;
}
