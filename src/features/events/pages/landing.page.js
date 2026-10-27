/**
 * Agenda (landing): hero compacto con el próximo evento, la lista de eventos con su calendario
 * y el rollo de fotos de la galería. Cada cosa aparece una sola vez: no hay carrusel de
 * destacados ni cifras que repitan lo mismo.
 */
import { BRAND, Banner, Button, FilmStrip, Section, SectionHeader, html } from "../../../design-system/index.js";
import { EventBadges } from "../components/event-card.js";
import { ExplorerSection } from "../components/explorer.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { hasOwnImage, isRegistrationOpen } from "../domain/event.js";
import { formatLongDate, formatPlace, formatSchedule } from "../domain/format.js";
import { eventImage } from "../domain/images.js";
import { albumHref, eventHref } from "../domain/links.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {Awaited<ReturnType<import("../services/event-service.js").EventService["getLandingData"]>>} LandingData */
/** @typedef {import("../domain/gallery.js").ReelPhoto} ReelPhoto */

/**
 * Próximo evento con su foto (o la de la casa matriz) y su botón; sin próximos, la invitación a
 * revisar la agenda.
 * @param {LandingData} landing
 */
function Hero(landing) {
  const { hero } = LANDING_CONTENT;
  const next = landing.nextEvent;
  const allEvents = Button({ label: hero.allEvents, variant: "on-dark", size: "lg", href: "#calendario" });
  if (!next) {
    return Banner({ image: { src: BRAND.heroImage }, photo: true, title: hero.emptyTitle, text: hero.emptyText, actions: allEvents });
  }
  const open = isRegistrationOpen(next);
  return Banner({
    image: { src: hasOwnImage(next) ? eventImage(next.image, "hero") : BRAND.heroImage },
    photo: true,
    headingLevel: 2,
    badges: EventBadges(next, { onDark: true }),
    kicker: `${hero.kicker} · ${formatLongDate(next)} · ${formatSchedule(next)}`,
    title: next.heroTitle ?? next.title,
    text: formatPlace(next),
    actions: html`${Button({
      label: !open ? "Ver detalle" : next.kind === "principal" ? "Ver programa e inscribirme" : "Inscribirme",
      variant: "accent",
      size: "lg",
      href: eventHref(next.id),
    })}${allEvents}`,
  });
}

/**
 * @param {{ landing: LandingData, reel: ReelPhoto[], explorer: ExplorerResult, categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderLandingPage({ landing, reel, explorer, categories, canonical }) {
  const content = LANDING_CONTENT;

  const main = html`
    ${Section({
      spacing: "compact",
      labelledBy: "agenda-title",
      children: html`<h1 class="tw-sr-only" id="agenda-title">${content.heroTitle}</h1>${Hero(landing)}`,
    })}
    ${ExplorerSection({ explorer, categories, eyebrow: content.calendar.eyebrow, title: content.calendar.title })}
    ${reel.length
      ? Section({
          id: "galeria",
          labelledBy: "galeria-title",
          spacing: "wide",
          children: html`${SectionHeader({
            eyebrow: content.galleryTeaser.eyebrow,
            title: content.galleryTeaser.title,
            id: "galeria-title",
            actions: Button({ label: content.galleryTeaser.action, variant: "outline", href: "/galeria" }),
          })}
            ${FilmStrip({
              label: content.galleryTeaser.reelLabel,
              frames: reel.map(({ album, item }) => ({ src: item.thumb, href: albumHref(album.slug), title: album.title, slot: item.slot })),
            })}`,
        })
      : ""}`;

  return renderPage({
    title: content.meta.title,
    description: content.meta.description,
    canonical,
    image: BRAND.heroImage,
    categories,
    activeNav: "agenda",
    main,
    scripts: ["/features/events/client/landing.js"],
  });
}
