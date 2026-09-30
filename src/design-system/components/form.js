import { Icon } from "../icons/index.js";
import { attrs, cx, html } from "../utils/html.js";
import { Button } from "./button.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * @typedef {object} ControlProps
 * @property {string} id
 * @property {string} name
 * @property {string} [value]
 * @property {boolean} [required]
 * @property {boolean} [disabled]
 * @property {boolean} [invalid]
 * @property {string} [describedBy]
 * @property {Record<string, unknown>} [attrs]
 */

/**
 * Campo: label + control + ayuda/error. El control recibe `aria-describedby` hacia la ayuda y el error.
 * `hideLabel`: la etiqueta queda solo para lectores de pantalla (el placeholder la reemplaza visualmente).
 * @param {{ id: string, label: Renderable, hint?: Renderable, error?: Renderable, hideLabel?: boolean, className?: string,
 *   control: (a11y: { describedBy?: string, invalid: boolean }) => Renderable }} props
 */
export function Field({ id, label, hint, error, hideLabel = false, className, control }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  return html`<div class="${cx("tw-field", className)}">
    <label class="${hideLabel ? "tw-sr-only" : "tw-field__label"}" for="${id}">${label}</label>
    ${control({ describedBy, invalid: Boolean(error) })}
    ${hint ? html`<p class="tw-field__hint" id="${hintId}">${hint}</p>` : ""}
    <p class="tw-field__error" id="${errorId}" data-field-error="${id}" ${error ? "" : "hidden"}>${error ?? ""}</p>
  </div>`;
}

/**
 * @param {ControlProps & { type?: string, placeholder?: string, autocomplete?: string, inputmode?: string, size?: "md" | "lg", className?: string }} props
 */
export function Input({ id, name, type = "text", value, placeholder, autocomplete, inputmode, required, disabled, invalid, describedBy, size = "md", className, attrs: extra }) {
  return html`<input class="${cx("tw-input", size === "lg" && "tw-input--lg", className)}"${attrs({
    id,
    name,
    type,
    value,
    placeholder,
    autocomplete,
    inputmode,
    required,
    disabled,
    "aria-invalid": invalid ? "true" : null,
    "aria-describedby": describedBy,
    ...extra,
  })}>`;
}

/**
 * @param {ControlProps & { options: Array<{ value: string, label: string }>, className?: string }} props
 */
export function Select({ id, name, options, value, required, disabled, invalid, describedBy, className, attrs: extra }) {
  return html`<select class="${cx("tw-select", className)}"${attrs({ id, name, required, disabled, "aria-invalid": invalid ? "true" : null, "aria-describedby": describedBy, ...extra })}>
    ${options.map((option) => html`<option${attrs({ value: option.value, selected: option.value === value })}>${option.label}</option>`)}
  </select>`;
}

/**
 * Control compuesto en una fila: un prefijo angosto (p. ej. Select de código de país) + el control principal.
 * El `Field` etiqueta al control principal; el prefijo necesita su propio `aria-label`.
 * @param {{ children: Renderable, className?: string, attrs?: Record<string, unknown> }} props
 */
export function InputGroup({ children, className, attrs: extra }) {
  return html`<div class="${cx("tw-input-group", className)}"${attrs(extra)}>${children}</div>`;
}

/** @param {{ id?: string, name: string, label: Renderable, checked?: boolean, required?: boolean, value?: string, attrs?: Record<string, unknown> }} props */
export function Checkbox({ id, name, label, checked = false, required, value = "on", attrs: extra }) {
  return html`<label class="tw-check">
    <input type="checkbox"${attrs({ id, name, value, checked, required, ...extra })}>
    <span>${label}</span>
  </label>`;
}

/**
 * Campo de búsqueda con ícono. La etiqueta es visible u oculta (`hideLabel`), nunca ausente.
 * @param {{ id: string, name: string, label: string, placeholder?: string, value?: string, hideLabel?: boolean, attrs?: Record<string, unknown> }} props
 */
export function SearchField({ id, name, label, placeholder, value, hideLabel = false, attrs: extra }) {
  return html`<div class="tw-field">
    <label class="${hideLabel ? "tw-sr-only" : "tw-field__label"}" for="${id}">${label}</label>
    <div class="tw-search">
      ${Icon({ name: "search", size: 18 })}
      ${Input({ id, name, type: "search", value, placeholder, autocomplete: "off", attrs: { enterkeyhint: "search", ...extra } })}
    </div>
  </div>`;
}

/**
 * Barra de búsqueda destacada (hero): formulario GET que funciona sin JS.
 * @param {{ action: string, name?: string, label: string, placeholder?: string, value?: string, buttonLabel?: string, attrs?: Record<string, unknown> }} props
 */
export function SearchBar({ action, name = "q", label, placeholder, value, buttonLabel = "Buscar", attrs: extra }) {
  return html`<form class="tw-searchbar" role="search" method="get" action="${action}"${attrs(extra)}>
    ${Icon({ name: "search", size: 20 })}
    <label class="tw-sr-only" for="tw-searchbar-${name}">${label}</label>
    <input class="tw-searchbar__input" id="tw-searchbar-${name}" type="search" name="${name}"${attrs({ value, placeholder, autocomplete: "off", enterkeyhint: "search" })}>
    ${Button({ label: buttonLabel, type: "submit", variant: "accent", size: "sm", iconEnd: "arrow-right" })}
  </form>`;
}
