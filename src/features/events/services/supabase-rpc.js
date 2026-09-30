/**
 * Cliente mínimo de las RPC públicas de NEXUS (Supabase / PostgREST). Solo servidor: la clave
 * publicable nunca llega al navegador.
 *
 *   POST {url}/rest/v1/rpc/<nombre>   apikey: <publicable eventos_web>
 *
 * Contrato: nexus-app/docs/api-publica.md.
 */
import { RepositoryError } from "./errors.js";

/**
 * Error de negocio lanzado por una RPC (`RAISE EXCEPTION`): `code` es el mensaje RPE_* y
 * `detail` el JSON `{ campo, regla }` cuando corresponde.
 */
export class RpcError extends Error {
  /** @param {{ code: string, status: number, detail?: Record<string, string> | null, hint?: string | null }} info */
  constructor({ code, status, detail = null, hint = null }) {
    super(code);
    this.name = "RpcError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.hint = hint;
  }
}

/** @param {unknown} value */
function parseDetail(value) {
  if (typeof value !== "string" || !value.startsWith("{")) return null;
  try {
    return /** @type {Record<string, string>} */ (JSON.parse(value));
  } catch {
    return null;
  }
}

/**
 * @param {{ url: string, key: string, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 * @returns {<T = unknown>(name: string, args?: Record<string, unknown>) => Promise<T>}
 */
export function createSupabaseRpc({ url, key, fetchImpl = fetch, timeoutMs = 8000 }) {
  const root = `${url.replace(/\/+$/, "")}/rest/v1/rpc`;

  return async function rpc(name, args = {}) {
    let response;
    try {
      response = await fetchImpl(`${root}/${name}`, {
        method: "POST",
        headers: { apikey: key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new RepositoryError(`No se pudo conectar con la base de eventos (${name})`, { cause });
    }

    const body = await response.json().catch(() => null);
    if (response.ok) return body;

    // Las excepciones RPE_* llegan con el código de error en `message` (el status HTTP varía: 400 o 500).
    if (body && typeof body.message === "string" && body.message.startsWith("RPE_")) {
      throw new RpcError({ code: body.message, status: response.status, detail: parseDetail(body.details), hint: body.hint ?? null });
    }
    throw new RepositoryError(`La base de eventos respondió ${response.status} (${name})`, { status: response.status });
  };
}

/** @typedef {ReturnType<typeof createSupabaseRpc>} SupabaseRpc */
