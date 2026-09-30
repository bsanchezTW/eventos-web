/**
 * Rutas de la feature de eventos.
 *
 *   Páginas   GET  /                              landing (filtros en la query: q, categoria, formato, sede, mes, dia, orden, todos)
 *             GET  /eventos/:id                   detalle
 *             GET  /galeria                       galería (?tipo=foto|video)
 *             GET  /webinars                      webinars en vivo y grabados
 *   API       GET  /api/eventos                   explorador (misma query que la landing)
 *             GET  /api/eventos/:id               detalle
 *             GET  /api/categorias
 *             POST /api/eventos/:id/inscripciones
 *             POST /api/suscripciones
 *   Assets    /features/events/{domain,components,client}/**.js  (módulos isomórficos para el navegador)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { parseExplorerQuery } from "./domain/explorer.js";
import { LANDING_CONTENT } from "./data/landing-content.js";
import { renderEventDetailPage } from "./pages/event-detail.page.js";
import { renderGalleryPage } from "./pages/gallery.page.js";
import { renderWebinarsPage } from "./pages/webinars.page.js";
import { renderLandingPage } from "./pages/landing.page.js";
import { renderStatusPage } from "./pages/status.page.js";
import { DomainError } from "./services/registration-service.js";

/** @typedef {import("./services/event-service.js").EventService} EventService */
/** @typedef {import("./services/registration-service.js").RegistrationService} RegistrationService */
/** @typedef {import("./domain/event.js").EventView} EventView */

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIRS = ["domain", "components", "client"];

/** Versión liviana para listados (sin programa ni descripción larga). @param {EventView} event */
function toListItem(event) {
  const { program: _program, description: _description, audience: _audience, ...rest } = event;
  return rest;
}

/** @param {import("./domain/explorer.js").ExplorerResult} explorer */
function serializeExplorer(explorer) {
  return { ...explorer, monthItems: explorer.monthItems.map(toListItem), seasonItems: explorer.seasonItems.map(toListItem) };
}

/**
 * @param {import("express").Response} res
 * @param {unknown} error
 */
function sendApiError(res, error) {
  if (error instanceof DomainError) {
    return res.status(error.status).json({ ok: false, code: error.code, error: error.message, fields: error.fields });
  }
  throw error;
}

/** @type {import("express").RequestHandler} */
const noLimit = (_req, _res, next) => next();

/**
 * @param {{ eventService: EventService, registrationService: RegistrationService, registrationLimiter?: import("express").RequestHandler, publicUrl?: string, cacheAssets?: boolean }} deps
 */
export function createEventsFeature({ eventService, registrationService, registrationLimiter = noLimit, publicUrl = "", cacheAssets = true }) {
  const pages = express.Router();
  const api = express.Router();
  const assets = express.Router();

  const categoryRefs = async () => (await eventService.listCategories()).map(({ id, name }) => ({ id, name }));

  pages.get("/", async (req, res) => {
    const query = parseExplorerQuery(/** @type {Record<string, unknown>} */ (req.query));
    const [landing, explorer, categories] = await Promise.all([
      eventService.getLandingData({ formatsLabel: LANDING_CONTENT.stats.formats }),
      eventService.explore(query),
      categoryRefs(),
    ]);
    res.type("html").send(String(renderLandingPage({ landing, explorer, categories, canonical: publicUrl ? `${publicUrl}/` : undefined })));
  });

  pages.get("/galeria", async (req, res) => {
    const tipo = req.query.tipo === "foto" || req.query.tipo === "video" ? req.query.tipo : "todo";
    const [gallery, categories] = await Promise.all([eventService.getGallery(tipo), categoryRefs()]);
    res.type("html").send(String(renderGalleryPage({ gallery, type: tipo, categories })));
  });

  pages.get("/webinars", async (_req, res) => {
    const [webinars, categories] = await Promise.all([eventService.getWebinars(), categoryRefs()]);
    res.type("html").send(String(renderWebinarsPage({ webinars, categories })));
  });

  pages.get("/eventos/:id", async (req, res) => {
    const [detail, categories] = await Promise.all([eventService.getEventDetail(req.params.id), categoryRefs()]);
    if (!detail) {
      return res.status(404).type("html").send(String(renderStatusPage({ status: 404, categories })));
    }
    res.type("html").send(String(renderEventDetailPage({ detail, categories, canonical: publicUrl ? `${publicUrl}/eventos/${encodeURIComponent(detail.event.id)}` : undefined })));
  });

  api.get("/eventos", async (req, res) => {
    const explorer = await eventService.explore(parseExplorerQuery(/** @type {Record<string, unknown>} */ (req.query)));
    res.set("Cache-Control", "no-store").json({ ok: true, data: serializeExplorer(explorer) });
  });

  api.get("/eventos/:id", async (req, res) => {
    const detail = await eventService.getEventDetail(req.params.id);
    if (!detail) return res.status(404).json({ ok: false, code: "not_found", error: "Evento no encontrado" });
    res.json({ ok: true, data: detail });
  });

  api.get("/categorias", async (_req, res) => {
    res.json({ ok: true, data: await eventService.listCategories() });
  });

  api.post("/eventos/:id/inscripciones", registrationLimiter, express.json({ limit: "20kb" }), async (req, res) => {
    try {
      const registration = await registrationService.register(String(req.params.id), req.body ?? {});
      res.status(201).json({ ok: true, data: registration });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  api.post("/suscripciones", express.json({ limit: "10kb" }), async (req, res) => {
    try {
      res.status(201).json({ ok: true, data: await registrationService.subscribe(req.body ?? {}) });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  for (const dir of CLIENT_DIRS) {
    assets.use(`/${dir}`, express.static(path.join(FEATURE_ROOT, dir), { index: false, maxAge: cacheAssets ? "1h" : 0 }));
  }

  return { pages, api, assets };
}
