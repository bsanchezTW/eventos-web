/**
 * Secciones del sitio de eventos (template) construidas con el Design System.
 * La galería vive en components/gallery.js.
 */
import { Badge, Button, Card, Grid, Heading, StatCard, html } from "../../../design-system/index.js";
import { dateBadge, durationMinutes, zonedParts } from "../domain/format.js";
import { eventHref } from "../domain/links.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/** @param {{ stats: Array<{ label: string, value: string }> }} props */
export function StatBar({ stats }) {
  return html`<div class="tw-container">
    ${Grid({ min: 220, gap: "3-5", as: "ul", className: "tw-stat-bar", attrs: { "aria-label": "Resumen de la agenda" }, children: stats.map((s) => StatCard({ ...s, as: "li" })) })}
  </div>`;
}

/**
 * Fila de webinar (template): estado + línea, título, meta y acción.
 * @param {{ event: EventView, id?: string }} props
 */
export function WebinarRow({ event, id }) {
  const finished = event.status === "finished";
  const date = dateBadge(event);
  const start = zonedParts(event.startsAt, event.timezone);
  const speaker = event.program[0]?.speaker?.split(" · ")[0];
  const state =
    event.status === "live"
      ? Badge({ label: "EN VIVO AHORA", variant: "accent-soft", live: true })
      : finished
        ? Badge({ label: "GRABADO", variant: "neutral" })
        : Badge({ label: `EN VIVO · ${date.day} ${date.month}`, variant: "accent-soft" });
  const meta = finished
    ? `${durationMinutes(event)} min · Disponible on demand`
    : [`${start.time} hrs`, `${durationMinutes(event)} min`, speaker].filter(Boolean).join(" · ");

  return Card({
    as: "li",
    layout: "split",
    attrs: { id },
    children: html`<div class="tw-min-w-0">
        <div class="tw-card__badges">${state}${Badge({ label: event.categoryName, variant: "neutral" })}</div>
        ${Heading({ level: 2, variant: "title-md", children: event.title })}
        <p class="tw-card__meta">${meta}</p>
      </div>
      <div class="tw-card__actions">
        ${finished
          ? Button({ label: "Ver grabación", variant: "ghost", href: eventHref(event.id), attrs: { "aria-label": `Ver grabación: ${event.title}` } })
          : Button({ label: "Reservar cupo", variant: "accent", href: eventHref(event.id), attrs: { "aria-label": `Reservar cupo: ${event.title}` } })}
      </div>`,
  });
}
