import { Icon } from "../icons/index.js";
import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Superficie blanca del sistema.
 * - default: radius 24, shadow card, padding 28
 * - panel:   radius 28 (paneles grandes, calendario)
 * - raised:  radius 28 + borde + sombra fuerte (formulario sticky)
 * - dashed:  sin sombra, borde punteado (estados vacíos)
 * `interactive` agrega hover elevado; usar junto a `CardLink` (link estirado a toda la tarjeta).
 * Layouts: `row` (visual 88px + contenido), `split` (contenido + acción a la derecha),
 * `column` (ícono, título, texto y acción al pie). `roomy`: radio 26px (tarjetas informativas).
 *
 * @param {{
 *   children: Renderable, variant?: "default" | "panel" | "raised" | "dashed", layout?: "row" | "split" | "column" | "media",
 *   lift?: boolean, roomy?: boolean, compact?: boolean, flush?: boolean, bordered?: boolean, interactive?: boolean,
 *   as?: "div" | "article" | "section" | "li" | "aside" | "button", className?: string, attrs?: Record<string, unknown>
 * }} props
 */
export function Card({ children, variant = "default", layout, lift = false, roomy = false, compact = false, flush = false, bordered = false, interactive = false, as = "div", className, attrs: extra }) {
  const classes = cx(
    "tw-card",
    variant !== "default" && `tw-card--${variant}`,
    layout && `tw-card--${layout}`,
    lift && "tw-card--lift",
    roomy && "tw-card--roomy",
    compact && "tw-card--compact",
    flush && "tw-card--flush",
    bordered && "tw-card--bordered",
    interactive && "tw-card--interactive",
    className,
  );
  return html`<${as} class="${classes}"${attrs(extra)}>${children}</${as}>`;
}

/**
 * Enlace principal de una tarjeta interactiva: se estira (::after) para que toda la
 * tarjeta sea clicable, manteniendo un único destino accesible.
 * @param {{ href: string, children: Renderable, attrs?: Record<string, unknown> }} props
 */
export function CardLink({ href, children, attrs: extra }) {
  return html`<a class="tw-card__link" href="${href}"${attrs(extra)}>${children}</a>`;
}

/** Tarjeta de dato destacado (se superpone al hero). @param {{ label: Renderable, value: Renderable, as?: "div" | "li" }} props */
export function StatCard({ label, value, as = "div" }) {
  return html`<${as} class="tw-stat">
    <div class="tw-stat__label">${label}</div>
    <div class="tw-stat__value">${value}</div>
  </${as}>`;
}

/**
 * Bloque navy con día y mes. `srLabel` da la fecha completa a lectores de pantalla.
 * @param {{ day: Renderable, month: Renderable, srLabel?: string }} props
 */
export function DateBadge({ day, month, srLabel }) {
  return html`<div class="tw-date-badge"${attrs(srLabel ? { role: "img", "aria-label": srLabel } : {})}>
    <span class="tw-date-badge__day"${attrs(srLabel ? { "aria-hidden": "true" } : {})}>${day}</span>
    <span class="tw-date-badge__month"${attrs(srLabel ? { "aria-hidden": "true" } : {})}>${month}</span>
  </div>`;
}

/**
 * Marco de imagen (o video) con proporción fija. Sin `src` muestra el placeholder rayado del template.
 * `kind: "video"` reproduce con controles nativos (`alt` pasa a ser su nombre accesible).
 * @param {{ src?: string | null, alt?: string, kind?: "image" | "video", ratio?: "16x10" | "16x9" | "4x5", slot?: Renderable, badge?: Renderable, caption?: Renderable, loading?: "lazy" | "eager", className?: string }} props
 */
export function MediaFrame({ src, alt = "", kind = "image", ratio = "16x10", slot, badge, caption, loading = "lazy", className }) {
  const media = kind === "video"
    ? html`<video class="tw-media__img tw-media__img--contain"${attrs({ src, controls: true, preload: "metadata", playsinline: true, "aria-label": alt || null })}></video>`
    : html`<img class="tw-media__img" src="${src}" alt="${alt}" loading="${loading}" decoding="async">`;
  return html`<div class="${cx("tw-media", ratio !== "16x10" && `tw-media--${ratio}`, className)}">
    ${src ? media : html`<span class="tw-media__slot" aria-hidden="true">${slot ?? "[ IMAGEN ]"}</span>`}
    ${badge ? html`<span class="tw-media__badge">${badge}</span>` : ""}
    ${caption ? html`<div class="tw-media__caption">${caption}</div>` : ""}
  </div>`;
}

/**
 * Mapa insertado (iframe de un proveedor permitido por la CSP `frame-src`, p. ej. Google Maps).
 * `title` es obligatorio: es el nombre accesible del iframe. Carga diferida.
 * @param {{ src: string, title: string, className?: string }} props
 */
export function MapFrame({ src, title, className }) {
  return html`<div class="${cx("tw-map", className)}">
    <iframe class="tw-map__frame"${attrs({ src, title, loading: "lazy", allowfullscreen: true })}></iframe>
  </div>`;
}

/**
 * Círculo lime translúcido: con `icon` muestra un ícono oliva; sin él, el punto lime del template.
 * @param {{ icon?: string, size?: "md" | "lg" }} [props]
 */
export function IconCircle({ icon, size = "md" } = {}) {
  return html`<span class="${cx("tw-icon-circle", size === "lg" && "tw-icon-circle--lg")}" aria-hidden="true">
    ${icon ? Icon({ name: icon, size: size === "lg" ? 26 : 20 }) : html`<span class="tw-icon-circle__dot"></span>`}
  </span>`;
}

/** Datos clave en grilla (FECHA / HORARIO / LUGAR…). @param {{ items: Array<{ label: Renderable, value: Renderable }> }} props */
export function FactList({ items }) {
  return html`<dl class="tw-facts">
    ${items.map((item) => html`<div><dt class="tw-eyebrow tw-eyebrow--muted">${item.label}</dt><dd class="tw-facts__value">${item.value}</dd></div>`)}
  </dl>`;
}

/** Programa por horario. @param {{ items: Array<{ time: Renderable, title: Renderable, detail?: Renderable }> }} props */
export function Timeline({ items }) {
  return html`<ol class="tw-timeline" role="list">
    ${items.map(
      (item) => html`<li class="tw-timeline__row">
        <span class="tw-timeline__time">${item.time}</span>
        <div>
          <div class="tw-timeline__title">${item.title}</div>
          ${item.detail ? html`<div class="tw-timeline__detail">${item.detail}</div>` : ""}
        </div>
      </li>`,
    )}
  </ol>`;
}

/** Código monoespaciado destacado (comprobantes). @param {{ value: Renderable, label?: string }} props */
export function CodeDisplay({ value, label }) {
  return html`<div class="tw-code"${attrs({ "aria-label": label })}>${value}</div>`;
}
