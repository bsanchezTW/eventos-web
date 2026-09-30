/**
 * Mapas de Google para el detalle del evento. Isomórfico.
 *
 * El enlace lo carga el staff en la app NEXUS (campo "Mapa (Google Maps)", columna
 * `eventos.mapa_url`) con la misma regla que aquí (`urlMapaEmbebible` en nexus-app):
 * el enlace de "Insertar un mapa" o el `<iframe>` completo que copia Google Maps.
 * Solo esos dos hosts pueden cargarse en un iframe (CSP `frame-src`).
 */

/** Orígenes que la CSP deja insertar como iframe. */
export const MAP_FRAME_ORIGINS = ["https://www.google.com", "https://maps.google.com"];

const IFRAME_SRC = /src\s*=\s*["']([^"']+)["']/i;
const EMBEDDABLE = /^https:\/\/(www\.google\.com\/maps\/embed\?|maps\.google\.com\/maps\?.*output=embed)/;

/**
 * Enlace de Google Maps apto para `<iframe>`, o null si no sirve (vacío, enlace corto
 * `maps.app.goo.gl`, http, otro dominio…).
 * @param {unknown} value
 * @returns {string | null}
 */
export function embeddableMapUrl(value) {
  let url = typeof value === "string" ? value.trim() : "";
  if (!url) return null;
  const src = IFRAME_SRC.exec(url);
  if (src) url = src[1].replaceAll("&amp;", "&").trim();
  return EMBEDDABLE.test(url) ? url : null;
}

/**
 * "Abrir en Google Maps" (búsqueda por recinto y dirección; funciona en web y en la app del teléfono).
 * @param {{ venue?: string, address?: string, city?: string, country?: string }} location
 * @returns {string | null}
 */
export function mapsSearchHref({ venue, address, city, country }) {
  const query = [venue, address ?? city, country].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
