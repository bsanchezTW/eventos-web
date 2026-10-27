/**
 * Casos de uso de la agenda. Única puerta de entrada a los datos para páginas y API.
 */
import { toEventViews } from "../domain/event.js";
import { buildExplorer, isListable, sortEvents } from "../domain/explorer.js";
import { embeddableMapUrl } from "../domain/maps.js";

/** @typedef {import("../domain/event.js").EventView} EventView */
/** @typedef {import("../domain/event.js").Category} Category */
/** @typedef {import("../domain/explorer.js").ExplorerQuery} ExplorerQuery */
/** @typedef {import("./event-repository.js").EventRepository} EventRepository */
/** @typedef {import("./map-link-resolver.js").MapLinkResolver} MapLinkResolver */

/**
 * @param {{ repository: EventRepository, mapLinks?: MapLinkResolver, now?: () => Date }} deps
 */
export function createEventService({ repository, mapLinks, now = () => new Date() }) {
  async function loadViews() {
    const [events, categories] = await Promise.all([repository.listEvents(), repository.listCategories()]);
    return { views: toEventViews(events, { now: now(), categories }), categories };
  }

  /**
   * El enlace corto de "Compartir" no dice el lugar: se resuelve aquí para armar el mapa del detalle.
   * @param {EventView} event
   */
  async function withResolvedMap(event) {
    if (event.mapUrl || !event.mapLink || !mapLinks) return event;
    const mapUrl = embeddableMapUrl(await mapLinks.resolve(event.mapLink));
    return mapUrl ? { ...event, mapUrl } : event;
  }

  return {
    async listCategories() {
      return repository.listCategories();
    },

    /** @param {ExplorerQuery} query */
    async explore(query) {
      const { views } = await loadViews();
      return buildExplorer(views, query, { now: now() });
    },

    /** Hero de la landing: `nextEvent`, el destacado por comenzar o, si no hay, el próximo. */
    async getLandingData() {
      const { views } = await loadViews();
      const open = sortEvents(views.filter((e) => isListable(e) && (e.status === "upcoming" || e.status === "live")), "fecha");
      const nextEvent = open.find((e) => e.featured && e.status === "upcoming") ?? open.find((e) => e.status === "upcoming") ?? open[0] ?? null;
      return { nextEvent };
    },

    /** Webinars: próximos (por fecha) y grabaciones (más recientes primero). */
    async getWebinars() {
      const { views } = await loadViews();
      const webinars = views.filter((e) => e.modality === "webinar" && e.status !== "cancelled");
      const upcoming = sortEvents(webinars.filter((e) => e.status !== "finished"), "fecha");
      const recorded = webinars.filter((e) => e.status === "finished").sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
      return { upcoming, recorded };
    },

    /**
     * Detalle con evento padre (si es taller) y sub-eventos (si es principal).
     * @param {string} id
     */
    async getEventDetail(id) {
      const { views } = await loadViews();
      const found = views.find((e) => e.id === id);
      if (!found) return null;
      const event = await withResolvedMap(found);
      const parent = event.parentId ? (views.find((e) => e.id === event.parentId) ?? null) : null;
      const children = sortEvents(views.filter((e) => e.parentId === event.id), "fecha");
      return { event, parent, children };
    },

    /** @param {string} id @returns {Promise<EventView | null>} */
    async getEvent(id) {
      const { views } = await loadViews();
      return views.find((e) => e.id === id) ?? null;
    },
  };
}

/** @typedef {ReturnType<typeof createEventService>} EventService */
