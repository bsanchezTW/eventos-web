import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORIES } from "../../src/features/events/data/categories.mock.js";
import { EVENTS } from "../../src/features/events/data/events.mock.js";
import { normalizeEvent, toEventViews } from "../../src/features/events/domain/event.js";
import {
  DEFAULT_QUERY,
  applyFilters,
  buildExplorer,
  parseExplorerQuery,
  serializeExplorerQuery,
  sortEvents,
} from "../../src/features/events/domain/explorer.js";

const NOW = new Date("2026-09-28T12:00:00-03:00");
const views = toEventViews(EVENTS.map(normalizeEvent), { now: NOW, categories: CATEGORIES });
const q = (/** @type {Record<string, string>} */ params) => parseExplorerQuery(new URLSearchParams(params));

test("parseExplorerQuery sanea la entrada", () => {
  const query = q({ q: "  fibra ", categoria: "cctv,CCTV,<x>,energia", formato: "fiesta", sede: "Lima", mes: "2026-13", dia: "2026-11-05", orden: "raro", todos: "1" });
  assert.deepEqual(query, { q: "fibra", categories: ["cctv", "energia"], modality: "", city: "lima", month: "2026-11", day: "2026-11-05", sort: "fecha", all: true });
  assert.equal(q({ mes: "2026-10", dia: "2026-11-05" }).day, null);
});

test("serializeExplorerQuery es inversa de parse y omite defaults", () => {
  assert.equal(serializeExplorerQuery(DEFAULT_QUERY), "");
  const query = q({ q: "wifi", categoria: "networking", sede: "online", mes: "2026-10", orden: "precio" });
  assert.deepEqual(parseExplorerQuery(new URLSearchParams(serializeExplorerQuery(query))), query);
});

test("applyFilters excluye talleres y finalizados; busca sin tildes", () => {
  const ids = applyFilters(views, DEFAULT_QUERY).map((e) => e.id);
  assert.ok(!ids.includes("connect-taller-fttx"), "los talleres se ven dentro del evento principal");
  assert.ok(!ids.includes("webinar-mantencion-ups"), "los finalizados no se listan");
  assert.ok(ids.includes("showroom-semana-conectividad"), "los en curso sí");

  const search = applyFilters(views, q({ q: "analitica videovigilancia" })).map((e) => e.id);
  assert.deepEqual(search.sort(), ["desayuno-cctv-puertos", "webinar-cctv-analitica"]);
  assert.deepEqual(applyFilters(views, q({ q: "camaras termicas" })).map((e) => e.id), ["desayuno-cctv-puertos"]);
  assert.deepEqual(applyFilters(views, q({ sede: "lima" })).map((e) => e.id).sort(), ["encuentro-integradores-lima", "jornada-respaldo-energetico-lima"]);
});

test("sortEvents: cancelados al final; precio y cupos", () => {
  const list = sortEvents(applyFilters(views, DEFAULT_QUERY), "fecha");
  assert.equal(list.at(-1)?.status, "cancelled");
  const byPrice = sortEvents(applyFilters(views, DEFAULT_QUERY), "precio").filter((e) => e.status !== "cancelled");
  assert.ok(byPrice.every((e, i, arr) => i === 0 || arr[i - 1].price <= e.price));
  assert.equal(sortEvents(applyFilters(views, DEFAULT_QUERY), "cupos")[0].id, "curso-fusion-empalme-fibra");
});

test("buildExplorer: mes automático = mes del próximo evento por comenzar", () => {
  const result = buildExplorer(views, DEFAULT_QUERY, { now: NOW });
  assert.equal(result.query.month, "2026-10");
  assert.equal(result.monthExplicit, false);
  assert.deepEqual(result.months.map((m) => m.key), ["2026-09", "2026-10", "2026-11", "2026-12"]);
  assert.deepEqual(result.calendar?.markers, { 8: 1, 15: 1, 20: 1, 22: 1, 29: 1 });
  assert.equal(result.calendar?.today, null);
});

test("buildExplorer: mes explícito, día y 'hoy'", () => {
  const sep = buildExplorer(views, q({ mes: "2026-09" }), { now: NOW });
  assert.equal(sep.monthExplicit, true);
  assert.equal(sep.calendar?.today, 28);

  const day = buildExplorer(views, q({ dia: "2026-10-15" }), { now: NOW });
  assert.deepEqual(day.monthItems.map((e) => e.id), ["demo-inalambrica-mineria"]);

  const invalidDay = buildExplorer(views, q({ dia: "2026-10-16" }), { now: NOW });
  assert.equal(invalidDay.query.day, null, "un día sin eventos no filtra");
});

test("buildExplorer: sin resultados en el mes ofrece alternativas", () => {
  const result = buildExplorer(views, q({ categoria: "energia", mes: "2026-10" }), { now: NOW });
  assert.equal(result.monthItems.length, 0);
  assert.deepEqual(result.alternatives.map((m) => [m.key, m.count]), [["2026-11", 1], ["2026-12", 1]]);
  assert.equal(result.total, 2);
});

test("buildExplorer: facetas estables de sedes y formatos", () => {
  const result = buildExplorer(views, q({ categoria: "cctv" }), { now: NOW });
  assert.deepEqual(result.facets.cities.map((c) => c.value), ["antofagasta", "concepcion", "lima", "santiago", "online"]);
  assert.ok(result.facets.modalities.some((m) => m.value === "webinar"));
});
