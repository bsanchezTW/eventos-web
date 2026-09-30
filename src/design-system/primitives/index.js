/**
 * Primitivas: tipografía y layout. Son la base de todo componente y página.
 */
import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * @param {{ children: Renderable, className?: string, as?: "div" | "section" | "header" | "nav" | "footer", attrs?: Record<string, unknown> }} props
 */
export function Container({ children, className, as = "div", attrs: extra }) {
  return html`<${as} class="${cx("tw-container", className)}"${attrs(extra)}>${children}</${as}>`;
}

/**
 * Sección con separación vertical estándar. `labelledBy` enlaza el heading para lectores de pantalla.
 * `spacing`: default (56px) · wide (52px) · tight (44px) · page (34px, inicio de páginas internas) · compact (24px).
 * @param {{ children: Renderable, id?: string, labelledBy?: string, spacing?: "default" | "wide" | "tight" | "page" | "compact", className?: string, attrs?: Record<string, unknown> }} props
 */
export function Section({ children, id, labelledBy, spacing = "default", className, attrs: extra }) {
  return html`<section class="${cx("tw-section", spacing !== "default" && `tw-section--${spacing}`, className)}"${attrs({ id, "aria-labelledby": labelledBy, ...extra })}>
    <div class="tw-container">${children}</div>
  </section>`;
}

/**
 * @param {{ level?: 1 | 2 | 3 | 4, variant?: "display" | "h1" | "page" | "h2" | "h3" | "panel" | "card" | "title" | "title-md" | "title-sm" | "media", children: Renderable, id?: string, tone?: "default" | "on-dark" | "on-accent", className?: string }} props
 */
export function Heading({ level = 2, variant, children, id, tone = "default", className }) {
  const v = variant ?? /** @type {const} */ ({ 1: "h1", 2: "h2", 3: "h3", 4: "title" })[level];
  const tag = `h${level}`;
  return html`<${tag} class="${cx("tw-heading", `tw-heading--${v}`, tone !== "default" && `tw-heading--${tone}`, className)}"${attrs({ id })}>${children}</${tag}>`;
}

/**
 * @param {{ children: Renderable, variant?: "default" | "lead" | "lead-sm" | "body" | "meta" | "caption", tone?: "default" | "muted" | "on-dark" | "on-accent", as?: "p" | "span" | "div", className?: string, id?: string }} props
 */
export function Text({ children, variant = "default", tone = "default", as = "p", className, id }) {
  return html`<${as} class="${cx("tw-text", variant !== "default" && `tw-text--${variant}`, tone !== "default" && `tw-text--${tone}`, className)}"${attrs({ id })}>${children}</${as}>`;
}

/**
 * Etiqueta mono en mayúsculas que precede a los H2.
 * @param {{ children: Renderable, tone?: "default" | "on-dark" | "muted", as?: "span" | "p" | "div" | "dt", className?: string }} props
 */
export function Eyebrow({ children, tone = "default", as = "span", className }) {
  return html`<${as} class="${cx("tw-eyebrow", tone !== "default" && `tw-eyebrow--${tone}`, className)}">${children}</${as}>`;
}

/** Eyebrow en cápsula con punto lime (hero). @param {{ children: Renderable, className?: string }} props */
export function Kicker({ children, className }) {
  return html`<span class="${cx("tw-kicker", className)}"><span class="tw-dot" aria-hidden="true"></span><span>${children}</span></span>`;
}

/**
 * Encabezado de sección: eyebrow + H2 (+ descripción) a la izquierda y acciones a la derecha.
 * @param {{ eyebrow?: Renderable, title: Renderable, id?: string, description?: Renderable, actions?: Renderable, level?: 2 | 3 }} props
 */
export function SectionHeader({ eyebrow, title, id, description, actions, level = 2 }) {
  return html`<div class="tw-section-header">
    <div class="tw-section-header__text">
      ${eyebrow ? Eyebrow({ children: eyebrow }) : ""}
      ${Heading({ level, variant: "h2", id, children: title })}
      ${description ? Text({ children: description }) : ""}
    </div>
    ${actions ? html`<div class="tw-cluster">${actions}</div>` : ""}
  </div>`;
}

/**
 * Grilla auto-fit del template (se apila sola en pantallas angostas).
 * @param {{ children: Renderable, min?: 180 | 200 | 220 | 260 | 300 | 340 | 360 | 420, gap?: string, fill?: boolean, as?: "div" | "ul" | "ol", className?: string, attrs?: Record<string, unknown> }} props
 */
export function Grid({ children, min = 260, gap = "4", fill = false, as = "div", className, attrs: extra }) {
  const role = as === "div" ? {} : { role: "list" };
  return html`<${as} class="${cx("tw-grid", `tw-grid--min-${min}`, `tw-gap-${gap}`, fill && "tw-grid--fill", className)}"${attrs({ ...role, ...extra })}>${children}</${as}>`;
}

/**
 * `fill`: todos los hijos con el mismo alto (igualan a la columna vecina o, en una columna, al más alto).
 * @param {{ children: Renderable, gap?: string, between?: boolean, fill?: boolean, className?: string, as?: "div" | "ul", attrs?: Record<string, unknown> }} props
 */
export function Stack({ children, gap = "4", between = false, fill = false, className, as = "div", attrs: extra }) {
  return html`<${as} class="${cx("tw-stack", `tw-gap-${gap}`, between && "tw-stack--between", fill && "tw-stack--fill", className)}"${attrs(extra)}>${children}</${as}>`;
}

/** @param {{ children: Renderable, gap?: string, between?: boolean, className?: string, as?: "div" | "ul", attrs?: Record<string, unknown> }} props */
export function Cluster({ children, gap = "2-5", between = false, className, as = "div", attrs: extra }) {
  return html`<${as} class="${cx("tw-cluster", `tw-gap-${gap}`, between && "tw-cluster--between", className)}"${attrs(extra)}>${children}</${as}>`;
}

/** @param {{ children: Renderable, as?: "span" | "div" | "h2" | "h3", id?: string }} props */
export function VisuallyHidden({ children, as = "span", id }) {
  return html`<${as} class="tw-sr-only"${attrs({ id })}>${children}</${as}>`;
}

/** @param {{ tone?: "accent" | "brand" }} [props] */
export function Dot({ tone = "accent" } = {}) {
  return html`<span class="${cx("tw-dot", tone === "brand" && "tw-dot--brand")}" aria-hidden="true"></span>`;
}
