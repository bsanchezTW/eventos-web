/**
 * Shell del sitio de eventos (template): header con Agenda · Galería · Webinars, banda CTA
 * lime y footer en todas las vistas, más el modal de suscripción y la región de toasts.
 */
import { Button, CtaBand, Document, Section, SiteFooter, SiteHeader, ToastRegion, html } from "../../../design-system/index.js";
import { CONTACT, LANDING_CONTENT } from "../data/landing-content.js";
import { SubscribeModal } from "../components/subscribe-modal.js";

/** @typedef {import("../../../design-system/utils/html.js").Renderable} Renderable */
/** @typedef {"agenda" | "galeria" | "webinars" | null} NavId */

export const NAV = [
  { id: "agenda", label: "Agenda", href: "/" },
  { id: "galeria", label: "Galería", href: "/galeria" },
  { id: "webinars", label: "Webinars", href: "/webinars" },
];

/**
 * @param {{
 *   title: string, description?: string, main: Renderable, scripts?: string[], categories: Array<{ id: string, name: string }>,
 *   activeNav?: NavId, canonical?: string, image?: string, showCta?: boolean
 * }} props
 */
export function renderPage({ title, description, main, scripts = ["/features/events/client/site.js"], categories, activeNav = "agenda", canonical, image, showCta = true }) {
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
          cta: { label: content.headerCta, href: "#suscribirme", attrs: { "data-tw-modal-open": "suscribirme" } },
        })}
        <main class="tw-page__main" id="contenido" tabindex="-1">
          ${main}
          ${showCta
            ? Section({
                labelledBy: "cta-title",
                children: CtaBand({
                  tone: "accent",
                  title: content.cta.title,
                  id: "cta-title",
                  text: content.cta.text,
                  action: Button({ label: content.cta.action, variant: "light", size: "lg", href: content.cta.href }),
                }),
              })
            : ""}
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
      ${SubscribeModal({ categories, content: content.subscribe })}
      ${ToastRegion()}`,
  });
}
