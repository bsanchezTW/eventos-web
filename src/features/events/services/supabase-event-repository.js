/**
 * Repositorio sobre la base NEXUS (Supabase), vía las RPC públicas:
 *
 *   rpe_publico_calendario(p_desde, p_hasta)  → eventos del rango (sin talleres ni cupos)
 *   rpe_publico_evento(p_slug)                → detalle, cupos y talleres (sub-eventos) vigentes
 *
 * Cada evento vigente pide su detalle (en paralelo) y el resultado queda en caché unos segundos.
 * Ids: el evento usa su `slug`; un taller usa `<slug>--<código>` (el slug nunca tiene "--").
 *
 * Diferencias con el modelo de la landing, resueltas aquí:
 * - La base no tiene "modalidad": es presencial, salvo que lugar o nombre digan webinar/online.
 * - La categoría es la `tematica` del evento.
 * - La base solo publica cupos disponibles (no el total): `capacity` y `seatsLeft` son lo que queda.
 * - La ciudad se toma del último tramo de la dirección ("Av. Vitacura 2885, Las Condes").
 * - El mapa (`mapa_url`) lo carga el staff en la app; los talleres usan el del evento.
 */
import { GALLERY } from "../data/gallery.mock.js";
import { normalizeEvent } from "../domain/event.js";
import { foldText, zonedParts } from "../domain/format.js";

/** @typedef {import("../domain/event.js").Event} Event */
/** @typedef {import("../domain/event.js").Category} Category */
/** @typedef {import("./event-repository.js").EventRepository} EventRepository */
/** @typedef {import("./supabase-rpc.js").SupabaseRpc} SupabaseRpc */

const DEFAULT_IMAGE = "/media/eventos/casa-matriz.jpg";
const DEFAULT_IMAGE_ALT = "Edificio de la casa matriz de Transworld en Huechuraba";
const DAY_MS = 86_400_000;
const ONLINE = /\b(online|webinar|teams|zoom|google meet)\b/i;

const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
const clean = (/** @type {unknown} */ value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

/**
 * Fecha y hora locales de una zona → ISO 8601 con el offset vigente ese día (considera horario de verano).
 * @param {string} date "2026-11-12"
 * @param {string} time "09:00" o "09:00:00"
 * @param {string} timeZone
 */
export function zonedIso(date, time, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (/** @type {number} */ instant) => {
    const p = zonedParts(new Date(instant), timeZone);
    const [H, M] = p.time.split(":").map(Number);
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, H, M) - instant) / 60000);
  };
  const offset = offsetAt(wall - offsetAt(wall) * 60000);
  const abs = Math.abs(offset);
  return `${date}T${pad(hh)}:${pad(mm)}:00${offset < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Temática → categoría ("Seguridad de máquinas" → { id: "seguridad-de-maquinas" }). @param {unknown} topic @returns {Category} */
export function categoryFromTopic(topic) {
  const name = clean(topic) || "General";
  const id = foldText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return { id: id || "general", name, description: "", icon: "calendar" };
}

/** Primer párrafo, recortado para bajadas. @param {string} text */
function summarize(text) {
  const first = text.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  return first.length > 220 ? `${first.slice(0, 217).replace(/\s+\S*$/, "")}…` : first;
}

/** @param {any} cupo @param {boolean} [soldOut] */
function seats(cupo, soldOut = false) {
  if (!cupo) return soldOut ? 0 : null;
  return cupo.limitado ? Math.max(0, Number(cupo.disponibles) || 0) : null;
}

/**
 * Fila pública (calendario o detalle) → eventos crudos: el evento y sus talleres. Pasan luego por `normalizeEvent`.
 * @param {any} row
 * @param {{ featured?: boolean }} [options]
 * @returns {Array<Record<string, any>>}
 */
export function toRawEvents(row, { featured = false } = {}) {
  const slug = String(row.slug);
  const timezone = clean(row.zona_horaria) || (/^per[uú]$/i.test(clean(row.pais)) ? "America/Lima" : "America/Santiago");
  const country = clean(row.pais);
  const venue = clean(row.lugar);
  const address = clean(String(row.direccion ?? "").split("|")[0]);
  const city = address.includes(",") ? clean(address.split(",").pop()) : country;
  const online = ONLINE.test(`${venue} ${clean(row.nombre)}`);
  const label = online ? undefined : [venue, city].filter(Boolean).join(", ") || undefined;
  const category = categoryFromTopic(row.tematica).id;
  const description = clean(row.descripcion) ? String(row.descripcion).trim() : "";
  const image = clean(row.imagen_url) || DEFAULT_IMAGE;
  const imageAlt = image === DEFAULT_IMAGE ? DEFAULT_IMAGE_ALT : "";
  const currency = timezone === "America/Lima" ? "PEN" : "CLP";
  const subevents = Array.isArray(row.subeventos) ? row.subeventos : [];
  const seatsLeft = seats(row.cupo, row.agotado === true);
  const location = { online, venue: venue || undefined, city: online ? "Online" : city, country, address: address || undefined, label };

  const event = {
    id: slug,
    title: clean(row.nombre),
    summary: description ? summarize(description) : clean(row.tematica),
    description: description || undefined,
    image,
    imageAlt,
    category,
    modality: online ? "webinar" : "presencial",
    kind: subevents.length ? "principal" : "individual",
    parentId: null,
    startsAt: zonedIso(row.fecha_inicio, row.hora_inicio || "00:00", timezone),
    endsAt: zonedIso(row.fecha_fin || row.fecha_inicio, row.hora_fin || "23:59", timezone),
    timezone,
    location,
    price: 0,
    currency,
    capacity: seatsLeft,
    seatsLeft,
    featured,
    registrationOpen: row.registro_abierto !== false,
    hasTime: Boolean(row.hora_inicio),
    // Solo viene en el detalle (rpe_publico_evento); normalizeEvent descarta enlaces no insertables.
    mapUrl: row.mapa_url ?? undefined,
  };

  const workshops = subevents.map((/** @type {any} */ s) => {
    const room = clean(s.sala);
    const speaker = clean(s.expositor);
    const left = seats(s.cupo, s.agotado === true);
    const workshopDescription = clean(s.descripcion) ? String(s.descripcion).trim() : "";
    return {
      id: `${slug}--${s.codigo}`,
      code: String(s.codigo),
      parentId: slug,
      kind: "taller",
      modality: "taller",
      title: clean(s.nombre),
      summary: workshopDescription ? summarize(workshopDescription) : "",
      description: workshopDescription || undefined,
      image: clean(s.imagen_url) || image,
      imageAlt: clean(s.imagen_url) ? "" : imageAlt,
      category,
      startsAt: zonedIso(s.dia, s.hora_inicio, timezone),
      endsAt: zonedIso(s.dia, s.hora_fin, timezone),
      timezone,
      location: { ...location, venue: room || location.venue, label: room && label ? `${room} · ${label}` : label },
      price: 0,
      currency,
      capacity: left,
      seatsLeft: left,
      registrationOpen: event.registrationOpen,
      mapUrl: event.mapUrl,
      program: speaker ? [{ time: clean(s.hora_inicio).slice(0, 5), title: clean(s.nombre), speaker }] : [],
    };
  });

  return [event, ...workshops];
}

/**
 * @param {{
 *   rpc: SupabaseRpc,
 *   cacheTtlMs?: number,
 *   pastDays?: number,
 *   futureDays?: number,
 *   clock?: () => number,
 *   media?: import("../data/gallery.mock.js").MediaItem[],
 *   logger?: Pick<Console, "warn">,
 * }} options
 * @returns {EventRepository}
 */
export function createSupabaseEventRepository({ rpc, cacheTtlMs = 30_000, pastDays = 180, futureDays = 365, clock = Date.now, media = GALLERY, logger = console }) {
  /** @type {{ at: number, data: Promise<{ events: Event[], categories: Category[] }> } | null} */
  let cache = null;

  /** @param {any} raw */
  const safeNormalize = (raw) => {
    try {
      return normalizeEvent(raw);
    } catch (error) {
      logger.warn(`[eventos] Evento descartado: ${/** @type {Error} */ (error).message}`);
      return null;
    }
  };

  async function load() {
    const today = clock();
    const day = (/** @type {number} */ offset) => new Date(today + offset * DAY_MS).toISOString().slice(0, 10);
    const rows = await rpc("rpe_publico_calendario", { p_desde: day(-pastDays), p_hasta: day(futureDays) });
    const list = Array.isArray(rows) ? rows : [];

    // Detalle (cupos y talleres) solo de los vigentes; si uno falla, queda con los datos del calendario.
    const detailed = await Promise.all(
      list.map((/** @type {any} */ row) =>
        row.estado === "finalizado"
          ? row
          : rpc("rpe_publico_evento", { p_slug: row.slug }).catch((/** @type {Error} */ error) => {
              logger.warn(`[eventos] Sin detalle de ${row.slug}: ${error.message}`);
              return row;
            }),
      ),
    );

    // Destacado: el próximo evento con inscripción abierta y cupos.
    const featured = detailed.find((/** @type {any} */ row) => row.estado === "proximo" && row.registro_abierto && !row.agotado);
    const events = detailed.flatMap((/** @type {any} */ row) => toRawEvents(row, { featured: row === featured })).map(safeNormalize).filter((e) => e !== null);

    // Filtros de la agenda: temáticas de los eventos que aún no terminan.
    /** @type {Map<string, Category>} */
    const categories = new Map();
    for (const row of detailed) {
      const topic = categoryFromTopic(row.tematica);
      if (row.estado !== "finalizado" && !categories.has(topic.id)) categories.set(topic.id, topic);
    }
    return { events, categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, "es")) };
  }

  function data() {
    if (cache && clock() - cache.at < cacheTtlMs) return cache.data;
    const pending = load();
    const entry = { at: clock(), data: pending };
    cache = entry;
    pending.catch(() => {
      if (cache === entry) cache = null;
    });
    return pending;
  }

  return {
    async listEvents() {
      return (await data()).events.map((e) => structuredClone(e));
    },
    async getEvent(id) {
      const event = (await data()).events.find((e) => e.id === id);
      return event ? structuredClone(event) : null;
    },
    async listCategories() {
      return (await data()).categories.map((c) => ({ ...c }));
    },
    async listMedia() {
      return media.map((m) => ({ ...m }));
    },
    invalidate() {
      cache = null;
    },
  };
}

