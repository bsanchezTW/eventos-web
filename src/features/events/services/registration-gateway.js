/**
 * Escritura de inscripciones. Dos implementaciones con el mismo contrato:
 * - Supabase: `rpe_publico_registrar` (NEXUS), que valida, controla cupos y solapes, e
 *   inscribe con un único QR por persona y evento; el correo con el QR sale por `envios_qr`.
 * - Memoria: imita esas reglas para desarrollo y tests (EVENTS_SOURCE=mock | api).
 *
 * Reglas de la base: el mismo correo en el mismo evento suma talleres (no duplica ni pisa datos).
 */
import { workshopCode } from "../domain/event.js";
import { findOverlaps } from "../domain/registration.js";
import { RpcError } from "./supabase-rpc.js";

/** @typedef {import("../domain/registration.js").RegistrationInput} RegistrationInput */
/** @typedef {"sin_cupo" | "superpuesto" | "superpuesto_con_inscripcion" | "no_disponible" | "no_existe"} WorkshopRejection */

/**
 * @typedef {{ ok: true, result: "inscrito" | "actualizado" | "sin_cambios", added: string[], alreadyIn: string[], delivery: "programado" | "limitado" }
 *   | { ok: false, reason: "registro_cerrado" | "sin_cupo_evento" | "subeventos_rechazados", rejected: Array<{ code: string, reason: WorkshopRejection }> }
 *   | { ok: false, reason: "not_found" }
 *   | { ok: false, reason: "invalid", field: string, message: string }} GatewayResult
 */

/**
 * @typedef {object} RegistrationGateway
 * @property {(eventId: string, attendee: RegistrationInput, workshopCodes: string[]) => Promise<GatewayResult>} register
 */

/**
 * @param {{ rpc: import("./supabase-rpc.js").SupabaseRpc }} deps
 * @returns {RegistrationGateway}
 */
export function createSupabaseRegistrationGateway({ rpc }) {
  return {
    async register(eventId, attendee, workshopCodes) {
      const datos = {
        nombre_completo: attendee.nombre,
        email: attendee.email,
        empresa: attendee.empresa,
        cargo: attendee.cargo,
        telefono: attendee.telefono,
        ...attendee.utm,
      };
      try {
        /** @type {any} */
        const res = await rpc("rpe_publico_registrar", { p_slug: eventId, p_datos: datos, p_subeventos: workshopCodes });
        if (res?.ok) {
          return {
            ok: true,
            result: res.resultado,
            added: res.agregados ?? [],
            alreadyIn: res.ya_inscrito_en ?? [],
            delivery: res.envio === "limitado" ? "limitado" : "programado",
          };
        }
        return {
          ok: false,
          reason: res?.motivo ?? "registro_cerrado",
          rejected: (res?.rechazados ?? []).map((/** @type {any} */ r) => ({ code: String(r.codigo ?? ""), reason: r.motivo })),
        };
      } catch (error) {
        if (error instanceof RpcError && error.code === "RPE_EVENTO_NO_ENCONTRADO") return { ok: false, reason: "not_found" };
        if (error instanceof RpcError && error.code === "RPE_DATOS_INVALIDOS") {
          return { ok: false, reason: "invalid", field: error.detail?.campo ?? "", message: error.hint ?? "Revisa los datos ingresados." };
        }
        throw error;
      }
    },
  };
}

/**
 * @param {{ eventService: import("./event-service.js").EventService }} deps
 * @returns {RegistrationGateway}
 */
export function createMemoryRegistrationGateway({ eventService }) {
  /** @type {Map<string, Set<string>>} `${evento}:${email}` → talleres */
  const people = new Map();
  /** @type {Map<string, number>} evento o `${evento}:${taller}` → inscritos */
  const taken = new Map();
  const count = (/** @type {string} */ key) => taken.get(key) ?? 0;
  const add = (/** @type {string} */ key) => taken.set(key, count(key) + 1);

  return {
    async register(eventId, attendee, workshopCodes) {
      const detail = await eventService.getEventDetail(eventId);
      if (!detail) return { ok: false, reason: "not_found" };
      const { event, children } = detail;
      if (event.status === "finished" || event.status === "cancelled" || !event.registrationOpen) {
        return { ok: false, reason: "registro_cerrado", rejected: [] };
      }

      const byCode = new Map(children.map((c) => [workshopCode(c), c]));
      const personKey = `${eventId}:${attendee.email}`;
      const current = people.get(personKey);
      /** @type {Array<{ code: string, reason: WorkshopRejection }>} */
      const rejected = [];
      const reject = (/** @type {string} */ code, /** @type {WorkshopRejection} */ reason) => {
        if (!rejected.some((r) => r.code === code)) rejected.push({ code, reason });
      };

      for (const code of workshopCodes) {
        const workshop = byCode.get(code);
        if (!workshop) reject(code, "no_existe");
        else if (workshop.status === "finished" || workshop.status === "cancelled") reject(code, "no_disponible");
      }
      const slot = (/** @type {string} */ code) => {
        const w = /** @type {import("../domain/event.js").EventView} */ (byCode.get(code));
        return { code, title: w.title, startsAt: w.startsAt, endsAt: w.endsAt };
      };
      const valid = workshopCodes.filter((code) => byCode.has(code));
      for (const [a, b] of findOverlaps(valid.map(slot))) {
        reject(a.code, "superpuesto");
        reject(b.code, "superpuesto");
      }
      const mine = [...(current ?? [])].filter((code) => byCode.has(code));
      for (const code of valid.filter((c) => !current?.has(c))) {
        if (findOverlaps([slot(code), ...mine.map(slot)]).length) reject(code, "superpuesto_con_inscripcion");
        const left = byCode.get(code)?.seatsLeft ?? null;
        if (left !== null && count(`${eventId}:${code}`) >= left) reject(code, "sin_cupo");
      }

      if (!current && event.seatsLeft !== null && count(eventId) >= event.seatsLeft) return { ok: false, reason: "sin_cupo_evento", rejected: [] };
      if (rejected.length) return { ok: false, reason: "subeventos_rechazados", rejected };

      const alreadyIn = workshopCodes.filter((code) => current?.has(code));
      const added = workshopCodes.filter((code) => !current?.has(code));
      const codes = current ?? new Set();
      if (!current) add(eventId);
      for (const code of added) {
        codes.add(code);
        add(`${eventId}:${code}`);
      }
      people.set(personKey, codes);
      return { ok: true, result: !current ? "inscrito" : added.length ? "actualizado" : "sin_cambios", added, alreadyIn, delivery: "programado" };
    },
  };
}
