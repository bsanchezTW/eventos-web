import assert from "node:assert/strict";
import test from "node:test";
import { InvalidEventError, isRegistrationOpen, normalizeEvent, resolveStatus, toEventViews } from "../../src/features/events/domain/event.js";
import {
  dateBadge,
  eventDayKey,
  eventFacts,
  formatLongDate,
  formatPrice,
  formatSchedule,
  metaLine,
  seatAvailability,
} from "../../src/features/events/domain/format.js";
import { embeddableMapUrl, mapsSearchHref } from "../../src/features/events/domain/maps.js";
import {
  defaultPhoneCountry,
  findOverlaps,
  formatLocalPhoneInput,
  isValidNationalPhone,
  normalizePhone,
  validateRegistration,
  validateSubscription,
} from "../../src/features/events/domain/registration.js";

const base = {
  id: "e1",
  title: "Webinar FTTx",
  category: "fibra-optica",
  modality: "webinar",
  startsAt: "2026-10-08T15:00:00-03:00",
  endsAt: "2026-10-08T16:00:00-03:00",
  location: { online: true, venue: "Microsoft Teams" },
};

test("normalizeEvent completa valores por defecto", () => {
  const e = normalizeEvent(base);
  assert.equal(e.kind, "individual");
  assert.equal(e.parentId, null);
  assert.equal(e.price, 0);
  assert.equal(e.currency, "CLP");
  assert.equal(e.capacity, null);
  assert.equal(e.seatsLeft, null);
  assert.equal(e.location.city, "Online");
  assert.equal(e.timezone, "America/Santiago");
  assert.deepEqual(e.program, []);
});

test("normalizeEvent rechaza datos incompletos o inválidos", () => {
  assert.throws(() => normalizeEvent({ ...base, title: "" }), InvalidEventError);
  assert.throws(() => normalizeEvent({ ...base, startsAt: "mañana" }), /startsAt/);
  assert.throws(() => normalizeEvent({ ...base, modality: "fiesta" }), /Modalidad/);
});

test("normalizeEvent: seatsLeft cae a capacity y nunca es negativo", () => {
  assert.equal(normalizeEvent({ ...base, capacity: 20 }).seatsLeft, 20);
  assert.equal(normalizeEvent({ ...base, capacity: 20, seatsLeft: -3 }).seatsLeft, 0);
});

test("resolveStatus según fechas; cancelado prevalece", () => {
  const e = normalizeEvent(base);
  assert.equal(resolveStatus(e, new Date("2026-10-08T14:59:00-03:00")), "upcoming");
  assert.equal(resolveStatus(e, new Date("2026-10-08T15:30:00-03:00")), "live");
  assert.equal(resolveStatus(e, new Date("2026-10-08T16:00:00-03:00")), "finished");
  assert.equal(resolveStatus({ ...e, cancelled: true }, new Date("2026-01-01")), "cancelled");
});

test("toEventViews calcula childCount y nombre de categoría", () => {
  const parent = normalizeEvent({ ...base, id: "p", kind: "principal" });
  const child = normalizeEvent({ ...base, id: "c", parentId: "p", kind: "taller" });
  const [p] = toEventViews([parent, child], { categories: [{ id: "fibra-optica", name: "Fibra óptica", description: "", icon: "fiber" }] });
  assert.equal(p.childCount, 1);
  assert.equal(p.categoryName, "Fibra óptica");
});

test("formatos de fecha en la zona del evento", () => {
  const e = normalizeEvent(base);
  assert.deepEqual(dateBadge(e), { day: "8", month: "OCT" });
  assert.equal(formatLongDate(e), "Jueves 8 de octubre");
  assert.equal(formatSchedule(e), "15:00–16:00");

  // 21:30 en Lima (-05:00) = 23:30 en Santiago: el día se calcula en la zona del evento
  const lima = normalizeEvent({ ...base, startsAt: "2026-12-02T18:30:00-05:00", endsAt: "2026-12-02T21:30:00-05:00", timezone: "America/Lima" });
  assert.equal(eventDayKey(lima), "2026-12-02");
  assert.equal(formatSchedule(lima), "18:30–21:30");

  const multi = normalizeEvent({ ...base, startsAt: "2026-11-26T09:00:00-03:00", endsAt: "2026-11-27T19:00:00-03:00" });
  assert.equal(formatLongDate(multi), "26 y 27 de noviembre");
  assert.equal(formatSchedule(multi), "26–27 nov");
});

test("formatPrice", () => {
  assert.equal(formatPrice(0, "CLP"), "Sin costo");
  assert.equal(formatPrice(89000, "CLP"), "$89.000");
  assert.match(formatPrice(120, "PEN"), /^S\/\s?120$/);
});

test("seatAvailability: umbral de urgencia, agotado, cancelado", () => {
  const view = (/** @type {any} */ over) => ({ ...normalizeEvent({ ...base, capacity: 24, ...over }), status: "upcoming", categoryName: "", childCount: 0, ...over });
  assert.deepEqual(seatAvailability(view({ seatsLeft: 20 })), { label: "Cupos disponibles", tone: "default" });
  assert.deepEqual(seatAvailability(view({ seatsLeft: 6 })), { label: "Últimos 6 cupos", tone: "urgent" });
  assert.deepEqual(seatAvailability(view({ seatsLeft: 1 })), { label: "Último cupo", tone: "urgent" });
  assert.deepEqual(seatAvailability(view({ seatsLeft: 0 })), { label: "Cupos agotados", tone: "closed" });
  assert.equal(seatAvailability(view({ status: "cancelled" })).tone, "closed");
  assert.equal(isRegistrationOpen(view({ seatsLeft: 0 })), false);
  assert.equal(isRegistrationOpen(view({ seatsLeft: 3 })), true);
});

test("metaLine y eventFacts se derivan de los datos", () => {
  const e = { ...normalizeEvent({ ...base, price: 89000, includes: "Certificado" }), status: /** @type {const} */ ("upcoming"), categoryName: "", childCount: 0 };
  assert.equal(metaLine(e), "15:00–16:00 · Online vía Microsoft Teams · $89.000");
  assert.deepEqual(
    eventFacts(e).map((f) => f.label),
    ["Fecha", "Horario", "Formato", "Valor", "Incluye"],
  );
});

test("validateRegistration: campos y mensajes del formulario público anterior", () => {
  const { errors } = validateRegistration({ nombre: "María", email: "maria@", empresa: "", cargo: "Gerente 2", telefono: "123", telefono_pais: "CL", acepta: false });
  assert.deepEqual(errors, {
    nombre: "Ingresa nombre y apellido",
    empresa: "Ingresa la empresa",
    cargo: "Usa solo letras, sin números ni símbolos",
    telefono: "Ingresa un teléfono válido con formato 9 1234 5678",
    email: "Ingresa un correo válido",
    acepta: "Necesitamos tu autorización para enviarte la confirmación.",
  });

  const ok = validateRegistration({
    nombre: " MARÍA  pérez ",
    email: "Maria@Empresa.CL",
    empresa: "  P&G   Chile ",
    cargo: "jefa de proyectos",
    telefono: "912345678",
    telefono_pais: "CL",
    talleres: ["A7K2MQ", "a7k2mq", "<script>"],
    acepta: "on",
    utm: { utm_source: "linkedin", utm_medium: "" },
  });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.value, {
    nombre: "María Pérez",
    email: "maria@empresa.cl",
    empresa: "P&G Chile",
    cargo: "Jefa De Proyectos",
    telefono_pais: "CL",
    telefono: "+56 9 1234 5678",
    talleres: ["a7k2mq"],
    utm: { utm_source: "linkedin", utm_medium: null, utm_campaign: null, utm_content: null },
    acepta: true,
  });
});

test("validateRegistration: reglas de la base para nombre y correo", () => {
  const errorsOf = (/** @type {Record<string, unknown>} */ patch) =>
    validateRegistration({ nombre: "Ana Soto", email: "ana@x.cl", empresa: "X", cargo: "CTO", telefono: "+56 9 1234 5678", acepta: true, ...patch }).errors;
  assert.deepEqual(errorsOf({}), {});
  assert.equal(errorsOf({ nombre: "Ana S" }).nombre, "Ingresa nombre y apellido", "cada palabra con 2+ letras");
  assert.equal(errorsOf({ nombre: "Ana Soto!" }).nombre, "Usa solo letras, sin números ni símbolos");
  for (const email of ["a@b", "a@b.c", ".ana@x.cl", "ana..soto@x.cl", "ana@x_y.cl", "ana@x.c1"]) assert.ok(errorsOf({ email }).email, email);
});

test("teléfono: formato por país, fijos y móviles de Chile y Perú", () => {
  assert.equal(formatLocalPhoneInput("912345678", "CL"), "9 1234 5678");
  assert.equal(formatLocalPhoneInput("322345678", "CL"), "32 234 5678");
  assert.equal(formatLocalPhoneInput("56912345678", "CL"), "9 1234 5678", "quita el código de país pegado");
  assert.equal(formatLocalPhoneInput("13113000", "PE"), "1 311 3000");
  assert.equal(isValidNationalPhone("2 2345 6789", "CL"), true);
  assert.equal(isValidNationalPhone("812345678", "CL"), false);
  assert.equal(isValidNationalPhone("987 654 321", "PE"), true);
  assert.deepEqual(normalizePhone("+57 300 123 4567"), { ok: true, country: "CO", formatted: "+57 300 123 4567" });
  assert.deepEqual(normalizePhone("1 311 3000", "PE"), { ok: true, country: "PE", formatted: "+51 1 311 3000" });
  assert.equal(normalizePhone("+99 123").ok, false);
  assert.equal(defaultPhoneCountry("Perú"), "PE");
  assert.equal(defaultPhoneCountry("Chile"), "CL");
});

test("validateRegistration: talleres desconocidos o a la misma hora", () => {
  const workshops = [
    { code: "aaaaaa", title: "Fibra", startsAt: "2026-11-26T10:00:00-03:00", endsAt: "2026-11-26T11:30:00-03:00" },
    { code: "bbbbbb", title: "CCTV", startsAt: "2026-11-26T11:00:00-03:00", endsAt: "2026-11-26T12:00:00-03:00" },
    { code: "cccccc", title: "Energía", startsAt: "2026-11-26T11:30:00-03:00", endsAt: "2026-11-26T12:30:00-03:00" },
  ];
  const errorsOf = (/** @type {string[]} */ talleres) =>
    validateRegistration({ nombre: "Ana Soto", email: "ana@x.cl", empresa: "X", cargo: "CTO", telefono: "912345678", telefono_pais: "CL", acepta: true, talleres }, { workshops }).errors;
  assert.deepEqual(errorsOf(["aaaaaa", "cccccc"]), {}, "terminar 11:30 y empezar 11:30 no es choque");
  assert.equal(errorsOf(["aaaaaa", "bbbbbb"]).talleres, "«Fibra» y «CCTV» son a la misma hora: elige solo uno.");
  assert.equal(errorsOf(["zzzzzz"]).talleres, "Uno de los talleres elegidos ya no está disponible.");
  assert.equal(findOverlaps(workshops).length, 2);
});

test("validateSubscription filtra categorías desconocidas", () => {
  const { value, errors } = validateSubscription({ email: "a@b.cl", categorias: ["cctv", "hack"] }, ["cctv"]);
  assert.deepEqual(errors, {});
  assert.deepEqual(value.categories, ["cctv"]);
});

test("mapa: mismos casos que urlMapaEmbebible en nexus-app", () => {
  const embed = "https://www.google.com/maps/embed?pb=!1m18!2sHotel";
  assert.equal(embeddableMapUrl(embed), embed);
  assert.equal(
    embeddableMapUrl('<iframe src="https://www.google.com/maps/embed?pb=!1m1&amp;x=1" width="600" height="450" loading="lazy"></iframe>'),
    "https://www.google.com/maps/embed?pb=!1m1&x=1",
  );
  assert.ok(embeddableMapUrl("https://maps.google.com/maps?q=Vitacura&output=embed"));
  assert.equal(embeddableMapUrl("https://maps.app.goo.gl/abc123"), null);
  assert.equal(embeddableMapUrl("http://www.google.com/maps/embed?pb=1"), null);
  assert.equal(embeddableMapUrl("https://evil.example/maps/embed?pb=1"), null);
  assert.equal(embeddableMapUrl("  "), null);
  assert.equal(normalizeEvent({ ...base, mapUrl: "https://maps.app.goo.gl/x" }).mapUrl, undefined, "un enlace no insertable se descarta");
  assert.equal(
    mapsSearchHref({ venue: "Hotel Intercontinental", address: "Av. Vitacura 2885, Las Condes", country: "Chile" }),
    "https://www.google.com/maps/search/?api=1&query=Hotel%20Intercontinental%2C%20Av.%20Vitacura%202885%2C%20Las%20Condes%2C%20Chile",
  );
  assert.equal(mapsSearchHref({}), null);
});
