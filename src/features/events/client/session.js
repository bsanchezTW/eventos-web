/**
 * Memoria de la pestaña (sessionStorage): parámetros de campaña y datos del asistente para
 * inscribirse en varios eventos seguidos sin reescribirlos. Si el navegador bloquea el
 * almacenamiento, todo sigue funcionando sin recordar nada.
 */
import { UTM_KEYS } from "../domain/registration.js";

const UTM_KEY = "tw-eventos:utm";
const ATTENDEE_KEY = "tw-eventos:asistente";

/** @param {string} key */
function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/** @param {string} key @param {unknown} value */
function write(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento no disponible (modo privado, bloqueado): no se recuerda.
  }
}

/** Guarda los UTM de la URL de llegada (la campaña apunta a la agenda y la inscripción ocurre en el detalle). */
export function captureUtm() {
  const params = new URLSearchParams(location.search);
  const found = Object.fromEntries(UTM_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  if (Object.keys(found).length) write(UTM_KEY, found);
}

/** UTM de la URL actual o, si no trae, los de la llegada. @returns {Record<string, string>} */
export function readUtm() {
  const params = new URLSearchParams(location.search);
  const current = Object.fromEntries(UTM_KEYS.filter((k) => params.get(k)).map((k) => [k, /** @type {string} */ (params.get(k))]));
  return Object.keys(current).length ? current : (read(UTM_KEY) ?? {});
}

/** @returns {Record<string, string> | null} */
export const readAttendee = () => read(ATTENDEE_KEY);

/** @param {Record<string, string>} attendee */
export const rememberAttendee = (attendee) => write(ATTENDEE_KEY, attendee);
