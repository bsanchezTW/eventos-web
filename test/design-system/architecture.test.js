/**
 * Guardas del Design System: mantienen el lenguaje visual centralizado en tokens.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildStylesheet } from "../../src/design-system/server.js";
import { STYLESHEETS } from "../../src/design-system/styles/manifest.js";
import { readTokens } from "../../src/design-system/tokens/read-tokens.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ds = path.join(root, "src/design-system");

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}

test("el manifiesto incluye todas las hojas de estilo del sistema (y solo existentes)", () => {
  for (const file of STYLESHEETS) assert.ok(existsSync(path.join(ds, file)), `${file} no existe`);
  const onDisk = walk(ds)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.relative(ds, f).split(path.sep).join("/"));
  assert.deepEqual([...onDisk].sort(), [...STYLESHEETS].sort());
});

test("los componentes no usan colores hex sueltos: solo tokens", () => {
  const offenders = STYLESHEETS.filter((f) => !f.startsWith("tokens/")).flatMap((file) => {
    const css = readFileSync(path.join(ds, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    return [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => `${file}: ${m[0]}`);
  });
  assert.deepEqual(offenders, []);
});

test("las features no traen CSS propio: consumen el Design System", () => {
  const featureCss = walk(path.join(root, "src/features")).filter((f) => f.endsWith(".css"));
  assert.deepEqual(featureCss, []);
});

test("el bundle CSS no contiene @import (se sirve como un único archivo)", () => {
  assert.doesNotMatch(buildStylesheet(), /@import/);
});

test("el HTML generado no usa estilos inline (CSP style-src 'self')", () => {
  const sources = walk(path.join(root, "src")).filter((f) => f.endsWith(".js"));
  const offenders = sources.filter((f) => /\sstyle=["$]/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

/* ── Contraste AA de los pares de texto documentados ─────────────────────── */
function tokens() {
  const map = readTokens();
  return (/** @type {string} */ name) => /** @type {string} */ (map.get(name));
}

/** @param {string} value @returns {[number, number, number, number]} */
function parseColor(value) {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  const m = /rgba?\(([^)]+)\)/.exec(value);
  if (!m) throw new Error(`Color no soportado: ${value}`);
  const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

/** @param {[number, number, number, number]} fg @param {[number, number, number, number]} bg */
function contrast(fg, bg) {
  const mix = fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
  const lum = (/** @type {number[]} */ rgb) => {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(mix), lum(bg.slice(0, 3))].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

test("pares de texto/fondo del sistema cumplen WCAG AA (4.5:1)", () => {
  const t = tokens();
  const white = parseColor("#ffffff");
  const base = parseColor(t("--tw-color-bg"));
  const onTint = (/** @type {string} */ tint, /** @type {[number, number, number, number]} */ over) => {
    const c = parseColor(t(tint));
    return /** @type {[number, number, number, number]} */ ([...c.slice(0, 3).map((v, i) => v * c[3] + over[i] * (1 - c[3])), 1]);
  };
  const pairs = [
    ["body / surface", t("--tw-color-text-body"), white],
    ["body / base", t("--tw-color-text-body"), base],
    ["muted / surface", t("--tw-color-text-muted"), white],
    ["title / surface", t("--tw-color-text-title"), white],
    ["heading / base", t("--tw-color-text-heading"), base],
    ["label / surface", t("--tw-color-text-label"), white],
    ["accent text / base (eyebrows)", t("--tw-color-text-accent"), base],
    ["accent text / lime 16% (badges)", t("--tw-color-text-accent"), onTint("--tw-tint-accent-16", white)],
    ["accent text / lime 20% (calendario)", t("--tw-color-text-accent"), onTint("--tw-tint-accent-20", white)],
    ["on-accent / accent", t("--tw-color-text-on-accent"), parseColor(t("--tw-color-accent"))],
    ["on-brand / brand", t("--tw-color-text-on-brand"), parseColor(t("--tw-color-brand"))],
    ["on-dark / brand", t("--tw-color-text-on-dark"), parseColor(t("--tw-color-brand"))],
    ["on-dark muted / brand", t("--tw-color-text-on-dark-muted"), parseColor(t("--tw-color-brand"))],
    ["warning / surface", t("--tw-color-warning"), white],
    ["danger / danger 8%", t("--tw-color-danger"), onTint("--tw-tint-danger-8", white)],
  ];
  const failing = pairs
    .map(([name, fg, bg]) => [name, contrast(parseColor(/** @type {string} */ (fg)), /** @type {any} */ (bg))])
    .filter(([, ratio]) => /** @type {number} */ (ratio) < 4.5)
    .map(([name, ratio]) => `${name}: ${/** @type {number} */ (ratio).toFixed(2)}`);
  assert.deepEqual(failing, []);
});
