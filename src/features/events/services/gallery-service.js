/**
 * Casos de uso de la galería (páginas /galeria, /galeria/:slug y teaser de la landing).
 */
import { groupAlbumsByCountry } from "../domain/gallery.js";

/** @typedef {import("./gallery-repository.js").GalleryRepository} GalleryRepository */
/** @typedef {{ album: import("../domain/gallery.js").Album, item: import("../domain/gallery.js").MediaItem }} Tile */

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
     * Galería para la landing: fotos de muestra (primero la portada de cada álbum, más recientes
     * primero; si faltan, más fotos de esos álbumes) y cifras reales. Si la galería no responde,
     * la landing sigue sin estas piezas.
     * @param {number} [limit]
     * @returns {Promise<{ tiles: Tile[], photos: number, albums: number }>}
     */
    async getLandingGallery(limit = 5) {
      try {
        const albums = await repository.listAlbums();
        const withPreviews = albums.filter((a) => a.previews.length);
        /** @type {Tile[]} */
        const tiles = [];
        for (let round = 0; tiles.length < limit && withPreviews.some((a) => a.previews[round]); round++) {
          for (const album of withPreviews) {
            const item = album.previews[round];
            if (item && tiles.length < limit) tiles.push({ album, item });
          }
        }
        return { tiles, photos: albums.reduce((sum, a) => sum + a.photos, 0), albums: albums.length };
      } catch (error) {
        logger.warn(`[galeria] Landing sin galería: ${/** @type {Error} */ (error).message}`);
        return { tiles: [], photos: 0, albums: 0 };
      }
    },

    /** Fotos de muestra para el teaser (ver getLandingGallery). @param {number} [limit] */
    async getTeaser(limit = 4) {
      return (await this.getLandingGallery(limit)).tiles;
    },
  };
}

/** @typedef {ReturnType<typeof createGalleryService>} GalleryService */
