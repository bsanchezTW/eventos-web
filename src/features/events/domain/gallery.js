/**
 * Galería: álbumes de fotos y videos de eventos realizados. Isomórfico.
 *
 * Los álbumes vienen de la galería de la intranet (compartida por Chile y Perú): solo los
 * que alguien marcó "Mostrar en la web de eventos" y que no son privados.
 */

/** @typedef {"foto" | "video"} MediaType */

/**
 * @typedef {object} MediaItem
 * @property {string} id
 * @property {MediaType} type
 * @property {string | null} thumb  miniatura reducida para grillas (null = placeholder del sistema)
 * @property {string | null} src    versión de pantalla para el lightbox (foto reducida; el video, original)
 * @property {string} slot          texto del placeholder cuando no hay imagen
 */

/**
 * @typedef {object} Album
 * @property {string} slug
 * @property {string} title
 * @property {string} description
 * @property {string} country       "Chile" | "Perú"
 * @property {string | null} date   fecha del álbum (ISO), la que muestra la intranet
 * @property {MediaItem | null} cover
 * @property {number} photos
 * @property {number} videos
 */

/** @typedef {{ album: Pick<Album, "slug" | "title">, item: MediaItem }} ReelPhoto  foto del rollo de la portada y su evento (álbum) */

/** Piezas por tanda en un álbum: la primera llega con la página y las siguientes al bajar. */
export const ALBUM_PAGE = 20;

/** Fotos del slider de cabecera de un álbum (la portada y otras al azar), como en la intranet. */
export const ALBUM_SLIDES = 12;

/** Fotos del rollo por visita (al azar entre todos los álbumes). */
export const REEL_SIZE = 24;

/** Orden de los grupos: Chile, Perú y cualquier otro después. */
const COUNTRY_ORDER = ["Chile", "Perú"];

/** "CL" → "Chile". @param {unknown} code */
export function countryName(code) {
  return code === "PE" ? "Perú" : "Chile";
}

/** "7 de septiembre de 2026" (fecha del álbum en Chile), o "" si no hay. @param {string | null | undefined} iso */
export function formatAlbumDate(iso) {
  // La intranet guarda la hora en UTC sin zona ("2026-09-07T19:24:55").
  const date = iso ? new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" });
}

/** "64 fotos · 2 videos" · "1 foto". @param {Pick<Album, "photos" | "videos">} album */
export function mediaCountLabel({ photos, videos }) {
  const parts = [];
  if (photos) parts.push(`${photos} ${photos === 1 ? "foto" : "fotos"}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  return parts.join(" · ") || "Sin contenido aún";
}

/**
 * Álbumes agrupados por país (solo países con álbumes).
 * @param {Album[]} albums
 * @returns {Array<{ country: string, albums: Album[] }>}
 */
export function groupAlbumsByCountry(albums) {
  const countries = [...new Set(albums.map((a) => a.country))].sort((a, b) => {
    const ia = COUNTRY_ORDER.indexOf(a);
    const ib = COUNTRY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, "es");
  });
  return countries.map((country) => ({ country, albums: albums.filter((a) => a.country === country) }));
}
