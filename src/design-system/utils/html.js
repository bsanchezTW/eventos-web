/**
 * Motor de plantillas del Design System.
 *
 * Los componentes son funciones puras que devuelven `SafeHtml`. Funcionan igual en
 * Node (SSR) y en el navegador (re-render de regiones), sin framework ni bundler.
 * Todo valor interpolado se escapa salvo que ya sea `SafeHtml` (otro componente o `raw()`).
 */

export class SafeHtml {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = /** @type {Record<string, string>} */ ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
});

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/**
 * Marca un string como HTML confiable. Usar solo con contenido propio (SVG de íconos,
 * salida de otros componentes), nunca con datos de usuario o de la API.
 * @param {unknown} value
 */
export function raw(value) {
  return new SafeHtml(String(value ?? ""));
}

/**
 * @typedef {SafeHtml | string | number | boolean | null | undefined | Renderable[]} Renderable
 */

/** @param {unknown} value @returns {string} */
function render(value) {
  if (value === null || value === undefined || value === false || value === true) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeHtml(value);
}

/**
 * Tagged template: html`<p>${texto}</p>`
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1];
  }
  return new SafeHtml(out);
}

/**
 * Serializa atributos. `false`/`null`/`undefined` se omiten; `true` produce un atributo booleano.
 * @param {Record<string, unknown> | undefined} attributes
 */
export function attrs(attributes) {
  if (!attributes) return raw("");
  let out = "";
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(name)) continue;
    out += value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`;
  }
  return raw(out);
}

/**
 * Une clases condicionales: cx("tw-btn", active && "is-active", { "tw-btn--block": block })
 * @param {...(string | false | null | undefined | Record<string, unknown>)} parts
 */
export function cx(...parts) {
  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") out.push(part);
    else for (const [name, on] of Object.entries(part)) if (on) out.push(name);
  }
  return out.join(" ");
}

/** Convierte un render a string (útil para `element.innerHTML = toHtml(...)`). @param {Renderable} value */
export function toHtml(value) {
  return render(value);
}

let idCounter = 0;
/** Genera ids estables por render para asociar label/aria. @param {string} prefix */
export function uid(prefix = "tw") {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}-${idCounter.toString(36)}`;
}
