import { Button, IconButton } from "../components/button.js";
import { SegmentedControl } from "../components/selection.js";
import { BRAND } from "../utils/assets.js";
import { attrs, html } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */
/** @typedef {{ label: string, href: string, active?: boolean }} NavItem */

/**
 * Marca: logo + "TRANSWORLD" + bajada mono (nombre del producto/sección).
 * @param {{ href?: string, tagline: string, label?: string }} props
 */
export function Brand({ href = "/", tagline, label = "Transworld — inicio" }) {
  return html`<a class="tw-brand" href="${href}" aria-label="${label}">
    <img class="tw-brand__logo" src="${BRAND.logo}" alt="" width="40" height="40">
    <span class="tw-brand__text" aria-hidden="true">
      <span class="tw-brand__name">${BRAND.name}</span>
      <span class="tw-brand__tagline">${tagline}</span>
    </span>
  </a>`;
}

/**
 * Header sticky con blur. Bajo 960px la nav colapsa a un menú desplegable
 * (behaviors/disclosure.js); bajo 480px el CTA pasa al menú.
 * @param {{ tagline: string, homeHref?: string, nav: NavItem[], cta?: { label: string, href?: string, attrs?: Record<string, unknown> }, menuId?: string }} props
 */
export function SiteHeader({ tagline, homeHref = "/", nav, cta, menuId = "tw-mobile-nav" }) {
  const ctaButton = (/** @type {boolean} */ block) =>
    cta ? Button({ label: cta.label, href: cta.href, variant: "brand", size: "md", block, className: block ? undefined : "tw-header__cta tw-btn--elevated", attrs: cta.attrs }) : "";

  return html`<header class="tw-header">
    <div class="tw-container tw-header__inner">
      ${Brand({ href: homeHref, tagline })}
      ${SegmentedControl({ items: nav, label: "Principal", mode: "nav", variant: "nav", className: "tw-header__nav" })}
      <div class="tw-header__actions">
        ${ctaButton(false)}
        ${IconButton({ icon: "menu", label: "Abrir menú", variant: "ghost", className: "tw-header__menu-toggle", attrs: { "aria-expanded": "false", "aria-controls": menuId, "data-tw-disclosure": menuId } })}
      </div>
    </div>
    <div class="tw-mobile-nav" id="${menuId}" hidden>
      <nav class="tw-container" aria-label="Principal (móvil)">
        <ul class="tw-mobile-nav__list" role="list">
          ${nav.map((item) => html`<li><a class="tw-mobile-nav__link" href="${item.href}"${attrs({ "aria-current": item.active ? "page" : null })}>${item.label}</a></li>`)}
        </ul>
        ${cta ? html`<div class="tw-mobile-nav__footer">${ctaButton(true)}</div>` : ""}
      </nav>
    </div>
  </header>`;
}

/**
 * Footer navy oscuro con columnas de enlaces y datos de contacto.
 * @param {{
 *   about: Renderable, columns: Array<{ title: string, links: Array<{ label: string, href: string }> }>,
 *   contact?: { title: string, lines: Renderable[] }, legal: Renderable
 * }} props
 */
export function SiteFooter({ about, columns, contact, legal }) {
  return html`<footer class="tw-footer tw-on-dark">
    <div class="tw-container tw-footer__inner">
      <div class="tw-footer__grid">
        <div>
          <img class="tw-footer__logo" src="${BRAND.logo}" alt="Transworld" width="48" height="48" loading="lazy">
          <p class="tw-footer__about">${about}</p>
        </div>
        ${columns.map(
          (column) => html`<nav aria-label="${column.title}">
            <h2 class="tw-footer__heading">${column.title}</h2>
            <ul class="tw-footer__list" role="list">
              ${column.links.map((link) => html`<li><a href="${link.href}">${link.label}</a></li>`)}
            </ul>
          </nav>`,
        )}
        ${contact
          ? html`<div>
              <h2 class="tw-footer__heading">${contact.title}</h2>
              <address class="tw-footer__address">${contact.lines.map((line, i) => html`${i ? html`<br>` : ""}${line}`)}</address>
            </div>`
          : ""}
      </div>
      <hr class="tw-footer__divider">
      <p class="tw-footer__legal">${legal}</p>
    </div>
  </footer>`;
}
