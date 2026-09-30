/**
 * Repositorios de la galería. Dos implementaciones con el mismo contrato:
 * - Mock: álbumes de ejemplo con placeholders (desarrollo, sin intranet).
 * - Intranet: galería de la intranet (proyecto Supabase INTRANET, compartido por Chile y Perú).
 *
 * Intranet, solo lectura con la clave publicable (rol anon), nunca la secreta:
 *   rpc galeria_web()                          álbumes con "Mostrar en la web" y sus archivos
 *   POST /storage/v1/object/sign/<bucket>      URLs firmadas (los buckets son privados); la
 *                                              política galeria_web_lectura solo firma esos álbumes
 * Las fotos originales pesan varios MB: la grilla usa miniaturas con transformación de imagen
 * de Supabase y, si el proyecto no la tiene, cae al original.
 * SQL de la intranet: intranet-web/supabase/shared/schema.sql (sección "Web pública de eventos").
 */
import { ALBUMS } from "../data/gallery.mock.js";
import { countryName } from "../domain/gallery.js";
import { RepositoryError } from "./errors.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

/**
 * @typedef {object} GalleryRepository
 * @property {() => Promise<Album[]>} listAlbums  más recientes primero
 * @property {(slug: string) => Promise<{ album: Album, items: MediaItem[] } | null>} getAlbum
 */

/** @param {MediaItem[]} items */
const counts = (items) => ({ photos: items.filter((i) => i.type === "foto").length, videos: items.filter((i) => i.type === "video").length });

/**
 * @param {{ albums?: typeof ALBUMS }} [options]
 * @returns {GalleryRepository}
 */
export function createMockGalleryRepository({ albums = ALBUMS } = {}) {
  /** @param {(typeof ALBUMS)[number]} a @returns {Album} */
  const toAlbum = (a) => ({ slug: a.slug, title: a.title, description: a.description, country: a.country, cover: a.items.find((i) => i.type === "foto") ?? null, ...counts(a.items) });
  return {
    async listAlbums() {
      return albums.map(toAlbum);
    },
    async getAlbum(slug) {
      const found = albums.find((a) => a.slug === slug);
      return found ? { album: toAlbum(found), items: found.items.map((i) => ({ ...i })) } : null;
    },
  };
}

/**
 * @typedef {object} RawFile
 * @property {string} bucket
 * @property {string} ruta
 * @property {string} tipo   mimetype
 */

/**
 * @typedef {object} RawAlbum  fila de galeria_web()
 * @property {string} slug
 * @property {string} nombre
 * @property {string | null} descripcion
 * @property {string} pais
 * @property {string | null} portada  "/content/eventos/<slug>/<archivo>" (ruta de la intranet)
 * @property {RawFile[]} archivos
 */

/** @param {string} mime @returns {"foto" | "video" | null} */
const mediaType = (mime) => (mime.startsWith("image/") ? "foto" : mime.startsWith("video/") ? "video" : null);

/** Portada guardada por la intranet ("/content/eventos/…", segmentos codificados) → archivo del álbum. @param {RawAlbum} raw */
export function coverFile(raw) {
  const photos = raw.archivos.filter((f) => mediaType(f.tipo) === "foto");
  let path = "";
  try {
    path = decodeURIComponent(String(raw.portada ?? "").replace(/^\/content\//, ""));
  } catch {
    path = "";
  }
  return photos.find((f) => f.ruta === path) ?? photos[0] ?? null;
}

/**
 * Ejecuta `fn` sobre la lista con a lo más `limit` promesas a la vez.
 * @template T, R
 * @param {T[]} list @param {number} limit @param {(item: T) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapLimit(list, limit, fn) {
  const out = /** @type {R[]} */ (new Array(list.length));
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

/**
 * @param {{
 *   url: string,
 *   key: string,
 *   rpc: import("./supabase-rpc.js").SupabaseRpc,
 *   fetchImpl?: typeof fetch,
 *   cacheTtlMs?: number,
 *   signExpiresS?: number,
 *   thumbWidth?: number,
 *   concurrency?: number,
 *   clock?: () => number,
 *   logger?: Pick<Console, "warn">,
 * }} options
 * @returns {GalleryRepository}
 */
export function createIntranetGalleryRepository({
  url,
  key,
  rpc,
  fetchImpl = fetch,
  cacheTtlMs = 600_000,
  signExpiresS = 21_600,
  thumbWidth = 640,
  concurrency = 8,
  clock = Date.now,
  logger = console,
}) {
  const storage = `${url.replace(/\/+$/, "")}/storage/v1`;
  const encodePath = (/** @type {string} */ path) => path.split("/").map(encodeURIComponent).join("/");
  // Se vuelve a intentar en cada recarga de la lista: un fallo puntual no deja la grilla sin miniaturas.
  let transformsAvailable = true;

  /** @param {string} path @param {unknown} body */
  async function post(path, body) {
    let response;
    try {
      response = await fetchImpl(`${storage}${path}`, {
        method: "POST",
        headers: { apikey: key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new RepositoryError("No se pudo conectar con la galería", { cause });
    }
    return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
  }

  /** URLs firmadas a tamaño completo, en lotes por bucket. @param {RawFile[]} files @returns {Promise<Map<string, string>>} */
  async function signFull(files) {
    /** @type {Map<string, string>} */
    const urls = new Map();
    /** @type {Map<string, RawFile[]>} */
    const byBucket = new Map();
    for (const file of files) byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file]);
    for (const [bucket, list] of byBucket) {
      for (let i = 0; i < list.length; i += 100) {
        const paths = list.slice(i, i + 100).map((f) => f.ruta);
        const res = await post(`/object/sign/${encodeURIComponent(bucket)}`, { expiresIn: signExpiresS, paths });
        if (!res.ok || !Array.isArray(res.json)) throw new RepositoryError(`La galería respondió ${res.status} al firmar archivos`, { status: res.status });
        for (const row of res.json) if (row?.signedURL) urls.set(`${bucket}/${row.path}`, `${storage}${row.signedURL}`);
      }
    }
    return urls;
  }

  /** Miniatura firmada (transformación de imagen) o null si no se pudo. @param {RawFile} file */
  async function signThumb(file) {
    if (!transformsAvailable) return null;
    const res = await post(`/object/sign/${encodeURIComponent(file.bucket)}/${encodePath(file.ruta)}`, {
      expiresIn: signExpiresS,
      transform: { width: thumbWidth, quality: 70 },
    });
    const signed = res.ok && res.json && typeof res.json.signedURL === "string" ? res.json.signedURL : null;
    if (!signed) {
      transformsAvailable = false;
      logger.warn(`[galeria] Sin miniaturas (transformación de imagen no disponible, ${res.status}); se usan los originales.`);
      return null;
    }
    return `${storage}${signed}`;
  }

  /** @param {RawFile} file @param {Map<string, string>} full @returns {Promise<MediaItem>} */
  async function toItem(file, full) {
    const type = mediaType(file.tipo) ?? "foto";
    const src = full.get(`${file.bucket}/${file.ruta}`) ?? null;
    const thumb = type === "foto" ? ((await signThumb(file)) ?? src) : null;
    return { id: `${file.bucket}/${file.ruta}`, type, thumb, src, slot: type === "video" ? "[ VIDEO ]" : "[ FOTO ]" };
  }

  /** @param {RawAlbum} raw @param {MediaItem | null} cover @returns {Album} */
  function toAlbum(raw, cover) {
    const files = raw.archivos.filter((f) => mediaType(f.tipo));
    return {
      slug: raw.slug,
      title: String(raw.nombre ?? "").trim(),
      description: String(raw.descripcion ?? "").trim(),
      country: countryName(raw.pais),
      cover,
      photos: files.filter((f) => mediaType(f.tipo) === "foto").length,
      videos: files.filter((f) => mediaType(f.tipo) === "video").length,
    };
  }

  async function loadList() {
    transformsAvailable = true;
    const rows = await rpc("galeria_web");
    const raws = /** @type {RawAlbum[]} */ (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, archivos: Array.isArray(r.archivos) ? r.archivos : [] }));
    const coverFiles = raws.map(coverFile);
    const full = await signFull(coverFiles.filter((f) => f !== null));
    const covers = await mapLimit(coverFiles, concurrency, (f) => (f ? toItem(f, full) : Promise.resolve(null)));
    return raws.map((raw, i) => ({ raw, album: toAlbum(raw, covers[i]) }));
  }

  /** @type {{ at: number, data: ReturnType<typeof loadList> } | null} */
  let listCache = null;
  /** @type {Map<string, { at: number, data: Promise<MediaItem[]> }>} */
  const itemCache = new Map();

  /** @template T @param {{ at: number, data: Promise<T> } | null | undefined} entry */
  const fresh = (entry) => entry && clock() - entry.at < cacheTtlMs;

  function list() {
    if (listCache && fresh(listCache)) return listCache.data;
    const entry = { at: clock(), data: loadList() };
    listCache = entry;
    entry.data.catch(() => {
      if (listCache === entry) listCache = null;
    });
    return entry.data;
  }

  return {
    async listAlbums() {
      return (await list()).map((a) => structuredClone(a.album));
    },
    async getAlbum(slug) {
      const found = (await list()).find((a) => a.raw.slug === slug);
      if (!found) return null;
      let entry = itemCache.get(slug);
      if (!entry || !fresh(entry)) {
        const files = found.raw.archivos.filter((f) => mediaType(f.tipo));
        const data = signFull(files).then((full) => mapLimit(files, concurrency, (f) => toItem(f, full)));
        entry = { at: clock(), data };
        itemCache.set(slug, entry);
        data.catch(() => itemCache.delete(slug));
      }
      return { album: structuredClone(found.album), items: structuredClone(await entry.data) };
    },
  };
}
