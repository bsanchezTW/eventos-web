/**
 * Landing: hero compacto con el próximo evento (sin carrusel ni cifras) y teaser de galería.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BRAND } from "../../src/design-system/index.js";
import { normalizeEvent, toEventView } from "../../src/features/events/domain/event.js";
import { renderLandingPage } from "../../src/features/events/pages/landing.page.js";

const NOW = new Date("2026-09-30T12:00:00-03:00");
const view = (/** @type {Record<string, any>} */ raw) => toEventView(normalizeEvent({ category: "tele", modality: "presencial", ...raw }), { now: NOW });

const next = view({ id: "evento-test", title: "Evento Test", startsAt: "2026-10-10T09:00:00-03:00", endsAt: "2026-10-10T18:00:00-03:00", image: "https://nexus/evento-test.jpg", summary: "Jornada de prueba.", location: { label: "Casa matriz Transworld" } });
const album = { slug: "transworld-connect-2026", title: "Transworld Connect 2026", description: "Clientes y marcas.", country: "Chile", photos: 64, videos: 0, cover: null, previews: [] };
const photo = (/** @type {number} */ i) => ({ album, item: { id: `f${i}`, type: /** @type {const} */ ("foto"), thumb: `https://intranet/thumb-${i}.jpg`, src: `https://intranet/src-${i}.jpg`, large: null, slot: "" } });
const explorer = { query: { q: "", categories: [], modality: "", city: "", month: null, day: null, sort: /** @type {const} */ ("fecha"), all: false }, monthExplicit: false, months: [], calendar: null, items: [], past: [], total: 0, alternatives: [], facets: { cities: [], modalities: [] } };

/** @param {string} html */
const heroImage = (html) => /<img class="tw-banner__img" src="([^"]+)"/.exec(html)?.[1];

test("hero: el próximo evento con su foto, fecha, lugar y botón", () => {
  const html = String(renderLandingPage({ landing: { nextEvent: next }, gallery: { tiles: [0, 1, 2, 3, 4].map(photo), photos: 64, albums: 1 }, explorer, categories: [] }));
  assert.equal(heroImage(html), "https://nexus/evento-test.jpg");
  assert.match(html, /Próximo evento · Sábado 10 de octubre · 09:00–18:00/);
  assert.match(html, />Casa matriz Transworld</);
  assert.match(html, /href="\/eventos\/evento-test"[^>]*>.*Inscribirme/s);
  assert.doesNotMatch(html, /tw-hero__|tw-stat/, "sin carrusel ni cifras");

  const tiles = [...html.matchAll(/class="tw-tile"[\s\S]*?<img class="tw-media__img" src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tiles, [0, 1, 2, 3].map((i) => `https://intranet/thumb-${i}.jpg`), "cuatro fotos de la galería");
});

test("hero: sin foto propia usa la de la casa matriz; sin próximos invita a ver la agenda", () => {
  const noPhoto = String(renderLandingPage({ landing: { nextEvent: view({ ...next, id: "sin-foto", image: undefined }) }, gallery: { tiles: [], photos: 0, albums: 0 }, explorer, categories: [] }));
  assert.equal(heroImage(noPhoto), BRAND.heroImage);
  assert.doesNotMatch(noPhoto, /id="galeria"/, "sin fotos no hay teaser");

  const empty = String(renderLandingPage({ landing: { nextEvent: null }, gallery: { tiles: [], photos: 0, albums: 0 }, explorer, categories: [] }));
  assert.match(empty, /Pronto publicaremos nuevas fechas/);
  assert.match(empty, /href="#calendario"/);
});
