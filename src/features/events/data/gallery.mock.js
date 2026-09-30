/**
 * Álbumes de ejemplo para desarrollo (sin intranet configurada). Sin imágenes: se muestra el
 * placeholder rayado del sistema.
 */

/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/**
 * @param {string} slug
 * @param {number} photos
 * @param {number} [videos]
 * @returns {MediaItem[]}
 */
function placeholderItems(slug, photos, videos = 0) {
  return [
    ...Array.from({ length: photos }, (_, i) => ({ id: `${slug}-f${i + 1}`, type: /** @type {const} */ ("foto"), thumb: null, src: null, slot: `[ FOTO ${i + 1} ]` })),
    ...Array.from({ length: videos }, (_, i) => ({ id: `${slug}-v${i + 1}`, type: /** @type {const} */ ("video"), thumb: null, src: null, slot: `[ VIDEO ${i + 1} ]` })),
  ];
}

/** @type {Array<{ slug: string, title: string, description: string, country: string, items: MediaItem[] }>} */
export const ALBUMS = [
  {
    slug: "jornada-radwin-santiago",
    title: "Jornada Radwin: conectividad inalámbrica para minería",
    description: "Sala llena en Santiago para ver enlaces punto a punto y punto-multipunto.",
    country: "Chile",
    items: placeholderItems("jornada-radwin-santiago", 6, 1),
  },
  {
    slug: "taller-certificacion-huechuraba",
    title: "Taller práctico de certificación de redes",
    description: "Certificación de enlaces con equipos reales en la casa matriz.",
    country: "Chile",
    items: placeholderItems("taller-certificacion-huechuraba", 4),
  },
  {
    slug: "encuentro-integradores-lima",
    title: "Encuentro anual de integradores Perú",
    description: "Premiación y networking con los integradores de Lima.",
    country: "Perú",
    items: placeholderItems("encuentro-integradores-lima", 5),
  },
];
