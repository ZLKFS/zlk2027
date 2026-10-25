# ZLK2027

Recipe site for the Zviedrijas latviešu kalendārs 2027. Served at **https://zlk2027.latviesi.se**.
Twelve recipes, one per month, in Latvian and Swedish. QR codes in the printed calendar point at
`zlk2027.latviesi.se/<month-slug>/`.

## Build

```
node build.mjs        # writes public/
npm run dev           # build + local server on http://localhost:8787
```

No dependencies. `public/` is committed because Cloudflare Pages serves it as-is (no build step configured).

## Content

- `content/recipes.json` — all text, both languages. `site.lv` / `site.sv` hold UI strings and month names;
  each recipe has `slug`, `image` (true when `public/img/<slug>.jpg` exists) and an `lv` and `sv` block
  with `title`, `credit`, `intro`, `head` (ingredients heading), `ingredients`, `steps`, `tips`.
  An ingredient starting with `§` is a group heading. Empty `steps` = "recipe coming".
- `public/img/<slug>.jpg` (1600 px) + `<slug>-800.jpg` (800 px), JPEG q82, made with `sips` from the
  calendar paintings in `~/Desktop/ZLK 2027/images`.
- `src/style.css`, `src/app.js`, `src/favicon.svg` — copied into `public/assets/` on build.

## URLs and languages

- Latvian: `/` and `/<slug>/`; Swedish: `/sv/` and `/sv/<slug>/`. Slugs are the Latvian month names
  (janvaris … decembris) in both languages so a printed address works for everyone.
- The LV/SV toggle stores the choice in `localStorage` (`zlk-lang`); an inline head script redirects
  to the remembered language on later visits. `hreflang` alternates are in every page.
- `404.html` is bilingual.

## Deploy

- **Host:** Cloudflare Pages, project `zlk2027` (account `ints@latviesi.se`)
- **Domain:** `zlk2027.latviesi.se` (CNAME → `zlk2027.pages.dev`, DNS at GoDaddy)
- **Repo:** `ZLKFS/zlk2027` — pushes to `main` auto-deploy
- **Output dir:** `public/`

- Created: 2026-06-15 · Site built: 2026-10-25
- Owner: Ints (Samsen Studio)
