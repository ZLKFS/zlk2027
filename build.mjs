// Static site generator for zlk2027.latviesi.se
// Reads content/recipes.json, writes public/. No dependencies: `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const OUT = join(ROOT, "public");
const ORIGIN = "https://zlk2027.latviesi.se";
const data = JSON.parse(readFileSync(join(ROOT, "content/recipes.json"), "utf8"));
const LANGS = ["lv", "sv"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");
const base = (lang) => (lang === "lv" ? "/" : "/sv/");
const recipeUrl = (lang, slug) => `${base(lang)}${slug}/`;
const other = (lang) => (lang === "lv" ? "sv" : "lv");

function layout({ lang, title, description, path, altPath, image, body, bodyClass }) {
  const t = data.site[lang];
  return `<!doctype html>
<html lang="${lang}" data-alt="${altPath}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${path}">
<link rel="alternate" hreflang="lv" href="${ORIGIN}${lang === "lv" ? path : altPath}">
<link rel="alternate" hreflang="sv" href="${ORIGIN}${lang === "sv" ? path : altPath}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${ORIGIN}${path}">
${image ? `<meta property="og:image" content="${ORIGIN}${image}">` : ""}
<meta name="theme-color" content="#FCF7E8">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
<script>(function(){try{var l=localStorage.getItem("zlk-lang"),c=document.documentElement.lang,a=document.documentElement.getAttribute("data-alt");if(l&&l!==c&&a)location.replace(a)}catch(e){}})();</script>
</head>
<body class="${bodyClass || ""}">
<header class="site-head wrap">
  <a class="brand" href="${base(lang)}"><span class="brand-year">2027</span><span class="brand-name">${esc(t.name)}</span></a>
  <nav class="lang" aria-label="${esc(t.lang)}">
    <a href="${lang === "lv" ? path : altPath}" hreflang="lv" lang="lv" data-lang="lv"${lang === "lv" ? ' class="is-active" aria-current="page"' : ""}>LV</a>
    <a href="${lang === "sv" ? path : altPath}" hreflang="sv" lang="sv" data-lang="sv"${lang === "sv" ? ' class="is-active" aria-current="page"' : ""}>SV</a>
  </nav>
</header>
${body}
<footer class="site-foot wrap">
  <p>${esc(t.name)} 2027 · <a href="${ORIGIN}">zlk2027.latviesi.se</a></p>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function picture(slug, alt, { eager = false, sizes } = {}) {
  return `<img src="/img/${slug}.jpg" srcset="/img/${slug}-800.jpg 800w, /img/${slug}.jpg 1600w" sizes="${sizes}" width="1600" height="893" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
}

function card(lang, r) {
  const t = data.site[lang];
  const c = r[lang];
  const month = t.months[r.month - 1];
  const empty = c.steps.length === 0;
  const media = r.image
    ? `<div class="card-media">${picture(r.slug, c.title, { sizes: "(min-width: 1000px) 360px, (min-width: 640px) 50vw, 100vw" })}</div>`
    : `<div class="card-media card-media--empty" aria-hidden="true"><span>${pad(r.month)}</span></div>`;
  return `<a class="card${empty ? " card--coming" : ""}" href="${recipeUrl(lang, r.slug)}">
  ${media}
  <p class="eyebrow">${esc(month)}</p>
  <h2>${esc(c.title)}</h2>
  <p class="credit">${esc(empty ? t.coming : c.credit)}</p>
</a>`;
}

function homePage(lang) {
  const t = data.site[lang];
  const path = base(lang);
  const body = `<main class="home wrap">
  <section class="home-hero">
    <p class="eyebrow">2027</p>
    <h1>${esc(t.name)}</h1>
    <p class="lede">${esc(t.tagline)}</p>
  </section>
  <section class="grid" aria-label="${esc(t.all)}">
${data.recipes.map((r) => card(lang, r)).join("\n")}
  </section>
</main>`;
  return layout({ lang, title: `${t.name} 2027`, description: t.tagline, path, altPath: base(other(lang)), image: "/img/marts.jpg", body, bodyClass: "page-home" });
}

function ingredientList(items) {
  return items
    .map((it) => (it.startsWith("§") ? `<li class="group">${esc(it.slice(1).replace(/:$/, ""))}</li>` : `<li>${esc(it)}</li>`))
    .join("\n");
}

function recipePage(lang, r, i) {
  const t = data.site[lang];
  const c = r[lang];
  const month = t.months[r.month - 1];
  const path = recipeUrl(lang, r.slug);
  const altPath = recipeUrl(other(lang), r.slug);
  const prev = data.recipes[(i + 11) % 12];
  const next = data.recipes[(i + 1) % 12];
  const empty = c.steps.length === 0;

  const hero = r.image ? `<figure class="hero">${picture(r.slug, c.title, { eager: true, sizes: "(min-width: 1200px) 1120px, 100vw" })}</figure>` : "";
  const intro = `<div class="intro">${c.intro.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
  const bodyBlock = empty
    ? ""
    : `<div class="recipe-body">
    <aside class="ingredients">
      <h2>${esc(c.head)}</h2>
      <ul>
${ingredientList(c.ingredients)}
      </ul>
    </aside>
    <section class="method">
      <h2>${esc(t.method)}</h2>
      <ol>
${c.steps.map((s) => `        <li>${esc(s)}</li>`).join("\n")}
      </ol>
      ${c.tips.length ? `<div class="tips">${c.tips.map((p) => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
    </section>
  </div>`;

  const body = `<main class="recipe wrap">
  <section class="recipe-head">
    <p class="eyebrow">${esc(month)}</p>
    <h1>${esc(c.title)}</h1>
    <p class="credit">${esc(t.recipe)}: ${esc(c.credit)}</p>
  </section>
  ${hero}
  ${intro}
  ${bodyBlock}
  <nav class="month-nav" aria-label="${esc(t.all)}">
    <a class="month-nav-item" href="${recipeUrl(lang, prev.slug)}" rel="prev"><span class="eyebrow">${esc(t.prev)}</span><span class="month-nav-title">${esc(prev[lang].title)}</span></a>
    <a class="month-nav-item month-nav-item--next" href="${recipeUrl(lang, next.slug)}" rel="next"><span class="eyebrow">${esc(t.next)}</span><span class="month-nav-title">${esc(next[lang].title)}</span></a>
  </nav>
  <p class="all-link"><a href="${base(lang)}">${esc(t.all)}</a></p>
</main>`;
  const description = c.intro.length > 160 ? c.intro.slice(0, 157).replace(/\s+\S*$/, "") + "…" : c.intro;
  return layout({ lang, title: `${c.title} – ${t.short}`, description, path, altPath, image: r.image ? `/img/${r.slug}.jpg` : null, body, bodyClass: "page-recipe" });
}

function notFound() {
  const lv = data.site.lv, sv = data.site.sv;
  const body = `<main class="wrap notfound">
  <p class="eyebrow">404</p>
  <h1>${esc(lv.notfound)}<br><span lang="sv">${esc(sv.notfound)}</span></h1>
  <p class="lede"><a href="/">${esc(lv.home)}</a> · <a href="/sv/" lang="sv">${esc(sv.home)}</a></p>
</main>`;
  return layout({ lang: "lv", title: `404 – ${lv.short}`, description: lv.notfound, path: "/404.html", altPath: "/sv/", body, bodyClass: "page-404" });
}

// ---- write ----
for (const dir of ["assets", ...LANGS.map((l) => base(l).slice(1))]) {
  if (dir) mkdirSync(join(OUT, dir), { recursive: true });
}
// remove previously generated recipe folders so renamed slugs don't linger
for (const r of data.recipes) {
  for (const l of LANGS) rmSync(join(OUT, base(l), r.slug), { recursive: true, force: true });
}
let n = 0;
for (const lang of LANGS) {
  const dir = join(OUT, base(lang));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), homePage(lang));
  n++;
  data.recipes.forEach((r, i) => {
    const d = join(dir, r.slug);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "index.html"), recipePage(lang, r, i));
    n++;
  });
}
writeFileSync(join(OUT, "404.html"), notFound());
copyFileSync(join(ROOT, "src/style.css"), join(OUT, "assets/style.css"));
copyFileSync(join(ROOT, "src/app.js"), join(OUT, "assets/app.js"));
copyFileSync(join(ROOT, "src/favicon.svg"), join(OUT, "favicon.svg"));
writeFileSync(join(OUT, "_headers"), `/assets/*\n  Cache-Control: public, max-age=86400\n/img/*\n  Cache-Control: public, max-age=604800\n`);
for (const r of data.recipes) {
  if (r.image && !existsSync(join(OUT, "img", `${r.slug}.jpg`))) console.warn(`missing image: public/img/${r.slug}.jpg`);
}
console.log(`built ${n} pages + 404`);
