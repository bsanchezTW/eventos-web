/**
 * Copia las fuentes del Design System desde los paquetes @fontsource (devDependencies)
 * a src/design-system/assets/fonts. Los .woff2 quedan versionados en el repo, así la
 * app no depende de Google Fonts ni de node_modules en producción.
 *
 * Uso: npm run fonts:sync  (solo al actualizar versiones de las fuentes)
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "src/design-system/assets/fonts");

const FILES = [
  ["@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2", "montserrat-latin-wght-normal.woff2"],
  ["@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-normal.woff2", "montserrat-latin-ext-wght-normal.woff2"],
  ["@fontsource-variable/montserrat/LICENSE", "LICENSE-montserrat.txt"],
  ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", "ibm-plex-mono-latin-400-normal.woff2"],
  ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", "ibm-plex-mono-latin-500-normal.woff2"],
  ["@fontsource/ibm-plex-mono/LICENSE", "LICENSE-ibm-plex-mono.txt"],
];

mkdirSync(dest, { recursive: true });
for (const [from, to] of FILES) {
  copyFileSync(path.join(root, "node_modules", from), path.join(dest, to));
  console.log(`[fonts] ${to}`);
}
