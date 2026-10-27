/**
 * Agenda (landing): hero compacto con el próximo evento, la lista de eventos con su calendario
 * y el teaser de galería. Cada cosa aparece una sola vez: el hero muestra el próximo evento y la
 * lista los demás filtros; no hay carrusel ni cifras que repitan lo mismo.
 */
import { BRAND, Banner, Button, Section, SectionHeader, html } from "../../../design-system/index.js";
import { EventBadges } from "../components/event-card.js";
import { ExplorerSection } from "../components/explorer.js";
import { GalleryTeaser } from "../components/gallery.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { hasOwnImage, isRegistrationOpen } from "../domain/event.js";
import { formatLongDate, formatPlace, formatSchedule } from "../domain/format.js";
import { eventHref } from "../domain/links.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {Awaited<ReturnType<import("../services/event-service.js").EventService["getLandingData"]>>} LandingData */
/** @typedef {Awaited<ReturnType<import("../services/gallery-service.js").GalleryService["getLandingGallery"]>>} LandingGallery */

const TEASER_TILES = 4;

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
    image: { src: hasOwnImage(next) ? next.image : BRAND.heroImage },
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
 * @param {{ landing: LandingData, gallery: LandingGallery, explorer: ExplorerResult, categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderLandingPage({ landing, gallery, explorer, categories, canonical }) {
  const content = LANDING_CONTENT;
  const teaser = gallery.tiles.slice(0, TEASER_TILES);

  const main = html`
    ${Section({
      spacing: "compact",
      labelledBy: "agenda-title",
      children: html`<h1 class="tw-sr-only" id="agenda-title">${content.heroTitle}</h1>${Hero(landing)}`,
    })}
    ${ExplorerSection({ explorer, categories, eyebrow: content.calendar.eyebrow, title: content.calendar.title })}
    ${teaser.length
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
            ${GalleryTeaser({ tiles: teaser })}`,
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
