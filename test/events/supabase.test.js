/**
 * Integración con NEXUS (Supabase): mapeo de las RPC públicas, caché y escritura de inscripciones.
 * Usa un `fetch` falso con la forma de las respuestas reales de PostgREST.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { RepositoryError } from "../../src/features/events/services/event-repository.js";
import { createSupabaseRegistrationGateway } from "../../src/features/events/services/registration-gateway.js";
import { categoryFromTopic, createSupabaseEventRepository, toRawEvents, zonedIso } from "../../src/features/events/services/supabase-event-repository.js";
import { createSupabaseRpc, RpcError } from "../../src/features/events/services/supabase-rpc.js";

const CALENDAR_ROW = {
  slug: "transworld-connect-k3f9",
  nombre: "Transworld Connect",
  tematica: "Telecomunicaciones, TI, Seguridad de máquinas",
  pais: "Chile",
  fecha_inicio: "2026-11-12",
  fecha_fin: "2026-11-13",
  hora_inicio: "09:00",
  hora_fin: "18:00",
  zona_horaria: "America/Santiago",
  lugar: "Hotel Intercontinental",
  direccion: "Av. Vitacura 2885, Las Condes | Hora: 09:00 |",
  imagen_url: "https://evjo.supabase.co/storage/v1/object/public/imagenes/eventos/a.jpg",
  banner_url: null,
  estado: "proximo",
  registro_abierto: true,
  tiene_subeventos: true,
  agotado: false,
};

const DETAIL = {
  ...CALENDAR_ROW,
  descripcion: "Un día completo de demos y talleres.\n\nSegundo párrafo.",
  mapa_url: "https://www.google.com/maps/embed?pb=!1m18!2sIntercontinental",
  inscripciones_cierre: "2026-11-11T23:59:00",
  cupo: { limitado: true, disponibles: 42 },
  formulario: { campos: ["nombre_completo", "email", "empresa", "cargo", "telefono"] },
  subeventos: [
    { codigo: "a7k2mq", nombre: "Taller IA", descripcion: null, dia: "2026-11-12", hora_inicio: "10:00", hora_fin: "11:30", sala: "Salón B", expositor: "Ana Pérez", imagen_url: null, cupo: { limitado: true, disponibles: 0 }, agotado: true },
    { codigo: "b8m3np", nombre: "Taller Fibra", descripcion: "Práctica", dia: "2026-11-13", hora_inicio: "15:00", hora_fin: "16:00", sala: null, expositor: null, imagen_url: null, cupo: { limitado: false, disponibles: null }, agotado: false },
  ],
};

const PAST_ROW = { ...CALENDAR_ROW, slug: "certificacion-altai-8t4v", nombre: "Certificación Altai", tematica: "Certificación", fecha_inicio: "2026-08-27", fecha_fin: "2026-08-27", hora_inicio: null, hora_fin: null, lugar: "Transworld", direccion: "Calle Nueva 1890, Huechuraba", imagen_url: null, estado: "finalizado", registro_abierto: false, tiene_subeventos: false };

/**
 * PostgREST falso: responde las tres RPC y registra las llamadas.
 * @param {{ register?: (body: any) => { status: number, body: unknown } }} [options]
 */
function fakeSupabase({ register } = {}) {
  /** @type {Array<{ name: string, body: any, apikey: string | null }>} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (url, init) => {
    const name = String(url).split("/rpc/")[1];
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ name, body, apikey: new Headers(init?.headers).get("apikey") });
    if (name === "rpe_publico_calendario") return Response.json([PAST_ROW, CALENDAR_ROW]);
    if (name === "rpe_publico_evento") {
      return body.p_slug === DETAIL.slug ? Response.json(DETAIL) : Response.json({ code: "P0002", details: null, hint: "No encontramos ese evento.", message: "RPE_EVENTO_NO_ENCONTRADO" }, { status: 500 });
    }
    if (name === "rpe_publico_registrar" && register) {
      const res = register(body);
      return Response.json(res.body, { status: res.status });
    }
    return new Response("", { status: 404 });
  };
  return { calls, rpc: createSupabaseRpc({ url: "https://evjo.supabase.co/", key: "sb_publishable_test", fetchImpl }) };
}

test("zonedIso: hora local del evento con el offset vigente (horario de verano)", () => {
  assert.equal(zonedIso("2026-11-12", "09:00", "America/Santiago"), "2026-11-12T09:00:00-03:00");
  assert.equal(zonedIso("2026-08-27", "00:00", "America/Santiago"), "2026-08-27T00:00:00-04:00");
  assert.equal(zonedIso("2026-11-12", "18:30:00", "America/Lima"), "2026-11-12T18:30:00-05:00");
});

test("categoryFromTopic: la temática es la categoría (id apto para filtros de la URL)", () => {
  assert.deepEqual(categoryFromTopic("Cámaras"), { id: "camaras", name: "Cámaras", description: "", icon: "calendar" });
  assert.equal(categoryFromTopic("Telecomunicaciones, TI, Seguridad de máquinas").id, "telecomunicaciones-ti-seguridad-de-maqui");
  assert.equal(categoryFromTopic(null).id, "general");
});

test("toRawEvents: evento principal con talleres y cupos disponibles", () => {
  const [event, ia, fibra] = toRawEvents(DETAIL, { featured: true });
  assert.equal(event.id, "transworld-connect-k3f9");
  assert.equal(event.kind, "principal");
  assert.equal(event.modality, "presencial");
  assert.equal(event.startsAt, "2026-11-12T09:00:00-03:00");
  assert.equal(event.endsAt, "2026-11-13T18:00:00-03:00");
  assert.deepEqual(event.location, { online: false, venue: "Hotel Intercontinental", city: "Las Condes", country: "Chile", address: "Av. Vitacura 2885, Las Condes", label: "Hotel Intercontinental, Las Condes" });
  assert.equal(event.summary, "Un día completo de demos y talleres.");
  assert.equal(event.seatsLeft, 42);
  assert.equal(event.featured, true);

  assert.equal(ia.id, "transworld-connect-k3f9--a7k2mq");
  assert.equal(ia.code, "a7k2mq");
  assert.equal(ia.parentId, event.id);
  assert.equal(ia.seatsLeft, 0);
  assert.equal(ia.location.label, "Salón B · Hotel Intercontinental, Las Condes");
  assert.deepEqual(ia.program, [{ time: "10:00", title: "Taller IA", speaker: "Ana Pérez" }]);
  assert.equal(fibra.seatsLeft, null, "cupo ilimitado");
  assert.equal(event.mapUrl, "https://www.google.com/maps/embed?pb=!1m18!2sIntercontinental");
  assert.equal(ia.mapUrl, event.mapUrl, "el taller usa el mapa del evento");
  assert.equal(event.registrationClosesAt, "2026-11-11T23:59:00-03:00", "hora local del evento con su offset");
  assert.equal(ia.registrationClosesAt, event.registrationClosesAt, "el taller cierra con su evento");
  assert.equal(toRawEvents(CALENDAR_ROW)[0].registrationClosesAt, undefined, "el calendario no trae cierre");
});

test("toRawEvents: sin hora ni imagen → día completo con foto por defecto", () => {
  const [event] = toRawEvents(PAST_ROW);
  assert.equal(event.hasTime, false);
  assert.equal(event.startsAt, "2026-08-27T00:00:00-04:00");
  assert.equal(event.endsAt, "2026-08-27T23:59:00-04:00");
  assert.equal(event.image, "/media/eventos/casa-matriz.jpg");
  assert.equal(event.location.city, "Huechuraba");
  assert.equal(event.registrationOpen, false);
});

test("repositorio Supabase: detalle solo de vigentes, caché e invalidación", async () => {
  const { calls, rpc } = fakeSupabase();
  let clock = Date.parse("2026-09-29T12:00:00Z");
  const repo = createSupabaseEventRepository({ rpc, clock: () => clock, cacheTtlMs: 30_000 });

  const events = await repo.listEvents();
  assert.deepEqual(events.map((e) => e.id), ["certificacion-altai-8t4v", "transworld-connect-k3f9", "transworld-connect-k3f9--a7k2mq", "transworld-connect-k3f9--b8m3np"]);
  assert.deepEqual(calls.map((c) => c.name), ["rpe_publico_calendario", "rpe_publico_evento"], "el finalizado no pide detalle");
  assert.deepEqual(calls[0].body, { p_desde: "2026-01-01", p_hasta: "2027-09-29" });
  assert.equal(calls[0].apikey, "sb_publishable_test");
  assert.deepEqual(
    (await repo.listCategories()).map((c) => [c.name, c.active]),
    [
      ["Certificación", false],
      ["Telecomunicaciones, TI, Seguridad de máquinas", true],
    ],
    "todas las temáticas (para mostrar su nombre); solo las vigentes filtran",
  );
  assert.equal((await repo.getEvent("transworld-connect-k3f9--a7k2mq"))?.title, "Taller IA");
  assert.equal(calls.length, 2, "dentro del TTL no vuelve a consultar");

  clock += 31_000;
  await repo.listEvents();
  assert.equal(calls.length, 4, "vencido el TTL, vuelve a consultar");
  repo.invalidate?.();
  await repo.listEvents();
  assert.equal(calls.length, 6, "invalidate fuerza la lectura");
});

test("RPC: errores de negocio, de red y respuestas inesperadas", async () => {
  const { rpc } = fakeSupabase();
  await assert.rejects(rpc("rpe_publico_evento", { p_slug: "nope" }), (/** @type {any} */ e) => e instanceof RpcError && e.code === "RPE_EVENTO_NO_ENCONTRADO" && e.status === 500);
  await assert.rejects(rpc("otra_funcion"), RepositoryError);
  const offline = createSupabaseRpc({ url: "https://x.supabase.co", key: "k", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(offline("rpe_publico_calendario"), /No se pudo conectar con la base de eventos/);
});

const attendee = {
  nombre: "Ana Pérez",
  email: "ana@x.cl",
  empresa: "X",
  cargo: "Cto",
  telefono_pais: "CL",
  telefono: "+56 9 1234 5678",
  talleres: ["a7k2mq"],
  utm: { utm_source: "linkedin", utm_medium: null, utm_campaign: null, utm_content: null },
  acepta: true,
};

test("gateway Supabase: envía el contrato de rpe_publico_registrar y traduce la respuesta", async () => {
  const { calls, rpc } = fakeSupabase({
    register: () => ({ status: 200, body: { ok: true, resultado: "actualizado", agregados: ["a7k2mq"], ya_inscrito_en: ["b8m3np"], envio: "limitado" } }),
  });
  const result = await createSupabaseRegistrationGateway({ rpc }).register("transworld-connect-k3f9", attendee, ["a7k2mq", "b8m3np"]);
  assert.deepEqual(result, { ok: true, result: "actualizado", added: ["a7k2mq"], alreadyIn: ["b8m3np"], delivery: "limitado" });
  assert.deepEqual(calls[0].body, {
    p_slug: "transworld-connect-k3f9",
    p_datos: { nombre_completo: "Ana Pérez", email: "ana@x.cl", empresa: "X", cargo: "Cto", telefono: "+56 9 1234 5678", utm_source: "linkedin", utm_medium: null, utm_campaign: null, utm_content: null },
    p_subeventos: ["a7k2mq", "b8m3np"],
  });
});

test("gateway Supabase: rechazos y datos inválidos", async () => {
  const reply = (/** @type {{ status: number, body: unknown }} */ res) => createSupabaseRegistrationGateway({ rpc: fakeSupabase({ register: () => res }).rpc });

  const rejected = await reply({ status: 200, body: { ok: false, motivo: "subeventos_rechazados", rechazados: [{ codigo: "a7k2mq", motivo: "sin_cupo" }] } }).register("s", attendee, ["a7k2mq"]);
  assert.deepEqual(rejected, { ok: false, reason: "subeventos_rechazados", rejected: [{ code: "a7k2mq", reason: "sin_cupo" }] });

  const invalid = await reply({
    status: 400,
    body: { code: "22023", details: '{"campo":"telefono","regla":"formato"}', hint: "El teléfono debe tener entre 8 y 15 dígitos.", message: "RPE_DATOS_INVALIDOS" },
  }).register("s", attendee, []);
  assert.deepEqual(invalid, { ok: false, reason: "invalid", field: "telefono", message: "El teléfono debe tener entre 8 y 15 dígitos." });

  const missing = await reply({ status: 500, body: { code: "P0002", details: null, hint: null, message: "RPE_EVENTO_NO_ENCONTRADO" } }).register("s", attendee, []);
  assert.deepEqual(missing, { ok: false, reason: "not_found" });
});
