/**
 * Galería con el diseño de la intranet: tarjetas de álbum con filtro por país y, dentro de cada
 * álbum, el mosaico de miniaturas cuadradas (por tandas, que llegan al bajar). Isomórfico: el
 * cliente agrega tandas al mosaico.
 */
import { AlbumCover, Chip, EmptyState, GallerySectionHead, Icon, PhotoTile, PhotoTileSkeleton, html } from "../../../design-system/index.js";
import { formatAlbumDate } from "../domain/gallery.js";
import { albumHref } from "../domain/links.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/** @param {number} n @param {string} one @param {string} many */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Tarjeta de álbum de la lista: portada, fecha, título, descripción y "Ver galería". @param {{ album: Album }} props */
export function AlbumCard({ album }) {
  const date = formatAlbumDate(album.date);
  return AlbumCover({
    href: albumHref(album.slug),
    image: album.cover?.thumb,
    title: album.title,
    marks: date ? [html`${Icon({ name: "calendar", size: 14 })} ${date}`] : [],
    text: album.description,
    label: `Ver galería de ${album.title}`,
  });
}

/** Chips de país (solo si hay álbumes de más de uno). @param {{ countries: string[] }} props */
export function CountryFilter({ countries }) {
  if (countries.length < 2) return "";
  return html`<div class="tw-stack tw-gap-2 tw-mb-6">
    <span class="tw-eyebrow" id="galeria-filtro-pais">País</span>
    <div class="tw-cluster tw-gap-2" role="group" aria-labelledby="galeria-filtro-pais" data-gallery-filter>
      ${[{ value: "", label: "Todos" }, ...countries.map((c) => ({ value: c, label: c }))].map((c) => Chip({ label: c.label, value: c.value, pressed: !c.value, attrs: { "data-country": c.value } }))}
    </div>
  </div>`;
}

/**
 * Álbumes por país (Chile / Perú), cada país con su título de sección.
 * @param {{ groups: Array<{ country: string, albums: Album[] }> }} props
 */
export function AlbumGroups({ groups }) {
  if (!groups.length) {
    return EmptyState({ title: "Pronto publicaremos nuevos álbumes", text: "Aquí verás las fotos y videos de nuestros eventos en Chile y Perú.", headingLevel: 2 });
  }
  return html`${CountryFilter({ countries: groups.map((g) => g.country) })}
    ${groups.map(
      (group) => html`<section class="tw-gallery-section" aria-labelledby="galeria-${group.country}" data-country-section="${group.country}">
        ${GallerySectionHead({ title: group.country, id: `galeria-${group.country}`, meta: plural(group.albums.length, "álbum", "álbumes") })}
        <div class="tw-album-grid">${group.albums.map((album) => AlbumCard({ album }))}</div>
      </section>`,
    )}`;
}

/**
 * Miniaturas del mosaico (cada una abre el visor en su posición del álbum).
 * @param {{ items: MediaItem[], offset?: number, total: number }} props
 */
export function MediaTiles({ items, offset = 0, total }) {
  return html`${items.map((item, i) =>
    PhotoTile({
      src: item.thumb,
      video: item.type === "video",
      label: `${item.type === "video" ? "Ver video" : "Ver foto"} ${offset + i + 1} de ${total}`,
      attrs: { "data-viewer-index": offset + i },
    }),
  )}`;
}

/** Lugares del mosaico mientras llega la tanda siguiente. @param {{ count: number }} props */
export function TileSkeletons({ count }) {
  return html`${Array.from({ length: count }, () => PhotoTileSkeleton())}`;
}
