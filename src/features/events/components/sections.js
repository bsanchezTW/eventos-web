/**
 * Secciones del sitio de eventos (template) construidas con el Design System.
 */
import { Badge, Button, Card, EmptyState, Grid, Heading, IconButton, IconCircle, MediaFrame, StatCard, Text, html } from "../../../design-system/index.js";
import { dateBadge, durationMinutes, zonedParts } from "../domain/format.js";
import { eventHref } from "../domain/links.js";

/** @typedef {import("../domain/event.js").EventView} EventView */
/** @typedef {import("../data/gallery.mock.js").MediaItem} MediaItem */

/** @param {{ stats: Array<{ label: string, value: string }> }} props */
export function StatBar({ stats }) {
  return html`<div class="tw-container">
    ${Grid({ min: 220, gap: "3-5", as: "ul", className: "tw-stat-bar", attrs: { "aria-label": "Resumen de la agenda" }, children: stats.map((s) => StatCard({ ...s, as: "li" })) })}
  </div>`;
}

/** Formas de participar: punto lime, título navy, texto y acción ghost. @param {{ ways: Array<{ title: string, body: string, cta: string, href: string }> }} props */
export function WaysGrid({ ways }) {
  return Grid({
    min: 260,
    gap: "4",
    as: "ul",
    children: ways.map((way) =>
      Card({
        as: "li",
        layout: "column",
        roomy: true,
        children: html`${IconCircle()}
          ${Heading({ level: 3, variant: "card", children: way.title })}
          ${Text({ variant: "body", children: way.body })}
          ${Button({ label: way.cta, variant: "ghost", size: "sm", href: way.href, attrs: { "aria-label": `${way.cta}: ${way.title}` } })}`,
      }),
    ),
  });
}

/** Teaser de galería: tiles 4:5 con leyenda sobre degradado que llevan a /galeria. @param {{ items: Array<{ title: string, image: string | null, slot: string }> }} props */
export function GalleryTeaser({ items }) {
  return Grid({
    min: 200,
    gap: "3-5",
    as: "ul",
    children: items.map(
      (item) => html`<li>
        <a class="tw-tile" href="/galeria" aria-label="${item.title}: ver galería">
          ${MediaFrame({ src: item.image, alt: "", ratio: "4x5", slot: item.slot, caption: item.title })}
        </a>
      </li>`,
    ),
  });
}

/** @param {MediaItem} item */
const mediaBadge = (item) => Badge({ label: item.type === "video" ? "VIDEO" : "FOTO", variant: item.type === "video" ? "brand" : "light" });

/**
 * Pieza de galería: abre el lightbox (data-lightbox = índice en la colección visible).
 * @param {{ item: MediaItem, index: number }} props
 */
export function MediaCard({ item, index }) {
  return html`<li>${Card({
    as: "button",
    flush: true,
    lift: true,
    interactive: true,
    className: "tw-card--button",
    attrs: { type: "button", "data-lightbox": index, "aria-label": `${item.type === "video" ? "Video" : "Foto"}: ${item.title}` },
    children: html`${MediaFrame({ src: item.image, alt: "", slot: item.slot, badge: mediaBadge(item) })}
      <span class="tw-card__body tw-card__body--media">
        <span class="tw-meta-mono">${item.date} · ${item.place}</span>
        <span class="tw-heading tw-heading--media">${item.title}</span>
      </span>`,
  })}</li>`;
}

/**
 * Grupos por país (Chile / Perú) con su conteo.
 * @param {{ groups: Array<{ country: string, items: Array<MediaItem & { index: number }> }> }} props
 */
export function GalleryGroups({ groups }) {
  return html`<div class="tw-stack tw-gap-10">
    ${groups.map(
      (group) => html`<section aria-labelledby="galeria-${group.country}">
        <div class="tw-cluster tw-gap-2-5 tw-mb-4">
          ${Heading({ level: 2, variant: "h3", id: `galeria-${group.country}`, children: group.country })}
          <span class="tw-meta-mono">${group.items.length} ${group.items.length === 1 ? "elemento" : "elementos"}</span>
        </div>
        ${group.items.length
          ? Grid({ min: 260, fill: true, gap: "4", as: "ul", children: group.items.map((item) => MediaCard({ item, index: item.index })) })
          : EmptyState({ compact: true, title: "Sin resultados para este filtro.", headingLevel: 3 })}
      </section>`,
    )}
  </div>`;
}

/** Contenido del lightbox (el cliente lo reemplaza al navegar). @param {{ item: MediaItem }} props */
export function LightboxContent({ item }) {
  return html`${MediaFrame({ src: item.image, alt: item.title, ratio: "16x9", slot: item.slot })}
    <div class="tw-cluster tw-cluster--between tw-gap-5 tw-modal__footer">
      <div class="tw-min-w-0">
        <p class="tw-meta-mono tw-mb-2">${item.date} · ${item.place}</p>
        <h2 class="tw-heading tw-heading--title-md" id="lightbox-title">${item.title}</h2>
      </div>
      <div class="tw-cluster tw-gap-2">
        ${IconButton({ icon: "chevron-left", label: "Pieza anterior", size: "sm", attrs: { "data-lightbox-prev": "" } })}
        ${IconButton({ icon: "chevron-right", label: "Pieza siguiente", size: "sm", attrs: { "data-lightbox-next": "" } })}
        ${Button({ label: "Cerrar", variant: "brand", attrs: { "data-tw-modal-close": "" } })}
      </div>
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
