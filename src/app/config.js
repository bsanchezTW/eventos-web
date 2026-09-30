/**
 * Configuración desde variables de entorno (ver .env.example).
 */

const SOURCES = ["mock", "api", "supabase"];

/** @param {NodeJS.ProcessEnv} [env] */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? "development";
  const source = (env.EVENTS_SOURCE ?? "mock").trim().toLowerCase();
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/+$/, "") || undefined;
  return {
    port: Number(env.PORT) || 3020,
    nodeEnv,
    isProduction: nodeEnv === "production",
    publicUrl: (env.PUBLIC_URL ?? "").replace(/\/+$/, ""),
    /** Guía viva del Design System en /sistema-de-diseno (siempre en desarrollo; en producción solo con DS_SHOWCASE=1). */
    showcase: nodeEnv !== "production" || env.DS_SHOWCASE === "1",
    events: {
      source: /** @type {"mock" | "api" | "supabase"} */ (SOURCES.includes(source) ? source : "mock"),
      apiUrl: env.EVENTS_API_URL?.trim() || undefined,
      mockLatencyMs: Number(env.EVENTS_MOCK_LATENCY_MS) || 0,
      /** Segundos que se reutiliza la lectura de la base antes de volver a consultarla. */
      cacheTtlMs: (Number(env.EVENTS_CACHE_TTL_S) || 30) * 1000,
    },
    /** Proyecto NEXUS (solo servidor). La clave es la publicable del formulario web, nunca la secreta. */
    supabase: {
      url: supabaseUrl,
      key: env.SUPABASE_PUBLISHABLE_KEY?.trim() || undefined,
    },
    /**
     * Galería: proyecto Supabase de la INTRANET (compartido por Chile y Perú), solo lectura con su
     * clave publicable. Sin estas variables la galería usa álbumes de ejemplo.
     */
    gallery: {
      url: env.INTRANET_SUPABASE_URL?.trim().replace(/\/+$/, "") || undefined,
      key: env.INTRANET_SUPABASE_PUBLISHABLE_KEY?.trim() || undefined,
      cacheTtlMs: (Number(env.GALLERY_CACHE_TTL_S) || 600) * 1000,
    },
    /** Límite de inscripciones por IP (la API pública pide limitar antes de registrar). */
    registrationLimit: {
      max: Number(env.REGISTRATION_RATE_LIMIT) || 10,
      windowMs: (Number(env.REGISTRATION_RATE_WINDOW_S) || 600) * 1000,
    },
  };
}

/** @typedef {ReturnType<typeof loadConfig>} AppConfig */
