/**
 * Galería desde la intranet: álbumes marcados para la web, URLs firmadas y miniaturas.
 * Usa un fetch falso con la forma de PostgREST y de la API de Storage de Supabase.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { groupAlbumsByCountry, mediaCountLabel } from "../../src/features/events/domain/gallery.js";
import { RepositoryError } from "../../src/features/events/services/event-repository.js";
import { coverFile, createIntranetGalleryRepository, createMockGalleryRepository, previewFiles } from "../../src/features/events/services/gallery-repository.js";
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
      return Response.json({ signedURL: `/render/image/sign/${single[1]}/${single[2]}?token=thumb&width=${body.transform.width}` });
    }
    return new Response("", { status: 404 });
  };
  const rpc = createSupabaseRpc({ url: URL_BASE, key: "sb_publishable_intranet", fetchImpl });
  const repo = () => createIntranetGalleryRepository({ url: URL_BASE, key: "sb_publishable_intranet", rpc, fetchImpl, logger: { warn() {} } });
  return { calls, repo };
}

test("coverFile: la portada de la intranet (ruta /content codificada) o la primera foto", () => {
  assert.equal(coverFile(ALBUMS[0])?.ruta, "eventos/transworld-connect-2026/Foto B.jpg");
  assert.equal(coverFile({ ...ALBUMS[0], portada: "/content/eventos/otro/x.jpg" })?.ruta, "eventos/transworld-connect-2026/Foto A.jpg");
  assert.equal(coverFile(ALBUMS[1]), null);
});

test("intranet: álbumes con portada en miniatura firmada, sin PDF, país legible", async () => {
  const { calls, repo } = fakeIntranet();
  const albums = await repo().listAlbums();
  assert.deepEqual(
    albums.map((a) => [a.slug, a.country, a.photos, a.videos]),
    [
      ["transworld-connect-2026", "Chile", 2, 1],
      ["integradores-lima", "Perú", 0, 0],
    ],
  );
  assert.equal(albums[0].cover?.thumb, `${URL_BASE}/storage/v1/render/image/sign/intranet-content/eventos/transworld-connect-2026/Foto%20B.jpg?token=thumb&width=640`);
  assert.equal(albums[1].cover, null);
  assert.ok(calls.every((c) => c.apikey === "sb_publishable_intranet"), "siempre la clave publicable");
});

test("intranet: álbum con miniaturas y originales firmados por bucket; caché", async () => {
  const { calls, repo } = fakeIntranet();
  const gallery = repo();
  const found = await gallery.getAlbum("transworld-connect-2026");
  assert.ok(found);
  assert.deepEqual(
    found.items.map((i) => [i.type, i.thumb?.includes("render/image") ?? null, i.src?.includes("token=full")]),
    [
      ["foto", true, true],
      ["foto", true, true],
      ["video", null, true],
    ],
  );
  const batches = calls.filter((c) => /object\/sign\/[^/]+$/.test(c.url)).map((c) => [c.url.split("/").pop(), c.body.paths.length]);
  assert.deepEqual(batches.slice(-2), [
    ["intranet-content", 2],
    ["intranet-content-pe", 1],
  ]);

  const before = calls.length;
  await gallery.getAlbum("transworld-connect-2026");
  assert.equal(calls.length, before, "dentro del TTL no vuelve a firmar");
  assert.equal(await gallery.getAlbum("no-existe"), null);
});

test("intranet: sin transformación de imagen, la miniatura es el original", async () => {
  const { repo } = fakeIntranet({ transforms: false });
  const found = await repo().getAlbum("transworld-connect-2026");
  const photos = found?.items.filter((i) => i.type === "foto") ?? [];
  assert.ok(photos.length === 2 && photos.every((i) => i.thumb === i.src && i.src?.includes("token=full")));
});

test("intranet sin la función galeria_web (SQL sin aplicar): error de repositorio y landing sin teaser", async () => {
  const fetchImpl = /** @type {typeof fetch} */ (async () => Response.json({ code: "PGRST202", message: "Could not find the function public.galeria_web" }, { status: 404 }));
  const rpc = createSupabaseRpc({ url: URL_BASE, key: "k", fetchImpl });
  const repo = createIntranetGalleryRepository({ url: URL_BASE, key: "k", rpc, fetchImpl });
  await assert.rejects(repo.listAlbums(), RepositoryError);
  assert.deepEqual(await createGalleryService({ repository: repo, logger: { warn() {} } }).getTeaser(), []);
});

test("servicio y dominio: grupos Chile → Perú, teaser y etiquetas", async () => {
  const service = createGalleryService({ repository: createMockGalleryRepository() });
  const { groups } = await service.getGallery();
  assert.deepEqual(
    groups.map((g) => [g.country, g.albums.length]),
    [
      ["Chile", 2],
      ["Perú", 1],
    ],
  );
  assert.equal((await service.getTeaser(2)).length, 2);
  assert.equal(mediaCountLabel({ photos: 1, videos: 2 }), "1 foto · 2 videos");
  assert.equal(mediaCountLabel({ photos: 0, videos: 0 }), "Sin contenido aún");
  assert.deepEqual(groupAlbumsByCountry([]), []);
});

test("teaser: con un solo álbum igual arma 4 tarjetas (portada primero); con varios, una portada por álbum", async () => {
  const one = createGalleryService({ repository: createMockGalleryRepository({ albums: [{ slug: "a", title: "A", description: "", country: "Chile", items: Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, type: /** @type {const} */ ("foto"), thumb: `t${i}`, src: `s${i}`, slot: "" })) }] }) });
  assert.deepEqual((await one.getTeaser()).map((t) => [t.album.slug, t.item.id]), [["a", "f0"], ["a", "f1"], ["a", "f2"], ["a", "f3"]]);

  const many = createGalleryService({ repository: createMockGalleryRepository() });
  assert.deepEqual((await many.getTeaser()).map((t) => t.album.slug), ["jornada-radwin-santiago", "taller-certificacion-huechuraba", "encuentro-integradores-lima", "jornada-radwin-santiago"]);
});

test("previewFiles: la portada primero y luego las demás fotos (sin videos ni PDF)", () => {
  assert.deepEqual(previewFiles(ALBUMS[0]).map((f) => f.ruta.split("/").pop()), ["Foto B.jpg", "Foto A.jpg"]);
});
