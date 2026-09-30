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
 * @property {string | null} thumb  miniatura para grillas (null = placeholder del sistema)
 * @property {string | null} src    tamaño completo para el lightbox
 * @property {string | null} [large] versión grande para fondos (solo la portada del álbum)
 * @property {string} slot          texto del placeholder cuando no hay imagen
 */

/**
 * @typedef {object} Album
 * @property {string} slug
 * @property {string} title
 * @property {string} description
 * @property {string} country       "Chile" | "Perú"
 * @property {MediaItem | null} cover
 * @property {MediaItem[]} previews  hasta PREVIEW_COUNT fotos (la portada primero) para el teaser
 * @property {number} photos
 * @property {number} videos
 */

/** Fotos de muestra por álbum: la portada va al hero de la landing y las demás al teaser. */
export const PREVIEW_COUNT = 5;

/** Orden de los grupos: Chile, Perú y cualquier otro después. */
const COUNTRY_ORDER = ["Chile", "Perú"];

/** "CL" → "Chile". @param {unknown} code */
export function countryName(code) {
  return code === "PE" ? "Perú" : "Chile";
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
