// Static site generator for zlk2027.latviesi.se
// Reads content/recipes.json, writes public/. No dependencies: `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = new URL(".", import.meta.url).pathname;
const OUT = join(ROOT, "public");
const ORIGIN = "https://zlk2027.latviesi.se";
const data = JSON.parse(readFileSync(join(ROOT, "content/recipes.json"), "utf8"));
const LANGS = ["lv", "sv", "en"];
// Digital-cookbook recipes beyond the twelve calendar months (e.g. a second variant of a month's dish).
const EXTRAS = data.extras || [];
const bySlug = (slug) => [...data.recipes, ...EXTRAS].find((x) => x.slug === slug);
// Adobe Fonts web project for Sabon LT Pro: put the kit id here (e.g. "abc1def") and the
// stylesheet link is added to every page. Until then EB Garamond is the stand-in.
const ADOBE_KIT = data.site.adobeKit || "";

// Stylesheet and script carry a content hash in their file name, so every deploy brings the
// matching version along with the page (the pages themselves are never cached, see _headers).
const hashOf = (file) => createHash("md5").update(readFileSync(join(ROOT, file))).digest("hex").slice(0, 8);
const STYLE = `style.${hashOf("src/style.css")}.css`;
const APP = `app.${hashOf("src/app.js")}.js`;
// Paintings keep their names but carry a content version, so a replaced painting reaches everyone at once.
const img = (file) => { const f = join(ROOT, "public/img", file); return existsSync(f) ? `/img/${file}?v=${createHash("md5").update(readFileSync(f)).digest("hex").slice(0, 8)}` : `/img/${file}`; };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");
const base = (lang) => (lang === "lv" ? "/" : `/${lang}/`);
const recipeUrl = (lang, slug) => `${base(lang)}${slug}/`;
const urlsFor = (slug) => Object.fromEntries(LANGS.map((l) => [l, slug ? recipeUrl(l, slug) : base(l)]));
// "Februāris/Februari" — the calendar's bilingual month line, same in both languages
const monthLine = (lang, m) => data.site[lang].months[m - 1];

function layout({ lang, title, description, path, urls, image, body, bodyClass }) {
  const t = data.site[lang];
  const google = ADOBE_KIT
    ? "family=Inter:ital,opsz,wght@0,14..32,400..600;1,14..32,400..600"
    : "family=Inter:ital,opsz,wght@0,14..32,400..600;1,14..32,400..600&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700";
  const fonts = `${ADOBE_KIT ? `<link rel="stylesheet" href="https://use.typekit.net/${ADOBE_KIT}.css">\n` : ""}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${google}&display=swap" rel="stylesheet">`;
  return `<!doctype html>
<html lang="${lang}" data-urls="${esc(JSON.stringify(urls))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${path}">
${LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${urls[l]}">`).join("\n")}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${ORIGIN}${path}">
${image ? `<meta property="og:image" content="${ORIGIN}${image}">` : ""}
<meta name="theme-color" content="#fdfbf2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${fonts}
<link rel="stylesheet" href="/assets/${STYLE}">
<script>(function(){try{var l=localStorage.getItem("zlk-lang"),c=document.documentElement.lang,m=JSON.parse(document.documentElement.getAttribute("data-urls")||"{}");if(l&&l!==c&&m[l])location.replace(m[l])}catch(e){}})();</script>
</head>
<body class="${bodyClass || ""}">
<header class="site-head wrap">
  <a class="brand" href="${base(lang)}" aria-label="${esc(t.name)} 2027"><img src="/assets/skat.svg" alt="" width="59" height="32"></a>
  <nav class="lang" aria-label="${esc(t.lang)}">
    ${LANGS.map((l) => `<a href="${urls[l]}" hreflang="${l}" lang="${l}" data-lang="${l}"${l === lang ? ' class="is-active" aria-current="page"' : ""}>${l.toUpperCase()}</a>`).join("")}
  </nav>
</header>
${body}
<footer class="site-foot wrap">
  <p class="site-foot-line"><span>${esc(t.name)} 2027</span><a class="foot-logo" href="${base(lang)}" aria-label="${esc(t.home)}"><img src="/assets/skat.svg" alt="" width="33" height="18"></a></p>
</footer>
<script src="/assets/${APP}" defer></script>
</body>
</html>
`;
}

function picture(slug, alt, { eager = false, sizes } = {}) {
  return `<img src="${img(`${slug}.jpg`)}" srcset="${img(`${slug}-800.jpg`)} 800w, ${img(`${slug}.jpg`)} 1600w" sizes="${sizes}" width="1600" height="893" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
}

function visual(r, alt, opts) {
  return r.image
    ? `<figure class="visual">${picture(r.slug, alt, opts)}</figure>`
    : `<div class="visual visual--empty" aria-hidden="true"><span>${r.month ? pad(r.month) : "+"}</span></div>`;
}

function card(lang, r) {
  const t = data.site[lang];
  const c = r[lang];
  const empty = c.steps.length === 0;
  return `<a class="card${empty ? " card--coming" : ""}" href="${recipeUrl(lang, r.slug)}">
  ${visual(r, c.title, { sizes: "(min-width: 1000px) 360px, (min-width: 560px) 50vw, 100vw" })}
  <p class="month-line">${esc(r.month ? monthLine(lang, r.month) : t.extra)}</p>
  <h2 class="recipe-title">${esc(c.title)}</h2>
  <p class="credit">${esc(empty ? t.coming : c.credit)}</p>
</a>`;
}

function homePage(lang) {
  const t = data.site[lang];
  const path = base(lang);
  const body = `<main class="home wrap">
  <header class="month-head">
    <p class="year">2027</p>
    <h1 class="month">${esc(t.name)}</h1>
    <p class="lede">${esc(t.tagline)}</p>
  </header>
  <section class="grid" aria-label="${esc(t.all)}">
${data.recipes.map((r) => card(lang, r)).join("\n")}
  </section>
${EXTRAS.length ? `  <section class="cookbook" aria-labelledby="cookbook-title">
    <header class="cookbook-head">
      <h2 class="cookbook-title" id="cookbook-title">${esc(t.cookbook)}</h2>
      <p class="lede">${esc(t.cookbookLede)}</p>
      ${data.site.submitUrl ? `<p class="cookbook-cta"><a class="btn" href="${esc(data.site.submitUrl)}" rel="noopener">${esc(t.submit)}</a></p>` : ""}
    </header>
    <div class="grid">
${EXTRAS.map((r) => card(lang, r)).join("\n")}
    </div>
  </section>` : ""}
</main>`;
  return layout({ lang, title: `${t.name} 2027`, description: t.tagline, path, urls: urlsFor(null), image: img("marts.jpg"), body, bodyClass: "page-home" });
}

// Leading quantity of an ingredient line ("1,5 kg …", "500-600 g …", "½ - ¾ gl. …") becomes a
// scalable <span class="q">; everything else is left alone.
const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
const num = (s) => (FRAC[s] !== undefined ? FRAC[s] : parseFloat(s.replace(",", ".")));
const QTY = /^(\d+(?:[,.]\d+)?|[½¼¾⅓⅔])(?:\s*[-–]\s*(\d+(?:[,.]\d+)?|[½¼¾⅓⅔]))?(?=\s*(?:[^\d\s]|$))/;
function qtySpan(text) {
  const m = text.match(QTY);
  if (!m) return esc(text);
  const base = [num(m[1]), m[2] !== undefined ? num(m[2]) : null].filter((v) => v !== null).join(";");
  return `<span class="q" data-base="${base}">${esc(m[0])}</span>${esc(text.slice(m[0].length))}`;
}
function headSpan(text) {
  return esc(text).replace(/(\d+)/, (d) => `<span class="q" data-base="${d}">${d}</span>`);
}
// Amount control. A heading that states a portion count ("Sastāvdaļas 12 porcijām") gets a
// servings scaler (6 / 12 / 24 / custom number of portions); otherwise plain multipliers.
function multControl(t, head) {
  const m = head.match(/(\d+)\s*([^\s\d(),.;:]+)/);
  const serv = m ? +m[1] : 0;
  const unit = m ? m[2] : "";
  const half = serv % 2 === 0 ? String(serv / 2) : String(serv / 2).replace(".", ",");
  const btn = (mult, label, active) => `<button type="button" data-mult="${mult}"${active ? ' class="is-active"' : ""}>${label}</button>`;
  const labels = serv ? [half, String(serv), String(serv * 2)] : ["½×", "1×", "2×"];
  return `<div class="mult" role="group" aria-label="${esc(serv ? t.servings : t.amount)}"${serv ? ` data-servings="${serv}"` : ""}>${btn(0.5, labels[0])}${btn(1, labels[1], true)}${btn(2, labels[2])}${btn("custom", esc(t.custom))}<label class="mult-custom" hidden><input type="text" inputmode="${serv ? "numeric" : "decimal"}" autocomplete="off" maxlength="5" aria-label="${esc(serv ? t.servings : t.amount)}">${serv ? "&nbsp;" + esc(unit) : "×"}</label></div>`;
}
function ingredientList(items) {
  let i = 0;
  return items
    .map((it) =>
      it.startsWith("§")
        ? `<li class="group">${esc(it.slice(1).replace(/:$/, ""))}</li>`
        : `<li><label><input type="checkbox" data-i="${i++}"><span class="box" aria-hidden="true"></span><span class="txt">${qtySpan(it)}</span></label></li>`
    )
    .join("\n");
}
// A step starting with "§" is a group heading (e.g. one of two salads); numbering runs on across groups.
function stepList(steps) {
  let i = 0;
  return steps
    .map((s) =>
      s.startsWith("§")
        ? `        <li class="group">${esc(s.slice(1).replace(/:$/, ""))}</li>`
        : `        <li role="checkbox" aria-checked="false" tabindex="0" data-i="${i}"><span class="num" aria-hidden="true">${++i}</span><span class="txt">${esc(s)}</span></li>`
    )
    .join("\n");
}

function recipePage(lang, r, i) {
  const t = data.site[lang];
  const c = r[lang];
  const path = recipeUrl(lang, r.slug);
  const prev = r.month ? data.recipes[(i + 11) % 12] : null;
  const next = r.month ? data.recipes[(i + 1) % 12] : null;
  const related = r.related ? data.recipes.find((x) => x.month === r.related) : null;
  const see = r.see ? bySlug(r.see) : null;
  const empty = c.steps.length === 0;
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} ${t.min}` : ""}` : `${m} ${t.min}`);

  const i18n = { stepOf: t.stepOf, next: t.next, back: t.back, finish: t.finish, close: t.close, timer: t.timer, min: t.min, timerDone: t.timerDone, title: c.title, minutes: r.minutes || 60, eventDesc: t.eventDesc, url: `${ORIGIN}${path}`, share: t.share, copied: t.copied, shareText: t.shareText };
  const calendar = empty ? "" : `<p class="actions"><button type="button" class="btn" data-cal aria-expanded="false" aria-controls="cal">${esc(t.addCal)}</button> <button type="button" class="btn" data-share>${esc(t.share)}</button></p>
      <div class="cal" id="cal" hidden>
        <form class="cal-form">
          <p class="head" id="cal-title">${esc(t.when)}</p>
          <div class="cal-quick" role="group" aria-label="${esc(t.date)}">
            <button type="button" class="chip" data-day="0">${esc(t.today)}</button>
            <button type="button" class="chip" data-day="1">${esc(t.tomorrow)}</button>
            <button type="button" class="chip" data-day="sat">${esc(t.saturday)}</button>
            <button type="button" class="chip" data-day="sun">${esc(t.sunday)}</button>
          </div>
          <div class="cal-fields">
            <label><span>${esc(t.date)}</span><input type="date" name="date" required></label>
            <label><span>${esc(t.time)}</span><input type="time" name="time" value="17:00" required></label>
            <label><span>${esc(t.duration)}</span><span class="cal-dur"><input type="text" inputmode="numeric" name="minutes" value="${r.minutes || 60}" maxlength="3"> ${esc(t.min)}</span></label>
          </div>
          <div class="cal-actions">
            <button type="button" class="btn btn--primary" data-cal-ics>${esc(t.calGo)}</button>
            <a class="btn btn--text" data-cal-google href="#" target="_blank" rel="noopener">${esc(t.google)}</a>
            <button type="button" class="btn btn--text" data-cal-close>${esc(t.close)}</button>
          </div>
        </form>
      </div>`;
  const col1 = `<div class="col col-1">
      <h1 class="recipe-title">${esc(c.title)}</h1>
      <p class="credit">${esc(t.recipe)}: ${esc(c.credit)}${r.minutes && !empty ? ` · ${t.about} ${dur(r.minutes)}` : ""}</p>
      <div class="body">${c.intro.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      ${see ? `<p class="see-also"><a href="${recipeUrl(lang, see.slug)}"><span class="nav-label">${esc(t.alsoTry)}</span> ${esc(see[lang].title)} →</a></p>` : ""}
      ${calendar}
    </div>`;
  const col2 = empty ? "" : `<div class="col col-2">
      <div class="section-head">
        <h2 class="head">${headSpan(c.head)}</h2>
        ${multControl(t, c.head)}
      </div>
      <ul class="ingredients">
${ingredientList(c.ingredients)}
      </ul>
      <div class="section-head section-head--spaced">
        <h2 class="head">${esc(t.method)}</h2>
        <button type="button" class="btn" data-cook>${esc(t.cook)}</button>
      </div>
      <ol class="steps">
${stepList(c.steps)}
      </ol>
      ${c.tips.length ? `<div class="tips">${c.tips.map((p) => `<p class="tip">${typeof p === "string" ? esc(p) : `<a href="${esc(p.href)}" rel="noopener">${esc(p.text)}</a>`}</p>`).join("")}</div>` : ""}
      <p class="reset" hidden><button type="button" class="btn btn--text" data-reset>${esc(t.reset)}</button></p>
      <script type="application/json" id="i18n">${JSON.stringify(i18n).replace(/</g, "\\u003c")}</script>
    </div>`;
  const col3 = "";

  const body = `<main class="recipe wrap" data-slug="${r.slug}">
  <header class="month-head">
    <p class="year">2027</p>
    <p class="month">${esc(r.month ? monthLine(lang, r.month) : t.extra)}</p>
  </header>
  ${r.image ? visual(r, c.title, { eager: true, sizes: "(min-width: 1200px) 1120px, 100vw" }) : ""}
  <section class="band${empty ? " band--plain" : ""}">
    ${col1}
    ${col2}
  </section>
  <nav class="month-nav" aria-label="${esc(t.all)}">
    ${prev ? `<a class="prev" href="${recipeUrl(lang, prev.slug)}" rel="prev"><span class="nav-label">${esc(monthLine(lang, prev.month))}</span><span class="nav-title">${esc(prev[lang].title)}</span></a>
    <a class="next" href="${recipeUrl(lang, next.slug)}" rel="next"><span class="nav-label">${esc(monthLine(lang, next.month))}</span><span class="nav-title">${esc(next[lang].title)}</span></a>` : related ? `<a class="prev" href="${recipeUrl(lang, related.slug)}"><span class="nav-label">${esc(monthLine(lang, related.month))}</span><span class="nav-title">${esc(related[lang].title)}</span></a>` : ""}
  </nav>
  <p class="all-link"><a href="${base(lang)}">${esc(t.all)}</a></p>
</main>`;
  const description = c.intro.length > 160 ? c.intro.slice(0, 157).replace(/\s+\S*$/, "") + "…" : c.intro;
  return layout({ lang, title: `${c.title} – ${t.short}`, description, path, urls: urlsFor(r.slug), image: r.image ? img(`${r.slug}.jpg`) : null, body, bodyClass: "page-recipe" });
}

function notFound() {
  const lv = data.site.lv, sv = data.site.sv, en = data.site.en;
  const body = `<main class="wrap notfound">
  <p class="year">404</p>
  <h1 class="month">${esc(lv.notfound)}<br><span lang="sv">${esc(sv.notfound)}</span><br><span lang="en">${esc(en.notfound)}</span></h1>
  <p class="lede"><a href="/">${esc(lv.home)}</a> · <a href="/sv/" lang="sv">${esc(sv.home)}</a> · <a href="/en/" lang="en">${esc(en.home)}</a></p>
</main>`;
  return layout({ lang: "lv", title: `404 – ${lv.short}`, description: lv.notfound, path: "/404.html", urls: urlsFor(null), body, bodyClass: "page-404" });
}

// ---- write ----
mkdirSync(join(OUT, "assets"), { recursive: true });
for (const r of [...data.recipes, ...EXTRAS]) {
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
  EXTRAS.forEach((r) => {
    const d = join(dir, r.slug);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "index.html"), recipePage(lang, r, -1));
    n++;
  });
}
writeFileSync(join(OUT, "404.html"), notFound());
for (const f of readdirSync(join(OUT, "assets"))) if (/^(style|app)\..*\.(css|js)$|^(style\.css|app\.js)$/.test(f)) rmSync(join(OUT, "assets", f));
copyFileSync(join(ROOT, "src/style.css"), join(OUT, "assets", STYLE));
copyFileSync(join(ROOT, "src/app.js"), join(OUT, "assets", APP));
copyFileSync(join(ROOT, "src/favicon.svg"), join(OUT, "favicon.svg"));
copyFileSync(join(ROOT, "src/skat.svg"), join(OUT, "assets/skat.svg"));
writeFileSync(join(OUT, "_headers"), `/assets/skat.svg\n  Cache-Control: public, max-age=86400\n/assets/${STYLE}\n  Cache-Control: public, max-age=31536000, immutable\n/assets/${APP}\n  Cache-Control: public, max-age=31536000, immutable\n/img/*\n  Cache-Control: public, max-age=604800\n`);
for (const r of data.recipes) {
  if (r.image && !existsSync(join(OUT, "img", `${r.slug}.jpg`))) console.warn(`missing image: public/img/${r.slug}.jpg`);
}
console.log(`built ${n} pages + 404${ADOBE_KIT ? " (Adobe Fonts kit " + ADOBE_KIT + ")" : " (EB Garamond stand-in)"}`);
