/**
 * Álbum de la galería: grilla de miniaturas y lightbox a tamaño completo.
 */
import { Button, Eyebrow, Grid, Heading, Modal, Section, Text, html, raw } from "../../../design-system/index.js";
import { LightboxContent, MediaCard } from "../components/gallery.js";
import { mediaCountLabel } from "../domain/gallery.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/** JSON seguro para <script type="application/json"> (no ejecutable; CSP lo permite). @param {unknown} data */
const jsonScript = (data) => raw(JSON.stringify(data).replace(/</g, "\\u003c"));

/**
 * @param {{ album: Album, items: MediaItem[], categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderAlbumPage({ album, items, categories, canonical }) {
  const total = items.length;
  const main = html`${Section({
    spacing: "page",
    children: html`<div class="tw-cluster tw-gap-2-5 tw-mb-4">
        ${Button({ label: "Volver a la galería", variant: "outline", size: "sm", icon: "arrow-left", href: "/galeria", className: "tw-btn--medium" })}
      </div>
      <div class="tw-section-header tw-mb-6">
        <div class="tw-section-header__text">
          ${Eyebrow({ children: `${album.country} · ${mediaCountLabel(album)}` })}
          ${Heading({ level: 1, variant: "page", children: album.title })}
          ${album.description ? Text({ children: album.description, className: "tw-measure" }) : ""}
        </div>
      </div>
      ${Grid({ min: 220, fill: true, gap: "3-5", as: "ul", children: items.map((item, index) => MediaCard({ item, index, total })) })}
      ${total
        ? html`${Modal({
            id: "lightbox",
            titleId: "lightbox-title",
            variant: "media",
            flush: true,
            showClose: false,
            children: html`<div data-lightbox-content>${LightboxContent({ item: items[0], index: 0, total, title: album.title })}</div>`,
          })}
          <script type="application/json" id="gallery-data">${jsonScript({ title: album.title, items })}</script>`
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
