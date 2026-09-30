/**
 * EventCard: tarjeta de evento del template (bloque de fecha navy + contenido), construida
 * solo con componentes del DS. Se usa en el calendario, la temporada y los talleres.
 */
import { Availability, Badge, Button, Card, CardLink, DateBadge, Heading, html } from "../../../design-system/index.js";
import { MODALITIES } from "../domain/event.js";
import { dateBadge, formatLongDate, metaLine, seatAvailability } from "../domain/format.js";
import { eventHref } from "../domain/links.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/**
 * Badges: estado (En curso, Cancelado, Realizado), modalidad, línea, N talleres y DESTACADO.
 * "N talleres" ya dice que es un evento principal, así que no se repite.
 * Los estados "En curso" y "Cancelado" (no existen en el prototipo) van primero.
 * @param {EventView} event
 * @param {{ showFeatured?: boolean, size?: "md" | "lg", onDark?: boolean }} [options]
 */
export function EventBadges(event, { showFeatured = true, size = "md", onDark = false } = {}) {
  return html`${event.status === "live" ? Badge({ label: "En curso", variant: onDark ? "accent" : "accent-soft", live: true, size }) : ""}
    ${event.status === "finished" ? Badge({ label: "Realizado", variant: onDark ? "light" : "outline", size }) : ""}
    ${event.status === "cancelled" ? Badge({ label: "Cancelado", variant: onDark ? "light" : "danger", size }) : ""}
    ${Badge({ label: MODALITIES[event.modality], variant: onDark ? "accent" : "accent-soft", size })}
    ${Badge({ label: event.categoryName, variant: onDark ? "on-dark" : "neutral", size, truncate: true, attrs: { title: event.categoryName } })}
    ${!onDark && event.childCount > 0 ? Badge({ label: `${event.childCount} ${event.childCount === 1 ? "taller" : "talleres"}`, variant: "accent-soft", size }) : ""}
    ${!onDark && showFeatured && event.featured ? Badge({ label: "DESTACADO", variant: "accent", size }) : ""}`;
}

/** @param {EventView} event */
function ctaLabel(event) {
  if (event.status === "cancelled" || event.status === "finished" || event.seatsLeft === 0) return "Ver detalle";
  return event.kind === "principal" ? "Ver programa completo" : "Ver e inscribirme";
}

/**
 * @param {{ event: EventView, headingLevel?: 2 | 3 | 4, showFeatured?: boolean, as?: "article" | "li" }} props
 */
export function EventCard({ event, headingLevel = 3, showFeatured = true, as = "article" }) {
  const seats = seatAvailability(event);
  const date = dateBadge(event);
  const finished = event.status === "finished";
  return Card({
    as,
    layout: "row",
    interactive: true,
    muted: finished,
    children: html`${DateBadge({ day: date.day, month: date.month, srLabel: formatLongDate(event) })}
      <div class="tw-min-w-0">
        <div class="tw-card__badges tw-card__badges--single">${EventBadges(event, { showFeatured })}</div>
        ${Heading({ level: headingLevel, variant: "title", className: "tw-clamp-2", children: CardLink({ href: eventHref(event.id), children: event.title }) })}
        <p class="tw-card__meta">${metaLine(event)}</p>
        <div class="tw-card__footer">
          ${Button({ label: ctaLabel(event), variant: event.status === "cancelled" ? "ghost" : finished ? "outline" : "accent", size: "xs", decorative: true })}
          ${Availability({ label: seats.label, tone: seats.tone })}
        </div>
      </div>`,
  });
}
