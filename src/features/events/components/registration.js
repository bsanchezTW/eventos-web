/**
 * Panel de inscripción (sticky en el detalle): formulario, estados cerrados y confirmación.
 *
 * Campos del formulario público anterior: nombre y apellido, correo, empresa, cargo y teléfono
 * con código de país; más los talleres del evento (selección múltiple, sin choques de horario).
 */
import {
  Alert,
  Availability,
  Button,
  Card,
  Checkbox,
  ChoiceCard,
  ChoiceGroup,
  Cluster,
  Field,
  Heading,
  Input,
  InputGroup,
  Select,
  SuccessState,
  Tag,
  Text,
  html,
} from "../../../design-system/index.js";
import { isRegistrationOpen, workshopCode } from "../domain/event.js";
import { formatPrice, formatShortDate, formatTimeRange, seatAvailability } from "../domain/format.js";
import { API } from "../domain/links.js";
import { defaultPhoneCountry, getPhoneCountry, phoneCountryOptions } from "../domain/registration.js";

/** @typedef {import("../domain/event.js").EventView} EventView */

/** @param {EventView} event */
function closedState(event) {
  if (event.status === "cancelled") {
    return { title: "Evento cancelado", tone: /** @type {const} */ ("danger"), message: "Este evento fue cancelado. Si estabas inscrito, te escribiremos con las alternativas." };
  }
  if (event.status === "finished") {
    return { title: "Evento finalizado", tone: /** @type {const} */ ("info"), message: "Esta fecha ya se realizó. Revisa las próximas fechas de la agenda o pide el material de la sesión." };
  }
  if (!event.registrationOpen) {
    return { title: "Inscripciones cerradas", tone: /** @type {const} */ ("info"), message: "Ya no recibimos inscripciones para esta fecha. Revisa las próximas fechas de la agenda." };
  }
  return { title: "Cupos agotados", tone: /** @type {const} */ ("info"), message: "No quedan cupos para esta fecha. Suscríbete a la agenda y te avisamos cuando abramos una nueva." };
}

/** "Jue 26 de noviembre · 10:30 – 12:30 · Sala B · Ana Pérez". @param {EventView} workshop */
function workshopMeta(workshop) {
  const speaker = workshop.program[0]?.speaker;
  return [formatShortDate(workshop), formatTimeRange(workshop), workshop.location.venue, speaker].filter(Boolean).join(" · ");
}

/** @param {{ workshops: EventView[] }} props */
function WorkshopPicker({ workshops }) {
  return ChoiceGroup({
    id: "registro-talleres",
    legend: "Talleres (opcional)",
    hint: "Elige todos los que quieras; no puedes tomar dos a la misma hora.",
    children: workshops.map((workshop) => {
      const seats = seatAvailability(workshop);
      return ChoiceCard({
        name: "talleres",
        value: workshopCode(workshop),
        title: workshop.title,
        meta: workshopMeta(workshop),
        aside: Availability({ label: seats.label, tone: seats.tone }),
        disabled: !isRegistrationOpen(workshop),
        attrs: { "data-title": workshop.title, "data-starts": workshop.startsAt, "data-ends": workshop.endsAt },
      });
    }),
  });
}

/**
 * @param {{ event: EventView, workshops?: EventView[], parent?: EventView | null, contactHref: string }} props
 */
export function RegistrationPanel({ event, workshops = [], parent = null, contactHref }) {
  const seats = seatAvailability(event);
  const priceLabel = event.price ? `Valor ${formatPrice(event.price, event.currency)}` : "Inscripción sin costo";

  if (!isRegistrationOpen(event)) {
    const closed = closedState(event);
    return Card({
      variant: "raised",
      as: "section",
      attrs: { "aria-labelledby": "registro-title" },
      children: html`<div class="tw-stack tw-gap-4">
        ${Heading({ level: 2, variant: "h3", id: "registro-title", children: closed.title })}
        ${Alert({ tone: closed.tone, message: closed.message })}
        ${Button({ label: "Inscripción no disponible", variant: "accent", size: "lg", block: true, disabled: true })}
        ${Button({ label: "Ver otras fechas", variant: "brand", block: true, href: "/#calendario" })}
        ${event.status === "finished" ? Button({ label: "Solicitar material de la sesión", variant: "ghost", block: true, href: contactHref }) : ""}
        ${event.seatsLeft === 0 && event.status !== "finished" ? Button({ label: "Avisarme de nuevas fechas", variant: "ghost", block: true, href: "#suscribirme", attrs: { "data-tw-modal-open": "suscribirme" } }) : ""}
      </div>`,
    });
  }

  const openWorkshops = workshops.filter((w) => w.status !== "finished" && w.status !== "cancelled");
  const phoneCountry = defaultPhoneCountry(event.location.country);
  const field = (/** @type {string} */ name, /** @type {string} */ label, /** @type {Record<string, any>} */ props) =>
    Field({ id: `registro-${name}`, label, control: (a11y) => Input({ id: `registro-${name}`, name, ...props, ...a11y }) });

  return Card({
    variant: "raised",
    as: "section",
    attrs: { "aria-labelledby": "registro-title", "data-registration": event.id },
    children: html`<div data-registration-step="form">
        ${Heading({ level: 2, variant: "h3", id: "registro-title", children: "Reserva tu cupo" })}
        ${Text({ variant: "meta", className: "tw-mt-1-5 tw-mb-5", children: `${seats.label} · ${priceLabel}` })}
        ${parent ? Text({ variant: "meta", className: "tw-mb-4", children: `Quedarás inscrito en ${parent.title} con este taller.` }) : ""}
        <noscript>${Alert({ tone: "info", message: html`Activa JavaScript para completar la inscripción o escríbenos a <a href="${contactHref}">eventos@transworld.cl</a>.` })}</noscript>
        <form class="tw-form-grid" method="post" action="${API.registrations(event.id)}" novalidate data-registration-form>
          ${field("nombre", "Nombre y apellido", { autocomplete: "name", placeholder: "María Pérez", required: true })}
          ${field("email", "Correo electrónico", { type: "email", autocomplete: "email", placeholder: "maria@empresa.cl", required: true })}
          <div class="tw-form-grid tw-form-grid--2">
            ${field("empresa", "Empresa", { autocomplete: "organization", placeholder: "Constructora SpA", required: true })}
            ${field("cargo", "Cargo", { autocomplete: "organization-title", placeholder: "Jefa de proyectos", required: true })}
          </div>
          ${Field({
            id: "registro-telefono",
            label: "Teléfono",
            control: (a11y) =>
              InputGroup({
                children: html`${Select({ id: "registro-telefono_pais", name: "telefono_pais", value: phoneCountry, options: phoneCountryOptions(), attrs: { "aria-label": "Código de país", autocomplete: "tel-country-code" } })}
                ${Input({ id: "registro-telefono", name: "telefono", type: "tel", inputmode: "tel", autocomplete: "tel-national", placeholder: getPhoneCountry(phoneCountry).example, required: true, ...a11y })}`,
              }),
          })}
          ${openWorkshops.length ? WorkshopPicker({ workshops: openWorkshops }) : ""}
          ${Checkbox({ id: "registro-acepta", name: "acepta", checked: true, attrs: { "aria-describedby": "registro-acepta-error" }, label: "Acepto recibir la confirmación y recordatorios de este evento por correo." })}
          <p class="tw-field__error" id="registro-acepta-error" data-field-error="registro-acepta" hidden></p>
          <div id="registro-alert" data-form-alert></div>
          ${Button({ label: "Confirmar inscripción", type: "submit", variant: "accent", size: "lg", block: true })}
          <p class="tw-text tw-text--caption tw-text--muted tw-text-center">Te enviaremos tu código QR de acceso por correo.</p>
        </form>
      </div>
      <div data-registration-step="success" hidden></div>`,
  });
}

/** @typedef {import("../services/registration-service.js").RegistrationResult} RegistrationResult */

/** @param {Pick<RegistrationResult, "result" | "email" | "delivery" | "eventTitle">} props */
function successCopy({ result, email, delivery, eventTitle }) {
  const to = html`<strong>${email}</strong>`;
  if (result === "inscrito") return { title: "¡Inscripción confirmada!", text: html`Te enviamos tu código QR de acceso a ${to}. Preséntalo en la entrada de ${eventTitle}.` };
  if (result === "actualizado") return { title: "Sumamos tus talleres", text: html`Tu inscripción en ${eventTitle} ya los incluye. Te enviamos el código QR actualizado a ${to}.` };
  if (delivery === "limitado") return { title: "Ya estabas inscrito", text: html`Este correo ya estaba inscrito. Te enviamos el código QR hace unos minutos a ${to}.` };
  return { title: "Ya estabas inscrito", text: html`Este correo ya estaba inscrito. Te reenviamos el código QR a ${to}.` };
}

/** Confirmación (la renderiza el cliente tras el POST). @param {Pick<RegistrationResult, "result" | "email" | "delivery" | "eventTitle" | "workshops" | "alreadyIn">} props */
export function RegistrationSuccess(props) {
  const copy = successCopy(props);
  const tags = (/** @type {string[]} */ labels) => Cluster({ gap: "2", className: "tw-cluster--center", children: labels.map((label) => Tag({ label })) });
  return SuccessState({
    title: copy.title,
    headingLevel: 2,
    id: "registro-confirmado",
    text: copy.text,
    children: html`${props.workshops.length ? html`<div class="tw-stack tw-gap-2 tw-mt-4">${Text({ variant: "meta", children: "Talleres agregados" })}${tags(props.workshops)}</div>` : ""}
      ${props.alreadyIn.length ? html`<div class="tw-stack tw-gap-2 tw-mt-4">${Text({ variant: "meta", children: "Ya estabas inscrito en" })}${tags(props.alreadyIn)}</div>` : ""}
      ${Text({ variant: "caption", className: "tw-mt-4", children: "El correo puede tardar unos minutos. Si no lo ves, revisa la carpeta de spam." })}
      <div class="tw-stack tw-gap-2 tw-mt-5">
        ${Button({ label: "Inscribirme en otro evento", variant: "brand", block: true, href: "/#calendario" })}
        ${Button({ label: "Inscribir a otra persona", variant: "ghost", block: true, className: "tw-btn--medium", attrs: { "data-action": "reset-registration" } })}
      </div>`,
  });
}
