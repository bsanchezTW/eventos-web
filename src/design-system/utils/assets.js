/**
 * Rutas públicas de los assets del Design System. `DS_MOUNT` debe coincidir con el
 * punto de montaje de `designSystemAssets()` en el servidor.
 *
 * Se monta con el mismo nombre que la carpeta (src/design-system → /design-system) para
 * que los imports relativos entre módulos (p. ej. features/events/components →
 * ../../../design-system/index.js) resuelvan igual en Node y en el navegador.
 */
export const DS_MOUNT = "/design-system";

/** @param {string} file ruta relativa a src/design-system/assets */
export function dsAsset(file) {
  return `${DS_MOUNT}/assets/${file}`;
}

/** Recursos de marca incorporados desde el template. */
export const BRAND = {
  name: "TRANSWORLD",
  logo: dsAsset("brand/logo-transworld-96.png"),
  logoLarge: dsAsset("brand/logo-transworld-192.png"),
  heroImage: dsAsset("images/hero-casa-matriz.jpg"),
};
