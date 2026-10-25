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
    const r = Math.round(v * 100) / 100;
    return String(r).replace(".", ",");
  };
  const qs = [...document.querySelectorAll(".q")];
  const PRESETS = [0.5, 1, 2];
  const customBtn = document.querySelector("[data-mult='custom']");
  const customWrap = document.querySelector(".mult-custom");
  const customInput = customWrap?.querySelector("input");
  const applyMult = (m, viaCustom) => {
    if (!(m > 0)) return;
    qs.forEach((q) => {
      const parts = q.dataset.base.split(";").map(Number);
      q.textContent = parts.map((v) => fmt(v * m)).join("–");
    });
    const isCustom = viaCustom || !PRESETS.includes(m);
    document.querySelectorAll("[data-mult]").forEach((b) => b.classList.toggle("is-active", b.dataset.mult === "custom" ? isCustom : +b.dataset.mult === m));
    if (customWrap) { customWrap.hidden = !isCustom; customBtn.hidden = isCustom; if (isCustom && customInput.value === "") customInput.value = String(m).replace(".", ","); }
    store.set("mult", m);
  };
  document.querySelectorAll("[data-mult]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.mult === "custom") { applyMult(store.get("mult", 1), true); customInput.focus(); customInput.select(); }
    else { if (customInput) customInput.value = ""; applyMult(+b.dataset.mult); }
  }));
  customInput?.addEventListener("input", () => { const v = parseFloat(customInput.value.replace(",", ".")); if (v > 0) applyMult(v, true); });
  customInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") customInput.blur(); });
  const savedMult = store.get("mult", 1);
  if (savedMult !== 1) applyMult(savedMult);

  // --- add to calendar (.ics download or Google Calendar link) ---
  const cal = document.querySelector("dialog.cal");
  if (cal && typeof cal.showModal === "function") {
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
    document.querySelector("[data-cal]")?.addEventListener("click", () => {
      if (!form.date.value) { const d = new Date(); d.setDate(d.getDate() + 1); form.date.value = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
      updateGoogle(); cal.showModal();
    });
    form.addEventListener("input", updateGoogle);
    google.addEventListener("click", (e) => { if (!read()) { e.preventDefault(); form.reportValidity(); } });
    cal.querySelector("[data-cal-ics]").addEventListener("click", ics);
    cal.querySelector("[data-cal-close]").addEventListener("click", () => cal.close());
    cal.addEventListener("click", (e) => { if (e.target === cal) cal.close(); });
  }

  // --- cooking mode ---
  const TIME = /(\d+)(?:\s*[–-]\s*(\d+))?\s*(min|stund|timm)/i;
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
    cook.querySelector(".cook-text").textContent = steps[i];
    cook.querySelector(".cook-progress").style.width = `${((i + 1) / steps.length) * 100}%`;
    cook.querySelector("[data-back]").disabled = i === 0;
    cook.querySelector("[data-next]").textContent = i === steps.length - 1 ? i18n.finish : i18n.next;
    const m = steps[i].match(TIME);
    const tb = cook.querySelector("[data-timer]");
    if (m) {
      const unit = m[3].toLowerCase();
      const n = +m[1] * (unit.startsWith("min") ? 1 : 60);
      tb.dataset.seconds = n * 60; tb.textContent = `${i18n.timer} ${n} ${i18n.min}`; tb.parentElement.hidden = false;
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
