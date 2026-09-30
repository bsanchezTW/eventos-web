/**
 * Modelo de evento. Isomórfico: lo usan los repositorios (servidor) y los componentes (navegador).
 *
 * Los datos crudos (mock o API) pasan siempre por `normalizeEvent`, que valida y completa
 * valores por defecto; el resto de la app trabaja con `Event` / `EventView`.
 */
import { embeddableMapUrl } from "./maps.js";

/** @typedef {"upcoming" | "live" | "finished" | "cancelled"} EventStatus */
/** @typedef {"webinar" | "presencial" | "capacitacion" | "taller"} EventModality */
/** @typedef {"individual" | "principal" | "taller"} EventKind */

/**
 * @typedef {object} EventLocation
 * @property {boolean} online
 * @property {string} city       Ciudad o "Online"
 * @property {string} country
 * @property {string} [venue]    Recinto o plataforma ("Casa Piedra", "Microsoft Teams")
 * @property {string} [address]
 * @property {string} [label]    Lugar corto para tarjetas y fichas ("Huechuraba, Santiago")
 */

/**
 * @typedef {object} ProgramItem
 * @property {string} time
 * @property {string} title
 * @property {string} [speaker]
 */

/**
 * @typedef {object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} [heroTitle]   Título corto para piezas grandes (hero)
 * @property {string} summary       Bajada de 1–2 líneas
 * @property {string} [description]
 * @property {string} image
 * @property {string} imageAlt
 * @property {string} category      id de categoría (línea de producto)
 * @property {EventModality} modality
 * @property {EventKind} kind
 * @property {string | null} parentId
 * @property {string} startsAt      ISO 8601 con offset
 * @property {string} endsAt        ISO 8601 con offset
 * @property {string} timezone      Zona IANA del evento (fechas se muestran en hora local del evento)
 * @property {EventLocation} location
 * @property {number} price         0 = sin costo
 * @property {string} currency      ISO 4217
 * @property {number | null} capacity    null = cupos ilimitados
 * @property {number | null} seatsLeft
 * @property {boolean} cancelled
 * @property {boolean} featured
 * @property {string[]} audience
 * @property {ProgramItem[]} program
 * @property {string} [includes]
 * @property {string} [code]        Código de taller (sub-evento): se inscribe a través del evento padre
 * @property {boolean} registrationOpen  false si la organización cerró las inscripciones antes del evento
 * @property {boolean} hasTime      false si aún no hay horario confirmado (evento de día completo)
 * @property {string} [mapUrl]      Google Maps para insertar (ver domain/maps.js); se descarta si no es apto
 */

/**
 * @typedef {object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon   nombre de ícono del Design System
 */

/**
 * Evento listo para presentación: incluye estado resuelto, nombre de categoría y
 * cantidad de sub-eventos (talleres) si es un evento principal.
 * @typedef {Event & { status: EventStatus, categoryName: string, childCount: number }} EventView
 */

export const MODALITIES = /** @type {const} */ ({
  webinar: "Webinar",
  presencial: "Presencial",
  capacitacion: "Capacitación",
  taller: "Taller",
});

export const STATUS_LABELS = /** @type {const} */ ({
  upcoming: "Próximo",
  live: "En curso",
  finished: "Finalizado",
  cancelled: "Cancelado",
});

export class InvalidEventError extends Error {
  /** @param {string} message @param {unknown} [raw] */
  constructor(message, raw) {
    super(message);
    this.name = "InvalidEventError";
    this.raw = raw;
  }
}

/** @param {unknown} value */
const isIso = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));

/**
 * Valida y completa un evento crudo. Lanza `InvalidEventError` si faltan datos esenciales.
 * @param {any} raw
 * @returns {Event}
 */
export function normalizeEvent(raw) {
  if (!raw || typeof raw !== "object") throw new InvalidEventError("Evento vacío", raw);
  const required = ["id", "title", "category", "modality", "startsAt"];
  for (const key of required) {
    if (!raw[key]) throw new InvalidEventError(`Evento sin "${key}"`, raw);
  }
  if (!isIso(raw.startsAt)) throw new InvalidEventError(`startsAt inválido en ${raw.id}`, raw);
  if (!(raw.modality in MODALITIES)) throw new InvalidEventError(`Modalidad desconocida "${raw.modality}" en ${raw.id}`, raw);

  const endsAt = isIso(raw.endsAt) ? raw.endsAt : raw.startsAt;
  const location = raw.location ?? {};
  const capacity = Number.isFinite(raw.capacity) ? Number(raw.capacity) : null;
  const seatsLeft = Number.isFinite(raw.seatsLeft) ? Math.max(0, Number(raw.seatsLeft)) : capacity;

  return {
    id: String(raw.id),
    title: String(raw.title).trim(),
    heroTitle: raw.heroTitle ? String(raw.heroTitle) : undefined,
    summary: String(raw.summary ?? raw.description ?? "").trim(),
    description: raw.description ? String(raw.description) : undefined,
    image: String(raw.image ?? ""),
    imageAlt: String(raw.imageAlt ?? ""),
    category: String(raw.category),
    modality: raw.modality,
    kind: raw.kind === "principal" || raw.kind === "taller" ? raw.kind : "individual",
    parentId: raw.parentId ? String(raw.parentId) : null,
    startsAt: raw.startsAt,
    endsAt,
    timezone: String(raw.timezone ?? "America/Santiago"),
    location: {
      online: Boolean(location.online),
      city: String(location.city ?? (location.online ? "Online" : "")),
      country: String(location.country ?? ""),
      venue: location.venue ? String(location.venue) : undefined,
      address: location.address ? String(location.address) : undefined,
      label: location.label ? String(location.label) : undefined,
    },
    price: Number.isFinite(raw.price) ? Math.max(0, Number(raw.price)) : 0,
    currency: String(raw.currency ?? "CLP"),
    capacity,
    seatsLeft,
    cancelled: raw.cancelled === true || raw.status === "cancelled",
    featured: raw.featured === true,
    audience: Array.isArray(raw.audience) ? raw.audience.map(String) : [],
    program: Array.isArray(raw.program)
      ? raw.program.map((/** @type {any} */ item) => ({ time: String(item.time), title: String(item.title), speaker: item.speaker ? String(item.speaker) : undefined }))
      : [],
    includes: raw.includes ? String(raw.includes) : undefined,
    code: raw.code ? String(raw.code) : undefined,
    registrationOpen: raw.registrationOpen !== false,
    hasTime: raw.hasTime !== false,
    mapUrl: embeddableMapUrl(raw.mapUrl) ?? undefined,
  };
}

/**
 * Estado efectivo según la fecha actual. "cancelled" prevalece sobre las fechas.
 * @param {Pick<Event, "startsAt" | "endsAt" | "cancelled">} event
 * @param {Date} [now]
 * @returns {EventStatus}
 */
export function resolveStatus(event, now = new Date()) {
  if (event.cancelled) return "cancelled";
  const t = now.getTime();
  if (t >= Date.parse(event.endsAt)) return "finished";
  if (t >= Date.parse(event.startsAt)) return "live";
  return "upcoming";
}

/** true si todavía se puede inscribir (no cancelado/finalizado, inscripción abierta y con cupos). @param {EventView} event */
export function isRegistrationOpen(event) {
  if (event.status === "cancelled" || event.status === "finished" || !event.registrationOpen) return false;
  return event.seatsLeft === null || event.seatsLeft > 0;
}

/** Código con el que se elige un taller al inscribirse en su evento padre. @param {Pick<Event, "id" | "code">} event */
export const workshopCode = (event) => event.code ?? event.id;

/**
 * @param {Event} event
 * @param {{ now?: Date, categories?: Map<string, Category> | Category[], childCount?: number }} [options]
 * @returns {EventView}
 */
export function toEventView(event, { now = new Date(), categories, childCount = 0 } = {}) {
  const byId = categories instanceof Map ? categories : new Map((categories ?? []).map((c) => [c.id, c]));
  return {
    ...event,
    status: resolveStatus(event, now),
    categoryName: byId.get(event.category)?.name ?? event.category,
    childCount,
  };
}

/**
 * Convierte una colección completa (calcula childCount de los eventos principales).
 * @param {Event[]} events
 * @param {{ now?: Date, categories?: Category[] }} [options]
 * @returns {EventView[]}
 */
export function toEventViews(events, { now = new Date(), categories = [] } = {}) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  /** @type {Map<string, number>} */
  const children = new Map();
  for (const event of events) {
    if (event.parentId) children.set(event.parentId, (children.get(event.parentId) ?? 0) + 1);
  }
  return events.map((event) => toEventView(event, { now, categories: byId, childCount: children.get(event.id) ?? 0 }));
}
