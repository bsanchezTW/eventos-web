/**
 * Galería: teaser de la landing, álbumes por país, grilla de un álbum y lightbox.
 * Isomórfico: el lightbox se re-renderiza en el navegador al navegar entre piezas.
 */
import { Badge, Button, Card, CardLink, EmptyState, Grid, Heading, IconButton, MediaFrame, Text, html } from "../../../design-system/index.js";
import { mediaCountLabel } from "../domain/gallery.js";
import { albumHref } from "../domain/links.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/** Teaser: fotos 4:5 de los álbumes más recientes; cada una lleva a su álbum. @param {{ tiles: Array<{ album: Album, item: MediaItem }> }} props */
export function GalleryTeaser({ tiles }) {
  return Grid({
    min: 200,
    gap: "3-5",
    as: "ul",
    children: tiles.map(
      ({ album, item }) => html`<li>
        <a class="tw-tile" href="${albumHref(album.slug)}" aria-label="${album.title}: ver álbum">
          ${MediaFrame({ src: item.thumb, alt: "", ratio: "4x5", slot: "[ FOTO 4:5 ]", caption: album.title })}
        </a>
      </li>`,
    ),
  });
}

/** Tarjeta de álbum: portada, país y cantidad de piezas. @param {{ album: Album }} props */
export function AlbumCard({ album }) {
  return html`<li>${Card({
    as: "article",
    flush: true,
    lift: true,
    interactive: true,
    children: html`${MediaFrame({ src: album.cover?.thumb, alt: "", slot: "[ ÁLBUM ]" })}
      <div class="tw-card__body tw-card__body--media">
        <span class="tw-meta-mono">${mediaCountLabel(album)}</span>
        ${Heading({ level: 3, variant: "media", children: CardLink({ href: albumHref(album.slug), children: album.title }) })}
        ${album.description ? Text({ variant: "meta", children: album.description }) : ""}
      </div>`,
  })}</li>`;
}

/**
 * Álbumes agrupados por país (Chile / Perú).
 * @param {{ groups: Array<{ country: string, albums: Album[] }> }} props
 */
export function AlbumGroups({ groups }) {
  if (!groups.length) {
    return EmptyState({ title: "Pronto publicaremos nuevos álbumes", text: "Aquí verás las fotos y videos de nuestros eventos en Chile y Perú.", headingLevel: 2 });
  }
  return html`<div class="tw-stack tw-gap-10">
    ${groups.map(
      (group) => html`<section aria-labelledby="galeria-${group.country}">
        <div class="tw-cluster tw-gap-2-5 tw-mb-4">
          ${Heading({ level: 2, variant: "h3", id: `galeria-${group.country}`, children: group.country })}
          <span class="tw-meta-mono">${group.albums.length} ${group.albums.length === 1 ? "álbum" : "álbumes"}</span>
        </div>
        ${Grid({ min: 300, fill: true, gap: "4", as: "ul", children: group.albums.map((album) => AlbumCard({ album })) })}
      </section>`,
    )}
  </div>`;
}

/** @param {MediaItem} item */
const mediaBadge = (item) => Badge({ label: item.type === "video" ? "VIDEO" : "FOTO", variant: item.type === "video" ? "brand" : "light" });

/**
 * Pieza del álbum: abre el lightbox (data-lightbox = índice en el álbum).
 * @param {{ item: MediaItem, index: number, total: number }} props
 */
export function MediaCard({ item, index, total }) {
  return html`<li>${Card({
    as: "button",
    flush: true,
    lift: true,
    interactive: true,
    className: "tw-card--button",
    attrs: { type: "button", "data-lightbox": index, "aria-label": `${item.type === "video" ? "Video" : "Foto"} ${index + 1} de ${total}` },
    children: MediaFrame({ src: item.thumb, alt: "", slot: item.slot, badge: item.type === "video" ? mediaBadge(item) : undefined }),
  })}</li>`;
}

/**
 * Contenido del lightbox (el cliente lo reemplaza al navegar).
 * @param {{ item: MediaItem, index: number, total: number, title: string }} props
 */
export function LightboxContent({ item, index, total, title }) {
  const label = `${item.type === "video" ? "Video" : "Foto"} ${index + 1} de ${total}`;
  return html`${MediaFrame({ src: item.src, kind: item.type === "video" ? "video" : "image", alt: `${title}: ${label.toLowerCase()}`, ratio: "16x9", slot: item.slot, loading: "eager" })}
    <div class="tw-cluster tw-cluster--between tw-gap-5 tw-modal__footer">
      <div class="tw-min-w-0">
        <p class="tw-meta-mono tw-mb-2">${label}</p>
        <h2 class="tw-heading tw-heading--title-md" id="lightbox-title">${title}</h2>
      </div>
      <div class="tw-cluster tw-gap-2">
        ${IconButton({ icon: "chevron-left", label: "Pieza anterior", size: "sm", attrs: { "data-lightbox-prev": "" } })}
        ${IconButton({ icon: "chevron-right", label: "Pieza siguiente", size: "sm", attrs: { "data-lightbox-next": "" } })}
        ${Button({ label: "Cerrar", variant: "brand", attrs: { "data-tw-modal-close": "" } })}
      </div>
    </div>`;
}
