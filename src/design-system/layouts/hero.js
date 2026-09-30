import { IconButton } from "../components/button.js";
import { CarouselDots } from "../components/selection.js";
import { Heading, Kicker, Text } from "../primitives/index.js";
import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * @typedef {object} HeroSlide
 * @property {string} id
 * @property {Renderable} kicker
 * @property {Renderable} title
 * @property {Renderable} body
 * @property {{ src: string, alt?: string }} image
 * @property {Renderable} [actions]
 */

const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");

/**
 * Hero a ancho completo con crossfade de slides (behaviors/carousel.js). El autoplay se
 * pausa con hover/foco, se detiene al usar los controles y no corre con reduced-motion.
 * Sin JS se ve el primer slide completo. `title` es el H1 real de la página (oculto
 * visualmente) para que la jerarquía no dependa del slide activo.
 *
 * @param {{ label: string, title: string, slides: HeroSlide[], search?: Renderable, interval?: number, id?: string }} props
 */
export function HeroCarousel({ label, title, slides, search, interval = 6500, id }) {
  const total = slides.length;
  return html`<section class="tw-hero tw-on-dark"${attrs({ id, "aria-roledescription": "carrusel", "aria-label": label, "data-tw-carousel": "", "data-interval": interval })}>
    <div class="tw-hero__backdrops" aria-hidden="true">
      ${slides.map(
        (slide, i) => html`<div class="${cx("tw-hero__backdrop", i === 0 && "is-active")}" data-tw-slide-backdrop>
          <img src="${slide.image.src}" alt="" decoding="async"${attrs({ loading: i === 0 ? null : "lazy", fetchpriority: i === 0 ? "high" : null })}>
        </div>`,
      )}
    </div>
    <div class="tw-container tw-hero__content">
      <h1 class="tw-sr-only">${title}</h1>
      <div class="tw-hero__track" aria-live="off" data-tw-carousel-track>
        ${slides.map(
          (slide, i) => html`<div class="${cx("tw-hero__panel", i === 0 && "is-active")}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${total}" data-tw-slide>
            ${Kicker({ children: slide.kicker, className: "tw-hero__kicker" })}
            ${Heading({ level: 2, variant: "display", tone: "on-dark", children: slide.title, className: "tw-hero__title" })}
            ${Text({ variant: "lead", tone: "on-dark", children: slide.body, className: "tw-hero__body" })}
            ${slide.actions ? html`<div class="tw-cluster tw-gap-2-5">${slide.actions}</div>` : ""}
          </div>`,
        )}
      </div>
      ${search ? html`<div class="tw-hero__search">${search}</div>` : ""}
      ${total > 1
        ? html`<div class="tw-hero__controls">
            <div class="tw-cluster tw-cluster--nowrap tw-gap-2-5">
              ${CarouselDots({ count: total, active: 0, attrs: { "data-tw-carousel-dots": "" } })}
              <span class="tw-hero__counter" aria-hidden="true" data-tw-carousel-counter>01 / ${pad(total)}</span>
            </div>
            <div class="tw-hero__nav">
              ${IconButton({ icon: "chevron-left", label: "Diapositiva anterior", variant: "on-dark", attrs: { "data-tw-carousel-prev": "" } })}
              ${IconButton({ icon: "chevron-right", label: "Diapositiva siguiente", variant: "on-dark", attrs: { "data-tw-carousel-next": "" } })}
            </div>
          </div>`
        : ""}
    </div>
  </section>`;
}

/**
 * Banner navy redondeado con imagen al 30% y gradiente diagonal (cabecera de detalle).
 * @param {{ image?: { src: string }, badges?: Renderable, title: Renderable, text?: Renderable, headingLevel?: 1 | 2 }} props
 */
export function Banner({ image, badges, title, text, headingLevel = 1 }) {
  return html`<div class="tw-banner tw-on-dark">
    ${image ? html`<img class="tw-banner__img" src="${image.src}" alt="" decoding="async">` : ""}
    <div class="tw-banner__overlay" aria-hidden="true"></div>
    <div class="tw-banner__content">
      ${badges ? html`<div class="tw-cluster tw-gap-2 tw-banner__badges">${badges}</div>` : ""}
      ${Heading({ level: headingLevel, variant: "h1", tone: "on-dark", children: title, className: "tw-banner__title" })}
      ${text ? Text({ variant: "lead-sm", tone: "on-dark", children: text, className: "tw-banner__text" }) : ""}
    </div>
  </div>`;
}

/**
 * Banda de cierre en lime (accent) o navy (brand) con acción a la derecha.
 * `size: "lg"` usa título de sección (cabecera de página, como la de webinars).
 * @param {{ tone?: "accent" | "brand", size?: "md" | "lg", eyebrow?: Renderable, title: Renderable, text?: Renderable, action?: Renderable, headingLevel?: 1 | 2 | 3, id?: string }} props
 */
export function CtaBand({ tone = "accent", size = "md", eyebrow, title, text, action, headingLevel = 2, id }) {
  const tag = `h${headingLevel}`;
  return html`<div class="${cx("tw-cta-band", `tw-cta-band--${tone}`, size === "lg" && "tw-cta-band--lg", tone === "brand" && "tw-on-dark")}">
    <div class="tw-cta-band__body">
      ${eyebrow ? html`<span class="${cx("tw-eyebrow", tone === "brand" && "tw-eyebrow--on-dark")}">${eyebrow}</span>` : ""}
      <${tag} class="tw-cta-band__title"${attrs({ id })}>${title}</${tag}>
      ${text ? html`<p class="tw-cta-band__text">${text}</p>` : ""}
    </div>
    ${action ? html`<div class="tw-cta-band__action">${action}</div>` : ""}
  </div>`;
}
