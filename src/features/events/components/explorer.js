/**
 * Agenda: una sola lista de eventos con el calendario al lado. Las pestañas de mes ("Todos" y
 * los meses desde el actual), los chips de línea y el calendario solo filtran la lista; los
 * realizados quedan plegados al final. Ningún evento aparece dos veces.
 * `ExplorerResults` se re-renderiza en el navegador al cambiar filtros.
 */
import { Alert, Button, Card, Chip, Cluster, EmptyState, Eyebrow, MonthCalendar, SegmentedControl, Skeleton, Stack, html } from "../../../design-system/index.js";
import { hasActiveFilters } from "../domain/explorer.js";
import { monthName } from "../domain/format.js";
import { EventCard } from "./event-card.js";

/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {{ id: string, name: string }} CategoryRef */

export const PAST_LIST_ID = "realizados";

/** "Todos" (sin mes: los próximos) y los meses desde el actual. @param {{ months: ExplorerResult["months"], active: string | null }} props */
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
  const { query, monthExplicit, alternatives, past } = explorer;
  const clear = hasActiveFilters(query) ? Button({ label: "Limpiar filtros", variant: "soft-accent", attrs: { "data-action": "clear-filters" } }) : "";
  const others = alternatives.map((m) => Button({ label: `Ver ${m.label.toLowerCase()} (${m.count})`, variant: "ghost", attrs: { "data-month": m.key } }));
  return EmptyState({
    title: monthExplicit ? "Sin fechas para este filtro" : "Pronto publicaremos nuevas fechas",
    text: monthExplicit
      ? "Prueba con otro mes o quita los filtros de línea de producto."
      : past.length
        ? "Mientras tanto, revisa los eventos que ya realizamos."
        : "Vuelve a visitarnos en unos días.",
    action: clear || others.length ? Cluster({ className: "tw-cluster--center", children: html`${clear}${others}` }) : undefined,
  });
}

/** @param {{ events: ExplorerResult["items"], id?: string, hidden?: boolean }} props */
const EventList = ({ events, id, hidden = false }) =>
  html`<ul class="tw-stack tw-gap-3-5" role="list"${id ? html` id="${id}"` : ""}${hidden ? " hidden" : ""}>
    ${events.map((event) => EventCard({ event, as: "li" }))}
  </ul>`;

/** Lista + realizados plegados + calendario. @param {{ explorer: ExplorerResult }} props */
export function ExplorerResults({ explorer }) {
  const { calendar, items, past, query, total } = explorer;
  const summary = `${items.length} ${items.length === 1 ? "evento" : "eventos"} en la lista; ${total} en total.`;

  return html`<p class="tw-sr-only" role="status">${summary}</p>
    <div class="tw-split">
      <div class="tw-stack tw-gap-5-5">
        ${items.length ? EventList({ events: items }) : ListEmpty({ explorer })}
        ${past.length
          ? html`<div>
              ${Button({
                label: query.all ? "Ocultar eventos realizados" : `Ver eventos realizados (${past.length})`,
                variant: "outline",
                block: true,
                icon: query.all ? undefined : "chevron-down",
                attrs: { "data-action": "toggle-past", "aria-expanded": String(query.all), "aria-controls": PAST_LIST_ID },
              })}
              <div class="tw-mt-4">${EventList({ events: query.all ? past : [], id: PAST_LIST_ID, hidden: !query.all })}</div>
            </div>`
          : ""}
      </div>
      ${calendar ? html`<aside class="tw-split__aside" aria-label="Calendario">${CalendarPanel({ calendar, selectedDay: query.day })}</aside>` : ""}
    </div>`;
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
  return html`<div aria-busy="true">
    <p class="tw-sr-only" role="status">Cargando eventos…</p>
    <div class="tw-split">
      ${Stack({ gap: "3-5", children: [card, card, card] })}
      ${Card({ variant: "panel", children: html`<div class="tw-stack tw-gap-3">${Skeleton({ shape: "title", width: 40 })}${Skeleton({ shape: "block", className: "tw-skeleton--tall" })}</div>` })}
    </div>
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
