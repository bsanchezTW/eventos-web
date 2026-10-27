/**
 * Galería desde la intranet: álbumes marcados para la web, URLs firmadas y fotos reducidas.
 * Usa un fetch falso con la forma de PostgREST y de la API de Storage de Supabase.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { groupAlbumsByCountry, mediaCountLabel } from "../../src/features/events/domain/gallery.js";
import { RepositoryError } from "../../src/features/events/services/event-repository.js";
import { IMAGE_SIZES, coverFile, createIntranetGalleryRepository, createMockGalleryRepository, sample } from "../../src/features/events/services/gallery-repository.js";
import { createGalleryService } from "../../src/features/events/services/gallery-service.js";
import { createSupabaseRpc } from "../../src/features/events/services/supabase-rpc.js";

const URL_BASE = "https://intranet.supabase.co";
const ALBUMS = [
  {
    slug: "transworld-connect-2026",
    nombre: "Transworld Connect 2026",
    descripcion: "Clientes, marcas y profesionales.",
    pais: "CL",
    creado: "2026-09-07T19:24:55",
    portada: "/content/eventos/transworld-connect-2026/Foto%20B.jpg",
    archivos: [
      { bucket: "intranet-content", ruta: "eventos/transworld-connect-2026/Foto A.jpg", tipo: "image/jpeg" },
      { bucket: "intranet-content", ruta: "eventos/transworld-connect-2026/Foto B.jpg", tipo: "image/jpeg" },
      { bucket: "intranet-content-pe", ruta: "eventos/transworld-connect-2026/resumen.mp4", tipo: "video/mp4" },
      { bucket: "intranet-content", ruta: "eventos/transworld-connect-2026/acta.pdf", tipo: "application/pdf" },
    ],
  },
  { slug: "integradores-lima", nombre: "Integradores Lima", descripcion: null, pais: "PE", creado: "2026-05-01T10:00:00", portada: null, archivos: [] },
];

/** @param {{ transforms?: boolean }} [options] */
function fakeIntranet({ transforms = true } = {}) {
  /** @type {Array<{ url: string, body: any, apikey: string | null }>} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ url, body, apikey: new Headers(init?.headers).get("apikey") });
    if (url.endsWith("/rest/v1/rpc/galeria_web")) return Response.json(ALBUMS);
    const batch = /\/storage\/v1\/object\/sign\/([^/]+)$/.exec(url);
    if (batch) {
      return Response.json(body.paths.map((/** @type {string} */ path) => ({ path, signedURL: `/object/sign/${batch[1]}/${encodeURI(path)}?token=full`, error: null })));
    }
    const single = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(url);
    if (single) {
      if (!transforms) return Response.json({ statusCode: "403", error: "Image transformation is not enabled" }, { status: 400 });
      return Response.json({ signedURL: `/render/image/sign/${single[1]}/${single[2]}?token=sized&width=${body.transform.width}` });
    }
    return new Response("", { status: 404 });
  };
  const rpc = createSupabaseRpc({ url: URL_BASE, key: "sb_publishable_intranet", fetchImpl });
  const repo = () => createIntranetGalleryRepository({ url: URL_BASE, key: "sb_publishable_intranet", rpc, fetchImpl, logger: { warn() {} }, random: () => 0 });
  return { calls, repo, fetchImpl };
}

test("coverFile: la portada de la intranet (ruta /content codificada) o la primera foto", () => {
  assert.equal(coverFile(ALBUMS[0])?.ruta, "eventos/transworld-connect-2026/Foto B.jpg");
  assert.equal(coverFile({ ...ALBUMS[0], portada: "/content/eventos/otro/x.jpg" })?.ruta, "eventos/transworld-connect-2026/Foto A.jpg");
  assert.equal(coverFile(ALBUMS[1]), null);
});

test("intranet: álbumes con la portada en miniatura reducida (foto completa), sin PDF, país legible", async () => {
  const { calls, repo } = fakeIntranet();
  const albums = await repo().listAlbums();
  assert.deepEqual(
    albums.map((a) => [a.slug, a.country, a.photos, a.videos]),
    [
      ["transworld-connect-2026", "Chile", 2, 1],
      ["integradores-lima", "Perú", 0, 0],
    ],
  );
  assert.equal(albums[0].cover?.thumb, `${URL_BASE}/storage/v1/render/image/sign/intranet-content/eventos/transworld-connect-2026/Foto%20B.jpg?token=sized&width=640`);
  assert.equal(albums[1].cover, null);
  const transforms = calls.filter((c) => c.body.transform).map((c) => c.body.transform);
  assert.deepEqual(transforms, [IMAGE_SIZES.thumb], "la lista solo firma las portadas");
  assert.equal(IMAGE_SIZES.thumb.resize, "contain", "foto completa: ni recortada ni una franja");
  assert.ok(IMAGE_SIZES.thumb.height, "con alto y ancho, Supabase no inventa un alto de 2000px");
  assert.ok(calls.every((c) => c.apikey === "sb_publishable_intranet"), "siempre la clave publicable");
});

test("intranet: el álbum se firma por tandas, con miniatura y versión de pantalla reducidas; caché", async () => {
  const { calls, repo } = fakeIntranet();
  const gallery = repo();
  const first = await gallery.getAlbum("transworld-connect-2026", { offset: 0, limit: 2 });
  assert.ok(first);
  assert.equal(first.total, 3);
  assert.deepEqual(
    first.items.map((i) => [i.type, i.thumb?.includes("width=640"), i.src?.includes("width=1600")]),
    [
      ["foto", true, true],
      ["foto", true, true],
    ],
  );
  const signed = (/** @type {string} */ name) => calls.filter((c) => c.url.includes(encodeURIComponent(name)) || c.body.paths?.some((/** @type {string} */ p) => p.includes(name))).length;
  assert.equal(signed("resumen.mp4"), 0, "el video de la tanda siguiente no se firma todavía");

  const second = await gallery.getAlbum("transworld-connect-2026", { offset: 2, limit: 2 });
  assert.deepEqual(second?.items.map((i) => [i.type, i.thumb, i.src?.includes("token=full")]), [["video", null, true]], "el video va original (sin transformación)");

  const before = calls.length;
  await gallery.getAlbum("transworld-connect-2026", { offset: 0, limit: 2 });
  assert.equal(calls.length, before, "lo ya firmado no se vuelve a firmar");
  assert.equal(await gallery.getAlbum("no-existe"), null);
});

test("intranet: sin transformación de imagen, la miniatura es el original", async () => {
  const { repo } = fakeIntranet({ transforms: false });
  const found = await repo().getAlbum("transworld-connect-2026");
  const photos = found?.items.filter((i) => i.type === "foto") ?? [];
  assert.ok(photos.length === 2 && photos.every((i) => i.thumb === i.src && i.src?.includes("token=full")));
});

test("intranet: rollo de la portada con fotos al azar de todos los álbumes, aún más chicas", async () => {
  const { calls, repo } = fakeIntranet();
  const photos = await repo().samplePhotos(5);
  assert.equal(photos.length, 2, "no hay más fotos que las del álbum (sin videos ni PDF)");
  assert.ok(photos.every((p) => p.album.slug === "transworld-connect-2026" && p.album.title === "Transworld Connect 2026"));
  assert.ok(photos.every((p) => p.item.thumb?.includes(`width=${IMAGE_SIZES.reel.width}`)));
  assert.ok(calls.filter((c) => c.body.transform).every((c) => c.body.transform !== IMAGE_SIZES.view), "el rollo no pide la versión de pantalla");
});

test("intranet sin la función galeria_web (SQL sin aplicar): error de repositorio y landing sin rollo", async () => {
  const fetchImpl = /** @type {typeof fetch} */ (async () => Response.json({ code: "PGRST202", message: "Could not find the function public.galeria_web" }, { status: 404 }));
  const rpc = createSupabaseRpc({ url: URL_BASE, key: "k", fetchImpl });
  const repo = createIntranetGalleryRepository({ url: URL_BASE, key: "k", rpc, fetchImpl });
  await assert.rejects(repo.listAlbums(), RepositoryError);
  assert.deepEqual(await createGalleryService({ repository: repo, logger: { warn() {} } }).getReel(), []);
});

test("servicio y dominio: grupos Chile → Perú, álbum por tandas, rollo y etiquetas", async () => {
  const service = createGalleryService({ repository: createMockGalleryRepository() });
  const { groups } = await service.getGallery();
  assert.deepEqual(
    groups.map((g) => [g.country, g.albums.length]),
    [
      ["Chile", 2],
      ["Perú", 1],
    ],
  );
  const page = await service.getAlbum("jornada-radwin-santiago", { offset: 2, limit: 3 });
  assert.deepEqual([page?.items.length, page?.total], [3, 7]);
  const reel = await service.getReel(4);
  assert.equal(reel.length, 4);
  assert.ok(reel.every((p) => p.item.type === "foto" && p.album.title));
  assert.equal(mediaCountLabel({ photos: 1, videos: 2 }), "1 foto · 2 videos");
  assert.equal(mediaCountLabel({ photos: 0, videos: 0 }), "Sin contenido aún");
  assert.deepEqual(groupAlbumsByCountry([]), []);
});

test("sample: elementos al azar sin repetir", () => {
  assert.deepEqual(sample([1, 2, 3, 4], 2, () => 0), [1, 2]);
  assert.deepEqual(sample([1, 2, 3], 9, () => 0.99).sort(), [1, 2, 3]);
  assert.equal(new Set(sample([...Array(50).keys()], 20)).size, 20);
});

test("intranet: al vencer la muestra del rollo, la portada recibe la anterior mientras se firma la nueva", async () => {
  const { fetchImpl: inner } = fakeIntranet();
  let now = 0;
  /** @type {Promise<void> | null} */
  let hold = null;
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init) => {
    if (hold && String(input).includes("/storage/")) await hold;
    return inner(input, init);
  };
  const rpc = createSupabaseRpc({ url: URL_BASE, key: "k", fetchImpl });
  const gallery = createIntranetGalleryRepository({ url: URL_BASE, key: "k", rpc, fetchImpl, clock: () => now, cacheTtlMs: 1000, logger: { warn() {} } });

  const first = await gallery.samplePhotos(2);
  now = 5000;
  let release = () => {};
  hold = new Promise((resolve) => (release = resolve));
  assert.deepEqual(await gallery.samplePhotos(2), first, "no espera las firmas nuevas");
  release();
});

test("intranet: fecha del álbum y slider con la portada primero, en tamaño de pantalla", async () => {
  const { calls, repo } = fakeIntranet();
  const gallery = repo();
  const [connect] = await gallery.listAlbums();
  assert.equal(connect.date, "2026-09-07T19:24:55");
  const slides = await gallery.albumSlides("transworld-connect-2026", 12);
  assert.equal(slides.length, 2, "no hay más fotos que las del álbum (sin videos)");
  assert.match(slides[0].id, /Foto B\.jpg$/, "la portada abre el slider");
  assert.ok(slides.every((s) => s.src?.includes(`width=${IMAGE_SIZES.view.width}`) && s.thumb === null), "solo la versión de pantalla");
  const before = calls.length;
  await gallery.albumSlides("transworld-connect-2026", 12);
  assert.equal(calls.length, before, "el slider queda en caché");
  assert.deepEqual(await gallery.albumSlides("no-existe", 12), []);
});

test("formatAlbumDate: la fecha de la intranet (UTC) en Chile", async () => {
  const { formatAlbumDate } = await import("../../src/features/events/domain/gallery.js");
  assert.equal(formatAlbumDate("2026-09-07T19:24:55"), "7 de septiembre de 2026");
  assert.equal(formatAlbumDate("2026-09-08T02:00:00Z"), "7 de septiembre de 2026", "de noche en Chile sigue siendo el 7");
  assert.equal(formatAlbumDate(null), "");
  assert.equal(formatAlbumDate("no es fecha"), "");
});

test("servicio: página del álbum con su slider; si el slider falla, queda la portada", async () => {
  const mock = createMockGalleryRepository();
  const ok = await createGalleryService({ repository: mock }).getAlbumPage("jornada-radwin-santiago");
  assert.ok(ok && ok.slides.length === 6 && ok.slides[0].id === ok.album.cover?.id);
  const failing = { ...mock, albumSlides: async () => Promise.reject(new Error("sin red")) };
  const fallback = await createGalleryService({ repository: failing, logger: { warn() {} } }).getAlbumPage("jornada-radwin-santiago");
  assert.deepEqual(fallback?.slides.map((s) => s.id), [fallback?.album.cover?.id]);
  assert.equal(await createGalleryService({ repository: mock }).getAlbumPage("no-existe"), null);
});
