/**
 * Casos de uso de la galería (páginas /galeria, /galeria/:slug y teaser de la landing).
 */
import { groupAlbumsByCountry } from "../domain/gallery.js";

/** @typedef {import("./gallery-repository.js").GalleryRepository} GalleryRepository */

/**
 * @param {{ repository: GalleryRepository, logger?: Pick<Console, "warn"> }} deps
 */
export function createGalleryService({ repository, logger = console }) {
  return {
    async getGallery() {
      const albums = await repository.listAlbums();
      return { albums, groups: groupAlbumsByCountry(albums) };
    },

    /** @param {string} slug */
    async getAlbum(slug) {
      return repository.getAlbum(slug);
    },

    /**
     * Portadas de los álbumes más recientes para la landing. Si la galería no responde,
     * la landing sigue sin esta sección (no es motivo para mostrar un error).
     * @param {number} [limit]
     */
    async getTeaser(limit = 4) {
      try {
        return (await repository.listAlbums()).filter((a) => a.cover).slice(0, limit);
      } catch (error) {
        logger.warn(`[galeria] Teaser sin datos: ${/** @type {Error} */ (error).message}`);
        return [];
      }
    },
  };
}

/** @typedef {ReturnType<typeof createGalleryService>} GalleryService */
