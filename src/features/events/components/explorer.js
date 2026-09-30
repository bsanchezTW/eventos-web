/**
 * Calendario de la agenda (template): pestañas de mes, chips de línea de producto,
 * calendario + próximas fechas y "Ver todos los eventos".
 * `ExplorerResults` se re-renderiza en el navegador al cambiar filtros.
 */
import { Alert, Button, Card, Chip, Cluster, EmptyState, Eyebrow, Grid, MonthCalendar, SegmentedControl, Skeleton, Stack, html } from "../../../design-system/index.js";
import { hasActiveFilters } from "../domain/explorer.js";
import { monthName } from "../domain/format.js";
import { EventCard } from "./event-card.js";

/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {{ id: string, name: string }} CategoryRef */

/** Tarjetas junto al calendario (template: 2, estiradas a su altura). */
export const MONTH_LIST_LIMIT = 2;
export const SEASON_LIST_ID = "temporada";

/** @param {{ months: ExplorerResult["months"], active: string | null }} props */
export function MonthTabs({ months, active }) {
  return SegmentedControl({
    label: "Mes",
    items: months.map((m) => ({ label: m.label, shortLabel: m.label.slice(0, 3), value: m.key, active: m.key === active, attrs: { "data-month": m.key } })),
  });
}

/** @param {{ categories: CategoryRef[], selected: string[] }} props */
export function CategoryChips({ categories, selected }) {
  return html`<div class="tw-cluster tw-gap-2" role="group" aria-label="Líneas de producto" data-explorer-chips>
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
      selected: selectedDay ? Number(selectedDay.slice(8)) : null,
      today: calendar.today,
      dayLabel: (day, count) => `${day} de ${lower}: ${count} ${count === 1 ? "evento" : "eventos"}`,
      legend: [{ label: "Con evento" }, { label: "Seleccionado", tone: "brand" }],
      attrs: { "data-explorer-calendar": "" },
    }),
  });
}

/** @param {{ explorer: ExplorerResult }} props */
function MonthEmpty({ explorer }) {
  const clear = hasActiveFilters(explorer.query) ? Button({ label: "Limpiar filtros", variant: "soft-accent", attrs: { "data-action": "clear-filters" } }) : "";
  const alternatives = explorer.alternatives.map((m) => Button({ label: `Ver ${m.label.toLowerCase()} (${m.count})`, variant: "ghost", attrs: { "data-month": m.key } }));
  return EmptyState({
    title: "Sin fechas para este filtro",
    text: "Prueba con otro mes o quita los filtros de línea de producto.",
    action: Cluster({ className: "tw-cluster--center", children: html`${clear}${alternatives}` }),
  });
}

/** Región dinámica: calendario + fechas del mes + temporada completa. @param {{ explorer: ExplorerResult }} props */
export function ExplorerResults({ explorer }) {
  const { calendar, monthItems, seasonItems, query, total } = explorer;
  const visible = monthItems.slice(0, MONTH_LIST_LIMIT);
  const summary = `${total} ${total === 1 ? "evento encontrado" : "eventos encontrados"}${calendar ? `; ${monthItems.length} en ${calendar.title}` : ""}.`;

  return html`<p class="tw-sr-only" role="status">${summary}</p>
    ${Grid({
      min: 360,
      gap: "5-5",
      children: html`${calendar ? CalendarPanel({ calendar, selectedDay: query.day }) : ""}
        ${Stack({ gap: "3-5", between: true, children: visible.length ? visible.map((event) => EventCard({ event })) : MonthEmpty({ explorer }) })}`,
    })}
    ${Button({
      label: query.all ? "Ver menos" : `Ver todos los eventos (${total})`,
      variant: "outline-invert",
      size: "2xl",
      block: true,
      className: "tw-mt-4",
      attrs: { "data-action": "toggle-season", "aria-expanded": String(query.all), "aria-controls": SEASON_LIST_ID },
    })}
    <div id="${SEASON_LIST_ID}" class="tw-mt-4-5 tw-animate-up" ${query.all ? "" : "hidden"}>
      ${query.all
        ? html`${Eyebrow({ children: "Toda la temporada", as: "p", className: "tw-mb-3-5" })}
          ${Grid({ min: 420, gap: "3-5", as: "ul", children: seasonItems.map((event) => EventCard({ event, as: "li" })) })}`
        : ""}
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
    ${Grid({
      min: 360,
      gap: "5-5",
      children: html`${Card({ variant: "panel", children: html`<div class="tw-stack tw-gap-3">${Skeleton({ shape: "title", width: 40 })}${Skeleton({ shape: "block", className: "tw-skeleton--tall" })}</div>` })}
        ${Stack({ gap: "3-5", between: true, children: [card, card] })}`,
    })}
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
      <div class="tw-mb-5-5">${CategoryChips({ categories, selected: explorer.query.categories })}</div>
      <div data-explorer-results>${ExplorerResults({ explorer })}</div>
    </div>
  </section>`;
}
