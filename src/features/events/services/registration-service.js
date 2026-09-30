/**
 * Inscripciones y suscripciones.
 *
 * La inscripción valida con las mismas reglas que el navegador, revisa el estado del evento
 * y delega la escritura en un `RegistrationGateway` (NEXUS o memoria). Un taller se inscribe
 * siempre a través de su evento padre, con su código. Las suscripciones siguen en memoria.
 */
import { workshopCode } from "../domain/event.js";
import { validateRegistration, validateSubscription } from "../domain/registration.js";

/** @typedef {import("./event-service.js").EventService} EventService */
/** @typedef {import("./registration-gateway.js").RegistrationGateway} RegistrationGateway */
/** @typedef {import("../domain/event.js").EventView} EventView */

export class DomainError extends Error {
  /** @param {string} message @param {{ status: number, code: string, fields?: Record<string, string> }} details */
  constructor(message, { status, code, fields }) {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Motivo de rechazo de un taller → texto para el usuario. */
const WORKSHOP_REJECTIONS = {
  sin_cupo: "ya no tiene cupos",
  superpuesto: "choca en horario con otro taller que elegiste",
  superpuesto_con_inscripcion: "choca en horario con un taller en el que ya estás inscrito",
  no_disponible: "ya no está disponible",
  no_existe: "ya no está disponible",
};

/** Campo de la base → campo del formulario. */
const DB_FIELDS = /** @type {Record<string, string>} */ ({ nombre_completo: "nombre", email: "email", empresa: "empresa", cargo: "cargo", telefono: "telefono", subeventos: "talleres" });

/** @param {unknown} value */
const toList = (value) => (Array.isArray(value) ? value : typeof value === "string" && value ? value.split(",") : []);

/**
 * @param {{ eventService: EventService, gateway: RegistrationGateway, onRegistered?: () => void }} deps
 */
export function createRegistrationService({ eventService, gateway, onRegistered = () => {} }) {
  /** @type {Map<string, string[]>} */
  const subscriptions = new Map();

  /** @param {string} eventId */
  async function resolveTarget(eventId) {
    const detail = await eventService.getEventDetail(eventId);
    if (!detail) throw new DomainError("Evento no encontrado", { status: 404, code: "not_found" });
    if (!detail.event.parentId) return { ...detail, preselected: /** @type {string[]} */ ([]) };
    // Taller: la inscripción es al evento padre, con este taller elegido.
    const parent = await eventService.getEventDetail(detail.event.parentId);
    if (!parent) throw new DomainError("Evento no encontrado", { status: 404, code: "not_found" });
    return { ...parent, preselected: [workshopCode(detail.event)] };
  }

  /** El cupo del evento lo decide el gateway: quien ya está inscrito puede sumar talleres aunque no queden cupos. @param {EventView} event */
  function assertOpen(event) {
    if (event.status === "cancelled") throw new DomainError("Este evento fue cancelado. La inscripción no está disponible.", { status: 410, code: "cancelled" });
    if (event.status === "finished") throw new DomainError("Este evento ya finalizó. La inscripción no está disponible.", { status: 410, code: "finished" });
    if (!event.registrationOpen) throw new DomainError("Las inscripciones para este evento están cerradas.", { status: 410, code: "closed" });
  }

  /**
   * @param {EventView[]} children
   * @param {Array<{ code: string, reason: keyof typeof WORKSHOP_REJECTIONS }>} rejected
   */
  function workshopsError(children, rejected) {
    const title = (/** @type {string} */ code) => children.find((c) => workshopCode(c) === code)?.title ?? "Un taller";
    const lines = rejected.map((r) => `«${title(r.code)}» ${WORKSHOP_REJECTIONS[r.reason] ?? "no se pudo agregar"}.`);
    return new DomainError(lines.join(" "), { status: 409, code: "workshops_rejected", fields: { talleres: lines[0] ?? "Revisa los talleres elegidos." } });
  }

  return {
    /**
     * @param {string} eventId  evento o taller
     * @param {Record<string, unknown>} input
     */
    async register(eventId, input) {
      const { event, children, preselected } = await resolveTarget(eventId);
      assertOpen(event);

      const available = children.filter((c) => c.status !== "finished" && c.status !== "cancelled");
      const workshops = available.map((c) => ({ code: workshopCode(c), title: c.title, startsAt: c.startsAt, endsAt: c.endsAt }));
      const { value, errors } = validateRegistration({ ...input, talleres: [...preselected, ...toList(input.talleres)] }, { workshops });
      if (Object.keys(errors).length) {
        throw new DomainError("Revisa los datos marcados.", { status: 422, code: "invalid", fields: /** @type {Record<string, string>} */ (errors) });
      }
      const soldOut = value.talleres.filter((code) => available.find((c) => workshopCode(c) === code)?.seatsLeft === 0);
      if (soldOut.length) throw workshopsError(children, soldOut.map((code) => ({ code, reason: "sin_cupo" })));

      const outcome = await gateway.register(event.id, value, value.talleres);
      if (!outcome.ok) {
        switch (outcome.reason) {
          case "not_found":
            throw new DomainError("Evento no encontrado", { status: 404, code: "not_found" });
          case "invalid": {
            const field = DB_FIELDS[outcome.field];
            throw new DomainError(outcome.message, { status: 422, code: "invalid", fields: field ? { [field]: outcome.message } : undefined });
          }
          case "registro_cerrado":
            throw new DomainError("Las inscripciones para este evento están cerradas.", { status: 410, code: "closed" });
          case "sin_cupo_evento":
            throw new DomainError("No quedan cupos disponibles para esta fecha.", { status: 409, code: "sold_out" });
          default:
            throw workshopsError(children, outcome.rejected);
        }
      }

      onRegistered();
      const titles = (/** @type {string[]} */ codes) => codes.map((code) => children.find((c) => workshopCode(c) === code)?.title ?? code);
      return {
        eventId: event.id,
        eventTitle: event.title,
        email: value.email,
        result: outcome.result,
        workshops: titles(outcome.added),
        alreadyIn: titles(outcome.alreadyIn),
        delivery: outcome.delivery,
      };
    },

    /** @param {Record<string, unknown>} input */
    async subscribe(input) {
      const categories = (await eventService.listCategories()).map((c) => c.id);
      const { value, errors } = validateSubscription(input, categories);
      if (errors.email) throw new DomainError(errors.email, { status: 422, code: "invalid", fields: errors });
      subscriptions.set(value.email, value.categories);
      return value;
    },
  };
}

/** @typedef {ReturnType<typeof createRegistrationService>} RegistrationService */
/** @typedef {Awaited<ReturnType<RegistrationService["register"]>>} RegistrationResult */
