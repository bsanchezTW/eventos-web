/**
 * Repositorios de la galería. Dos implementaciones con el mismo contrato:
 * - Mock: álbumes de ejemplo con placeholders (desarrollo, sin intranet).
 * - Intranet: galería de la intranet (proyecto Supabase INTRANET, compartido por Chile y Perú).
 *
 * Intranet, solo lectura con la clave publicable (rol anon), nunca la secreta:
 *   rpc galeria_web()                          álbumes con "Mostrar en la web" y sus archivos
 *   POST /storage/v1/object/sign/<bucket>      URLs firmadas (los buckets son privados); la
 *                                              política galeria_web_lectura solo firma esos álbumes
 *
 * Cuota de Supabase: ninguna foto se sirve en su tamaño original. Las fotos van con la
 * transformación de imagen (WebP reducido, foto completa con `resize: contain`): miniatura para
 * grillas, versión de pantalla para el lightbox y una aún más chica para el rollo de la portada.
 * Los álbumes se firman por páginas (lo que se ve), no completos. Si el proyecto no tuviera la
 * transformación, se cae al original firmado.
 * SQL de la intranet: intranet-web/supabase/shared/schema.sql (sección "Web pública de eventos").
 */
import { ALBUMS } from "../data/gallery.mock.js";
import { countryName } from "../domain/gallery.js";
import { RepositoryError } from "./errors.js";

/** @typedef {import("../domain/gallery.js").Album} Album */
/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */
/** @typedef {import("../domain/gallery.js").ReelPhoto} ReelPhoto */

/**
 * @typedef {object} GalleryRepository
 * @property {() => Promise<Album[]>} listAlbums  más recientes primero
 * @property {(slug: string, page?: { offset?: number, limit?: number }) => Promise<{ album: Album, items: MediaItem[], total: number } | null>} getAlbum
 *   piezas del álbum desde `offset` (por defecto todas)
 * @property {(count: number) => Promise<ReelPhoto[]>} samplePhotos  fotos al azar de todos los álbumes
 * @property {(slug: string, count: number) => Promise<MediaItem[]>} albumSlides  slider del álbum: la portada y otras al azar, en tamaño de pantalla
 */

/** Tamaños pedidos a la transformación de imagen de Supabase (siempre la foto completa). */
export const IMAGE_SIZES = {
  thumb: { width: 640, height: 640, resize: "contain", quality: 70 },
  view: { width: 1600, height: 1600, resize: "contain", quality: 75 },
  reel: { width: 480, height: 480, resize: "contain", quality: 65 },
};

/** @param {MediaItem[]} items */
const counts = (items) => ({ photos: items.filter((i) => i.type === "foto").length, videos: items.filter((i) => i.type === "video").length });

/** @param {{ offset?: number, limit?: number }} page @param {number} total */
const pageRange = ({ offset = 0, limit = Number.POSITIVE_INFINITY }, total) => {
  const start = Math.max(0, Math.min(Math.floor(offset) || 0, total));
  return [start, Math.min(total, start + Math.max(0, limit))];
};

/**
 * `count` elementos al azar sin repetir (Fisher-Yates parcial).
 * @template T @param {T[]} list @param {number} count @param {() => number} [random]
 */
export function sample(list, count, random = Math.random) {
  const copy = [...list];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * @param {{ albums?: typeof ALBUMS, random?: () => number }} [options]
 * @returns {GalleryRepository}
 */
export function createMockGalleryRepository({ albums = ALBUMS, random = Math.random } = {}) {
  /** @param {(typeof ALBUMS)[number]} a @returns {Album} */
  const toAlbum = (a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    country: a.country,
    date: a.date ?? null,
    cover: a.items.find((i) => i.type === "foto") ?? null,
    ...counts(a.items),
  });
  return {
    async listAlbums() {
      return albums.map(toAlbum);
    },
    async getAlbum(slug, page = {}) {
      const found = albums.find((a) => a.slug === slug);
      if (!found) return null;
      const [start, end] = pageRange(page, found.items.length);
      return { album: toAlbum(found), items: found.items.slice(start, end).map((i) => ({ ...i })), total: found.items.length };
    },
    async albumSlides(slug, count) {
      const photos = albums.find((a) => a.slug === slug)?.items.filter((i) => i.type === "foto") ?? [];
      return [...photos.slice(0, 1), ...sample(photos.slice(1), count - 1, random)].map((i) => ({ ...i }));
    },
    async samplePhotos(count) {
      const photos = albums.flatMap((a) => a.items.filter((i) => i.type === "foto").map((item) => ({ album: { slug: a.slug, title: a.title }, item: { ...item } })));
      return sample(photos, count, random);
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
 * @property {string | null} [creado]  fecha del álbum (UTC, sin zona)
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
 *   concurrency?: number,
 *   clock?: () => number,
 *   random?: () => number,
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
  concurrency = 8,
  clock = Date.now,
  random = Math.random,
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

  /** URLs firmadas a tamaño original, en lotes por bucket (videos y respaldo sin transformación). @param {RawFile[]} files @returns {Promise<Map<string, string>>} */
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

  /** Foto reducida firmada (transformación de imagen) o null si no se pudo. @param {RawFile} file @param {keyof typeof IMAGE_SIZES} size */
  async function signSized(file, size) {
    if (!transformsAvailable) return null;
    const res = await post(`/object/sign/${encodeURIComponent(file.bucket)}/${encodePath(file.ruta)}`, { expiresIn: signExpiresS, transform: IMAGE_SIZES[size] });
    const signed = res.ok && res.json && typeof res.json.signedURL === "string" ? res.json.signedURL : null;
    if (!signed) {
      transformsAvailable = false;
      logger.warn(`[galeria] Sin transformación de imagen (${res.status}); se usan los originales.`);
      return null;
    }
    return `${storage}${signed}`;
  }

  /**
   * @param {RawFile} file
   * @param {Map<string, string>} full
   * @param {Array<keyof typeof IMAGE_SIZES>} sizes  `thumb` (o `reel`, más chica) para la miniatura; `view` para el lightbox
   * @returns {Promise<MediaItem>}
   */
  async function toItem(file, full, sizes = ["thumb", "view"]) {
    const type = mediaType(file.tipo) ?? "foto";
    const original = full.get(`${file.bucket}/${file.ruta}`) ?? null;
    if (type === "video") return { id: `${file.bucket}/${file.ruta}`, type, thumb: null, src: original, slot: "[ VIDEO ]" };
    const sized = async (/** @type {keyof typeof IMAGE_SIZES} */ size) => (await signSized(file, size)) ?? original;
    const thumb = sizes.includes("reel") ? await sized("reel") : sizes.includes("thumb") ? await sized("thumb") : null;
    const src = sizes.includes("view") ? await sized("view") : thumb;
    return { id: `${file.bucket}/${file.ruta}`, type, thumb, src, slot: "[ FOTO ]" };
  }

  /** @param {RawAlbum} raw @param {MediaItem | null} cover @returns {Album} */
  function toAlbum(raw, cover) {
    const files = raw.archivos.filter((f) => mediaType(f.tipo));
    return {
      slug: raw.slug,
      title: String(raw.nombre ?? "").trim(),
      description: String(raw.descripcion ?? "").trim(),
      country: countryName(raw.pais),
      date: typeof raw.creado === "string" ? raw.creado : null,
      cover,
      photos: files.filter((f) => mediaType(f.tipo) === "foto").length,
      videos: files.filter((f) => mediaType(f.tipo) === "video").length,
    };
  }

  /** Lista de álbumes con su portada en miniatura (solo eso se firma). */
  async function loadList() {
    transformsAvailable = true;
    const rows = await rpc("galeria_web");
    const raws = /** @type {RawAlbum[]} */ (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, archivos: Array.isArray(r.archivos) ? r.archivos : [] }));
    const covers = raws.map(coverFile);
    const full = await signFull(/** @type {RawFile[]} */ (covers.filter(Boolean)));
    const items = await mapLimit(covers, concurrency, (file) => (file ? toItem(file, full, ["thumb"]) : Promise.resolve(null)));
    return raws.map((raw, i) => ({ raw, album: toAlbum(raw, items[i]) }));
  }

  /** @type {{ at: number, data: ReturnType<typeof loadList> } | null} */
  let listCache = null;
  /** Piezas ya firmadas, por id (los álbumes se piden por páginas). @type {Map<string, { at: number, data: Promise<MediaItem> }>} */
  const itemCache = new Map();
  /** @type {{ at: number, count: number, data: Promise<ReelPhoto[]> } | null} */
  let sampleCache = null;
  /** Slider de cada álbum (otras fotos al azar cuando vence). @type {Map<string, { at: number, data: Promise<MediaItem[]> }>} */
  const slidesCache = new Map();

  /** @template T @param {{ at: number, data: Promise<T> } | null | undefined} entry @param {number} [ttl] */
  const fresh = (entry, ttl = cacheTtlMs) => entry && clock() - entry.at < ttl;
  // Las piezas firmadas se reutilizan media vida de la firma: la misma URL vuelve a salir de la
  // caché de Supabase en vez de generar otra vez la versión reducida.
  const signedTtlMs = (signExpiresS * 1000) / 2;

  /**
   * @template {{ at: number, data: Promise<any> }} E
   * @param {E} entry
   * @param {() => void} drop
   * @returns {E}
   */
  const forgetOnError = (entry, drop) => {
    entry.data.catch(drop);
    return entry;
  };

  function list() {
    if (listCache && fresh(listCache)) return listCache.data;
    const entry = forgetOnError({ at: clock(), data: loadList() }, () => {
      if (listCache === entry) listCache = null;
    });
    listCache = entry;
    return entry.data;
  }

  /** Firma lo que falte de estas piezas (en un lote por bucket) y las devuelve en orden. @param {RawFile[]} files */
  async function signedItems(files) {
    const id = (/** @type {RawFile} */ f) => `${f.bucket}/${f.ruta}`;
    const missing = files.filter((f) => !fresh(itemCache.get(id(f)), signedTtlMs));
    if (missing.length) {
      const full = signFull(missing);
      for (const file of missing) {
        const entry = forgetOnError({ at: clock(), data: full.then((urls) => toItem(file, urls)) }, () => {
          if (itemCache.get(id(file)) === entry) itemCache.delete(id(file));
        });
        itemCache.set(id(file), entry);
      }
    }
    return mapLimit(files, concurrency, (f) => /** @type {{ data: Promise<MediaItem> }} */ (itemCache.get(id(f))).data);
  }

  /** @param {number} count */
  async function loadSample(count) {
    const albums = await list();
    const photos = albums.flatMap(({ raw, album }) => raw.archivos.filter((f) => mediaType(f.tipo) === "foto").map((file) => ({ file, album })));
    const chosen = sample(photos, count, random);
    const full = await signFull(chosen.map((c) => c.file));
    return mapLimit(chosen, concurrency, async ({ file, album }) => ({ album: { slug: album.slug, title: album.title }, item: await toItem(file, full, ["reel"]) }));
  }

  return {
    async listAlbums() {
      return (await list()).map((a) => structuredClone(a.album));
    },
    async getAlbum(slug, page = {}) {
      const found = (await list()).find((a) => a.raw.slug === slug);
      if (!found) return null;
      const files = found.raw.archivos.filter((f) => mediaType(f.tipo));
      const [start, end] = pageRange(page, files.length);
      return { album: structuredClone(found.album), items: structuredClone(await signedItems(files.slice(start, end))), total: files.length };
    },
    async albumSlides(slug, count) {
      const found = (await list()).find((a) => a.raw.slug === slug);
      if (!found) return [];
      let entry = slidesCache.get(slug);
      if (!entry || !fresh(entry)) {
        const photos = found.raw.archivos.filter((f) => mediaType(f.tipo) === "foto");
        const cover = coverFile(found.raw);
        const chosen = [...(cover ? [cover] : []), ...sample(photos.filter((f) => f !== cover), count - (cover ? 1 : 0), random)];
        const data = signFull(chosen).then((full) => mapLimit(chosen, concurrency, (file) => toItem(file, full, ["view"])));
        const created = forgetOnError({ at: clock(), data }, () => {
          if (slidesCache.get(slug) === created) slidesCache.delete(slug);
        });
        entry = created;
        slidesCache.set(slug, entry);
      }
      return structuredClone(await entry.data);
    },
    // La muestra se renueva con la caché: todas las visitas de ese rato la comparten (el servicio
    // la baraja en cada visita) y con el tiempo pasan todas las fotos. Al vencer, se sigue
    // entregando la anterior mientras se firma la nueva: la portada no espera esas firmas.
    async samplePhotos(count) {
      const previous = sampleCache && sampleCache.count === count ? sampleCache : null;
      if (!previous || !fresh(previous)) {
        const entry = forgetOnError({ at: clock(), count, data: loadSample(count) }, () => {
          if (sampleCache === entry) sampleCache = previous;
        });
        sampleCache = entry;
        if (previous) {
          entry.data.catch(() => {});
          return structuredClone(await previous.data);
        }
      }
      return structuredClone(await /** @type {NonNullable<typeof sampleCache>} */ (sampleCache).data);
    },
  };
}
