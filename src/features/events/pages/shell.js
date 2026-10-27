/**
 * Shell del sitio de eventos (template): header con Agenda · Galería, footer en todas las vistas
 * y la región de toasts.
 *
 * Ocultos por ahora (el código sigue, solo no se enlaza): la página de webinars
 * (pages/webinars.page.js), la banda "¿Necesitas una capacitación…?" y el modal de suscripción
 * (components/subscribe-modal.js; las suscripciones solo quedaban en memoria).
 */
import { Document, SiteFooter, SiteHeader, ToastRegion, html } from "../../../design-system/index.js";
import { CONTACT, LANDING_CONTENT } from "../data/landing-content.js";

/** @typedef {import("../../../design-system/utils/html.js").Renderable} Renderable */
/** @typedef {"agenda" | "galeria" | null} NavId */

export const NAV = [
  { id: "agenda", label: "Agenda", href: "/" },
  { id: "galeria", label: "Galería", href: "/galeria" },
];

/**
 * @param {{
 *   title: string, description?: string, main: Renderable, scripts?: string[], categories?: Array<{ id: string, name: string }>,
 *   activeNav?: NavId | "webinars", canonical?: string, image?: string
 * }} props
 */
export function renderPage({ title, description, main, scripts = ["/features/events/client/site.js"], activeNav = "agenda", canonical, image }) {
  const content = LANDING_CONTENT;
  return Document({
    title,
    description,
    canonical,
    image,
    scripts,
    body: html`<a class="tw-skip-link" href="#contenido">Saltar al contenido</a>
      <div class="tw-page">
        ${SiteHeader({
          tagline: content.tagline,
          nav: NAV.map((item) => ({ label: item.label, href: item.href, active: item.id === activeNav })),
        })}
        <main class="tw-page__main" id="contenido" tabindex="-1">
          ${main}
        </main>
        ${SiteFooter({
          about: content.footer.about,
          columns: content.footer.columns,
          contact: {
            title: "Casa matriz",
            lines: [...CONTACT.address, html`<a href="${CONTACT.phoneHref}">${CONTACT.phone}</a>`, html`<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`],
          },
          legal: content.footer.legal,
        })}
      </div>
      ${ToastRegion()}`,
  });
}
