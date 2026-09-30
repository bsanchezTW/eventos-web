/**
 * Agenda (landing) — mismo orden que el template: hero, stats, calendario, formas de
 * participar y teaser de galería (la banda CTA y el footer los agrega el shell).
 */
import { BRAND, Button, HeroCarousel, Section, SectionHeader, html } from "../../../design-system/index.js";
import { ExplorerSection } from "../components/explorer.js";
import { GalleryTeaser } from "../components/gallery.js";
import { StatBar } from "../components/sections.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { formatCity, formatKickerDate, monthName } from "../domain/format.js";
import { eventHref } from "../domain/links.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/event.js").EventView} EventView */
/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {Awaited<ReturnType<import("../services/event-service.js").EventService["getLandingData"]>>} LandingData */

const calendarButton = () => Button({ label: "Ver calendario", variant: "on-dark", size: "xl", href: "#calendario" });

/**
 * Slides del template: promoción de la agenda, evento destacado y galería.
 * @param {LandingData} landing
 */
function buildSlides(landing) {
  const { promoSlide, gallerySlide } = LANDING_CONTENT;
  const keys = landing.openMonths;
  const range = keys.length ? [keys[0], keys[keys.length - 1]].map((key) => monthName(Number(key.slice(5))).slice(0, 3).toUpperCase()) : [];
  const image = { src: BRAND.heroImage };

  const slides = [
    {
      id: "agenda",
      kicker: range.length ? `${promoSlide.kicker} · ${[...new Set(range)].join("–")}` : promoSlide.kicker,
      title: promoSlide.title,
      body: promoSlide.body,
      image,
      actions: html`${Button({ label: promoSlide.cta, variant: "accent", size: "xl", href: "#calendario" })}${calendarButton()}`,
    },
  ];

  const event = landing.heroEvent;
  if (event) {
    const place = (event.location.label ?? formatCity(event)).split(",")[0];
    slides.push({
      id: event.id,
      kicker: `${formatKickerDate(event)} · ${place}`,
      title: event.heroTitle ?? event.title,
      body: event.capacity ? `${event.summary} ${event.capacity} cupos.` : event.summary,
      image: event.image ? { src: event.image } : image,
      actions: html`${Button({ label: event.kind === "principal" ? "Ver programa completo" : "Inscribirme a esta fecha", variant: "accent", size: "xl", href: eventHref(event.id) })}${calendarButton()}`,
    });
  }

  slides.push({
    id: "galeria",
    kicker: gallerySlide.kicker,
    title: gallerySlide.title,
    body: gallerySlide.body,
    image,
    actions: html`${Button({ label: gallerySlide.cta, variant: "accent", size: "xl", href: "/galeria" })}${calendarButton()}`,
  });
  return slides;
}

/**
 * @param {{ landing: LandingData, explorer: ExplorerResult, teaser: import("../domain/gallery.js").Album[], categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderLandingPage({ landing, explorer, teaser, categories, canonical }) {
  const content = LANDING_CONTENT;

  const main = html`
    ${HeroCarousel({ label: "Destacados de la agenda", title: content.heroTitle, slides: buildSlides(landing) })}
    ${StatBar({ stats: landing.stats })}
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
            ${GalleryTeaser({ albums: teaser })}`,
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
