import { Icon } from "../icons/index.js";
import { attrs, cx, html } from "../utils/html.js";
import { Heading, Text } from "../primitives/index.js";
import { IconCircle } from "./card.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Mensaje en línea. `danger` usa role="alert" (se anuncia de inmediato); el resto role="status".
 * Sin ícono por defecto (template); `icon: true` lo agrega para mensajes con acción.
 * @param {{ tone?: "danger" | "success" | "info", message: Renderable, action?: Renderable, icon?: boolean, className?: string, attrs?: Record<string, unknown> }} props
 */
export function Alert({ tone = "info", message, action, icon: showIcon = false, className, attrs: extra }) {
  const icon = tone === "danger" ? "alert" : tone === "success" ? "check" : "alert";
  return html`<div class="${cx("tw-alert", `tw-alert--${tone}`, className)}"${attrs({ role: tone === "danger" ? "alert" : "status", ...extra })}>
    ${showIcon ? Icon({ name: icon, size: 18 }) : ""}
    <div class="tw-alert__body">${message}</div>
    ${action ? html`<div class="tw-alert__action">${action}</div>` : ""}
  </div>`;
}

/**
 * Estado vacío: borde punteado y siempre una acción para salir del estado.
 * @param {{ title: Renderable, text?: Renderable, action?: Renderable, compact?: boolean, headingLevel?: 1 | 2 | 3 | 4, attrs?: Record<string, unknown> }} props
 */
export function EmptyState({ title, text, action, compact = false, headingLevel = 3, attrs: extra }) {
  const tag = `h${headingLevel}`;
  return html`<div class="${cx("tw-empty", compact && "tw-empty--compact")}"${attrs(extra)}>
    <${tag} class="tw-empty__title">${title}</${tag}>
    ${text ? html`<p class="tw-empty__text">${text}</p>` : ""}
    ${action ?? ""}
  </div>`;
}

/**
 * Bloque de carga. Componer varios para imitar la forma del contenido final.
 * @param {{ shape?: "line" | "title" | "pill" | "block", width?: 40 | 60 | 80, className?: string }} [props]
 */
export function Skeleton({ shape = "line", width, className } = {}) {
  return html`<span class="${cx("tw-skeleton", `tw-skeleton--${shape}`, width && `tw-skeleton--w-${width}`, className)}" aria-hidden="true"></span>`;
}

/**
 * Región de toasts (una por página). Los mensajes se agregan desde behaviors/toast.js.
 */
export function ToastRegion() {
  return html`<div class="tw-toast-region" data-tw-toast-region role="status" aria-live="polite" aria-atomic="false"></div>`;
}

/** @param {{ message: Renderable, tone?: "default" | "danger" }} props */
export function Toast({ message, tone = "default" }) {
  return html`<div class="${cx("tw-toast", tone === "danger" && "tw-toast--danger")}"><span class="tw-dot" aria-hidden="true"></span><span>${message}</span></div>`;
}

/**
 * Confirmación de éxito: círculo lime + título + texto + contenido/acciones.
 * @param {{ title: Renderable, text?: Renderable, children?: Renderable, headingLevel?: 2 | 3, id?: string }} props
 */
export function SuccessState({ title, text, children, headingLevel = 3, id }) {
  return html`<div class="tw-success" role="status">
    ${IconCircle({ size: "lg" })}
    ${Heading({ level: headingLevel, variant: "h3", children: title, className: "tw-success__title", id })}
    ${text ? Text({ variant: "body", children: text, className: "tw-success__text" }) : ""}
    ${children ?? ""}
  </div>`;
}
