/**
 * Repositorios de eventos. La UI y el servicio solo conocen la interfaz `EventRepository`;
 * cambiar de datos mock a una API real es cuestión de configuración (EVENTS_SOURCE).
 *
 *   UI → EventService → EventRepository → (mock | API | Supabase NEXUS)
 */
import { CATEGORIES } from "../data/categories.mock.js";
import { EVENTS } from "../data/events.mock.js";
import { normalizeEvent } from "../domain/event.js";
import { RepositoryError } from "./errors.js";
import { createSupabaseEventRepository } from "./supabase-event-repository.js";

export { RepositoryError };

/** @typedef {import("../domain/event.js").Event} Event */
/** @typedef {import("../domain/event.js").Category} Category */

/**
 * @typedef {object} EventRepository
 * @property {() => Promise<Event[]>} listEvents
 * @property {(id: string) => Promise<Event | null>} getEvent
 * @property {() => Promise<Category[]>} listCategories
 * @property {() => void} [invalidate]  descarta la caché (p. ej. tras una inscripción, para refrescar cupos)
 */

/**
 * Datos en memoria. `latencyMs` simula red para probar estados de carga.
 * @param {{ events?: Array<Record<string, any>>, categories?: Category[], latencyMs?: number }} [options]
 * @returns {EventRepository}
 */
export function createMockEventRepository({ events = EVENTS, categories = CATEGORIES, latencyMs = 0 } = {}) {
  const normalized = events.map(normalizeEvent);
  const byId = new Map(normalized.map((e) => [e.id, e]));
  const delay = () => (latencyMs > 0 ? new Promise((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve());

  return {
    async listEvents() {
      await delay();
      return normalized.map((e) => structuredClone(e));
    },
    async getEvent(id) {
      await delay();
      const event = byId.get(id);
      return event ? structuredClone(event) : null;
    },
    async listCategories() {
      await delay();
      return categories.map((c) => ({ ...c }));
    },
  };
}

/**
 * Repositorio HTTP. Contrato esperado del backend:
 *   GET {baseUrl}/events           → Event[]  (o { data: Event[] })
 *   GET {baseUrl}/events/:id       → Event    (404 si no existe)
 *   GET {baseUrl}/categories       → Category[]
 * Cada evento pasa por `normalizeEvent`; los inválidos se descartan con un warning.
 *
 * @param {{ baseUrl: string, fetchImpl?: typeof fetch, timeoutMs?: number, headers?: Record<string, string>, logger?: Pick<Console, "warn"> }} options
 * @returns {EventRepository}
 */
export function createApiEventRepository({ baseUrl, fetchImpl = fetch, timeoutMs = 5000, headers = {}, logger = console }) {
  const root = baseUrl.replace(/\/+$/, "");

  /** @param {string} path */
  async function request(path) {
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      throw new RepositoryError(`No se pudo conectar con la API de eventos (${path})`, { cause });
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new RepositoryError(`La API de eventos respondió ${response.status} (${path})`, { status: response.status });
    const body = await response.json();
    return body && typeof body === "object" && "data" in body ? body.data : body;
  }

  /** @param {any} raw */
  const safeNormalize = (raw) => {
    try {
      return normalizeEvent(raw);
    } catch (error) {
      logger.warn(`[eventos] Evento descartado: ${/** @type {Error} */ (error).message}`);
      return null;
    }
  };

  return {
    async listEvents() {
      const list = await request("/events");
      return (Array.isArray(list) ? list : []).map(safeNormalize).filter((e) => e !== null);
    },
    async getEvent(id) {
      const raw = await request(`/events/${encodeURIComponent(id)}`);
      return raw ? safeNormalize(raw) : null;
    },
    async listCategories() {
      const list = await request("/categories");
      return Array.isArray(list) ? list : [];
    },
  };
}

/**
 * @param {{ source?: string, apiUrl?: string, latencyMs?: number, rpc?: import("./supabase-rpc.js").SupabaseRpc | null, cacheTtlMs?: number }} config
 * @returns {EventRepository}
 */
export function createEventRepository({ source = "mock", apiUrl, latencyMs, rpc, cacheTtlMs } = {}) {
  if (source === "supabase") {
    if (!rpc) throw new Error("EVENTS_SOURCE=supabase requiere SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY");
    return createSupabaseEventRepository({ rpc, cacheTtlMs });
  }
  if (source === "api") {
    if (!apiUrl) throw new Error("EVENTS_SOURCE=api requiere EVENTS_API_URL");
    return createApiEventRepository({ baseUrl: apiUrl });
  }
  return createMockEventRepository({ latencyMs });
}
