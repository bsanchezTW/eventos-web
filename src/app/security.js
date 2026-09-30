/**
 * Cabeceras de seguridad. La CSP es estricta: todo se sirve desde el mismo origen y
 * el Design System no usa estilos ni scripts inline (fuentes self-hosted, sin CDNs).
 * Excepciones declaradas: imágenes del Storage de Supabase (fotos de eventos y de la galería),
 * videos de la galería e iframes de mapas (Google Maps en el detalle del evento).
 */

/** @param {string[]} imageOrigins @param {string[]} frameOrigins @param {string[]} mediaOrigins */
function contentSecurityPolicy(imageOrigins, frameOrigins, mediaOrigins) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    ["img-src 'self' data:", ...imageOrigins].join(" "),
    "font-src 'self'",
    ["frame-src 'self'", ...frameOrigins].join(" "),
    ["media-src 'self'", ...mediaOrigins].join(" "),
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * @param {{ imageOrigins?: string[], frameOrigins?: string[], mediaOrigins?: string[] }} [options]
 * @returns {import("express").RequestHandler}
 */
export function securityHeaders({ imageOrigins = [], frameOrigins = [], mediaOrigins = [] } = {}) {
  const csp = contentSecurityPolicy(imageOrigins, frameOrigins, mediaOrigins);
  return (_req, res, next) => {
    res.set({
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  };
}
