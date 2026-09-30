/**
 * Agenda (landing): hero, cifras, calendario y teaser de galería (la banda CTA y el footer los
 * agrega el shell).
 *
 * El hero y las cifras usan solo información real y no se repiten entre sí: cada diapositiva lleva
 * una foto propia distinta (la del evento o la del álbum, nunca la de otro), y las cifras son
 * totales del año que no repiten nombres ni fechas del hero.
 */
import { BRAND, Button, HeroCarousel, Section, SectionHeader, html } from "../../../design-system/index.js";
import { ExplorerSection } from "../components/explorer.js";
import { GalleryTeaser } from "../components/gallery.js";
import { StatBar } from "../components/sections.js";
import { LANDING_CONTENT } from "../data/landing-content.js";
import { hasOwnImage, isRegistrationOpen } from "../domain/event.js";
import { formatCity, formatKickerDate, formatLongDate, formatPlace, monthName } from "../domain/format.js";
import { mediaCountLabel } from "../domain/gallery.js";
import { albumHref, eventHref } from "../domain/links.js";
import { renderPage } from "./shell.js";

/** @typedef {import("../domain/event.js").EventView} EventView */
/** @typedef {import("../domain/explorer.js").ExplorerResult} ExplorerResult */
/** @typedef {Awaited<ReturnType<import("../services/event-service.js").EventService["getLandingData"]>>} LandingData */
/** @typedef {Awaited<ReturnType<import("../services/gallery-service.js").GalleryService["getLandingGallery"]>>} LandingGallery */

const TEASER_TILES = 4;

const calendarButton = () => Button({ label: "Ver calendario", variant: "on-dark", size: "xl", href: "#calendario" });

/** "Hotel Intercontinental" · "Online". @param {EventView} event */
const shortPlace = (event) => (event.location.label ?? formatCity(event)).split(",")[0];

/**
 * @param {LandingData} landing
 * @param {LandingGallery} gallery
 * @returns {{ slides: Array<{ id: string, kicker: string, title: string, body: string, image: { src: string }, actions: any }>, galleryTileUsed: boolean }}
 */
function buildSlides(landing, gallery) {
  /** @type {Set<string>} */
  const used = new Set();
  /** Reserva una foto para una sola diapositiva. @param {string | null | undefined} src */
  const take = (src) => (src && !used.has(src) ? (used.add(src), { src }) : null);

  const { promoSlide } = LANDING_CONTENT;
  const next = landing.nextEvent;
  // Si el próximo evento no tiene foto propia, usa la de la casa matriz y la promo general sobra.
  const nextImage = next ? (hasOwnImage(next) ? take(next.image) : take(BRAND.heroImage)) : null;
  const promoImage = take(BRAND.heroImage);

  const slides = [];
  if (promoImage) {
    const keys = landing.openMonths;
    const range = keys.length ? [...new Set([keys[0], keys[keys.length - 1]].map((key) => monthName(Number(key.slice(5))).slice(0, 3).toUpperCase()))] : [];
    slides.push({
      id: "agenda",
      kicker: range.length ? `${promoSlide.kicker} · ${range.join("–")}` : "Agenda Transworld",
      title: promoSlide.title,
      body: promoSlide.body,
      image: promoImage,
      actions: html`${Button({ label: promoSlide.cta, variant: "accent", size: "xl", href: "#calendario" })}${calendarButton()}`,
    });
  }

  if (next && nextImage) {
    const open = isRegistrationOpen(next);
    slides.push({
      id: next.id,
      kicker: `${formatKickerDate(next)} · ${shortPlace(next)}`,
      title: next.heroTitle ?? next.title,
      body: next.summary || `Evento en ${formatPlace(next)}.`,
      image: nextImage,
      actions: html`${Button({
        label: !open ? "Ver detalle" : next.kind === "principal" ? "Ver programa e inscribirme" : "Inscribirme a esta fecha",
        variant: "accent",
        size: "xl",
        href: eventHref(next.id),
      })}${calendarButton()}`,
    });
  }

  const past = landing.lastFinished;
  const pastImage = past ? take(past.image) : null;
  if (past && pastImage) {
    slides.push({
      id: past.id,
      kicker: `Realizado · ${formatKickerDate(past)} · ${shortPlace(past)}`,
      title: past.title,
      body: `Se realizó el ${formatLongDate(past).toLowerCase()} en ${formatPlace(past)}.${past.description ? ` ${past.summary}` : ""}`,
      image: pastImage,
      actions: html`${Button({ label: "Ver detalle", variant: "accent", size: "xl", href: eventHref(past.id) })}${calendarButton()}`,
    });
  }

  const cover = gallery.tiles[0];
  const coverImage = cover ? take(cover.item.large ?? cover.item.src) : null;
  if (cover && coverImage) {
    slides.push({
      id: `galeria-${cover.album.slug}`,
      kicker: `Galería · ${mediaCountLabel(cover.album)}`,
      title: cover.album.title,
      body: cover.album.description || `Fotos de ${cover.album.title}, en ${cover.album.country}.`,
      image: coverImage,
      actions: html`${Button({ label: "Ver álbum", variant: "accent", size: "xl", href: albumHref(cover.album.slug) })}${Button({
        label: "Ver galería",
        variant: "on-dark",
        size: "xl",
        href: "/galeria",
      })}`,
    });
  }

  return { slides, galleryTileUsed: Boolean(cover && coverImage) };
}

/**
 * Cifras del año bajo el hero (totales reales; no repiten nombres ni fechas del hero).
 * @param {LandingData} landing
 * @param {LandingGallery} gallery
 */
function buildStats(landing, gallery) {
  const { year, total, finished, countries, openRegistrations } = landing.summary;
  const plural = (/** @type {number} */ n, /** @type {string} */ one, /** @type {string} */ many) => `${n} ${n === 1 ? one : many}`;
  return [
    { label: `Eventos ${year}`, value: total ? `${plural(total, "evento", "eventos")}${countries.length ? ` en ${countries.join(" y ")}` : ""}` : "Por anunciar" },
    { label: "Inscripciones abiertas", value: openRegistrations ? plural(openRegistrations, "evento", "eventos") : "Pronto nuevas fechas" },
    gallery.photos
      ? { label: "Galería", value: `${plural(gallery.photos, "foto publicada", "fotos publicadas")}` }
      : { label: `Realizados ${year}`, value: plural(finished, "evento", "eventos") },
  ];
}

/**
 * @param {{ landing: LandingData, gallery: LandingGallery, explorer: ExplorerResult, categories: Array<{ id: string, name: string }>, canonical?: string }} props
 */
export function renderLandingPage({ landing, gallery, explorer, categories, canonical }) {
  const content = LANDING_CONTENT;
  const { slides, galleryTileUsed } = buildSlides(landing, gallery);
  // La foto del álbum que ya está en el hero no se repite en el teaser.
  const teaser = gallery.tiles.slice(galleryTileUsed ? 1 : 0, (galleryTileUsed ? 1 : 0) + TEASER_TILES);

  const main = html`
    ${HeroCarousel({ label: "Destacados de la agenda", title: content.heroTitle, slides })}
    ${StatBar({ stats: buildStats(landing, gallery) })}
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
