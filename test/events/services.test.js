import assert from "node:assert/strict";
import test from "node:test";
import { createApiEventRepository, createMockEventRepository, RepositoryError } from "../../src/features/events/services/event-repository.js";
import { createEventService } from "../../src/features/events/services/event-service.js";
import { createMemoryRegistrationGateway } from "../../src/features/events/services/registration-gateway.js";
import { createRegistrationService, DomainError } from "../../src/features/events/services/registration-service.js";

const NOW = new Date("2026-09-28T12:00:00-03:00");
/** @param {import("../../src/features/events/services/event-repository.js").EventRepository} [repository] */
const setup = (repository = createMockEventRepository()) => {
  const eventService = createEventService({ repository, now: () => NOW });
  return { eventService, registrationService: createRegistrationService({ eventService, gateway: createMemoryRegistrationGateway({ eventService }) }) };
};

const person = { nombre: "Camila Rojas", email: "camila@andes.cl", empresa: "Andes SpA", cargo: "Jefa de proyectos", telefono: "9 1234 5678", telefono_pais: "CL", acepta: true };

/** @param {Promise<unknown>} promise @returns {Promise<[number, string] | null>} */
async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof DomainError);
    return [error.status, error.code];
  }
  return null;
}

test("mock repository devuelve copias (la UI no puede mutar la fuente)", async () => {
  const repo = createMockEventRepository();
  const [first] = await repo.listEvents();
  first.title = "mutado";
  assert.notEqual((await repo.getEvent(first.id))?.title, "mutado");
  assert.equal(await repo.getEvent("no-existe"), null);
});

test("getLandingData: evento del hero y stats del template", async () => {
  const { eventService } = setup();
  const data = await eventService.getLandingData({ formatsLabel: "Presencial · Webinar · En terreno" });
  assert.equal(data.heroEvent?.id, "certificacion-seguridad-maquinas");
  assert.deepEqual(data.stats.map((s) => s.value), ["Jue 8 de octubre", "Presencial · Webinar · En terreno", "Santiago · Antofagasta · Lima"]);
});

test("getWebinars y getGallery", async () => {
  const { eventService } = setup();
  const { upcoming, recorded } = await eventService.getWebinars();
  assert.deepEqual(upcoming.map((e) => e.id), ["webinar-fttx-industrial", "webinar-wifi7-oficinas", "webinar-cctv-analitica", "webinar-tendencias-2027"]);
  assert.deepEqual(recorded.map((e) => e.id), ["webinar-vallados-sensores", "webinar-mantencion-ups"]);
  const gallery = await eventService.getGallery("foto");
  assert.ok(gallery.items.every((m) => m.type === "foto"));
  assert.deepEqual(gallery.groups.map((g) => [g.country, g.items.length]), [["Chile", 4], ["Perú", 1]]);
});

test("getEventDetail: principal con talleres y taller con padre", async () => {
  const { eventService } = setup();
  const connect = await eventService.getEventDetail("transworld-connect-2026");
  assert.equal(connect?.children.length, 4);
  assert.equal(connect?.event.childCount, 4);
  const taller = await eventService.getEventDetail("connect-taller-fttx");
  assert.equal(taller?.parent?.id, "transworld-connect-2026");
  assert.equal(await eventService.getEventDetail("nope"), null);
});


test("register: inscribe, el mismo correo suma talleres y los estados cerrados se rechazan", async () => {
  const { registrationService } = setup();
  const first = await registrationService.register("webinar-fttx-industrial", person);
  assert.deepEqual(first, {
    eventId: "webinar-fttx-industrial",
    eventTitle: "Diseño y certificación de redes FTTx en proyectos industriales",
    email: "camila@andes.cl",
    result: "inscrito",
    workshops: [],
    alreadyIn: [],
    delivery: "programado",
  });
  assert.equal((await registrationService.register("webinar-fttx-industrial", person)).result, "sin_cambios");

  assert.deepEqual(await failure(registrationService.register("webinar-fttx-industrial", { ...person, email: "x" })), [422, "invalid"]);
  assert.deepEqual(await failure(registrationService.register("curso-fusion-empalme-fibra", person)), [409, "sold_out"]);
  assert.deepEqual(await failure(registrationService.register("desayuno-cctv-puertos", person)), [410, "cancelled"]);
  assert.deepEqual(await failure(registrationService.register("webinar-mantencion-ups", person)), [410, "finished"]);
  assert.deepEqual(await failure(registrationService.register("nope", person)), [404, "not_found"]);
});

test("register: talleres del evento principal, desde el taller y actualizaciones", async () => {
  const { registrationService } = setup();
  const connect = "transworld-connect-2026";
  const withFttx = await registrationService.register(connect, { ...person, talleres: ["connect-taller-fttx"] });
  assert.equal(withFttx.result, "inscrito");
  assert.deepEqual(withFttx.workshops, ["Taller: certificación FTTx en terreno"]);

  // Desde la página del taller: se inscribe en el evento padre con ese taller.
  const fromWorkshop = await registrationService.register("connect-demo-cctv", person);
  assert.equal(fromWorkshop.eventId, connect);
  assert.equal(fromWorkshop.result, "actualizado");
  assert.equal(fromWorkshop.workshops.length, 1);

  const again = await registrationService.register(connect, { ...person, talleres: ["connect-taller-fttx"] });
  assert.equal(again.result, "sin_cambios");
  assert.deepEqual(again.alreadyIn, ["Taller: certificación FTTx en terreno"]);
});

test("register: taller sin cupo o con choque de horario", async () => {
  const base = { category: "cctv", startsAt: "2026-11-10T09:00:00-03:00", endsAt: "2026-11-10T18:00:00-03:00" };
  const repository = createMockEventRepository({
    events: [
      { ...base, id: "expo", title: "Expo", modality: "presencial", kind: "principal", capacity: 100, seatsLeft: 100 },
      { ...base, id: "t1", code: "aaaaaa", parentId: "expo", title: "Taller 1", modality: "taller", startsAt: "2026-11-10T10:00:00-03:00", endsAt: "2026-11-10T11:00:00-03:00", capacity: 1, seatsLeft: 1 },
      { ...base, id: "t2", code: "bbbbbb", parentId: "expo", title: "Taller 2", modality: "taller", startsAt: "2026-11-10T10:30:00-03:00", endsAt: "2026-11-10T11:30:00-03:00" },
      { ...base, id: "t3", code: "cccccc", parentId: "expo", title: "Taller 3", modality: "taller", startsAt: "2026-11-10T12:00:00-03:00", endsAt: "2026-11-10T13:00:00-03:00", capacity: 5, seatsLeft: 0 },
    ],
  });
  const { registrationService } = setup(repository);
  await assert.rejects(registrationService.register("expo", { ...person, talleres: ["aaaaaa", "bbbbbb"] }), (/** @type {any} */ e) => e.status === 422 && /misma hora/.test(e.fields.talleres));
  await assert.rejects(registrationService.register("expo", { ...person, talleres: ["cccccc"] }), (/** @type {any} */ e) => e.code === "workshops_rejected" && /ya no tiene cupos/.test(e.message));

  await registrationService.register("expo", { ...person, talleres: ["aaaaaa"] });
  // Último cupo tomado y, para quien ya está en el Taller 1, el Taller 2 choca con su inscripción.
  await assert.rejects(registrationService.register("expo", { ...person, email: "otro@andes.cl", talleres: ["aaaaaa"] }), (/** @type {any} */ e) => /«Taller 1» ya no tiene cupos/.test(e.message));
  await assert.rejects(registrationService.register("expo", { ...person, talleres: ["bbbbbb"] }), (/** @type {any} */ e) => /ya estás inscrito/.test(e.message));
});

test("API repository: normaliza, descarta inválidos y mapea errores", async () => {
  const warnings = [];
  /** @type {typeof fetch} */
  const fakeFetch = async (url) => {
    const u = String(url);
    if (u.endsWith("/events")) return Response.json({ data: [{ id: "a", title: "A", category: "cctv", modality: "webinar", startsAt: "2026-10-01T10:00:00-03:00" }, { id: "b" }] });
    if (u.endsWith("/events/a")) return Response.json({ id: "a", title: "A", category: "cctv", modality: "webinar", startsAt: "2026-10-01T10:00:00-03:00" });
    if (u.endsWith("/categories")) return Response.json([{ id: "cctv", name: "CCTV" }]);
    if (u.endsWith("/events/boom")) return new Response("fail", { status: 500 });
    return new Response("", { status: 404 });
  };
  const repo = createApiEventRepository({ baseUrl: "https://api.test/v1/", fetchImpl: fakeFetch, logger: { warn: (/** @type {string} */ m) => warnings.push(m) } });
  assert.deepEqual((await repo.listEvents()).map((e) => e.id), ["a"]);
  assert.equal(warnings.length, 1);
  assert.equal((await repo.getEvent("a"))?.location.city, "");
  assert.equal(await repo.getEvent("zzz"), null);
  await assert.rejects(repo.getEvent("boom"), RepositoryError);

  const offline = createApiEventRepository({ baseUrl: "https://api.test", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(offline.listEvents(), /No se pudo conectar/);
});
