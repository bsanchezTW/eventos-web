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
  // Mismo orden que el template: hero → stats → calendario → participar → galería → CTA
  const order = ["tw-hero", "tw-stat-bar", "id=\"calendario\"", "id=\"participar\"", "id=\"galeria\"", "tw-cta-band--accent", "tw-footer"].map((m) => body.indexOf(m));
  assert.ok(order.every((pos, i) => pos > 0 && (i === 0 || pos > order[i - 1])), `orden de secciones: ${order}`);
  assert.match(body, /id="suscribirme"/);
  assert.doesNotMatch(body, /tw-searchbar|data-explorer-form/, "el template no tiene buscador ni barra de filtros");
  for (const [label, href] of [["Agenda", "/"], ["Galería", "/galeria"], ["Webinars", "/webinars"]]) {
    assert.match(body, new RegExp(`class="tw-pill" href="${href}"[^>]*>${label}<`));
  }
  assert.match(body, />Inscribirme<\/span>/);
  assert.match(body, /<h1 class="tw-sr-only">Agenda de eventos Transworld<\/h1>/);
  assert.equal((body.match(/<h1\b/g) ?? []).length, 1, "un solo h1 por página");
  assert.match(body, /<link rel="stylesheet" href="\/design-system\/tw.css">/);
});

test("GET / respeta filtros de la URL (SSR = mismo estado que el cliente)", async () => {
  const body = await (await fetch(`${base}/?categoria=energia&mes=2026-10`)).text();
  assert.match(body, /Sin fechas para este filtro/);
  assert.match(body, /data-month="2026-11"[^>]*>.*Ver noviembre \(1\)/s);
  assert.match(body, /data-category="energia"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-category="energia"/);
});

test("GET /galeria y /webinars (vistas del template)", async () => {
  const gallery = await (await fetch(`${base}/galeria?tipo=video`)).text();
  assert.match(gallery, /Lo que pasó en cada evento/);
  assert.match(gallery, /href="\/galeria\?tipo=video" aria-current="page"/);
  assert.equal((gallery.match(/data-lightbox=/g) ?? []).length, 3, "solo videos");
  assert.match(gallery, /<script type="application\/json" id="gallery-data">/);

  const webinars = await (await fetch(`${base}/webinars`)).text();
  assert.match(webinars, /Sesiones técnicas desde donde estés/);
  assert.match(webinars, /EN VIVO · 8 OCT/);
  assert.match(webinars, /id="grabaciones"/);
  assert.match(webinars, /Ver grabación/);
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
  assert.equal(list.data.seasonItems[0].program, undefined, "los listados van sin programa");

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
  assert.equal((await fetch(`${base}/design-system/assets/fonts/montserrat-latin-wght-normal.woff2`)).status, 200);
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
  assert.match(body, /#293f68/);
  assert.equal((await fetch(`${base}/design-system/tokens/read-tokens.js`)).status, 404);

  const prod = loadConfig({ NODE_ENV: "production" });
  assert.equal(prod.showcase, false);
  assert.equal(loadConfig({ NODE_ENV: "production", DS_SHOWCASE: "1" }).showcase, true);
});
