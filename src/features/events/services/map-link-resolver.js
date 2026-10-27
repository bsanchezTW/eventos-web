/**
 * Resuelve los enlaces cortos de Google Maps (`https://maps.app.goo.gl/…`, el que da "Compartir")
 * al enlace largo, que sí dice el lugar y sus coordenadas. Solo en el servidor: el navegador no
 * puede seguir esa redirección (CORS) y así el staff solo pega el enlace en la app.
 *
 * Sigue las redirecciones a mano y solo dentro de Google. Guarda el resultado en memoria (los
 * enlaces cortos no cambian de destino). Si Google no responde, devuelve null y la página arma
 * el mapa con la dirección del evento.
 */
import { googleMapsLink, isShortMapsLink } from "../domain/maps.js";

const MAX_HOPS = 5;

/**
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, maxEntries?: number, logger?: Pick<Console, "warn"> }} [options]
 */
export function createMapLinkResolver({ fetchImpl = fetch, timeoutMs = 4000, maxEntries = 500, logger = console } = {}) {
  /** @type {Map<string, Promise<string | null>>} */
  const cache = new Map();

  /** @param {string} link */
  async function follow(link) {
    let current = link;
    for (let hop = 0; hop < MAX_HOPS && isShortMapsLink(current); hop++) {
      const res = await fetchImpl(current, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
      const location = res.headers.get("location");
      if (!location) return null;
      const next = new URL(location, current);
      // Fuera de Chile/Perú Google puede pasar por la página de consentimiento: el destino va en `continue`.
      current = next.hostname === "consent.google.com" ? (next.searchParams.get("continue") ?? "") : next.href;
    }
    const resolved = googleMapsLink(current);
    return resolved && !isShortMapsLink(resolved) ? resolved : null;
  }

  return {
    /**
     * Enlace largo de Google Maps, el mismo enlace si ya era largo, o null si no se pudo resolver.
     * @param {string} link
     * @returns {Promise<string | null>}
     */
    resolve(link) {
      if (!isShortMapsLink(link)) return Promise.resolve(link);
      const hit = cache.get(link);
      if (hit) return hit;
      const pending = follow(link).catch((/** @type {unknown} */ error) => {
        logger.warn(`[mapas] No se pudo resolver ${link}: ${error instanceof Error ? error.message : error}`);
        cache.delete(link);
        return null;
      });
      if (cache.size >= maxEntries) cache.delete(/** @type {string} */ (cache.keys().next().value));
      cache.set(link, pending);
      return pending;
    },
  };
}

/** @typedef {ReturnType<typeof createMapLinkResolver>} MapLinkResolver */
