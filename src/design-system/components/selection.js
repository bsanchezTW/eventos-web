import { attrs, cx, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Grupo de píldoras (nav principal, tabs de mes, filtros exclusivos).
 * - mode "pressed": botones toggle (aria-pressed) — filtros en la misma página.
 * - mode "nav": enlaces con aria-current — navegación.
 * `shortLabel` reemplaza visualmente la etiqueta bajo 480px (p. ej. "Sep" por "Septiembre").
 *
 * @param {{
 *   items: Array<{ label: Renderable, shortLabel?: string, value?: string, href?: string, active?: boolean, attrs?: Record<string, unknown> }>,
 *   label: string, mode?: "pressed" | "nav", variant?: "default" | "nav", className?: string, attrs?: Record<string, unknown>
 * }} props
 */
export function SegmentedControl({ items, label, mode = "pressed", variant = "default", className, attrs: extra }) {
  const tag = mode === "nav" ? "nav" : "div";
  const role = mode === "nav" ? {} : { role: "group" };
  const content = (/** @type {{ label: Renderable, shortLabel?: string }} */ item) =>
    item.shortLabel ? html`<span class="tw-pill__long">${item.label}</span><span class="tw-pill__short" aria-hidden="true">${item.shortLabel}</span>` : item.label;
  const pills = items.map((item) =>
    mode === "nav"
      ? html`<a class="tw-pill" href="${item.href ?? "#"}"${attrs({ "aria-current": item.active ? "page" : null, ...item.attrs })}>${content(item)}</a>`
      : html`<button class="tw-pill" type="button"${attrs({ "aria-pressed": item.active ? "true" : "false", "data-value": item.value, ...item.attrs })}>${content(item)}</button>`,
  );
  return html`<${tag} class="${cx("tw-segmented", variant === "nav" && "tw-segmented--nav", className)}"${attrs({ "aria-label": label, ...role, ...extra })}>${pills}</${tag}>`;
}

/**
 * Chip de filtro con estado on/off (selección múltiple).
 * @param {{ label: Renderable, pressed?: boolean, count?: number, value?: string, attrs?: Record<string, unknown> }} props
 */
export function Chip({ label, pressed = false, count, value, attrs: extra }) {
  return html`<button class="tw-chip" type="button"${attrs({ "aria-pressed": pressed ? "true" : "false", "data-value": value, ...extra })}>
    <span>${label}</span>${count !== undefined ? html`<span class="tw-chip__count" aria-label="${count} resultados">${count}</span>` : ""}
  </button>`;
}

/**
 * Selector segmentado con radios nativos (accesible por teclado sin JS).
 * @param {{ name: string, legend: string, options: Array<{ value: string, label: Renderable }>, value?: string, disabled?: boolean, legendClassName?: string }} props
 */
export function OptionGroup({ name, legend, options, value, disabled = false, legendClassName = "tw-field__label" }) {
  return html`<fieldset class="tw-field" ${disabled ? "disabled" : ""}>
    <legend class="${legendClassName}">${legend}</legend>
    <div class="tw-options">
      ${options.map(
        (option) => html`<label class="tw-option">
          <input type="radio"${attrs({ name, value: option.value, checked: option.value === value })}>
          <span>${option.label}</span>
        </label>`,
      )}
    </div>
  </fieldset>`;
}

/**
 * Tarjeta seleccionable (checkbox nativo con detalle) para elegir varias opciones: talleres, sesiones.
 * `aside` va a la derecha (p. ej. `Availability`). Deshabilitada, no se puede marcar.
 * @param {{ name: string, value: string, title: Renderable, meta?: Renderable, aside?: Renderable, checked?: boolean, disabled?: boolean, id?: string, attrs?: Record<string, unknown> }} props
 */
export function ChoiceCard({ name, value, title, meta, aside, checked = false, disabled = false, id, attrs: extra }) {
  return html`<label class="tw-choice">
    <input class="tw-choice__input" type="checkbox"${attrs({ id, name, value, checked, disabled, ...extra })}>
    <span class="tw-choice__body">
      <span class="tw-choice__title">${title}</span>
      ${meta ? html`<span class="tw-choice__meta">${meta}</span>` : ""}
    </span>
    ${aside ? html`<span class="tw-choice__aside">${aside}</span>` : ""}
  </label>`;
}

/**
 * Grupo de `ChoiceCard` con leyenda, ayuda y error. Sigue la convención de `Field`: el mensaje de error
 * es `#<id>-error` con `data-field-error="<id>"`, y el grupo (`#<id>`) recibe foco al marcar un error.
 * @param {{ id: string, legend: Renderable, hint?: Renderable, error?: Renderable, children: Renderable }} props
 */
export function ChoiceGroup({ id, legend, hint, error, children }) {
  const describedBy = [hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined;
  return html`<fieldset class="tw-field"${attrs({ id, tabindex: "-1", "aria-describedby": describedBy, "aria-invalid": error ? "true" : null })}>
    <legend class="tw-field__label">${legend}</legend>
    ${hint ? html`<p class="tw-field__hint tw-choice-group__hint" id="${id}-hint">${hint}</p>` : ""}
    <div class="tw-choice-group">${children}</div>
    <p class="tw-field__error" id="${id}-error" data-field-error="${id}" ${error ? "" : "hidden"}>${error ?? ""}</p>
  </fieldset>`;
}

/**
 * Indicadores de carrusel. El activo se estira a 38px.
 * @param {{ count: number, active?: number, label?: (index: number) => string, attrs?: Record<string, unknown> }} props
 */
export function CarouselDots({ count, active = 0, label = (i) => `Ir a la diapositiva ${i + 1}`, attrs: extra }) {
  return html`<div class="tw-dots"${attrs(extra)}>
    ${Array.from({ length: count }, (_, i) =>
      html`<button class="tw-dots__dot" type="button"${attrs({ "aria-label": label(i), "aria-current": i === active ? "true" : "false", "data-index": i })}></button>`,
    )}
  </div>`;
}
