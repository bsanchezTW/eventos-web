/**
 * Galería: álbumes publicados desde la intranet, agrupados por país. Cada álbum abre su página.
 */
import { Eyebrow, Heading, Section, Text, html } from "../../../design-system/index.js";
import { AlbumGroups } from "../components/gallery.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/gallery.js").Album} Album */

/**
 * @param {{ gallery: { groups: Array<{ country: string, albums: Album[] }> }, categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderGalleryPage({ gallery, categories, canonical }) {
  const page = LANDING_CONTENT.galleryPage;
  const main = html`${Section({
    spacing: "page",
    children: html`<div class="tw-section-header tw-mb-6">
        <div class="tw-section-header__text">
          ${Eyebrow({ children: page.eyebrow })}
          ${Heading({ level: 1, variant: "page", children: page.heading })}
          ${Text({ children: page.text, className: "tw-measure" })}
        </div>
      </div>
      ${AlbumGroups({ groups: gallery.groups })}`,
  })}`;

  return renderPage({ title: page.title, description: page.text, canonical, categories, activeNav: "galeria", main });
}
