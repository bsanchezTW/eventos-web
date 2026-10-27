/**
 * Detalle de evento (SSR): cabecera, ficha, talleres, programa, audiencia, cómo llegar y panel de inscripción.
 * Es la vista pública de un evento de la app NEXUS: el staff la enlaza como `/eventos/<slug>`.
 */
import { Banner, Button, Card, Cluster, FactList, Heading, MapFrame, Section, Tag, Text, Timeline, html } from "../../../design-system/index.js";
import { EventBadges, EventCard } from "../components/event-card.js";
import { RegistrationPanel, WorkshopPicker } from "../components/registration.js";
import { mailto } from "../data/landing-content.js";
import { eventFacts, formatLongDate } from "../domain/format.js";
import { isRegistrationOpen } from "../domain/event.js";
import { eventImage } from "../domain/images.js";
import { eventHref } from "../domain/links.js";
import { locationMapUrl, mapsSearchHref } from "../domain/maps.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/**
 * "Cómo llegar": mapa del enlace que pegó el staff en la app o, sin enlace, el de la dirección;
 * más la dirección y "Abrir en Google Maps" (al mismo lugar del enlace, si hay). Nada si es online.
 * @param {EventView} event
 */
function locationBody(event) {
  const { online, venue, address, city } = event.location;
  if (online) return null;
  const mapUrl = event.mapUrl ?? locationMapUrl(event.location);
  const searchHref = event.mapLink && !event.mapLink.includes("output=embed") && !event.mapLink.includes("/maps/embed") ? event.mapLink : mapsSearchHref(event.location);
  if (!mapUrl && !searchHref) return null;
  const place = [venue, address ?? city].filter(Boolean).join(" · ");
  return html`<div class="tw-stack tw-gap-4">
    ${mapUrl ? MapFrame({ src: mapUrl, title: `Mapa: ${venue ?? event.title}` }) : ""}
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
  const selectWorkshops = isRegistrationOpen(event) && children.some(isRegistrationOpen);
  const location = locationBody(event);

  const panel = (/** @type {string} */ title, /** @type {import("../../../design-system/utils/html.js").Renderable} */ body, /** @type {string | undefined} */ intro = undefined, /** @type {string | undefined} */ id = undefined) =>
    Card({
      as: "section",
      roomy: true,
      attrs: { id },
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
          image: { src: eventImage(event.image, "hero") },
          badges: EventBadges(event, { size: "lg", onDark: true }),
          title: event.title,
          text: event.description ?? event.summary,
        })}
        <div class="tw-split tw-mt-6">
          <div class="tw-stack tw-gap-4-5">
            ${Card({ as: "section", roomy: true, attrs: { "aria-label": "Datos del evento" }, children: FactList({ items: eventFacts(event) }) })}
            ${children.length
              ? // Con inscripción abierta, esta es la única lista de talleres: se eligen aquí mismo.
                selectWorkshops
                ? panel("Talleres y actividades", WorkshopPicker({ workshops: children }), undefined, "talleres")
                : panel(
                    "Talleres y actividades",
                    html`<ul class="tw-stack tw-gap-3" role="list">${children.map((child) => EventCard({ event: child, as: "li", showFeatured: false }))}</ul>`,
                    event.status === "finished" ? "Talleres que se realizaron dentro de este evento." : undefined,
                    "talleres",
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
    image: eventImage(event.image, "hero"),
    categories,
    activeNav: "agenda",
    main,
    scripts: ["/features/events/client/event-detail.js"],
  });
}
