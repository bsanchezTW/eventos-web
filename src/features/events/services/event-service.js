/**
 * Casos de uso de la agenda. Única puerta de entrada a los datos para páginas y API.
 */
import { toEventViews } from "../domain/event.js";
import { buildExplorer, isListable, sortEvents } from "../domain/explorer.js";
import { eventMonthKey, formatShortDate, modalityLabel } from "../domain/format.js";

/** @typedef {import("../domain/event.js").EventView} EventView */
/** @typedef {import("../domain/event.js").Category} Category */
/** @typedef {import("../domain/explorer.js").ExplorerQuery} ExplorerQuery */
/** @typedef {import("./event-repository.js").EventRepository} EventRepository */

/**
 * @param {{ repository: EventRepository, now?: () => Date }} deps
 */
export function createEventService({ repository, now = () => new Date() }) {
  async function loadViews() {
    const [events, categories] = await Promise.all([repository.listEvents(), repository.listCategories()]);
    return { views: toEventViews(events, { now: now(), categories }), categories };
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

    /**
     * Datos de la landing (excepto el explorador): evento del hero y stats.
     * @param {{ formatsLabel?: string }} [options] texto editorial para "Formatos" (si no, se deriva)
     */
    async getLandingData({ formatsLabel } = {}) {
      const { views } = await loadViews();
      const open = sortEvents(views.filter((e) => e.status === "upcoming" || e.status === "live"), "fecha").filter(isListable);

      const heroEvent = open.find((e) => e.featured && e.status === "upcoming") ?? null;
      const next = open.find((e) => e.status === "upcoming") ?? open[0];
      const cities = [...new Set(open.filter((e) => !e.location.online).map((e) => e.location.city))];
      const stats = [
        { label: "Próxima fecha", value: next ? formatShortDate(next) : "Por anunciar" },
        { label: "Formatos", value: formatsLabel ?? ([...new Set(open.map(modalityLabel))].join(" · ") || "—") },
        { label: "Sedes", value: cities.join(" · ") || "Online" },
      ];

      // Meses con inscripciones abiertas (eventos por comenzar), para el kicker del hero.
      const openMonths = [...new Set(open.filter((e) => e.status === "upcoming").map(eventMonthKey))].sort();

      return { heroEvent, stats, openMonths };
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
      const event = views.find((e) => e.id === id);
      if (!event) return null;
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
