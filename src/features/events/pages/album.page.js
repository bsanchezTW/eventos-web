/**
 * Álbum de la galería con el diseño de la intranet: slider de cabecera (la portada y otras fotos
 * al azar), "Fotos y videos" con el mosaico de miniaturas cuadradas (las tandas siguientes llegan
 * al bajar) y el visor a pantalla completa.
 */
import { GallerySectionHead, GallerySlider, PhotoViewer, Section, html, raw } from "../../../design-system/index.js";
import { MediaTiles, plural } from "../components/gallery.js";
import { formatAlbumDate, mediaCountLabel } from "../domain/gallery.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/** JSON seguro para <script type="application/json"> (no ejecutable; CSP lo permite). @param {unknown} data */
const jsonScript = (data) => raw(JSON.stringify(data).replace(/</g, "\\u003c"));

/**
 * @param {{ album: Album, items: MediaItem[], total: number, slides: MediaItem[], categories: Array<{ id: string, name: string }>, canonical?: string }} props
 *   `items`: la primera tanda; el cliente pide las siguientes al bajar. `slides`: fotos del slider.
 */
export function renderAlbumPage({ album, items, total, slides, categories, canonical }) {
  const date = formatAlbumDate(album.date);
  const left = total - items.length;
  const main = html`${Section({
    spacing: "page",
    children: html`${GallerySlider({
        slides: slides.map((slide) => slide.src).filter((src) => typeof src === "string"),
        label: `Fotos destacadas de ${album.title}`,
        back: { href: "/galeria", label: "Galería" },
        eyebrow: date ? ["Galería", date] : ["Galería"],
        title: album.title,
        text: album.description || undefined,
        chips: [
          { icon: "image", label: plural(album.photos, "foto", "fotos") },
          ...(album.videos ? [{ icon: "video", label: plural(album.videos, "video", "videos") }] : []),
        ],
      })}
      <section class="tw-gallery-section" aria-labelledby="galeria-fotos-titulo">
        ${GallerySectionHead({ title: "Fotos y videos", id: "galeria-fotos-titulo", meta: plural(total, "archivo", "archivos") })}
        <div class="tw-photo-grid" data-album-mosaic>${MediaTiles({ items, total })}</div>
        ${left > 0 ? html`<div data-album-more aria-hidden="true"></div>` : ""}
      </section>
      ${items.length
        ? html`${PhotoViewer({ id: "visor" })}
          <script type="application/json" id="gallery-data">${jsonScript({ slug: album.slug, total, items })}</script>`
        : ""}`,
  })}`;

  return renderPage({
    title: `${album.title} · Galería · Transworld`,
    description: album.description || `${mediaCountLabel(album)} del evento ${album.title}.`,
    canonical,
    // Sin og:image: las URLs de la intranet son firmadas y caducan.
    categories,
    activeNav: "galeria",
    main,
    scripts: ["/features/events/client/gallery.js"],
  });
}
