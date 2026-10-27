/**
 * Agenda: una sola lista de eventos con el calendario al lado. Las pestañas de mes ("Todos" y
 * los meses desde el actual), los chips de línea y el calendario solo filtran la lista: primero
 * los próximos y después los realizados. Ningún evento aparece dos veces.
 * `ExplorerResults` se re-renderiza en el navegador al cambiar filtros.
 */
import { Alert, Button, Card, Chip, Cluster, EmptyState, Eyebrow, Grid, MonthCalendar, SegmentedControl, Skeleton, Stack, html } from "../../../design-system/index.js";
import { hasActiveFilters } from "../domain/explorer.js";
import { monthName } from "../domain/format.js";
import { EventCard, EventTile } from "./event-card.js";

/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {{ id: string, name: string }} CategoryRef */

/** Tarjetas junto al calendario y con foto en la fila de abajo; el resto va tras "Ver más". */
export const SIDE_COUNT = 2;
export const ROW_COUNT = 4;
export const MORE_LIST_ID = "mas-eventos";

/** "Todos" (sin mes: toda la agenda) y los meses desde el actual. @param {{ months: ExplorerResult["months"], active: string | null }} props */
export function MonthTabs({ months, active }) {
  return SegmentedControl({
    label: "Mes",
    items: [
      { label: "Todos", value: "", active: !active, attrs: { "data-month": "" } },
      ...months.map((m) => ({ label: m.label, shortLabel: m.label.slice(0, 3), value: m.key, active: m.key === active, attrs: { "data-month": m.key } })),
    ],
  });
}

/** Chips de línea de producto; con una sola línea no filtran nada y no se muestran. @param {{ categories: CategoryRef[], selected: string[] }} props */
export function CategoryChips({ categories, selected }) {
  if (categories.length < 2) return "";
  return html`<div class="tw-cluster tw-gap-2 tw-mb-5-5" role="group" aria-label="Líneas de producto" data-explorer-chips>
    ${categories.map((c) => Chip({ label: c.name, value: c.id, pressed: selected.includes(c.id), attrs: { "data-category": c.id } }))}
  </div>`;
}

/** @param {{ calendar: NonNullable<ExplorerResult["calendar"]>, selectedDay: string | null }} props */
function CalendarPanel({ calendar, selectedDay }) {
  const lower = monthName(calendar.month).toLowerCase();
  return Card({
    variant: "panel",
    children: MonthCalendar({
      year: calendar.year,
      month: calendar.month,
      title: calendar.title,
      titleId: "explorer-calendar-title",
      markers: calendar.markers,
      past: calendar.past,
      nav: {
        prev: calendar.prev ? { label: `Ver ${calendar.prev.label.toLowerCase()}`, attrs: { "data-month": calendar.prev.key } } : null,
        next: calendar.next ? { label: `Ver ${calendar.next.label.toLowerCase()}`, attrs: { "data-month": calendar.next.key } } : null,
      },
      selected: selectedDay ? Number(selectedDay.slice(8)) : null,
      today: calendar.today,
      dayLabel: (day, count) => `${day} de ${lower}: ${count} ${count === 1 ? "evento" : "eventos"}`,
      legend: [{ label: "Próximo" }, { label: "Realizado", tone: "muted" }, { label: "Seleccionado", tone: "brand" }],
      attrs: { "data-explorer-calendar": "", "data-calendar-month": calendar.key },
    }),
  });
}

/** @param {{ explorer: ExplorerResult }} props */
function ListEmpty({ explorer }) {
  const { query, monthExplicit, alternatives } = explorer;
  const clear = hasActiveFilters(query) ? Button({ label: "Limpiar filtros", variant: "soft-accent", attrs: { "data-action": "clear-filters" } }) : "";
  const others = alternatives.map((m) => Button({ label: `Ver ${m.label.toLowerCase()} (${m.count})`, variant: "ghost", attrs: { "data-month": m.key } }));
  return EmptyState({
    title: monthExplicit ? "Sin fechas para este filtro" : "Pronto publicaremos nuevas fechas",
    text: monthExplicit ? "Prueba con otro mes o quita los filtros de línea de producto." : "Vuelve a visitarnos en unos días.",
    action: clear || others.length ? Cluster({ className: "tw-cluster--center", children: html`${clear}${others}` }) : undefined,
  });
}

/**
 * Lista con el calendario: SIDE_COUNT tarjetas junto al calendario, ROW_COUNT con foto en una fila
 * bajo él y, tras "Ver más eventos", el resto en dos columnas.
 * @param {{ explorer: ExplorerResult }} props
 */
export function ExplorerResults({ explorer }) {
  const { calendar, items, query, total } = explorer;
  const summary = `${items.length} ${items.length === 1 ? "evento" : "eventos"} en la lista; ${total} en total.`;
  const side = items.slice(0, SIDE_COUNT);
  const row = items.slice(SIDE_COUNT, SIDE_COUNT + ROW_COUNT);
  const rest = items.slice(SIDE_COUNT + ROW_COUNT);

  return html`<p class="tw-sr-only" role="status">${summary}</p>
    <div class="tw-split">
      ${side.length
        ? html`<ul class="tw-stack tw-gap-3-5" role="list">${side.map((event) => EventCard({ event, as: "li" }))}</ul>`
        : ListEmpty({ explorer })}
      ${calendar ? html`<aside class="tw-split__aside" aria-label="Calendario">${CalendarPanel({ calendar, selectedDay: query.day })}</aside>` : ""}
    </div>
    ${row.length ? Grid({ as: "ul", gap: "3-5", className: "tw-grid--quad tw-mt-6", children: row.map((event) => EventTile({ event })) }) : ""}
    ${rest.length
      ? html`${Button({
          label: query.all ? "Ver menos eventos" : `Ver más eventos (${rest.length})`,
          variant: "outline",
          size: "lg",
          block: true,
          icon: query.all ? undefined : "chevron-down",
          className: "tw-mt-6",
          attrs: { "data-action": "toggle-more", "aria-expanded": String(query.all), "aria-controls": MORE_LIST_ID },
        })}
        <div class="tw-mt-6" id="${MORE_LIST_ID}"${query.all ? "" : " hidden"}>
          ${query.all ? Grid({ as: "ul", min: 420, gap: "3-5", children: rest.map((event) => EventCard({ event, as: "li" })) }) : ""}
        </div>`
      : ""}`;
}

/** Estado de carga con la forma del contenido final. */
export function ExplorerSkeleton() {
  const card = Card({
    layout: "row",
    children: html`${Skeleton({ shape: "block" })}
      <div class="tw-stack tw-gap-2-5">
        <div class="tw-cluster tw-gap-2">${Skeleton({ shape: "pill" })}${Skeleton({ shape: "pill" })}</div>
        ${Skeleton({ shape: "title", width: 80 })}
        ${Skeleton({ shape: "line", width: 60 })}
      </div>`,
  });
  const tile = Card({
    flush: true,
    children: html`<div class="tw-media">${Skeleton({ shape: "block" })}</div>
      <div class="tw-card__body tw-card__body--media tw-stack tw-gap-2-5">${Skeleton({ shape: "line", width: 40 })}${Skeleton({ shape: "title", width: 80 })}${Skeleton({ shape: "line", width: 60 })}</div>`,
  });
  return html`<div aria-busy="true">
    <p class="tw-sr-only" role="status">Cargando eventos…</p>
    <div class="tw-split">
      ${Stack({ gap: "3-5", children: [card, card] })}
      ${Card({ variant: "panel", children: html`<div class="tw-stack tw-gap-3">${Skeleton({ shape: "title", width: 40 })}${Skeleton({ shape: "block", className: "tw-skeleton--tall" })}</div>` })}
    </div>
    ${Grid({ gap: "3-5", className: "tw-grid--quad tw-mt-6", children: [tile, tile, tile, tile] })}
  </div>`;
}

/** @param {{ message: string }} props */
export function ExplorerError({ message }) {
  return Alert({
    tone: "danger",
    icon: true,
    message,
    action: Button({ label: "Reintentar", variant: "ghost", size: "sm", icon: "refresh", attrs: { "data-action": "retry" } }),
  });
}

/**
 * Sección completa (SSR).
 * @param {{ explorer: ExplorerResult, categories: CategoryRef[], eyebrow: string, title: string }} props
 */
export function ExplorerSection({ explorer, categories, eyebrow, title }) {
  return html`<section class="tw-section tw-section--tight" id="calendario" aria-labelledby="calendario-title" data-explorer>
    <div class="tw-container">
      <div class="tw-section-header">
        <div class="tw-section-header__text">
          ${Eyebrow({ children: eyebrow })}
          <h2 class="tw-heading tw-heading--h2" id="calendario-title">${title}</h2>
        </div>
        <div data-explorer-months>${MonthTabs({ months: explorer.months, active: explorer.query.month })}</div>
      </div>
      ${CategoryChips({ categories, selected: explorer.query.categories })}
      <div data-explorer-results>${ExplorerResults({ explorer })}</div>
    </div>
  </section>`;
}
