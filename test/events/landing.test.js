/**
 * Landing: el hero y las cifras usan solo información real y nunca repiten una foto.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BRAND } from "../../src/design-system/index.js";
import { normalizeEvent, toEventView } from "../../src/features/events/domain/event.js";
import { renderLandingPage } from "../../src/features/events/pages/landing.page.js";

const NOW = new Date("2026-09-30T12:00:00-03:00");
const view = (/** @type {Record<string, any>} */ raw) => toEventView(normalizeEvent({ category: "tele", modality: "presencial", ...raw }), { now: NOW });

const next = view({ id: "evento-test", title: "Evento Test", startsAt: "2026-10-10T09:00:00-03:00", endsAt: "2026-10-10T18:00:00-03:00", image: "https://nexus/evento-test.jpg", summary: "Jornada de prueba.", location: { label: "Casa matriz Transworld" } });
const past = view({ id: "connect", title: "TRANSWORLD CONNECT", startsAt: "2026-08-25T09:00:00-04:00", endsAt: "2026-08-25T18:00:00-04:00", image: "https://nexus/connect.jpg", location: { venue: "Hotel Intercontinental", city: "Las Condes", label: "Hotel Intercontinental, Las Condes" } });
const album = { slug: "transworld-connect-2026", title: "Transworld Connect 2026", description: "Clientes y marcas.", country: "Chile", photos: 64, videos: 0, cover: null, previews: [] };
const photo = (/** @type {number} */ i) => ({ album, item: { id: `f${i}`, type: /** @type {const} */ ("foto"), thumb: `https://intranet/thumb-${i}.jpg`, src: `https://intranet/src-${i}.jpg`, large: i === 0 ? "https://intranet/large-0.jpg" : null, slot: "" } });
const explorer = { query: { q: "", categories: [], modality: "", city: "", month: null, day: null, sort: /** @type {const} */ ("fecha"), all: false }, monthExplicit: false, months: [], calendar: null, monthItems: [], seasonItems: [], total: 0, alternatives: [], facets: { cities: [], modalities: [] } };

/** @param {string} html */
const backdrops = (html) => [...html.matchAll(/tw-hero__backdrop[^>]*>\s*<img src="([^"]+)"/g)].map((m) => m[1]);

test("hero: agenda, próximo evento, último realizado y álbum; cada uno con su propia foto", () => {
  const html = String(
    renderLandingPage({
      landing: { nextEvent: next, lastFinished: past, openMonths: ["2026-10"], summary: { year: 2026, total: 18, finished: 17, countries: ["Chile", "Perú"], openRegistrations: 1 } },
      gallery: { tiles: [0, 1, 2, 3, 4].map(photo), photos: 64, albums: 1 },
      explorer,
      categories: [],
    }),
  );
  const images = backdrops(html);
  assert.deepEqual(images, [BRAND.heroImage, "https://nexus/evento-test.jpg", "https://nexus/connect.jpg", "https://intranet/large-0.jpg"]);
  assert.equal(new Set(images).size, images.length, "ninguna foto se repite");
  assert.match(html, /Realizado · MAR 25 AGO · Hotel Intercontinental/i);
  assert.match(html, /Galería · 64 fotos/);

  // El teaser no repite la portada del hero: fotos 1 a 4.
  const tiles = [...html.matchAll(/class="tw-tile"[\s\S]*?<img class="tw-media__img" src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tiles, [1, 2, 3, 4].map((i) => `https://intranet/thumb-${i}.jpg`));

  // Cifras reales, sin nombres ni fechas del hero.
  assert.match(html, /Eventos 2026<\/div>\s*<div class="tw-stat__value">18 eventos en Chile y Perú/);
  assert.match(html, /Inscripciones abiertas<\/div>\s*<div class="tw-stat__value">1 evento</);
  assert.match(html, /Galería<\/div>\s*<div class="tw-stat__value">64 fotos publicadas/);
});

test("hero: sin foto propia no se inventa una; sin galería, las cifras siguen siendo reales", () => {
  const nextNoPhoto = view({ ...next, id: "sin-foto", image: undefined });
  const html = String(
    renderLandingPage({
      landing: { nextEvent: nextNoPhoto, lastFinished: null, openMonths: [], summary: { year: 2026, total: 3, finished: 2, countries: ["Chile"], openRegistrations: 1 } },
      gallery: { tiles: [], photos: 0, albums: 0 },
      explorer,
      categories: [],
    }),
  );
  assert.deepEqual(backdrops(html), [BRAND.heroImage], "el próximo evento usa la foto de la casa matriz y la promo sobra");
  assert.match(html, /Realizados 2026<\/div>\s*<div class="tw-stat__value">2 eventos/);
  assert.doesNotMatch(html, /id="galeria"/, "sin fotos no hay teaser");
});
