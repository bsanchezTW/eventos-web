import { attrs, cx, html } from "../utils/html.js";
import { IconButton } from "./button.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Modal sobre <dialog> nativo. Se abre con `data-tw-modal-open="<id>"` o `openModal(id)`
 * (behaviors/modal.js). Escape, foco atrapado y fondo inerte los resuelve el navegador.
 * `flush` quita el padding del panel (contenido a sangre, p. ej. lightbox).
 * @param {{ id: string, titleId?: string, children: Renderable, variant?: "default" | "wide" | "media", flush?: boolean, closeLabel?: string, showClose?: boolean }} props
 */
export function Modal({ id, titleId, children, variant = "default", flush = false, closeLabel = "Cerrar", showClose = true }) {
  return html`<dialog class="${cx("tw-modal", variant === "wide" && "tw-modal--wide", variant === "media" && "tw-modal--wide tw-modal--media")}"${attrs({ id, "aria-labelledby": titleId, "data-tw-modal": "" })}>
    <div class="${cx("tw-modal__panel", flush && "tw-modal__panel--flush")}">
      ${showClose ? IconButton({ icon: "close", label: closeLabel, variant: "ghost", size: "sm", className: "tw-modal__close", attrs: { "data-tw-modal-close": "" } }) : ""}
      ${children}
    </div>
  </dialog>`;
}
