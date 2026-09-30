/**
 * Integración del Design System con Express (solo Node).
 *
 * Expone bajo DS_MOUNT (/design-system):
 *   - /design-system/tw.css         bundle CSS concatenado según styles/manifest.js
 *   - /design-system/**.js          módulos ES del sistema (componentes, íconos, behaviors) para el navegador
 *   - /design-system/assets/**      fuentes, marca e imágenes del sistema
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { STYLESHEETS } from "./styles/manifest.js";

export { DS_MOUNT } from "./utils/assets.js";

const DS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_EXTENSIONS = new Set([".js", ".css", ".woff2", ".png", ".jpg", ".jpeg", ".svg", ".webp"]);
/** Módulos solo-Node que no se exponen al navegador (rutas relativas al mount). */
const PRIVATE_PATHS = new Set(["/server.js", "/tokens/read-tokens.js"]);

/** Concatena las hojas del manifiesto en un solo CSS. */
export function buildStylesheet() {
  return STYLESHEETS.map((file) => {
    const css = readFileSync(path.join(DS_ROOT, file), "utf8");
    return `/* ── ${file} ── */\n${css.trim()}\n`;
  }).join("\n");
}

/**
 * @param {{ cache?: boolean, maxAge?: string }} [options]
 *   cache: reutiliza el bundle en memoria (producción). En desarrollo se reconstruye por request.
 */
export function designSystemAssets({ cache = true, maxAge = "1d" } = {}) {
  const router = express.Router();
  /** @type {{ css: string, etag: string } | null} */
  let bundle = null;

  const getBundle = () => {
    if (bundle && cache) return bundle;
    const css = buildStylesheet();
    bundle = { css, etag: `"${createHash("sha1").update(css).digest("base64url")}"` };
    return bundle;
  };

  router.get("/tw.css", (req, res) => {
    const { css, etag } = getBundle();
    res.set("ETag", etag);
    res.set("Cache-Control", cache ? "public, max-age=3600" : "no-cache");
    if (req.headers["if-none-match"] === etag) return res.status(304).end();
    res.type("text/css").send(css);
  });

  router.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (!PUBLIC_EXTENSIONS.has(ext) || PRIVATE_PATHS.has(req.path)) {
      return res.status(404).end();
    }
    next();
  });

  router.use(express.static(DS_ROOT, { maxAge: cache ? maxAge : 0, etag: true, index: false }));
  return router;
}
