/**
 * Landing: hero compacto con el próximo evento (sin carrusel ni cifras) y rollo de fotos de la galería.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BRAND } from "../../src/design-system/index.js";
import { normalizeEvent, toEventView } from "../../src/features/events/domain/event.js";
import { renderLandingPage } from "../../src/features/events/pages/landing.page.js";

const NOW = new Date("2026-09-30T12:00:00-03:00");
const view = (/** @type {Record<string, any>} */ raw) => toEventView(normalizeEvent({ category: "tele", modality: "presencial", ...raw }), { now: NOW });

const NEXUS = "https://evjocwzmlsyjixzihxep.supabase.co/storage/v1";
const next = view({ id: "evento-test", title: "Evento Test", startsAt: "2026-10-10T09:00:00-03:00", endsAt: "2026-10-10T18:00:00-03:00", image: `${NEXUS}/object/public/imagenes/eventos/test.png`, summary: "Jornada de prueba.", location: { label: "Casa matriz Transworld" } });
const photo = (/** @type {number} */ i, /** @type {string} */ title) => ({ album: { slug: `album-${i}`, title }, item: { id: `f${i}`, type: /** @type {const} */ ("foto"), thumb: `https://intranet/reel-${i}.webp`, src: null, slot: "" } });
const explorer = { query: { q: "", categories: [], modality: "", city: "", month: null, day: null, sort: /** @type {const} */ ("fecha"), all: false }, monthExplicit: false, months: [], calendar: null, items: [], total: 0, alternatives: [], facets: { cities: [], modalities: [] } };

/** @param {string} html */
const heroImage = (html) => /<img class="tw-banner__img" src="([^"]+)"/.exec(html)?.[1];

test("hero: el próximo evento con su foto reducida, fecha, lugar y botón", () => {
  const html = String(renderLandingPage({ landing: { nextEvent: next }, reel: [photo(1, "Connect 2026"), photo(2, "Jornada Lima")], explorer, categories: [] }));
  assert.equal(heroImage(html), `${NEXUS}/render/image/public/imagenes/eventos/test.png?width=1600&amp;height=1600&amp;resize=contain&amp;quality=75`, "nunca el original");
  assert.match(html, /Próximo evento · Sábado 10 de octubre · 09:00–18:00/);
  assert.match(html, />Casa matriz Transworld</);
  assert.match(html, /href="\/eventos\/evento-test"[^>]*>.*Inscribirme/s);
  assert.doesNotMatch(html, /tw-hero__|tw-stat/, "sin carrusel ni cifras");
});

test("rollo de fotos: cada foto lleva a su álbum y arriba va el título de la del centro", () => {
  const html = String(renderLandingPage({ landing: { nextEvent: next }, reel: [photo(1, "Connect 2026"), photo(2, "Jornada Lima")], explorer, categories: [] }));
  assert.match(html, /data-tw-filmstrip-title>Connect 2026</);
  assert.deepEqual([...html.matchAll(/class="tw-filmstrip__img" src="([^"]+)"/g)].map((m) => m[1]), ["https://intranet/reel-1.webp", "https://intranet/reel-2.webp"]);
  assert.match(html, /href="\/galeria\/album-2" aria-label="Jornada Lima: ver álbum"/);
  assert.match(html, /data-title="Jornada Lima"/);
});

test("hero: sin foto propia usa la de la casa matriz; sin próximos invita a ver la agenda; sin fotos no hay rollo", () => {
  const noPhoto = String(renderLandingPage({ landing: { nextEvent: view({ ...next, id: "sin-foto", image: undefined }) }, reel: [], explorer, categories: [] }));
  assert.equal(heroImage(noPhoto), BRAND.heroImage);
  assert.doesNotMatch(noPhoto, /id="galeria"|tw-filmstrip/, "sin fotos no hay rollo");

  const empty = String(renderLandingPage({ landing: { nextEvent: null }, reel: [], explorer, categories: [] }));
  assert.match(empty, /Pronto publicaremos nuevas fechas/);
  assert.match(empty, /href="#calendario"/);
});
