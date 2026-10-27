/**
 * Casos de uso de la galería (páginas /galeria, /galeria/:slug y rollo de fotos de la landing).
 */
import { ALBUM_PAGE, ALBUM_SLIDES, REEL_SIZE, groupAlbumsByCountry } from "../domain/gallery.js";
import { sample } from "./gallery-repository.js";

/** @typedef {import("./gallery-repository.js").GalleryRepository} GalleryRepository */
/** @typedef {import("../domain/gallery.js").ReelPhoto} ReelPhoto */

/**
 * @param {{ repository: GalleryRepository, logger?: Pick<Console, "warn">, random?: () => number }} deps
 */
export function createGalleryService({ repository, logger = console, random = Math.random }) {
  return {
    async getGallery() {
      const albums = await repository.listAlbums();
      return { albums, groups: groupAlbumsByCountry(albums) };
    },

    /**
     * Álbum por tandas: la página trae la primera y "Ver más" pide las siguientes.
     * @param {string} slug
     * @param {{ offset?: number, limit?: number }} [page]
     */
    async getAlbum(slug, { offset = 0, limit = ALBUM_PAGE } = {}) {
      return repository.getAlbum(slug, { offset, limit: Math.min(Math.max(1, limit), 48) });
    },

    /**
     * Página del álbum: primera tanda del mosaico y fotos del slider de cabecera. Si el slider
     * falla, la página sigue con la portada.
     * @param {string} slug
     */
    async getAlbumPage(slug) {
      const found = await this.getAlbum(slug);
      if (!found) return null;
      const slides = await repository.albumSlides(slug, ALBUM_SLIDES).catch((/** @type {Error} */ error) => {
        logger.warn(`[galeria] Álbum ${slug} sin slider: ${error.message}`);
        return found.album.cover ? [found.album.cover] : [];
      });
      return { ...found, slides };
    },

    /**
     * Rollo de fotos de la landing: `count` fotos al azar de todos los álbumes, en otro orden en
     * cada visita (la muestra la renueva el repositorio). Si la galería no responde, la landing
     * sigue sin el rollo.
     * @param {number} [count]
     * @returns {Promise<ReelPhoto[]>}
     */
    async getReel(count = REEL_SIZE) {
      try {
        return sample(await repository.samplePhotos(count), count, random);
      } catch (error) {
        logger.warn(`[galeria] Landing sin rollo de fotos: ${/** @type {Error} */ (error).message}`);
        return [];
      }
    },
  };
}

/** @typedef {ReturnType<typeof createGalleryService>} GalleryService */
