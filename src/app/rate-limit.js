/**
 * Límite de solicitudes por IP en ventana fija, en memoria (una instancia del servidor).
 * Con varias réplicas, cada una cuenta por separado.
 */

/**
 * @param {{ max: number, windowMs: number, message: string, clock?: () => number }} options
 * @returns {import("express").RequestHandler}
 */
export function rateLimit({ max, windowMs, message, clock = Date.now }) {
  /** @type {Map<string, { start: number, count: number }>} */
  const hits = new Map();

  return (req, res, next) => {
    const now = clock();
    if (hits.size > 10_000) {
      for (const [key, entry] of hits) if (now - entry.start >= windowMs) hits.delete(key);
    }
    const key = req.ip ?? "desconocida";
    let entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.start + windowMs - now) / 1000)));
      res.status(429).json({ ok: false, code: "rate_limited", error: message });
      return;
    }
    next();
  };
}
