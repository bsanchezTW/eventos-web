import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * @typedef {"accent-soft" | "neutral" | "accent" | "outline" | "brand" | "light" | "danger" | "on-dark"} BadgeVariant
 */

/**
 * `truncate`: una sola línea con "…" (pasar el texto completo en `attrs.title`).
 *
 * Etiqueta no interactiva. Convenciones del template:
 * accent-soft = modalidad · neutral = línea de producto · accent = DESTACADO ·
 * outline = EVENTO PRINCIPAL · brand/light = VIDEO/FOTO sobre media.
 * `live` agrega un punto pulsante (estado "en curso").
 * @param {{ label: Renderable, variant?: BadgeVariant, size?: "md" | "lg", live?: boolean, truncate?: boolean, className?: string, attrs?: Record<string, unknown> }} props
 */
export function Badge({ label, variant = "neutral", size = "md", live = false, truncate = false, className, attrs: extra }) {
  const text = truncate ? html`<span class="tw-badge__text">${label}</span>` : label;
  return html`<span class="${cx("tw-badge", `tw-badge--${variant}`, size === "lg" && "tw-badge--lg", live && "tw-badge--live", truncate && "tw-badge--truncate", className)}"${attrs(extra)}>${live ? html`<span class="tw-badge__dot" aria-hidden="true"></span>` : ""}${text}</span>`;
}

/** Etiqueta informativa gris (audiencias, requisitos). @param {{ label: Renderable }} props */
export function Tag({ label }) {
  return html`<span class="tw-tag">${label}</span>`;
}

/**
 * Texto de disponibilidad: normal (muted), urgente (naranja), cerrado (rojo).
 * @param {{ label: Renderable, tone?: "default" | "urgent" | "closed" }} props
 */
export function Availability({ label, tone = "default" }) {
  return html`<span class="${cx("tw-availability", tone !== "default" && `tw-availability--${tone}`)}">${label}</span>`;
}

/** @param {{ items: Array<{ label: Renderable, tone?: "accent" | "brand" | "muted" }>, className?: string }} props */
export function Legend({ items, className }) {
  return html`<div class="${cx("tw-legend", className)}">
    ${items.map((item) => html`<span class="tw-legend__item"><span class="${cx("tw-dot", item.tone === "brand" && "tw-dot--brand", item.tone === "muted" && "tw-dot--muted")}" aria-hidden="true"></span>${item.label}</span>`)}
  </div>`;
}
