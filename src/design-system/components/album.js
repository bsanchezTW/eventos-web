/**
 * Galería de álbumes (diseño copiado de la galería de la intranet): tarjeta de álbum, slider de
 * cabecera, título de sección con barra lima, miniatura del mosaico y visor a pantalla completa.
 * Comportamientos en behaviors: data-tw-slider (slider) y data-tw-reveal (entrada de las fotos).
 * El visor lo maneja la página que lo usa (sabe qué piezas hay y cómo pedir más).
 */
import { Icon } from "../icons/index.js";
import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Tarjeta de álbum: foto 4:3 con velo y título encima, marcas (fecha…) en vidrio, descripción
 * en dos líneas y "Ver galería". La foto entra al cargar (con shimmer mientras tanto).
 * @param {{ href: string, image?: string | null, title: Renderable, marks?: Renderable[], text?: string, cta?: string, label?: string, attrs?: Record<string, unknown> }} props
 */
export function AlbumCover({ href, image, title, marks = [], text, cta = "Ver galería", label, attrs: extra }) {
  return html`<a class="tw-album-card" href="${href}"${attrs({ "aria-label": label, ...extra })}>
    <div class="${cx("tw-album-card__media", image && "is-loading")}">
      <span class="tw-album-card__placeholder" aria-hidden="true">${Icon({ name: "image", size: 48 })}</span>
      ${image ? html`<img src="${image}" alt="" loading="lazy" decoding="async" data-tw-reveal>` : ""}
      <div class="tw-album-card__veil" aria-hidden="true"></div>
      <div class="tw-album-card__head">
        ${marks.length ? html`<span class="tw-album-card__marks">${marks.map((mark) => html`<span class="tw-album-card__mark">${mark}</span>`)}</span>` : ""}
        <h3 class="tw-album-card__title">${title}</h3>
      </div>
    </div>
    <div class="tw-album-card__body">
      <p class="${cx("tw-album-card__text", !text && "is-empty")}">${text || "Sin descripción"}</p>
      <span class="tw-album-card__cta">${cta} ${Icon({ name: "chevron-right", size: 16 })}</span>
    </div>
  </a>`;
}

/**
 * Slider de cabecera del álbum: fotos que se funden (Ken Burns), velo, "volver" en vidrio,
 * eyebrow lima, título grande, descripción y chips; flechas y puntos abajo a la derecha.
 * La primera foto carga de inmediato; las demás cuando les toca (data-src).
 * @param {{
 *   slides: string[], label: string, back: { href: string, label: string }, eyebrow: Renderable[],
 *   title: Renderable, text?: Renderable, chips?: Array<{ icon: string, label: Renderable }>, interval?: number, headingLevel?: 1 | 2
 * }} props
 */
export function GallerySlider({ slides, label, back, eyebrow, title, text, chips = [], interval = 5500, headingLevel = 1 }) {
  const tag = `h${headingLevel}`;
  const many = slides.length > 1;
  return html`<section class="${cx("tw-gallery-hero", !slides.length && "tw-gallery-hero--empty")}"${attrs({ "aria-roledescription": "carrusel", "aria-label": label, "data-tw-slider": many ? "" : null, "data-interval": interval })}>
    <div class="tw-gallery-hero__viewport">
      ${slides.map(
        (src, i) => html`<div class="${cx("tw-gallery-hero__slide", i === 0 && "is-active")}" data-tw-slide>
          <img${attrs({ src: i === 0 ? src : null, "data-src": i === 0 ? null : src })} alt="" decoding="async">
        </div>`,
      )}
    </div>
    <div class="tw-gallery-hero__veil" aria-hidden="true"></div>
    <a class="tw-gallery-hero__back" href="${back.href}">${Icon({ name: "arrow-left", size: 16 })} ${back.label}</a>
    <div class="tw-gallery-hero__content">
      <p class="tw-gallery-hero__eyebrow">${eyebrow.map((part, i) => html`${i ? html`<span aria-hidden="true">·</span>` : ""}<span>${part}</span>`)}</p>
      <${tag} class="tw-gallery-hero__title">${title}</${tag}>
      ${text ? html`<p class="tw-gallery-hero__text">${text}</p>` : ""}
      ${chips.length ? html`<div class="tw-gallery-hero__chips">${chips.map((chip) => html`<span class="tw-gallery-chip">${Icon({ name: chip.icon, size: 14 })} <span>${chip.label}</span></span>`)}</div>` : ""}
    </div>
    ${many
      ? html`<div class="tw-gallery-hero__controls">
          <button class="tw-gallery-hero__nav" type="button" aria-label="Foto anterior" data-tw-slider-move="-1">${Icon({ name: "chevron-left", size: 18 })}</button>
          <div class="tw-gallery-hero__dots" role="tablist" aria-label="Elegir foto">
            ${slides.map((_, i) => html`<button class="${cx("tw-gallery-hero__dot", i === 0 && "is-active")}" type="button" role="tab" aria-selected="${i === 0 ? "true" : "false"}" aria-label="Foto ${i + 1} de ${slides.length}" data-tw-slider-go="${i}"></button>`)}
          </div>
          <button class="tw-gallery-hero__nav" type="button" aria-label="Foto siguiente" data-tw-slider-move="1">${Icon({ name: "chevron-right", size: 18 })}</button>
        </div>`
      : ""}
  </section>`;
}

/**
 * Título de sección de la galería: barra lima a la izquierda, dato a la derecha y línea abajo.
 * @param {{ title: Renderable, id?: string, meta?: Renderable, metaAttrs?: Record<string, unknown> }} props
 */
export function GallerySectionHead({ title, id, meta, metaAttrs }) {
  return html`<div class="tw-gallery-section__head">
    <h2 class="tw-gallery-section__title"${attrs({ id })}>${title}</h2>
    ${meta !== undefined ? html`<span class="tw-gallery-section__meta"${attrs(metaAttrs ?? {})}>${meta}</span>` : ""}
  </div>`;
}

/**
 * Miniatura cuadrada del mosaico: entra con desenfoque al cargar (shimmer mientras tanto) y se
 * acerca al pasar el mouse. Un video muestra el botón de reproducir.
 * @param {{ src?: string | null, video?: boolean, label: string, attrs?: Record<string, unknown> }} props
 */
export function PhotoTile({ src, video = false, label, attrs: extra }) {
  return html`<button class="${cx("tw-photo-tile", src && "is-loading", video && "tw-photo-tile--video")}" type="button"${attrs({ "aria-label": label, ...extra })}>
    ${src ? html`<img src="${src}" alt="" loading="lazy" decoding="async" data-tw-reveal>` : ""}
    ${video ? html`<span class="tw-photo-tile__play" aria-hidden="true">${Icon({ name: "play", size: 18 })}</span>` : ""}
  </button>`;
}

/** Lugar del mosaico mientras llega la tanda siguiente. */
export function PhotoTileSkeleton() {
  return html`<span class="tw-photo-tile is-loading" aria-hidden="true" data-tw-tile-skeleton></span>`;
}

/**
 * Visor a pantalla completa: barra con contador y acciones (descargar, cerrar), flechas a los
 * lados y escenario con la foto completa. Va oculto; la página lo abre y lo llena.
 * @param {{ id: string, label?: string }} props
 */
export function PhotoViewer({ id, label = "Visor de fotos y videos" }) {
  return html`<div class="tw-photo-viewer" id="${id}" role="dialog" aria-modal="true" aria-label="${label}" hidden data-tw-viewer>
    <div class="tw-photo-viewer__bar">
      <p class="tw-photo-viewer__counter" aria-live="polite" data-tw-viewer-counter></p>
      <div class="tw-photo-viewer__actions">
        <a class="tw-photo-viewer__action" href="#" download data-tw-viewer-download>${Icon({ name: "download", size: 16 })}<span>Descargar</span></a>
        <button class="tw-photo-viewer__action tw-photo-viewer__action--close" type="button" aria-label="Cerrar visor" data-tw-viewer-close>${Icon({ name: "close", size: 18 })}</button>
      </div>
    </div>
    <button class="tw-photo-viewer__nav tw-photo-viewer__nav--prev" type="button" aria-label="Anterior" data-tw-viewer-prev>${Icon({ name: "chevron-left", size: 22 })}</button>
    <div class="tw-photo-viewer__stage" data-tw-viewer-stage></div>
    <button class="tw-photo-viewer__nav tw-photo-viewer__nav--next" type="button" aria-label="Siguiente" data-tw-viewer-next>${Icon({ name: "chevron-right", size: 22 })}</button>
  </div>`;
}
