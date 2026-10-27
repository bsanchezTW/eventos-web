/**
 * Fotos de los eventos (las que el staff sube en NEXUS) en tamaño reducido. Isomórfico.
 *
 * El Storage público de NEXUS sirve el archivo original (hasta varios MB, en PNG). Para no gastar
 * cuota de Supabase se pide la transformación de imagen: el navegador recibe WebP al ancho que
 * de verdad se muestra (p. ej. 1,1 MB → 65 KB en una tarjeta). Las demás URLs no se tocan.
 */

const PUBLIC_OBJECT = "/storage/v1/object/public/";
const PUBLIC_RENDER = "/storage/v1/render/image/public/";

/** Ancho máximo por uso; la foto se pide completa (`resize=contain`), nunca recortada. */
export const EVENT_IMAGE_WIDTHS = { card: 640, hero: 1600 };

/**
 * @param {string | null | undefined} src
 * @param {keyof typeof EVENT_IMAGE_WIDTHS} use
 * @returns {string}
 */
export function eventImage(src, use) {
  const url = String(src ?? "");
  const at = url.indexOf(PUBLIC_OBJECT);
  if (at < 0 || !/^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(url)) return url;
  const width = EVENT_IMAGE_WIDTHS[use];
  const [path, query] = url.slice(at + PUBLIC_OBJECT.length).split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries({ width, height: width, resize: "contain", quality: use === "hero" ? 75 : 70 })) params.set(key, String(value));
  return `${url.slice(0, at)}${PUBLIC_RENDER}${path}?${params}`;
}
