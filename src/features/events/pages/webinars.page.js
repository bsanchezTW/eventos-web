/**
 * Webinars (template): banda navy de cabecera + lista de transmisiones en vivo y grabadas.
 */
import { Button, CtaBand, EmptyState, Section, html } from "../../../design-system/index.js";
import { WebinarRow } from "../components/sections.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/**
 * @param {{ webinars: { upcoming: EventView[], recorded: EventView[] }, categories: Array<{ id: string, name: string }> }} props
 */
export function renderWebinarsPage({ webinars, categories }) {
  const page = LANDING_CONTENT.webinarsPage;
  const rows = [
    ...webinars.upcoming.map((event) => WebinarRow({ event })),
    ...webinars.recorded.map((event, i) => WebinarRow({ event, id: i === 0 ? "grabaciones" : undefined })),
  ];

  const main = Section({
    spacing: "page",
    children: html`${CtaBand({
        tone: "brand",
        size: "lg",
        headingLevel: 1,
        eyebrow: page.eyebrow,
        title: page.heading,
        text: page.text,
        action: Button({ label: page.cta, variant: "accent", size: "lg", href: "#suscribirme", attrs: { "data-tw-modal-open": "suscribirme" } }),
      })}
      <div class="tw-mt-6">
        ${rows.length
          ? html`<ul class="tw-stack tw-gap-3" role="list">${rows}</ul>`
          : EmptyState({ title: "Pronto anunciaremos nuevos webinars", text: "Activa los avisos y te escribimos cuando abramos inscripciones." })}
      </div>`,
  });

  return renderPage({ title: page.title, description: page.text, categories, activeNav: "webinars", main });
}
