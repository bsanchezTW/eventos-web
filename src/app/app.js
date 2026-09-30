/**
 * Aplicación Express: monta el Design System, la feature de eventos y el manejo de errores.
 * `createApp` no escucha puertos, así los tests la levantan en un puerto efímero.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import { DS_MOUNT, designSystemAssets } from "../design-system/server.js";
import { renderShowcasePage } from "../design-system/showcase/page.js";
import { readTokens } from "../design-system/tokens/read-tokens.js";
import { renderStatusPage } from "../features/events/pages/status.page.js";
import { MAP_FRAME_ORIGINS } from "../features/events/domain/maps.js";
import { createEventsFeature } from "../features/events/routes.js";
import { createEventRepository, RepositoryError } from "../features/events/services/event-repository.js";
import { createEventService } from "../features/events/services/event-service.js";
import { createMemoryRegistrationGateway, createSupabaseRegistrationGateway } from "../features/events/services/registration-gateway.js";
import { createRegistrationService } from "../features/events/services/registration-service.js";
import { createSupabaseRpc } from "../features/events/services/supabase-rpc.js";
import { rateLimit } from "./rate-limit.js";
import { securityHeaders } from "./security.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{
 *   config: import("./config.js").AppConfig,
 *   repository?: import("../features/events/services/event-repository.js").EventRepository,
 *   gateway?: import("../features/events/services/registration-gateway.js").RegistrationGateway,
 *   now?: () => Date,
 *   logger?: Pick<Console, "error" | "warn">
 * }} options
 */
export function createApp({ config, repository, gateway, now, logger = console }) {
  const { url, key } = config.supabase;
  const rpc = config.events.source === "supabase" && url && key ? createSupabaseRpc({ url, key }) : null;
  const eventRepository =
    repository ??
    createEventRepository({ source: config.events.source, apiUrl: config.events.apiUrl, latencyMs: config.events.mockLatencyMs, rpc, cacheTtlMs: config.events.cacheTtlMs });
  const eventService = createEventService({ repository: eventRepository, now });
  const registrationService = createRegistrationService({
    eventService,
    gateway: gateway ?? (rpc ? createSupabaseRegistrationGateway({ rpc }) : createMemoryRegistrationGateway({ eventService })),
    // Tras inscribir, la próxima lectura trae los cupos actualizados.
    onRegistered: () => eventRepository.invalidate?.(),
  });
  const registrationLimiter = rateLimit({
    ...config.registrationLimit,
    message: "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
  });
  const events = createEventsFeature({ eventService, registrationService, registrationLimiter, publicUrl: config.publicUrl, cacheAssets: config.isProduction });

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(compression());
  app.use(securityHeaders({ imageOrigins: rpc && url ? [new URL(url).origin] : [], frameOrigins: MAP_FRAME_ORIGINS }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, source: config.events.source });
  });

  app.use(DS_MOUNT, designSystemAssets({ cache: config.isProduction }));
  app.use("/features/events", events.assets);
  app.use(express.static(path.join(ROOT, "public"), { maxAge: config.isProduction ? "7d" : 0, index: false }));

  if (config.showcase) {
    app.get("/sistema-de-diseno", (_req, res) => {
      res.type("html").send(String(renderShowcasePage({ tokens: readTokens() })));
    });
  }

  app.use("/api", events.api);
  app.use(events.pages);

  app.use("/api", (_req, res) => {
    res.status(404).json({ ok: false, code: "not_found", error: "Recurso no encontrado" });
  });

  app.use(async (_req, res) => {
    res.status(404).type("html").send(String(renderStatusPage({ status: 404 })));
  });

  /** @type {import("express").ErrorRequestHandler} */
  const onError = (error, req, res, _next) => {
    const status = error instanceof RepositoryError ? 503 : Number(error.status) >= 400 && Number(error.status) < 500 ? Number(error.status) : 500;
    if (status >= 500) logger.error(`[eventos] ${req.method} ${req.originalUrl}:`, error);
    if (res.headersSent) return;
    if (req.originalUrl.startsWith("/api")) {
      const message = status === 503 ? "La agenda no está disponible en este momento" : status >= 500 ? "Error interno" : "Solicitud inválida";
      return res.status(status).json({ ok: false, code: status === 503 ? "unavailable" : "error", error: message });
    }
    res.status(status).type("html").send(String(renderStatusPage({ status: status === 503 ? 503 : 500 })));
  };
  app.use(onError);

  return app;
}
