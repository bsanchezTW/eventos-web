/**
 * Detalle de evento (SSR): cabecera, ficha, talleres, programa, audiencia, cómo llegar y panel de inscripción.
 * Es la vista pública de un evento de la app NEXUS: el staff la enlaza como `/eventos/<slug>`.
 */
import { Banner, Button, Card, Cluster, FactList, Heading, MapFrame, Section, Tag, Text, Timeline, html } from "../../../design-system/index.js";
import { EventBadges, EventCard } from "../components/event-card.js";
import { RegistrationPanel } from "../components/registration.js";
import { mailto } from "../data/landing-content.js";
import { eventFacts, formatLongDate } from "../domain/format.js";
import { eventHref } from "../domain/links.js";
import { mapsSearchHref } from "../domain/maps.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/**
 * "Cómo llegar": mapa cargado en la app (si hay) + dirección + enlace a Google Maps. Nada si es online.
 * @param {EventView} event
 */
function locationBody(event) {
  const { online, venue, address, city } = event.location;
  const searchHref = mapsSearchHref(event.location);
  if (online || (!event.mapUrl && !searchHref)) return null;
  const place = [venue, address ?? city].filter(Boolean).join(" · ");
  return html`<div class="tw-stack tw-gap-4">
    ${event.mapUrl ? MapFrame({ src: event.mapUrl, title: `Mapa: ${venue ?? event.title}` }) : ""}
    <div class="tw-cluster tw-cluster--between tw-gap-3">
      ${place ? Text({ variant: "meta", children: place }) : ""}
      ${searchHref ? Button({ label: "Abrir en Google Maps", variant: "outline", size: "sm", icon: "pin", href: searchHref, className: "tw-btn--medium", attrs: { target: "_blank", rel: "noopener" } }) : ""}
    </div>
  </div>`;
}

/**
 * @param {{ detail: { event: EventView, parent: EventView | null, children: EventView[] }, categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderEventDetailPage({ detail, categories, canonical }) {
  const { event, parent, children } = detail;
  const location = locationBody(event);

  const panel = (/** @type {string} */ title, /** @type {import("../../../design-system/utils/html.js").Renderable} */ body, /** @type {string | undefined} */ intro = undefined) =>
    Card({
      as: "section",
      roomy: true,
      children: html`${Heading({ level: 2, variant: "panel", children: title, className: intro ? "tw-mb-2" : "tw-mb-4" })}
        ${intro ? Text({ variant: "meta", className: "tw-mb-4", children: intro }) : ""}
        ${body}`,
    });

  const main = html`${Section({
      spacing: "compact",
      children: html`<div class="tw-cluster tw-gap-2-5 tw-mb-4">
          ${Button({ label: "Volver a la agenda", variant: "outline", size: "sm", icon: "arrow-left", href: "/", className: "tw-btn--medium" })}
          ${parent ? Button({ label: `Parte de: ${parent.title}`, variant: "accent-outline", size: "sm", icon: "corner-down-right", href: eventHref(parent.id), className: "tw-btn--medium" }) : ""}
        </div>
        ${Banner({
          image: { src: event.image },
          badges: EventBadges(event, { size: "lg", onDark: true }),
          title: event.title,
          text: event.description ?? event.summary,
        })}
        <div class="tw-split tw-mt-6">
          <div class="tw-stack tw-gap-4-5">
            ${Card({ as: "section", roomy: true, attrs: { "aria-label": "Datos del evento" }, children: FactList({ items: eventFacts(event) }) })}
            ${children.length
              ? panel(
                  "Talleres y actividades",
                  html`<ul class="tw-stack tw-gap-3" role="list">${children.map((child) => EventCard({ event: child, as: "li", showFeatured: false }))}</ul>`,
                  "Elígelos en el formulario al inscribirte: cada taller tiene cupos propios y no puedes tomar dos a la misma hora.",
                )
              : ""}
            ${event.program.length
              ? panel(
                  "Programa de la sesión",
                  Timeline({ items: event.program.map((item) => ({ time: item.time, title: item.title, detail: item.speaker })) }),
                )
              : ""}
            ${event.audience.length ? panel("Dirigido a", Cluster({ gap: "2", children: event.audience.map((label) => Tag({ label })) })) : ""}
            ${location ? panel("Cómo llegar", location) : ""}
          </div>
          <aside class="tw-split__aside" aria-label="Inscripción">
            ${RegistrationPanel({ event, workshops: children, parent, contactHref: mailto(`Consulta: ${event.title}`) })}
          </aside>
        </div>`,
    })}`;

  return renderPage({
    title: `${event.title} · ${formatLongDate(event)} · Transworld`,
    description: event.summary,
    canonical,
    image: event.image,
    categories,
    activeNav: "agenda",
    main,
    scripts: ["/features/events/client/event-detail.js"],
  });
}
