/**
 * Iconografía del Design System.
 *
 * El template usa glifos tipográficos (‹ › ← ↳) y el motivo del "punto lime". Este set
 * los reproduce como SVG de trazo (24×24, stroke 1.8, extremos redondeados) para que
 * escalen nítidos, más los íconos de categoría que necesita la agenda.
 * Heredan el color vía `currentColor`.
 */
import { html, raw } from "../utils/html.js";

/** @type {Record<string, string>} */
const PATHS = {
  "chevron-left": '<path d="M15 18l-6-6 6-6"/>',
  "chevron-right": '<path d="M9 18l6-6-6-6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  "arrow-left": '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  "arrow-right": '<path d="M5 12h14M12 5l7 7-7 7"/>',
  "corner-down-right": '<path d="M5 4v7a4 4 0 0 0 4 4h11"/><path d="M15 10l5 5-5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10.5l5-3v9l-5-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.2 2.4 3.5 5.2"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  // Categorías / líneas de producto
  fiber: '<path d="M3 7c7 0 9 5 18 5M3 12h18M3 17c7 0 9-5 18-5"/><circle cx="21" cy="12" r=".6"/>',
  network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18.5" r="2.5"/><circle cx="19" cy="18.5" r="2.5"/><path d="M10.8 7.2l-4.6 9M13.2 7.2l4.6 9M7.5 18.5h9"/>',
  camera: '<path d="M3.5 9.2l11.6-3.4 2 5.8-11.6 3.4z"/><path d="M7 14l1.6 4.8H4"/><path d="M17.6 8.8l3-.9v4.4l-2.9-.5"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  bolt: '<path d="M13 2.5L4.5 14H11l-1 7.5L18.5 10H12z"/>',
  server: '<rect x="4" y="3.5" width="16" height="7" rx="2"/><rect x="4" y="13.5" width="16" height="7" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h4M12 17h4"/>',
};

const FILLED = new Set(["play"]);

/** @returns {string[]} */
export function iconNames() {
  return Object.keys(PATHS);
}

/**
 * @param {object} props
 * @param {string} props.name
 * @param {number} [props.size]
 * @param {string} [props.label] Texto accesible. Sin label el ícono es decorativo (aria-hidden).
 * @param {string} [props.className]
 */
export function Icon({ name, size = 20, label, className = "" }) {
  const body = PATHS[name];
  if (!body) throw new Error(`Icon: "${name}" no existe en el set del Design System`);
  const fill = FILLED.has(name) ? "currentColor" : "none";
  const a11y = label ? html`role="img" aria-label="${label}"` : raw('aria-hidden="true" focusable="false"');
  return html`<svg class="tw-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${raw(body)}</svg>`;
}
