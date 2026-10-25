// Language memory: the inline <head> script redirects to the remembered language.
document.querySelectorAll("[data-lang]").forEach((a) => {
  a.addEventListener("click", () => {
    try { localStorage.setItem("zlk-lang", a.dataset.lang); } catch (e) {}
  });
});

// ---- recipe tools: ticks, scaler, cooking mode ----
const main = document.querySelector("main[data-slug]");
const stepsEl = document.querySelector(".steps");
if (main && stepsEl) {
  const slug = main.dataset.slug;
  const LANG = document.documentElement.lang;
  const DEC = LANG === "en" ? "." : ",";
  const i18n = JSON.parse(document.getElementById("i18n").textContent);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(`zlk:${k}:${slug}`); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(`zlk:${k}:${slug}`, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(`zlk:${k}:${slug}`); } catch (e) {} },
  };
  const resetRow = document.querySelector(".reset");
  const ingBoxes = [...document.querySelectorAll(".ingredients input[type=checkbox]")];
  const stepItems = [...stepsEl.querySelectorAll("li")];
  const steps = stepItems.map((li) => li.querySelector(".txt").textContent);

  // --- ingredient ticks ---
  const ingDone = new Set(store.get("ing", []));
  ingBoxes.forEach((b) => { b.checked = ingDone.has(+b.dataset.i); });
  ingBoxes.forEach((b) => b.addEventListener("change", () => {
    b.checked ? ingDone.add(+b.dataset.i) : ingDone.delete(+b.dataset.i);
    store.set("ing", [...ingDone]); updateReset();
  }));

  // --- step ticks ---
  const stepDone = new Set(store.get("steps", []));
  const paintSteps = () => stepItems.forEach((li) => {
    const on = stepDone.has(+li.dataset.i);
    li.classList.toggle("is-done", on); li.setAttribute("aria-checked", on);
  });
  const toggleStep = (i) => { stepDone.has(i) ? stepDone.delete(i) : stepDone.add(i); store.set("steps", [...stepDone]); paintSteps(); updateReset(); };
  stepItems.forEach((li) => {
    li.addEventListener("click", () => toggleStep(+li.dataset.i));
    li.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleStep(+li.dataset.i); } });
  });
  paintSteps();

  function updateReset() { if (resetRow) resetRow.hidden = ingDone.size === 0 && stepDone.size === 0; }
  updateReset();
  document.querySelector("[data-reset]")?.addEventListener("click", () => {
    ingDone.clear(); stepDone.clear(); store.del("ing"); store.del("steps");
    ingBoxes.forEach((b) => { b.checked = false; }); paintSteps(); updateReset();
  });

  // --- quantity scaler ---
  const FR = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  const fmt = (v) => {
    const w = Math.floor(v), f = +(v - w).toFixed(2);
    if (FR[f]) return (w ? w : "") + FR[f];
    // Kitchen rounding: whole numbers from 10 up, one decimal between 1 and 10, two below 1.
    const r = v >= 10 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
    return String(r).replace(".", DEC);
  };
  const qs = [...document.querySelectorAll(".q")];
  const PRESETS = [0.5, 1, 2];
  // A recipe that states its portion count scales in servings: the custom field holds portions.
  const BASE_SERV = +(document.querySelector(".mult")?.dataset.servings || 0);
  const customBtn = document.querySelector("[data-mult='custom']");
  const customWrap = document.querySelector(".mult-custom");
  const customInput = customWrap?.querySelector("input");
  const customText = (m) => (BASE_SERV ? String(Math.round(m * BASE_SERV * 10) / 10) : String(m)).replace(".", ",");
  const applyMult = (m, viaCustom) => {
    if (!(m > 0)) return;
    qs.forEach((q) => {
      const parts = q.dataset.base.split(";").map(Number);
      q.textContent = parts.map((v) => fmt(v * m)).join("–");
    });
    const isCustom = viaCustom || !PRESETS.includes(m);
    document.querySelectorAll("[data-mult]").forEach((b) => b.classList.toggle("is-active", b.dataset.mult === "custom" ? isCustom : +b.dataset.mult === m));
    if (customWrap) { customWrap.hidden = !isCustom; customBtn.hidden = isCustom; if (isCustom && customInput.value === "") customInput.value = customText(m); }
    store.set("mult", m);
  };
  document.querySelectorAll("[data-mult]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.mult === "custom") { applyMult(store.get("mult", 1), true); customInput.focus(); customInput.select(); }
    else { if (customInput) customInput.value = ""; applyMult(+b.dataset.mult); }
  }));
  customInput?.addEventListener("input", () => { const v = parseFloat(customInput.value.replace(",", ".")); if (v > 0) applyMult(BASE_SERV ? v / BASE_SERV : v, true); });
  customInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") customInput.blur(); });
  const savedMult = store.get("mult", 1);
  if (savedMult !== 1) applyMult(savedMult);

  // --- add to calendar (.ics download or Google Calendar link) ---
  const cal = document.querySelector(".cal");
  if (cal) {
    const calBtn = document.querySelector("[data-cal]");
    const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayFor = (what) => { const d = new Date(); d.setHours(12, 0, 0, 0); if (what === "0" || what === "1") d.setDate(d.getDate() + +what); else { const target = what === "sat" ? 6 : 0; let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); } return d; };
    const form = cal.querySelector("form");
    const google = cal.querySelector("[data-cal-google]");
    const p2 = (n) => String(n).padStart(2, "0");
    const local = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
    const read = () => {
      const [y, m, d] = (form.date.value || "").split("-").map(Number);
      const [hh, mm] = (form.time.value || "17:00").split(":").map(Number);
      if (!y) return null;
      const mins = Math.max(5, parseInt(form.minutes.value, 10) || i18n.minutes);
      const start = new Date(y, m - 1, d, hh || 0, mm || 0);
      return { start, end: new Date(start.getTime() + mins * 60000) };
    };
    const details = `${i18n.eventDesc} ${i18n.url}`;
    const updateGoogle = () => {
      const r = read(); if (!r) return;
      google.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(i18n.title)}&dates=${local(r.start)}/${local(r.end)}&details=${encodeURIComponent(details)}`;
    };
    const escI = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const fold = (line) => { const out = []; while (line.length > 72) { out.push(line.slice(0, 72)); line = " " + line.slice(72); } out.push(line); return out.join("\r\n"); };
    const ics = () => {
      const r = read(); if (!r) { form.reportValidity(); return; }
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ZLK 2027//Receptes//LV", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
        `UID:${slug}-${stamp}@zlk2027.latviesi.se`, `DTSTAMP:${stamp}`, `DTSTART:${local(r.start)}`, `DTEND:${local(r.end)}`,
        `SUMMARY:${escI(i18n.title)}`, `DESCRIPTION:${escI(details)}`, `URL:${i18n.url}`,
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escI(i18n.title)}`, "TRIGGER:-P1D", "END:VALARM",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escI(i18n.title)}`, "TRIGGER:-PT1H", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"];
      const blob = new Blob([lines.map(fold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug}.ics`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    };
    const chips = [...cal.querySelectorAll("[data-day]")];
    const paintChips = () => chips.forEach((c) => c.classList.toggle("is-active", form.date.value === isoDate(dayFor(c.dataset.day))));
    const openCal = () => {
      if (!form.date.value) form.date.value = isoDate(dayFor("1"));
      paintChips(); updateGoogle(); cal.hidden = false; calBtn.setAttribute("aria-expanded", "true");
      cal.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const closeCal = () => { cal.hidden = true; calBtn.setAttribute("aria-expanded", "false"); calBtn.focus(); };
    calBtn?.addEventListener("click", () => (cal.hidden ? openCal() : closeCal()));
    chips.forEach((c) => c.addEventListener("click", () => { form.date.value = isoDate(dayFor(c.dataset.day)); paintChips(); updateGoogle(); }));
    form.addEventListener("input", () => { paintChips(); updateGoogle(); });
    form.addEventListener("submit", (e) => e.preventDefault());
    google.addEventListener("click", (e) => { if (!read()) { e.preventDefault(); form.reportValidity(); } });
    cal.querySelector("[data-cal-ics]").addEventListener("click", ics);
    cal.querySelector("[data-cal-close]").addEventListener("click", closeCal);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !cal.hidden && !document.querySelector(".cook.is-open")) closeCal(); });
  }

  // --- share: native sheet where available, otherwise copy the link ---
  const shareBtn = document.querySelector("[data-share]");
  shareBtn?.addEventListener("click", async () => {
    const data = { title: i18n.title, text: i18n.shareText, url: i18n.url };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) { await navigator.share(data); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(i18n.url); } catch (e) {
      const ta = document.createElement("textarea"); ta.value = i18n.url; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e2) {} ta.remove();
    }
    const label = shareBtn.textContent; shareBtn.textContent = i18n.copied; shareBtn.classList.add("is-done");
    setTimeout(() => { shareBtn.textContent = label; shareBtn.classList.remove("is-done"); }, 2000);
  });

  // --- amounts inside the step text (cooking mode) ---
  // Each ingredient line = quantity [unit] name…; the name's content words become stems that are
  // looked up in the step text, and the current (scaled) amount is written after the first hit.
  const UNITS = new Set(["g","kg","dl","l","ml","cl","litrs","litri","litru","liter","liters","ēdamkarote","ēdamkarotes","ēd.k.","ēd","k","tējkarote","tējkarotes","tējk","tējk.","pustējkarote","msk","tsk","gb","gb.","st","glāze","gl","gl.","pāksts","krm","ēdamkarotes","tbsp","tsp","litre","litres","glass","cup","cups"]);
  const STOP = new Set(("un vai pēc garšas garšai ar bez no uz kas vien pieejams vēlams var arī ja ko lai kā jeb par pie zem vēl tikai nav ir tas tā " +
    "parastais parastā bezlaktozes svaigs svaiga svaigi svaigu liels liela lieli palieli palielus mazs maza sīki smalki rupji vidēja maluma kapātu kapāta kapāti sagrieztu sasmalcinātu žāvētas žāvēta žāvēts " +
    "šķēle šķēles šķēlītes cepšanai pārsmērēšanai pārkaisīšanai pildījumam mīklai pamatnei piedevas nedaudz apmēram apm cik daudz receptē recepte zviedriski zviedru latviešu " +
    "och eller efter smak en ett till för av med gärna helst vanlig vanliga laktosfri stora stor små liten färsk färska finhackad finhackade hackade hackad rivet riven malen malet torkade torkad osötat hela hel " +
    "det som finns lite cirka ca ungefär nypa skiva skivor bitar pensling fyllning deg degbotten tillbehör vispad kan uteslutas om du bakar de minsta polsk svenska lettisk lettiska " +
    "the and for with into until plus large small fresh chopped grated dried ground sliced diced smoked whole plain boneless unsweetened dark fine finely coarse coarsely little some taste serve glazing dusting frying base filling pastry regular lactose free ideally preferably such that can boiled just under one pinch").split(" "));
  const words = (s) => [...s.toLowerCase().matchAll(/[\p{L}\p{M}]+/gu)];
  // strip the usual inflection endings so "kartupeļus" ~ "kartupeļu", "mjölken" ~ "mjölk"
  const norm = (w) => (LANG === "sv" ? w.replace(/(arna|erna|orna|en|et|na|ar|er|or|e)$/, "")
    : LANG === "en" ? w.replace(/ies$/, "y").replace(/oes$/, "o").replace(/(sh|ch|x|z|ss)es$/, "$1").replace(/s$/, "")
    : w.replace(/(iem|ām|ēm|ās|ēs|os|us|is|as|es|ai|ei|u|a|e|i|s|ā|ē|ī|ū)$/, ""));
  // step word a vs ingredient key b: equal, or the ingredient is a compound ending in the step word
  // (vetemjöl ~ mjöl), or both long and one extends the other
  const same = (a, b, strict) => a === b || (!strict && a.length >= 4 && b.length >= 4 && b.endsWith(a)) || (a.length >= 6 && b.length >= 6 && (a.startsWith(b) || b.startsWith(a)));
  const ingredientsInfo = () => {
    const list = [...document.querySelectorAll(".ingredients li:not(.group) .txt")].map((txt) => {
      const q = txt.querySelector(".q");
      if (!q) return null;
      const rest = txt.textContent.slice(q.textContent.length).replace(/\([^)]*\)/g, " ").replace(/,.*$/, "").trim();
      const toks = rest.split(/\s+/);
      let unit = "", nameStart = 0;
      if (toks[0] && UNITS.has(toks[0].toLowerCase())) { unit = toks[0]; nameStart = 1; }
      const keys = words(toks.slice(nameStart).join(" ")).map((m) => m[0]).filter((w) => w.length >= 3 && !STOP.has(w) && !UNITS.has(w)).map(norm);
      return keys.length ? { amount: unit ? `${q.textContent} ${unit}` : q.textContent, keys, need: 1, strict: false } : null;
    });
    const ings = list.filter(Boolean);
    // a specific line (vaniļas cukura, vaniljsocker) must not take a generic twin's hits (cukura, socker)
    for (const B of ings) for (const A of ings) {
      if (A === B) continue;
      if (A.keys.length < B.keys.length && A.keys.every((k) => B.keys.includes(k))) B.need = 2;
      if (A.keys.length === 1 && B.keys.length === 1 && B.keys[0] !== A.keys[0] && B.keys[0].endsWith(A.keys[0])) B.strict = true;
    }
    return ings;
  };
  const escH = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const QUANTIFIED = /(\d|[½¼¾]|\b(en|ett|lite|tesked|matsked|tsk|msk|dl|g|kg|ml|liter|nypa|nedaudz|mazliet|pāris|šķipsniņ\w*|tējkarot\w*|ēdamkarot\w*|puse|pusi|a|an|some|teaspoon|tablespoon|tbsp|tsp|pinch|cup|little)\b)\s*\p{L}*\s*$/iu;
  // For every step: which ingredient's amount goes after which word. Decided once per cooking
  // session so a name shared by two lines (1 ola / 4 olas) goes to the first unused line.
  function planAmounts() {
    const ings = ingredientsInfo();
    const used = new Map();
    return steps.map((text, si) => {
      const toks = words(text).map((m) => ({ w: norm(m[0]), start: m.index, end: m.index + m[0].length }));
      const cands = new Map();
      ings.forEach((ing, ii) => {
        for (let j = 0; j < toks.length; j++) {
          const k0 = ing.keys.findIndex((k) => same(toks[j].w, k, ing.strict));
          if (k0 < 0) continue;
          let end = toks[j].end, hits = 1;
          for (let m = j + 1; m < Math.min(toks.length, j + 3); m++) {
            if (ing.keys.some((k, idx) => idx !== k0 && same(toks[m].w, k, ing.strict))) { end = toks[m].end; hits++; }
          }
          if (hits < ing.need) continue;
          if (QUANTIFIED.test(text.slice(Math.max(0, toks[j].start - 24), toks[j].start))) break; // the step states its own amount
          cands.set(end, [...(cands.get(end) || []), ii]);
          break;
        }
      });
      const plan = [];
      for (const [end, list] of [...cands.entries()].sort((x, y) => x[0] - y[0])) {
        let pick = list.find((ii) => !used.has(ii));
        if (pick === undefined) pick = list.reduce((best, ii) => (used.get(ii) > used.get(best) ? ii : best), list[0]);
        used.set(pick, si);
        plan.push({ end, ii: pick });
      }
      return plan;
    });
  }
  let amountPlan = null;
  function withAmounts(text, plan) {
    if (!plan || !plan.length) return escH(text);
    const ings = ingredientsInfo();
    let out = "", last = 0;
    for (const { end, ii } of plan) {
      out += escH(text.slice(last, end)) + ` <span class="amt">(${escH(ings[ii].amount)})</span>`;
      last = end;
    }
    return out + escH(text.slice(last));
  }

  // --- cooking mode ---
  const TIME = /(\d+)(?:\s*[–-]\s*(\d+))?\s*(min|stund|timm|hour|hr)/i;
  let cook, cur = 0, timer = null, wake = null;
  const t = (s, n, m) => s.replace("{n}", n).replace("{m}", m);

  function build() {
    cook = document.createElement("div");
    cook.className = "cook"; cook.setAttribute("role", "dialog"); cook.setAttribute("aria-modal", "true"); cook.setAttribute("aria-label", i18n.title);
    cook.innerHTML = `<div class="cook-bar" aria-hidden="true"><span class="cook-progress"></span></div>
<div class="cook-head wrap"><span class="cook-title">${i18n.title}</span><button type="button" class="btn btn--text" data-close>${i18n.close}</button></div>
<div class="cook-body wrap"><p class="cook-step"></p><p class="cook-text"></p><p class="cook-timer"><button type="button" class="btn" data-timer></button></p></div>
<div class="cook-foot wrap"><button type="button" class="btn" data-back>${i18n.back}</button><button type="button" class="btn btn--primary" data-next>${i18n.next}</button></div>`;
    document.body.appendChild(cook);
    cook.querySelector("[data-close]").addEventListener("click", close);
    cook.querySelector("[data-back]").addEventListener("click", () => go(cur - 1));
    cook.querySelector("[data-next]").addEventListener("click", () => { if (cur >= steps.length - 1) { stepDone.add(cur); store.set("steps", [...stepDone]); paintSteps(); updateReset(); close(); } else { stepDone.add(cur); store.set("steps", [...stepDone]); paintSteps(); updateReset(); go(cur + 1); } });
    cook.querySelector("[data-timer]").addEventListener("click", toggleTimer);
    let x0 = null;
    cook.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    cook.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (dx < -60) go(cur + 1); else if (dx > 60) go(cur - 1); });
  }
  function go(i) {
    if (i < 0 || i >= steps.length) return;
    cur = i; stopTimer();
    cook.querySelector(".cook-step").textContent = t(i18n.stepOf, i + 1, steps.length);
    cook.querySelector(".cook-text").innerHTML = withAmounts(steps[i], amountPlan && amountPlan[i]);
    cook.querySelector(".cook-progress").style.width = `${((i + 1) / steps.length) * 100}%`;
    cook.querySelector("[data-back]").disabled = i === 0;
    cook.querySelector("[data-next]").textContent = i === steps.length - 1 ? i18n.finish : i18n.next;
    const m = steps[i].match(TIME);
    const tb = cook.querySelector("[data-timer]");
    if (m) {
      const unit = m[3].toLowerCase();
      const n = +m[1] * (unit.startsWith("min") ? 1 : 60);
      tb.dataset.seconds = n * 60; tb.textContent = `${i18n.timer} ${n >= 60 && n % 60 === 0 ? `${n / 60} h` : `${n} ${i18n.min}`}`; tb.parentElement.hidden = false;
    } else tb.parentElement.hidden = true;
    cook.querySelector(".cook-body").scrollTop = 0;
  }
  function toggleTimer() {
    const tb = cook.querySelector("[data-timer]");
    if (timer) { stopTimer(); go(cur); return; }
    let left = +tb.dataset.seconds;
    const paint = () => { tb.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; };
    paint(); tb.classList.add("is-running");
    timer = setInterval(() => { left--; if (left <= 0) { stopTimer(); tb.textContent = i18n.timerDone; tb.classList.add("is-done"); beep(); } else paint(); }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; const tb = cook?.querySelector("[data-timer]"); tb?.classList.remove("is-running", "is-done"); }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach((at) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.2, ac.currentTime + at); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + at + 0.25); o.start(ac.currentTime + at); o.stop(ac.currentTime + at + 0.3); });
    } catch (e) {}
    try { navigator.vibrate?.([200, 100, 200]); } catch (e) {}
  }
  async function lock() { try { wake = await navigator.wakeLock?.request("screen"); } catch (e) { wake = null; } }
  document.addEventListener("visibilitychange", () => { if (cook?.classList.contains("is-open") && document.visibilityState === "visible") lock(); });
  function open(i) {
    if (!cook) build();
    cook.classList.add("is-open"); document.body.classList.add("is-cooking");
    amountPlan = planAmounts();
    go(i); lock();
    cook.querySelector("[data-next]").focus();
  }
  function close() {
    stopTimer(); cook.classList.remove("is-open"); document.body.classList.remove("is-cooking");
    try { wake?.release(); } catch (e) {} wake = null;
    document.querySelector("[data-cook]")?.focus();
  }
  document.querySelector("[data-cook]")?.addEventListener("click", () => {
    const first = steps.findIndex((_, i) => !stepDone.has(i));
    open(first === -1 ? 0 : first);
  });
  document.addEventListener("keydown", (e) => {
    if (!cook?.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(cur + 1);
    else if (e.key === "ArrowLeft") go(cur - 1);
  });
}
