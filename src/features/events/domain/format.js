/**
 * Formato de fechas, horarios, precios y cupos para la UI (es-CL).
 * Las fechas se muestran en la zona horaria del evento, no en la del visitante:
 * un webinar en Santiago a las 15:00 se anuncia "15:00" también para quien lo ve desde Lima.
 */
import { MODALITIES } from "./event.js";

/** @typedef {import("./event.js").Event} Event */
/** @typedef {import("./event.js").EventView} EventView */

const LOCALE = "es-CL";

/**
 * @typedef {object} ZonedParts
 * @property {number} year
 * @property {number} month  1–12
 * @property {number} day
 * @property {number} weekday 0 = domingo
 * @property {string} time   "HH:MM"
 */

/** @type {Map<string, Intl.DateTimeFormat>} */
const partsFormatters = new Map();

/**
 * Descompone un instante en la zona indicada.
 * @param {string | Date} value
 * @param {string} timeZone
 * @returns {ZonedParts}
 */
export function zonedParts(value, timeZone) {
  let fmt = partsFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdays.indexOf(parts.weekday),
    time: `${parts.hour}:${parts.minute}`,
  };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const capitalize = (/** @type {string} */ s) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");

/** @param {number} month 1–12 */
export const monthName = (month) => capitalize(MONTHS[month - 1]);
/** @param {number} month 1–12 */
export const monthShort = (month) => MONTHS_SHORT[month - 1];

/** "2026-10" del inicio del evento (en su zona). @param {Pick<Event, "startsAt" | "timezone">} event */
export function eventMonthKey(event) {
  const p = zonedParts(event.startsAt, event.timezone);
  return `${p.year}-${pad(p.month)}`;
}

/** "2026-10-08" del inicio del evento (en su zona). @param {Pick<Event, "startsAt" | "timezone">} event */
export function eventDayKey(event) {
  const p = zonedParts(event.startsAt, event.timezone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "Octubre 2026" desde "2026-10". @param {string} key */
export function monthKeyLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return `${monthName(month)} ${year}`;
}

/** true si el evento abarca más de un día calendario. @param {Event} event */
export function isMultiDay(event) {
  return eventDayKey(event) !== eventDayKey({ startsAt: event.endsAt, timezone: event.timezone });
}

/** { day: "8", month: "OCT" } para el bloque de fecha. @param {Event} event */
export function dateBadge(event) {
  const p = zonedParts(event.startsAt, event.timezone);
  return { day: String(p.day), month: monthShort(p.month) };
}

/** "Jueves 8 de octubre" · multi-día: "26 y 27 de noviembre" / "21 sep – 2 oct". @param {Event} event */
export function formatLongDate(event) {
  const s = zonedParts(event.startsAt, event.timezone);
  if (!isMultiDay(event)) return `${capitalize(WEEKDAYS[s.weekday])} ${s.day} de ${MONTHS[s.month - 1]}`;
  const e = zonedParts(event.endsAt, event.timezone);
  if (s.month === e.month) {
    return e.day - s.day === 1 ? `${s.day} y ${e.day} de ${MONTHS[s.month - 1]}` : `${s.day} al ${e.day} de ${MONTHS[s.month - 1]}`;
  }
  return `${s.day} ${MONTHS_SHORT[s.month - 1].toLowerCase()} – ${e.day} ${MONTHS_SHORT[e.month - 1].toLowerCase()}`;
}

/** "Jue 8 de octubre" (stat card). @param {Event} event */
export function formatShortDate(event) {
  const s = zonedParts(event.startsAt, event.timezone);
  return `${WEEKDAYS_SHORT[s.weekday]} ${s.day} de ${MONTHS[s.month - 1]}`;
}

/** "JUE 22 OCT" (kicker del hero). @param {Event} event */
export function formatKickerDate(event) {
  const s = zonedParts(event.startsAt, event.timezone);
  return `${WEEKDAYS_SHORT[s.weekday]} ${s.day} ${MONTHS_SHORT[s.month - 1]}`.toUpperCase();
}

/** "15:00–16:00" · multi-día: "26–27 nov". @param {Event} event */
export function formatSchedule(event) {
  const s = zonedParts(event.startsAt, event.timezone);
  const e = zonedParts(event.endsAt, event.timezone);
  if (isMultiDay(event)) {
    return s.month === e.month
      ? `${s.day}–${e.day} ${MONTHS_SHORT[s.month - 1].toLowerCase()}`
      : `${s.day} ${MONTHS_SHORT[s.month - 1].toLowerCase()} – ${e.day} ${MONTHS_SHORT[e.month - 1].toLowerCase()}`;
  }
  if (event.hasTime === false) return "Horario por confirmar";
  return s.time === e.time ? s.time : `${s.time}–${e.time}`;
}

/** "15:00 – 16:00" (ficha de detalle). @param {Event} event */
export function formatTimeRange(event) {
  const s = zonedParts(event.startsAt, event.timezone);
  const e = zonedParts(event.endsAt, event.timezone);
  if (event.hasTime === false) return "Por confirmar";
  if (isMultiDay(event)) return `Desde las ${s.time}`;
  return `${s.time} – ${e.time}`;
}

/** Duración en minutos. @param {Event} event */
export function durationMinutes(event) {
  return Math.round((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60000);
}

/** "Sin costo" | "$89.000" | "S/ 120". @param {number} price @param {string} currency */
export function formatPrice(price, currency) {
  if (!price) return "Sin costo";
  return new Intl.NumberFormat(currency === "PEN" ? "es-PE" : LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(price);
}

/** "Online vía Teams" | "Huechuraba, Santiago" (label corto si existe). @param {Event} event */
export function formatPlace(event) {
  const { online, venue, city, label } = event.location;
  if (label) return label;
  if (online) return venue ? `Online vía ${venue}` : "Online";
  return [venue, city].filter(Boolean).join(", ");
}

/** "Santiago" | "Lima, Perú" | "Online" (datos cortos). @param {Event} event */
export function formatCity(event) {
  const { online, city, country } = event.location;
  if (online) return "Online";
  return country && country !== "Chile" ? `${city}, ${country}` : city;
}

/** "24 cupos" | "Cupos ilimitados". @param {Event} event */
export function formatCapacity(event) {
  return event.capacity === null ? "Cupos ilimitados" : `${event.capacity} cupos`;
}

/**
 * Texto de disponibilidad con su tono (template: "Últimos N cupos" en naranja).
 * @param {EventView} event
 * @returns {{ label: string, tone: "default" | "urgent" | "closed" }}
 */
export function seatAvailability(event) {
  if (event.status === "cancelled") return { label: "Evento cancelado", tone: "closed" };
  if (event.status === "finished") return { label: "Evento finalizado", tone: "default" };
  if (event.seatsLeft === 0) return { label: "Cupos agotados", tone: "closed" };
  if (event.registrationOpen === false) return { label: "Inscripciones cerradas", tone: "closed" };
  if (event.seatsLeft === null) return { label: "Cupos disponibles", tone: "default" };
  const threshold = Math.max(6, Math.ceil((event.capacity ?? 0) * 0.25));
  if (event.seatsLeft <= threshold) {
    return { label: event.seatsLeft === 1 ? "Último cupo" : `Últimos ${event.seatsLeft} cupos`, tone: "urgent" };
  }
  return { label: "Cupos disponibles", tone: "default" };
}

/** Línea de metadatos de la tarjeta: "15:00–16:00 · Online vía Teams · Cupos ilimitados". @param {Event} event */
export function metaLine(event) {
  return [formatSchedule(event), formatPlace(event), event.price ? formatPrice(event.price, event.currency) : formatCapacity(event)].join(" · ");
}

/** @param {Event} event */
export function modalityLabel(event) {
  return MODALITIES[event.modality];
}

/**
 * Datos clave de la ficha (FECHA / HORARIO / LUGAR o FORMATO / VALOR / CUPOS / INCLUYE).
 * @param {EventView} event
 * @returns {Array<{ label: string, value: string }>}
 */
export function eventFacts(event) {
  const facts = [
    { label: "Fecha", value: formatLongDate(event) },
    { label: "Horario", value: formatTimeRange(event) },
    event.location.online ? { label: "Formato", value: `${modalityLabel(event)} en vivo` } : { label: "Lugar", value: formatPlace(event) },
    { label: "Valor", value: formatPrice(event.price, event.currency) },
  ];
  if (event.capacity !== null && event.seatsLeft !== null && event.status !== "finished") {
    facts.push({ label: "Cupos", value: event.seatsLeft === 0 ? "Agotados" : `${event.seatsLeft} disponibles` });
  }
  if (event.includes) facts.push({ label: "Incluye", value: event.includes });
  return facts;
}

/** Normaliza texto para búsqueda (minúsculas, sin tildes). @param {string} value */
export function foldText(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
