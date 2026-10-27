/**
 * Integración HTTP: levanta la app en un puerto efímero con fecha fija.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app/app.js";
import { loadConfig } from "../src/app/config.js";
import { createMockEventRepository } from "../src/features/events/services/event-repository.js";

const NOW = new Date("2026-09-28T12:00:00-03:00");
/** @type {import("node:http").Server} */
let server;
let base = "";

before(async () => {
  const app = createApp({ config: loadConfig({}), now: () => NOW, logger: { error() {}, warn() {} } });
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve(undefined));
  });
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

after(() => server?.close());

test("GET / renderiza la landing completa con cabeceras de seguridad", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy") ?? "", /style-src 'self'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  const body = await res.text();
  // Orden: hero compacto → lista de eventos → galería → footer; sin carrusel, cifras ni banda CTA
  const order = ["tw-banner--photo", "id=\"calendario\"", "id=\"galeria\"", "tw-footer"].map((m) => body.indexOf(m));
  assert.ok(order.every((pos, i) => pos > 0 && (i === 0 || pos > order[i - 1])), `orden de secciones: ${order}`);
  assert.doesNotMatch(body, /class="tw-hero\b|tw-stat-bar|tw-cta-band/);
  assert.doesNotMatch(body, /id="suscribirme"|\/webinars|capacitación para tu equipo/i, "webinars, capacitaciones y suscripción ocultos");
  assert.doesNotMatch(body, /tw-searchbar|data-explorer-form/, "el template no tiene buscador ni barra de filtros");
  for (const [label, href] of [["Agenda", "/"], ["Galería", "/galeria"]]) {
    assert.match(body, new RegExp(`class="tw-pill" href="${href}"[^>]*>${label}<`));
  }
  assert.match(body, /Próximo evento · /);
  assert.match(body, /<h1 class="tw-sr-only" id="agenda-title">Agenda de eventos Transworld<\/h1>/);
  assert.equal((body.match(/<h1\b/g) ?? []).length, 1, "un solo h1 por página");
  assert.match(body, /<link rel="stylesheet" href="\/design-system\/tw.css">/);
});

test("GET / respeta filtros de la URL (SSR = mismo estado que el cliente)", async () => {
  const body = await (await fetch(`${base}/?categoria=energia&mes=2026-10`)).text();
  assert.match(body, /Sin fechas para este filtro/);
  assert.match(body, /data-month="2026-11"[^>]*>.*Ver noviembre \(1\)/s);
  assert.match(body, /data-category="energia"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-category="energia"/);
});

test("GET /galeria, /galeria/:slug y /webinars", async () => {
  const gallery = await (await fetch(`${base}/galeria`)).text();
  assert.match(gallery, /Lo que pasó en cada evento/);
  assert.equal((gallery.match(/href="\/galeria\/[a-z0-9-]+"/g) ?? []).length, 3, "un enlace por álbum");
  assert.match(gallery, /id="galeria-Chile"[\s\S]*id="galeria-Perú"/, "Chile antes que Perú");
  assert.match(gallery, /data-gallery-filter[\s\S]*data-country="Chile"[\s\S]*data-country="Perú"/, "filtro por país");
  assert.match(gallery, /class="tw-album-card" href="\/galeria\/jornada-radwin-santiago" aria-label="Ver galería de Jornada Radwin/);
  assert.match(gallery, /20 de agosto de 2026/, "fecha del álbum en su tarjeta");

  const album = await (await fetch(`${base}/galeria/jornada-radwin-santiago`)).text();
  assert.match(album, /<h1 class="tw-gallery-hero__title">Jornada Radwin: conectividad inalámbrica para minería<\/h1>/);
  assert.match(album, /<span>Galería<\/span><span aria-hidden="true">·<\/span><span>20 de agosto de 2026<\/span>/);
  assert.match(album, /<span>6 fotos<\/span>[\s\S]*<span>1 video<\/span>/);
  assert.match(album, /href="\/galeria">.*Galería<\/a>/s, "volver a la galería desde el slider");
  assert.match(album, /Fotos y videos[\s\S]*7 archivos/);
  assert.equal((album.match(/data-viewer-index=/g) ?? []).length, 7, "cada miniatura abre el visor");
  assert.match(album, /data-album-mosaic[\s\S]*data-tw-viewer/, "mosaico y visor");
  assert.match(album, /<script type="application\/json" id="gallery-data">/);
  assert.doesNotMatch(album, /data-album-more/, "7 piezas caben en la primera tanda");
  assert.equal((await fetch(`${base}/galeria/no-existe`)).status, 404);

  // Las tandas siguientes (al bajar) por la API.
  const page = await (await fetch(`${base}/api/galeria/jornada-radwin-santiago?desde=4&cantidad=2`)).json();
  assert.deepEqual([page.data.items.length, page.data.total, page.data.items[0].id], [2, 7, "jornada-radwin-santiago-f5"]);
  assert.equal((await fetch(`${base}/api/galeria/no-existe`)).status, 404);

  const landing = await (await fetch(`${base}/`)).text();
  assert.match(landing, /data-tw-filmstrip/, "rollo de fotos en la portada");
  assert.match(landing, /href="\/galeria\/jornada-radwin-santiago" aria-label="Jornada Radwin[^"]*: ver álbum"/, "cada foto lleva a su álbum");

  const webinars = await fetch(`${base}/webinars`, { redirect: "manual" });
  assert.equal(webinars.status, 302, "webinars ocultos por ahora");
  assert.equal(webinars.headers.get("location"), "/");
});

test("GET /eventos/:id y 404 con el lenguaje visual del sistema", async () => {
  const ok = await fetch(`${base}/eventos/transworld-connect-2026`);
  assert.equal(ok.status, 200);
  const detail = await ok.text();
  assert.match(detail, /Talleres y actividades/);
  // Campos del formulario público anterior + talleres del evento.
  for (const name of ["nombre", "email", "empresa", "cargo", "telefono_pais", "telefono", "acepta"]) assert.match(detail, new RegExp(`name="${name}"`), name);
  assert.match(detail, /<option value="CL" selected>\+56 CL<\/option>/);
  assert.equal((detail.match(/<input class="tw-choice__input" type="checkbox" name="talleres"/g) ?? []).length, 4);
  // Cómo llegar: mapa cargado en la app + enlace a Google Maps.
  assert.match(detail, /Inscripciones hasta<\/dt>\s*<dd[^>]*>Martes 24 de noviembre, 23:59</);
  assert.match(detail, />Cómo llegar</);
  assert.match(detail, /<iframe class="tw-map__frame" src="https:\/\/maps\.google\.com\/maps\?q=[^"]+&amp;output=embed" title="Mapa: Centro de Eventos Casa Piedra"/);
  assert.match(detail, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[^"]+" target="_blank" rel="noopener"/);
  assert.match(ok.headers.get("content-security-policy") ?? "", /frame-src 'self' https:\/\/www\.google\.com https:\/\/maps\.google\.com;/);
  const closed = await (await fetch(`${base}/eventos/curso-fusion-empalme-fibra`)).text();
  assert.match(closed, /Cupos agotados/);
  assert.match(closed, /<button[^>]*disabled[^>]*>.*Inscripción no disponible/s);
  const missing = await fetch(`${base}/eventos/no-existe`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /No encontramos esta página/);
});

test("API: explorador, detalle, inscripción y suscripción", async () => {
  const list = await (await fetch(`${base}/api/eventos?sede=lima`)).json();
  assert.equal(list.ok, true);
  assert.equal(list.data.total, 2);
  assert.equal(list.data.items[0].program, undefined, "los listados van sin programa");

  const post = (/** @type {string} */ url, /** @type {unknown} */ body) =>
    fetch(`${base}${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const person = { nombre: "Ana Soto", email: "ana@x.cl", empresa: "X SpA", cargo: "Ingeniera", telefono: "9 1234 5678", telefono_pais: "CL", acepta: true };
  const created = await post("/api/eventos/webinar-cctv-analitica/inscripciones", person);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.result, "inscrito");
  assert.equal((await (await post("/api/eventos/webinar-cctv-analitica/inscripciones", person)).json()).data.result, "sin_cambios");

  const invalid = await post("/api/eventos/webinar-cctv-analitica/inscripciones", { nombre: "Ana" });
  assert.equal(invalid.status, 422);
  assert.ok((await invalid.json()).fields.email);

  const sub = await post("/api/suscripciones", { email: "ana@x.cl", categorias: ["cctv"] });
  assert.equal(sub.status, 201);

  assert.equal((await fetch(`${base}/api/eventos/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/otra-cosa`)).status, 404);
});

test("inscripciones: límite de intentos por IP", async () => {
  const app = createApp({ config: { ...loadConfig({}), registrationLimit: { max: 2, windowMs: 60_000 } }, logger: { error() {}, warn() {} } });
  const srv = app.listen(0);
  await new Promise((resolve) => srv.once("listening", resolve));
  const address = srv.address();
  const url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/api/eventos/webinar-cctv-analitica/inscripciones`;
  const post = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  try {
    assert.equal((await post()).status, 422);
    assert.equal((await post()).status, 422);
    const limited = await post();
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal((await limited.json()).code, "rate_limited");
  } finally {
    srv.close();
  }
});

test("CSP: imágenes del Storage de Supabase solo con la fuente supabase", async () => {
  const { securityHeaders } = await import("../src/app/security.js");
  /** @type {Record<string, string>} */
  const headers = {};
  const res = /** @type {any} */ ({ set: (/** @type {Record<string, string>} */ h) => Object.assign(headers, h) });
  securityHeaders({ imageOrigins: ["https://evjo.supabase.co"] })(/** @type {any} */ ({}), res, () => {});
  assert.match(headers["Content-Security-Policy"], /img-src 'self' data: https:\/\/evjo\.supabase\.co;/);
  const config = loadConfig({ EVENTS_SOURCE: "supabase", SUPABASE_URL: "https://evjo.supabase.co/", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" });
  assert.equal(config.events.source, "supabase");
  assert.equal(config.supabase.url, "https://evjo.supabase.co");
  assert.throws(() => createApp({ config: loadConfig({ EVENTS_SOURCE: "supabase" }) }), /SUPABASE_URL/);
});

test("assets: el DS y los módulos de cliente se sirven; el código de servidor no", async () => {
  assert.equal((await fetch(`${base}/design-system/tw.css`)).status, 200);
  assert.equal((await fetch(`${base}/design-system/index.js`)).status, 200);
  assert.equal((await fetch(`${base}/design-system/assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2`)).status, 200);
  assert.equal((await fetch(`${base}/features/events/components/event-card.js`)).status, 200);
  assert.equal((await fetch(`${base}/design-system/server.js`)).status, 404);
  assert.equal((await fetch(`${base}/features/events/services/event-service.js`)).status, 404);
  assert.equal((await fetch(`${base}/features/events/data/events.mock.js`)).status, 404);
});

test("repositorio caído → 503 con página de estado", async () => {
  const failing = createMockEventRepository();
  failing.listEvents = async () => {
    const { RepositoryError } = await import("../src/features/events/services/event-repository.js");
    throw new RepositoryError("caído");
  };
  const app = createApp({ config: loadConfig({}), repository: failing, logger: { error() {}, warn() {} } });
  const srv = app.listen(0);
  await new Promise((resolve) => srv.once("listening", resolve));
  const address = srv.address();
  const url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  try {
    const page = await fetch(`${url}/`);
    assert.equal(page.status, 503);
    assert.match(await page.text(), /La agenda no está disponible/);
    const api = await fetch(`${url}/api/eventos`);
    assert.equal(api.status, 503);
  } finally {
    srv.close();
  }
});

test("guía viva del Design System en desarrollo; oculta en producción", async () => {
  const res = await fetch(`${base}/sistema-de-diseno`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /navy-600/);
  assert.match(body, /#203e6d/);
  assert.equal((await fetch(`${base}/design-system/tokens/read-tokens.js`)).status, 404);

  const prod = loadConfig({ NODE_ENV: "production" });
  assert.equal(prod.showcase, false);
  assert.equal(loadConfig({ NODE_ENV: "production", DS_SHOWCASE: "1" }).showcase, true);
});
