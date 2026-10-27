/**
 * Mapas de Google para el detalle del evento. Isomórfico.
 *
 * El staff pega en la app NEXUS (campo "Ubicación en Google Maps", columna `eventos.mapa_url`)
 * el enlace que da Google Maps al compartir un lugar, sin códigos ni pasos extra:
 * - corto: `https://maps.app.goo.gl/…` (lo resuelve el servidor, ver services/map-link-resolver.js);
 * - largo: el de la barra del navegador (`https://www.google.com/maps/place/…`);
 * - el de "Insertar un mapa" o su `<iframe>` completo (lo que se usaba antes).
 * Con eso la web arma el mapa insertado; si no hay enlace, lo arma con la dirección del evento.
 * Solo `www.google.com` y `maps.google.com` pueden cargarse en un iframe (CSP `frame-src`).
 */

/** Orígenes que la CSP deja insertar como iframe. */
export const MAP_FRAME_ORIGINS = ["https://www.google.com", "https://maps.google.com"];

const IFRAME_SRC = /src\s*=\s*["']([^"']+)["']/i;
const FIRST_URL = /https?:\/\/[^\s"'<>]+/i;
const EMBEDDABLE = /^https:\/\/(www\.google\.com\/maps\/embed\?|maps\.google\.com\/maps\?.*output=embed)/;
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
/** google.com, google.cl, google.com.pe… (con o sin www / maps.). */
const GOOGLE_HOST = /^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/;
const PIN = /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/;
const VIEWPORT = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
const COORDS = /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/;

/** @param {string} value @returns {URL | null} */
function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** @param {URL} url */
const isShortUrl = (url) => SHORT_HOSTS.has(url.hostname) && (url.hostname !== "goo.gl" || url.pathname.startsWith("/maps"));

/** @param {URL} url */
const isGoogleMapsUrl = (url) => GOOGLE_HOST.test(url.hostname) && (url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps"));

/**
 * Enlace de Google Maps limpio a partir de lo que pegó el staff, o null si no es de Google Maps.
 * Acepta el texto que copia el botón Compartir del teléfono ("Casa Piedra\nhttps://maps.app.goo.gl/…")
 * y el `<iframe>` de "Insertar un mapa".
 * @param {unknown} value
 * @returns {string | null}
 */
export function googleMapsLink(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const raw = IFRAME_SRC.exec(text)?.[1] ?? FIRST_URL.exec(text)?.[0];
  const url = raw ? parseUrl(raw.replaceAll("&amp;", "&").trim()) : null;
  if (!url || !(isShortUrl(url) || isGoogleMapsUrl(url))) return null;
  url.protocol = "https:";
  return url.href;
}

/** true si es un enlace corto que hay que seguir para saber el lugar. @param {string} link */
export function isShortMapsLink(link) {
  const url = parseUrl(link);
  return Boolean(url && isShortUrl(url));
}

/** @param {string} value */
const decodePart = (value) => {
  try {
    return decodeURIComponent(value.replaceAll("+", " ")).trim();
  } catch {
    return value.trim();
  }
};

/** @param {Record<string, string>} params */
const embedUrl = (params) => `https://maps.google.com/maps?${new URLSearchParams({ ...params, z: "16", output: "embed" })}`;

/**
 * Mapa para `<iframe>` a partir de un enlace de Google Maps, o null si no se puede saber el lugar
 * (vacío, enlace corto sin resolver, otro dominio…).
 * Prefiere el pin exacto del lugar (`!3d…!4d…`) y su nombre; después la búsqueda (`q`, `query`,
 * `/search/…`) y por último el centro del mapa (`@lat,lng`).
 * @param {unknown} value
 * @returns {string | null}
 */
export function embeddableMapUrl(value) {
  const link = googleMapsLink(value);
  if (!link) return null;
  if (EMBEDDABLE.test(link)) return link;
  const url = parseUrl(link);
  if (!url || isShortUrl(url)) return null;

  const path = url.pathname.split("/").filter(Boolean);
  const after = (/** @type {string} */ segment) => {
    const i = path.indexOf(segment);
    return i >= 0 && path[i + 1] && !path[i + 1].startsWith("@") && !path[i + 1].startsWith("data=") ? decodePart(path[i + 1]) : "";
  };
  const place = after("place");
  const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? (after("search") || url.searchParams.get("destination") || "");
  const pin = PIN.exec(link);
  const viewport = VIEWPORT.exec(link);

  if (pin) return embedUrl(place ? { q: place, ll: `${pin[1]},${pin[2]}` } : { q: `${pin[1]},${pin[2]}` });
  if (place || query) {
    const coords = COORDS.exec(query);
    if (coords) return embedUrl({ q: `${coords[1]},${coords[2]}` });
    return embedUrl(viewport ? { q: place || query, ll: `${viewport[1]},${viewport[2]}` } : { q: place || query });
  }
  return viewport ? embedUrl({ q: `${viewport[1]},${viewport[2]}` }) : null;
}

/** @param {{ venue?: string, address?: string, city?: string, country?: string }} location */
const locationQuery = ({ venue, address, city, country }) => [venue, address ?? city, country].filter(Boolean).join(", ");

/**
 * Mapa armado con la dirección del evento, para cuando el staff no pegó un enlace.
 * @param {{ online?: boolean, venue?: string, address?: string, city?: string, country?: string }} location
 * @returns {string | null}
 */
export function locationMapUrl(location) {
  if (location.online || !(location.venue || location.address)) return null;
  return embedUrl({ q: locationQuery(location) });
}

/**
 * "Abrir en Google Maps" (búsqueda por recinto y dirección; funciona en web y en la app del teléfono).
 * @param {{ venue?: string, address?: string, city?: string, country?: string }} location
 * @returns {string | null}
 */
export function mapsSearchHref(location) {
  const query = locationQuery(location);
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
