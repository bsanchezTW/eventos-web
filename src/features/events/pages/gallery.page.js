/**
 * Galería (template): encabezado con tabs Todo / Fotos / Videos, grupos por país y lightbox.
 * Los tabs son enlaces (?tipo=foto) para que el filtro funcione y se comparta sin JS.
 */
import { Eyebrow, Heading, Modal, Section, SegmentedControl, Text, html, raw } from "../../../design-system/index.js";
import { GalleryGroups, LightboxContent } from "../components/sections.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../data/gallery.mock.js").MediaItem} MediaItem */
/** @typedef {"todo" | "foto" | "video"} MediaType */

export const GALLERY_TABS = /** @type {const} */ ([
  { id: "todo", label: "Todo" },
  { id: "foto", label: "Fotos" },
  { id: "video", label: "Videos" },
]);

/** JSON seguro para <script type="application/json"> (no ejecutable; CSP lo permite). @param {unknown} data */
const jsonScript = (data) => raw(JSON.stringify(data).replace(/</g, "\\u003c"));

/**
 * @param {{ gallery: { items: MediaItem[], groups: Array<{ country: string, items: MediaItem[] }> }, type: MediaType, categories: Array<{ id: string, name: string }> }} props
 */
export function renderGalleryPage({ gallery, type, categories }) {
  const page = LANDING_CONTENT.galleryPage;
  const indexed = new Map(gallery.items.map((item, index) => [item.id, index]));
  const groups = gallery.groups.map((g) => ({ country: g.country, items: g.items.map((item) => ({ ...item, index: indexed.get(item.id) ?? 0 })) }));

  const main = html`${Section({
    spacing: "page",
    children: html`<div class="tw-section-header tw-mb-6">
        <div class="tw-section-header__text">
          ${Eyebrow({ children: page.eyebrow })}
          ${Heading({ level: 1, variant: "page", children: page.heading })}
          ${Text({ children: page.text, className: "tw-measure" })}
        </div>
        ${SegmentedControl({
          label: "Tipo de contenido",
          mode: "nav",
          items: GALLERY_TABS.map((tab) => ({ label: tab.label, href: tab.id === "todo" ? "/galeria" : `/galeria?tipo=${tab.id}`, active: tab.id === type })),
        })}
      </div>
      ${GalleryGroups({ groups })}
      ${gallery.items.length
        ? html`${Modal({
            id: "lightbox",
            titleId: "lightbox-title",
            variant: "media",
            flush: true,
            showClose: false,
            children: html`<div data-lightbox-content>${LightboxContent({ item: gallery.items[0] })}</div>`,
          })}
          <script type="application/json" id="gallery-data">${jsonScript(gallery.items)}</script>`
        : ""}`,
  })}`;

  return renderPage({
    title: page.title,
    description: page.text,
    categories,
    activeNav: "galeria",
    main,
    scripts: ["/features/events/client/gallery.js"],
  });
}
