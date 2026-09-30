/**
 * Agenda: calendario interactivo (mes, línea de producto, día y temporada completa). El HTML
 * inicial llega del servidor; aquí se re-renderiza la región de resultados con los mismos
 * componentes pidiendo los datos a /api/eventos. La URL queda sincronizada (enlaces compartibles).
 */
import { toHtml } from "../../../design-system/index.js";
import { ExplorerError, ExplorerResults, ExplorerSkeleton } from "../components/explorer.js";
import { parseExplorerQuery, serializeExplorerQuery } from "../domain/explorer.js";
import { API } from "../domain/links.js";
import { initShell } from "./shell.js";

/** @typedef {import("../domain/explorer.js").ExplorerQuery} ExplorerQuery */
/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */

const SKELETON_DELAY_MS = 180;

function initExplorer() {
  const root = document.querySelector("[data-explorer]");
  if (!root) return;

  const results = /** @type {HTMLElement} */ (root.querySelector("[data-explorer-results]"));
  const monthTabs = root.querySelector("[data-explorer-months]");
  results.tabIndex = -1;

  /** @type {ExplorerQuery} */
  let query = parseExplorerQuery(new URLSearchParams(location.search));
  /** Mes efectivo (si la URL no lo fija, lo resuelve el servidor). */
  let resolvedMonth = monthTabs?.querySelector('[aria-pressed="true"]')?.getAttribute("data-month") ?? null;
  let requestId = 0;
  /** @type {AbortController | undefined} */
  let inflight;

  function syncChips() {
    root?.querySelectorAll("[data-explorer-chips] [data-category]").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(query.categories.includes(chip.getAttribute("data-category") ?? "")));
    });
  }

  function syncUrl() {
    const qs = serializeExplorerQuery(query);
    history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }

  /** Clave de foco para recuperarlo tras el re-render. @param {Element | null} el */
  function focusKey(el) {
    if (!el || !results.contains(el)) return null;
    // Selector de mes del calendario: se vuelve a la misma flecha (su data-month cambia al navegar).
    const nav = el.closest(".tw-calendar__nav");
    if (nav) return `.tw-calendar__nav .tw-icon-btn:${el === nav.firstElementChild ? "first" : "last"}-child`;
    for (const attr of ["data-action", "data-day", "data-month"]) {
      const value = el.getAttribute(attr);
      if (value) return `[${attr}="${CSS.escape(value)}"]`;
    }
    return "";
  }

  /** @param {ExplorerResult} explorer @param {string | null} key */
  function render(explorer, key) {
    resolvedMonth = explorer.query.month;
    results.innerHTML = toHtml(ExplorerResults({ explorer }));
    monthTabs?.querySelectorAll("[data-month]").forEach((tab) => {
      tab.setAttribute("aria-pressed", String(tab.getAttribute("data-month") === resolvedMonth));
    });
    if (key === null) return;
    let target = /** @type {HTMLButtonElement | null} */ (key ? results.querySelector(key) : null);
    // Una flecha que quedó deshabilitada (primer o último mes) no recibe foco: pasa a la otra.
    if (target?.disabled) target = /** @type {HTMLButtonElement | null} */ (target.closest(".tw-calendar__nav")?.querySelector(".tw-icon-btn:not(:disabled)") ?? null);
    (target ?? results).focus({ preventScroll: true });
  }

  /** @param {Partial<ExplorerQuery>} patch */
  async function update(patch = {}) {
    query = { ...query, ...patch };
    syncChips();
    syncUrl();

    const key = focusKey(document.activeElement);
    const id = ++requestId;
    inflight?.abort();
    inflight = new AbortController();
    const skeleton = setTimeout(() => {
      results.innerHTML = toHtml(ExplorerSkeleton());
    }, SKELETON_DELAY_MS);

    try {
      const response = await fetch(`${API.events}?${serializeExplorerQuery(query)}`, { headers: { accept: "application/json" }, signal: inflight.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (id !== requestId) return;
      clearTimeout(skeleton);
      render(body.data, key);
    } catch (error) {
      if (/** @type {Error} */ (error).name === "AbortError") return;
      clearTimeout(skeleton);
      results.innerHTML = toHtml(ExplorerError({ message: "No pudimos cargar los eventos. Revisa tu conexión e inténtalo de nuevo." }));
      /** @type {HTMLElement | null} */ (results.querySelector('[data-action="retry"]'))?.focus({ preventScroll: true });
    }
  }

  root.addEventListener("click", (event) => {
    const target = /** @type {Element} */ (event.target);

    const month = target.closest("[data-month]");
    if (month) return void update({ month: month.getAttribute("data-month"), day: null });

    const chip = target.closest("[data-explorer-chips] [data-category]");
    if (chip) {
      const id = chip.getAttribute("data-category") ?? "";
      const categories = query.categories.includes(id) ? query.categories.filter((c) => c !== id) : [...query.categories, id];
      return void update({ categories, day: null });
    }

    // Template: clic en un día con eventos filtra; un segundo clic lo deselecciona.
    const day = target.closest("[data-explorer-calendar] [data-day]");
    if (day && resolvedMonth) {
      const key = `${resolvedMonth}-${String(day.getAttribute("data-day")).padStart(2, "0")}`;
      return void update({ month: resolvedMonth, day: query.day === key ? null : key });
    }

    const action = target.closest("[data-action]")?.getAttribute("data-action");
    if (action === "clear-filters") update({ q: "", categories: [], modality: "", city: "", day: null });
    else if (action === "toggle-season") update({ all: !query.all });
    else if (action === "retry") update();
  });
}

/**
 * Enlaces como /?categoria=cctv#calendario: el navegador salta al ancla antes de que carguen
 * las fuentes y el reflow lo desplaza; se re-alinea al terminar.
 */
function realignHashTarget() {
  const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (!target || target.tagName === "DIALOG") return;
  document.fonts.ready.then(() => target.scrollIntoView({ block: "start", behavior: "instant" }));
}

initShell();
initExplorer();
realignHashTarget();
