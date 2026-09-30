/**
 * Utilidades de formularios y red para el navegador (errores por campo, alertas, estado busy).
 */
import { Alert, toHtml } from "../../../design-system/index.js";

/**
 * POST JSON. Lanza `NetworkError` si no hay respuesta; devuelve status + cuerpo si la hay.
 * @param {string} url
 * @param {unknown} body
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}

export class NetworkError extends Error {
  /** @param {unknown} cause */
  constructor(cause) {
    super("Sin conexión", { cause });
    this.name = "NetworkError";
  }
}

/**
 * Muestra u oculta errores por campo. Convención del DS: control #<prefix>-<name>,
 * mensaje [data-field-error="<prefix>-<name>"] con id <prefix>-<name>-error.
 * Con `inline: false` (patrón del template) el mensaje no se escribe junto al campo: el control
 * queda marcado y describe su error vía `describedBy` (p. ej. la alerta única del formulario).
 * @param {HTMLFormElement} form
 * @param {Record<string, string | undefined>} errors
 * @param {string} prefix
 * @param {{ inline?: boolean, describedBy?: string }} [options]
 * @returns {HTMLElement | null} primer control inválido
 */
export function setFieldErrors(form, errors, prefix, { inline = true, describedBy } = {}) {
  /** @type {HTMLElement | null} */
  let first = null;
  form.querySelectorAll("[data-field-error]").forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    const controlId = el.dataset.fieldError ?? "";
    const name = controlId.slice(prefix.length + 1);
    const message = errors[name];
    const control = form.querySelector(`#${CSS.escape(controlId)}`);
    el.textContent = inline ? (message ?? "") : "";
    el.hidden = !inline || !message;
    if (control) {
      if (message) {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", inline ? el.id : (describedBy ?? el.id));
        first ??= /** @type {HTMLElement} */ (control);
      } else {
        control.removeAttribute("aria-invalid");
        control.removeAttribute("aria-describedby");
      }
    }
  });
  return first;
}

/**
 * @param {Element | null} container
 * @param {{ tone: "danger" | "success" | "info", message: string } | null} alert
 */
export function renderAlert(container, alert) {
  if (!container) return;
  container.innerHTML = alert ? toHtml(Alert(alert)) : "";
}

/** @param {HTMLButtonElement | null} button @param {boolean} busy */
export function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  if (busy) button.setAttribute("aria-busy", "true");
  else button.removeAttribute("aria-busy");
}

export const NETWORK_MESSAGE = "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.";
