// Remember the chosen language. The inline <head> script redirects to the
// remembered language on later visits.
document.querySelectorAll("[data-lang]").forEach((a) => {
  a.addEventListener("click", () => {
    try { localStorage.setItem("zlk-lang", a.dataset.lang); } catch (e) {}
  });
});
