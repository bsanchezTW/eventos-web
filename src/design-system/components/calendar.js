import { attrs, cx, html } from "../utils/html.js";
import { IconButton } from "./button.js";
import { Legend } from "./badge.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Número de días del mes y desfase del primer día (semana que empieza el lunes).
 * @param {number} year
 * @param {number} month 1–12
 */
export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = domingo
  const lead = (first + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { lead, days };
}

/**
 * Calendario mensual del sistema. Solo los días con marca son botones (los demás no
 * reciben foco); el seleccionado usa aria-pressed. Cada botón lleva `data-day` (1–31).
 * `past`: días con marca que ya ocurrieron (se ven en gris).
 * `nav`: botones mes anterior / siguiente junto al título; `null` lo deja deshabilitado.
 *
 * @param {{
 *   year: number, month: number, title: Renderable, titleId?: string,
 *   markers?: Record<number, number>, past?: number[], selected?: number | null, today?: number | null,
 *   nav?: { prev: { label: string, attrs?: Record<string, unknown> } | null, next: { label: string, attrs?: Record<string, unknown> } | null },
 *   dayLabel?: (day: number, count: number) => string,
 *   legend?: Array<{ label: Renderable, tone?: "accent" | "brand" | "muted" }>, attrs?: Record<string, unknown>
 * }} props
 */
export function MonthCalendar({
  year,
  month,
  title,
  titleId,
  markers = {},
  past = [],
  nav,
  selected = null,
  today = null,
  dayLabel = (day, count) => `${day}: ${count} ${count === 1 ? "evento" : "eventos"}`,
  legend,
  attrs: extra,
}) {
  const { lead, days } = monthGrid(year, month);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(html`<span class="tw-calendar__day" aria-hidden="true"></span>`);
  for (let day = 1; day <= days; day++) {
    const count = markers[day] ?? 0;
    const cls = cx("tw-calendar__day", count > 0 && "tw-calendar__day--marked", count > 0 && past.includes(day) && "tw-calendar__day--past", today === day && "tw-calendar__day--today");
    cells.push(
      count > 0
        ? html`<button class="${cls}" type="button"${attrs({ "data-day": day, "aria-pressed": selected === day ? "true" : "false", "aria-label": dayLabel(day, count) })}>${day}</button>`
        : html`<span class="${cls}"${attrs({ "aria-current": today === day ? "date" : null })}>${day}</span>`,
    );
  }

  return html`<div class="tw-calendar"${attrs(extra)}>
    <div class="tw-calendar__header">
      <div class="tw-calendar__title"${attrs({ id: titleId })}>${title}</div>
      ${nav
        ? html`<div class="tw-calendar__nav">
            ${IconButton({ icon: "chevron-left", size: "sm", label: nav.prev?.label ?? "Sin mes anterior", attrs: { disabled: !nav.prev, ...nav.prev?.attrs } })}
            ${IconButton({ icon: "chevron-right", size: "sm", label: nav.next?.label ?? "Sin mes siguiente", attrs: { disabled: !nav.next, ...nav.next?.attrs } })}
          </div>`
        : ""}
    </div>
    <div class="tw-calendar__weekdays" aria-hidden="true">
      ${WEEKDAYS.map((d) => html`<span class="tw-calendar__weekday">${d}</span>`)}
    </div>
    <div class="tw-calendar__grid" role="group"${attrs({ "aria-labelledby": titleId })}>${cells}</div>
    ${legend ? Legend({ items: legend, className: "tw-calendar__legend" }) : ""}
  </div>`;
}
