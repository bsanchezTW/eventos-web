/**
 * Explorador de eventos: parseo de filtros desde la URL, filtrado, orden y armado del
 * calendario. Funciones puras compartidas por el servidor (SSR y API) y el navegador,
 * para que un enlace como /?categoria=cctv#calendario muestre lo mismo con o sin JS.
 */
import { MODALITIES } from "./event.js";
import { eventDayKey, eventMonthKey, foldText, formatCity, monthKeyLabel, monthName, zonedParts } from "./format.js";

/** @typedef {import("./event.js").EventView} EventView */
/** @typedef {"fecha" | "precio" | "cupos"} SortKey */

/**
 * @typedef {object} ExplorerQuery
 * @property {string} q
 * @property {string[]} categories
 * @property {string} modality   "" = todas
 * @property {string} city       slug de sede, "" = todas
 * @property {string | null} month  "2026-10" · null = automático
 * @property {string | null} day    "2026-10-15"
 * @property {SortKey} sort
 * @property {boolean} all       mostrar la temporada completa
 */

export const SORT_OPTIONS = /** @type {const} */ ([
  { value: "fecha", label: "Fecha" },
  { value: "precio", label: "Menor valor" },
  { value: "cupos", label: "Últimos cupos" },
]);

/** @type {ExplorerQuery} */
export const DEFAULT_QUERY = Object.freeze({ q: "", categories: [], modality: "", city: "", month: null, day: null, sort: "fecha", all: false });

const SLUG = /^[a-z0-9-]{1,40}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** "Santiago" → "santiago"; online → "online". @param {EventView} event */
export function citySlug(event) {
  if (event.location.online) return "online";
  return foldText(event.location.city).trim().replace(/\s+/g, "-");
}

/**
 * @param {URLSearchParams | Record<string, unknown>} input
 * @returns {ExplorerQuery}
 */
export function parseExplorerQuery(input) {
  const get = (/** @type {string} */ key) => {
    const value = input instanceof URLSearchParams ? input.get(key) : input[key];
    return typeof value === "string" ? value.trim() : Array.isArray(value) ? String(value[0] ?? "").trim() : "";
  };

  const categories = [...new Set(get("categoria").toLowerCase().split(",").map((s) => s.trim()).filter((s) => SLUG.test(s)))];
  const modality = get("formato");
  const city = get("sede").toLowerCase();
  const sort = /** @type {SortKey} */ (SORT_OPTIONS.some((o) => o.value === get("orden")) ? get("orden") : "fecha");
  let month = MONTH.test(get("mes")) ? get("mes") : null;
  let day = DAY.test(get("dia")) ? get("dia") : null;
  if (day && !month) month = day.slice(0, 7);
  if (day && month && !day.startsWith(month)) day = null;

  return {
    q: get("q").slice(0, 80),
    categories,
    modality: modality in MODALITIES ? modality : "",
    city: SLUG.test(city) ? city : "",
    month,
    day,
    sort,
    all: get("todos") === "1",
  };
}

/** Query → querystring (omite valores por defecto). @param {Partial<ExplorerQuery>} query */
export function serializeExplorerQuery(query) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categories?.length) params.set("categoria", query.categories.join(","));
  if (query.modality) params.set("formato", query.modality);
  if (query.city) params.set("sede", query.city);
  if (query.month) params.set("mes", query.month);
  if (query.day) params.set("dia", query.day);
  if (query.sort && query.sort !== "fecha") params.set("orden", query.sort);
  if (query.all) params.set("todos", "1");
  return params.toString();
}

/** @param {ExplorerQuery} query */
export function hasActiveFilters(query) {
  return Boolean(query.q || query.categories.length || query.modality || query.city || query.day);
}

/** Aparece en el explorador: evento de primer nivel que aún no terminó. @param {EventView} event */
export function isListable(event) {
  return !event.parentId && event.status !== "finished";
}

/** @param {EventView} event @param {string} q */
function matchesText(event, q) {
  const needle = foldText(q);
  const haystack = foldText([event.title, event.summary, event.categoryName, MODALITIES[event.modality], event.location.city, event.location.venue ?? ""].join(" "));
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/**
 * Filtros que no dependen del calendario (texto, categoría, formato, sede).
 * @param {EventView[]} events
 * @param {ExplorerQuery} query
 */
export function applyFilters(events, query) {
  return events.filter(
    (event) =>
      isListable(event) &&
      (!query.q || matchesText(event, query.q)) &&
      (!query.categories.length || query.categories.includes(event.category)) &&
      (!query.modality || event.modality === query.modality) &&
      (!query.city || citySlug(event) === query.city),
  );
}

/**
 * Orden estable. Los cancelados siempre al final.
 * @param {EventView[]} events
 * @param {SortKey} sort
 */
export function sortEvents(events, sort) {
  const byDate = (/** @type {EventView} */ a, /** @type {EventView} */ b) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
  const seats = (/** @type {EventView} */ e) => (e.seatsLeft === null ? Number.POSITIVE_INFINITY : e.seatsLeft);
  /** @type {Record<SortKey, (a: EventView, b: EventView) => number>} */
  const comparators = {
    fecha: byDate,
    precio: (a, b) => a.price - b.price || byDate(a, b),
    cupos: (a, b) => seats(a) - seats(b) || byDate(a, b),
  };
  return [...events].sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled") || comparators[sort](a, b));
}

/**
 * @typedef {object} ExplorerResult
 * @property {ExplorerQuery} query           query resuelta (mes efectivo, día validado)
 * @property {boolean} monthExplicit
 * @property {Array<{ key: string, label: string, count: number }>} months
 * @property {{ key: string, year: number, month: number, title: string, markers: Record<number, number>, today: number | null } | null} calendar
 * @property {EventView[]} monthItems        eventos del mes (y del día, si hay día)
 * @property {EventView[]} seasonItems       todos los meses, con filtros
 * @property {number} total
 * @property {Array<{ key: string, label: string, count: number }>} alternatives  otros meses con resultados
 * @property {{ cities: Array<{ value: string, label: string }>, modalities: Array<{ value: string, label: string }> }} facets
 */

/**
 * @param {EventView[]} events  colección completa (vistas)
 * @param {ExplorerQuery} query
 * @param {{ now?: Date, timeZone?: string }} [options]
 * @returns {ExplorerResult}
 */
export function buildExplorer(events, query, { now = new Date(), timeZone = "America/Santiago" } = {}) {
  const listable = events.filter(isListable);
  const filtered = sortEvents(applyFilters(events, query), query.sort);

  // Pestañas de mes estables: salen de todo lo listable, el conteo refleja los filtros.
  const monthKeys = [...new Set(sortEvents(listable, "fecha").map(eventMonthKey))].sort();
  const countByMonth = new Map();
  for (const event of filtered) countByMonth.set(eventMonthKey(event), (countByMonth.get(eventMonthKey(event)) ?? 0) + 1);
  const months = monthKeys.map((key) => ({ key, label: monthName(Number(key.slice(5))), count: countByMonth.get(key) ?? 0 }));

  // Mes automático: el del próximo evento por comenzar (un evento "en curso" que empezó
  // el mes anterior no debería abrir la agenda en un mes que está terminando).
  const monthExplicit = Boolean(query.month && monthKeys.includes(query.month));
  const nextUpcoming = filtered.filter((e) => e.status === "upcoming").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const month = monthExplicit
    ? /** @type {string} */ (query.month)
    : ((nextUpcoming && eventMonthKey(nextUpcoming)) ?? months.find((m) => m.count > 0)?.key ?? monthKeys[0] ?? null);
  const inMonth = filtered.filter((event) => eventMonthKey(event) === month);
  const day = query.day && month && query.day.startsWith(month) && inMonth.some((e) => eventDayKey(e) === query.day) ? query.day : null;

  /** @type {Record<number, number>} */
  const markers = {};
  for (const event of inMonth) {
    const d = Number(eventDayKey(event).slice(8));
    markers[d] = (markers[d] ?? 0) + 1;
  }

  const today = zonedParts(now, timeZone);
  const calendar = month
    ? {
        key: month,
        year: Number(month.slice(0, 4)),
        month: Number(month.slice(5)),
        title: monthKeyLabel(month),
        markers,
        today: today.year === Number(month.slice(0, 4)) && today.month === Number(month.slice(5)) ? today.day : null,
      }
    : null;

  const monthItems = day ? inMonth.filter((event) => eventDayKey(event) === day) : inMonth;

  const cityMap = new Map();
  for (const event of sortEvents(listable, "fecha")) cityMap.set(citySlug(event), formatCity(event));
  const usedModalities = new Set(listable.map((e) => e.modality));

  return {
    query: { ...query, month, day },
    monthExplicit,
    months,
    calendar,
    monthItems,
    seasonItems: filtered,
    total: filtered.length,
    alternatives: monthItems.length ? [] : months.filter((m) => m.key !== month && m.count > 0),
    facets: {
      cities: [...cityMap].map(([value, label]) => ({ value, label })).sort((a, b) => (a.value === "online" ? 1 : b.value === "online" ? -1 : a.label.localeCompare(b.label, "es"))),
      modalities: Object.entries(MODALITIES)
        .filter(([value]) => usedModalities.has(/** @type {keyof typeof MODALITIES} */ (value)))
        .map(([value, label]) => ({ value, label })),
    },
  };
}
