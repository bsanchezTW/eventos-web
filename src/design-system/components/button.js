import { Icon } from "../icons/index.js";
import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * @typedef {"accent" | "brand" | "on-dark" | "ghost" | "outline" | "outline-invert" | "light" | "soft-accent" | "accent-outline" | "text"} ButtonVariant
 */

/**
 * Botón del sistema. Con `href` se renderiza como enlace con apariencia de botón.
 *
 * | variante        | uso (template)                                            |
 * |-----------------|-----------------------------------------------------------|
 * | accent          | CTA principal lime ("Inscribirme", "Confirmar")           |
 * | brand           | acción navy ("Suscribirme" en header, "Ver otras fechas") |
 * | on-dark         | secundaria sobre navy/imagen ("Ver calendario")           |
 * | ghost           | bajo énfasis dentro de tarjetas ("Solicitar")             |
 * | outline         | blanca con borde ("Volver a la agenda")                   |
 * | outline-invert  | se invierte a navy en hover ("Ver todos los eventos")     |
 * | light           | blanca sobre lime ("Solicitar contacto")                  |
 * | soft-accent     | "Limpiar filtros"                                         |
 * | accent-outline  | "↳ Parte de: …"                                           |
 * | text            | terciaria sin fondo ("Ahora no")                          |
 *
 * Tamaños (template): xs 38 (píldora de tarjeta) · sm 40 · md 44 · lg 52 · xl 54 (hero) · 2xl 56.
 *
 * `decorative`: renderiza un <span> con apariencia de botón (aria-hidden), para tarjetas
 * cuyo enlace real es el título estirado (patrón del template: "Ver e inscribirme").
 *
 * @param {{
 *   label?: Renderable, children?: Renderable, variant?: ButtonVariant, size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl",
 *   href?: string, type?: "button" | "submit" | "reset", icon?: string, iconEnd?: string, block?: boolean,
 *   disabled?: boolean, loading?: boolean, decorative?: boolean, className?: string, attrs?: Record<string, unknown>
 * }} props
 */
export function Button({
  label,
  children,
  variant = "brand",
  size = "md",
  href,
  type = "button",
  icon,
  iconEnd,
  block = false,
  disabled = false,
  loading = false,
  decorative = false,
  className,
  attrs: extra,
}) {
  const classes = cx("tw-btn", `tw-btn--${variant}`, `tw-btn--${size}`, block && "tw-btn--block", className);
  const content = html`${icon ? Icon({ name: icon, size: 18 }) : ""}<span class="tw-btn__label">${children ?? label}</span>${iconEnd ? Icon({ name: iconEnd, size: 18 }) : ""}`;

  if (decorative) {
    return html`<span class="${classes}" aria-hidden="true"${attrs(extra)}>${content}</span>`;
  }
  if (href && !disabled) {
    return html`<a class="${classes}" href="${href}"${attrs(extra)}>${content}</a>`;
  }
  return html`<button class="${classes}"${attrs({ type, disabled, "aria-busy": loading ? "true" : null, ...extra })}>${content}</button>`;
}

/**
 * Botón circular de solo ícono. `label` es obligatorio (nombre accesible).
 * @param {{ icon: string, label: string, variant?: "default" | "on-dark" | "ghost", size?: "md" | "sm", className?: string, attrs?: Record<string, unknown> }} props
 */
export function IconButton({ icon, label, variant = "default", size = "md", className, attrs: extra }) {
  const classes = cx("tw-icon-btn", variant !== "default" && `tw-icon-btn--${variant}`, size === "sm" && "tw-icon-btn--sm", className);
  return html`<button class="${classes}"${attrs({ type: "button", "aria-label": label, ...extra })}>${Icon({ name: icon, size: 20 })}</button>`;
}
