import { DS_MOUNT, dsAsset } from "../utils/assets.js";
import { attrs, html, raw } from "../utils/html.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/**
 * Documento HTML base: meta, favicon, fuentes precargadas y bundle CSS del sistema.
 * @param {{
 *   title: string, description?: string, lang?: string, body: Renderable, head?: Renderable,
 *   bodyClass?: string, scripts?: string[], canonical?: string, image?: string, themeColor?: string
 * }} props
 */
export function Document({ title, description, lang = "es", body, head, bodyClass, scripts = [], canonical, image, themeColor = "#293f68" }) {
  return html`${raw("<!doctype html>")}
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${description ? html`<meta name="description" content="${description}">` : ""}
  <meta name="theme-color" content="${themeColor}">
  ${canonical ? html`<link rel="canonical" href="${canonical}">` : ""}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  ${description ? html`<meta property="og:description" content="${description}">` : ""}
  ${image ? html`<meta property="og:image" content="${image}">` : ""}
  <link rel="icon" type="image/png" sizes="32x32" href="${dsAsset("brand/favicon-32.png")}">
  <link rel="apple-touch-icon" href="${dsAsset("brand/apple-touch-icon.png")}">
  <link rel="preload" href="${dsAsset("fonts/montserrat-latin-wght-normal.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${DS_MOUNT}/tw.css">
  ${head ?? ""}
</head>
<body${attrs({ class: bodyClass })}>
${body}
${scripts.map((src) => html`<script type="module" src="${src}"></script>`)}
</body>
</html>`;
}
