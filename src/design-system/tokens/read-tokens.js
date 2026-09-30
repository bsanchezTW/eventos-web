/**
 * Lee los tokens de tokens.css (solo Node). Lo usan la guía viva del sistema y los tests
 * de contraste, para que tokens.css siga siendo la única fuente de verdad.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOKENS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "tokens.css");

/**
 * Tokens del bloque :root principal (sin overrides responsive), con var() resueltos.
 * @returns {Map<string, string>}
 */
export function readTokens() {
  const css = readFileSync(TOKENS_FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const start = css.indexOf(":root {");
  const block = css.slice(start, css.indexOf("}", start));
  /** @type {Map<string, string>} */
  const raw = new Map();
  for (const [, name, value] of block.matchAll(/(--tw-[\w-]+):\s*([^;]+);/g)) raw.set(name, value.trim().replace(/\s+/g, " "));

  /** @param {string} value @param {number} depth @returns {string} */
  const resolve = (value, depth = 0) =>
    depth > 8 ? value : value.replace(/var\((--tw-[\w-]+)\)/g, (_, ref) => resolve(raw.get(ref) ?? ref, depth + 1));

  return new Map([...raw].map(([name, value]) => [name, resolve(value)]));
}
