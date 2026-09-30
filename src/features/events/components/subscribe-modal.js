/**
 * Modal "Suscríbete a la agenda" (header, banda de webinars, footer).
 * Se abre con data-tw-modal-open="suscribirme"; el envío lo maneja client/shell.js.
 */
import { Button, Chip, Field, Heading, Input, Modal, SuccessState, Text, html } from "../../../design-system/index.js";

export const SUBSCRIBE_MODAL_ID = "suscribirme";

/**
 * @param {{ categories: Array<{ id: string, name: string }>, content: { title: string, text: string, submit: string, dismiss: string, successTitle: string } }} props
 */
export function SubscribeModal({ categories, content }) {
  return Modal({
    id: SUBSCRIBE_MODAL_ID,
    titleId: "suscribirme-title",
    showClose: false, // template: se cierra con "Ahora no", Escape o clic fuera
    children: html`<div data-subscribe-step="form">
        ${Heading({ level: 2, variant: "h3", id: "suscribirme-title", className: "tw-modal__title", children: content.title })}
        ${Text({ variant: "body", className: "tw-modal__intro", children: content.text })}
        <form class="tw-stack tw-gap-3" novalidate data-subscribe-form>
          ${Field({
            id: "subscribe-email",
            label: "Correo de empresa",
            hideLabel: true,
            control: (a11y) => Input({ id: "subscribe-email", name: "email", type: "email", autocomplete: "email", placeholder: "Correo de empresa", required: true, size: "lg", ...a11y }),
          })}
          <fieldset class="tw-field">
            <legend class="tw-sr-only">Líneas de producto que te interesan (opcional)</legend>
            <div class="tw-cluster tw-gap-2" data-subscribe-categories>
              ${categories.map((c) => Chip({ label: c.name, value: c.id, attrs: { "data-subscribe-category": c.id } }))}
            </div>
          </fieldset>
          <div data-form-alert></div>
          ${Button({ label: content.submit, type: "submit", variant: "brand", size: "lg", block: true, className: "tw-mt-1" })}
          ${Button({ label: content.dismiss, variant: "text", block: true, attrs: { "data-tw-modal-close": "" } })}
        </form>
      </div>
      <div data-subscribe-step="success" hidden>
        ${SuccessState({
          title: content.successTitle,
          headingLevel: 2,
          children: html`<p class="tw-text tw-text--body tw-mb-5" data-subscribe-summary></p>${Button({ label: "Listo", variant: "brand", className: "tw-btn--wide", attrs: { "data-tw-modal-close": "" } })}`,
        })}
      </div>`,
  });
}
