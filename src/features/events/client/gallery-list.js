/**
 * Lista de álbumes: filtro por país (oculta las secciones de los demás países).
 */
import { initShell } from "./shell.js";

function initCountryFilter() {
  const group = document.querySelector("[data-gallery-filter]");
  if (!group) return;
  const sections = /** @type {HTMLElement[]} */ ([...document.querySelectorAll("[data-country-section]")]);
  group.addEventListener("click", (event) => {
    const chip = /** @type {Element} */ (event.target).closest("[data-country]");
    if (!chip) return;
    const country = chip.getAttribute("data-country") ?? "";
    group.querySelectorAll("[data-country]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    sections.forEach((section) => (section.hidden = Boolean(country) && section.dataset.countrySection !== country));
  });
}

initShell();
initCountryFilter();
