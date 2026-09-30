/**
 * Piezas de la galería (fotos y videos de eventos pasados), del template.
 * Sin `image` se muestra el placeholder rayado del sistema con su `slot`.
 *
 * @typedef {object} MediaItem
 * @property {string} id
 * @property {"foto" | "video"} type
 * @property {string | null} image
 * @property {string} slot
 * @property {string} date    Mes en mayúsculas ("JUNIO")
 * @property {string} place
 * @property {string} country
 * @property {string} title
 */

/** @type {MediaItem[]} */
export const GALLERY = [
  { id: "m1", type: "foto", image: null, slot: "[ FOTO 16:10 · SALA LLENA ]", date: "JUNIO", place: "Santiago", country: "Chile", title: "Jornada Radwin: conectividad inalámbrica para minería" },
  { id: "m2", type: "foto", image: null, slot: "[ FOTO 16:10 · DEMO TERRENO ]", date: "MAYO", place: "Antofagasta", country: "Chile", title: "Demo de enlaces punto a punto en faena" },
  { id: "m3", type: "video", image: null, slot: "[ VIDEO 16:9 · RESUMEN 2 MIN ]", date: "MAYO", place: "Antofagasta", country: "Chile", title: "Resumen de la jornada norte en 2 minutos" },
  { id: "m4", type: "foto", image: null, slot: "[ FOTO 16:10 · TALLER ]", date: "ABRIL", place: "Huechuraba", country: "Chile", title: "Taller práctico de certificación de redes" },
  { id: "m5", type: "video", image: null, slot: "[ VIDEO 16:9 · CHARLA COMPLETA ]", date: "MARZO", place: "Webinar", country: "Chile", title: "Seguridad de máquinas: vallados y sensores" },
  { id: "m6", type: "foto", image: null, slot: "[ FOTO 16:10 · SHOWROOM ]", date: "MARZO", place: "Santiago", country: "Chile", title: "Visita guiada al showroom de equipos" },
  { id: "m7", type: "video", image: null, slot: "[ VIDEO 16:9 · ENTREVISTA ]", date: "ENERO", place: "Lima", country: "Perú", title: "Entrevista: continuidad operacional en salas críticas" },
  { id: "m8", type: "foto", image: null, slot: "[ FOTO 16:10 · PREMIACIÓN ]", date: "ENERO", place: "Lima", country: "Perú", title: "Encuentro anual de integradores Perú" },
];
