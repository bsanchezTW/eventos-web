/**
 * Detalle de evento: envío de inscripción con validación compartida, formato del teléfono al
 * escribir y datos recordados para inscribirse en otros eventos de la agenda.
 * Los talleres se marcan en "Talleres y actividades" (fuera del panel): sus casillas pertenecen
 * al formulario por el atributo `form`, y sus errores se muestran allí.
 */
import { toHtml } from "../../../design-system/index.js";
import { AlreadyRegistered, RegistrationSuccess } from "../components/registration.js";
import { API } from "../domain/links.js";
import { formatLocalPhoneInput, getPhoneCountry, validateRegistration } from "../domain/registration.js";
import { NETWORK_MESSAGE, NetworkError, postJson, renderAlert, setBusy, setFieldErrors } from "./forms.js";
import { readAttendee, readUtm, rememberAttendee } from "./session.js";
import { initShell } from "./shell.js";

const PERSONAL_FIELDS = ["nombre", "email", "empresa", "cargo", "telefono_pais", "telefono"];

function initRegistration() {
  const panel = /** @type {HTMLElement | null} */ (document.querySelector("[data-registration]"));
  const form = /** @type {HTMLFormElement | null} */ (panel?.querySelector("[data-registration-form]") ?? null);
  if (!panel || !form) return;

  const eventId = panel.dataset.registration ?? "";
  const formStep = /** @type {HTMLElement} */ (panel.querySelector('[data-registration-step="form"]'));
  const successStep = /** @type {HTMLElement} */ (panel.querySelector('[data-registration-step="success"]'));
  const alertBox = form.querySelector("[data-form-alert]");
  const submit = /** @type {HTMLButtonElement | null} */ (form.querySelector('button[type="submit"]'));
  const input = (/** @type {string} */ name) => /** @type {HTMLInputElement | HTMLSelectElement} */ (form.elements.namedItem(name));
  const phone = /** @type {HTMLInputElement} */ (input("telefono"));
  const country = /** @type {HTMLSelectElement} */ (input("telefono_pais"));
  // Casillas asociadas al formulario (también las que están fuera de él, con el atributo form).
  const workshopInputs = () => /** @type {HTMLInputElement[]} */ ([...form.elements].filter((el) => el instanceof HTMLInputElement && el.name === "talleres"));
  // Contenedor con el formulario y la lista de talleres: ahí viven sus mensajes de error.
  const root = /** @type {HTMLElement} */ (panel.closest(".tw-split") ?? form);
  const summary = /** @type {HTMLElement | null} */ (panel.querySelector("[data-workshops-summary]"));

  /** Resumen en el panel de lo marcado en la lista de talleres. */
  const updateSummary = () => {
    if (!summary) return;
    const chosen = workshopInputs().filter((i) => i.checked).map((i) => i.dataset.title ?? i.value);
    summary.textContent = chosen.length ? `${chosen.length === 1 ? "1 taller" : `${chosen.length} talleres`}: ${chosen.join(", ")}` : "Ningún taller elegido (opcional)";
  };
  root.addEventListener("change", (event) => {
    if (/** @type {HTMLInputElement} */ (event.target).name === "talleres") updateSummary();
  });

  // Teléfono: agrupa los dígitos según el país y muestra su formato de ejemplo.
  phone.addEventListener("input", () => {
    phone.value = formatLocalPhoneInput(phone.value, country.value);
  });
  country.addEventListener("change", () => {
    phone.placeholder = getPhoneCountry(country.value).example;
    if (phone.value) phone.value = formatLocalPhoneInput(phone.value, country.value);
  });

  // Al corregir un campo marcado, su error desaparece sin esperar al próximo envío.
  root.addEventListener("input", (event) => {
    const control = /** @type {Element} */ (event.target).closest('[aria-invalid="true"]');
    if (!control) return;
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-describedby");
    const message = /** @type {HTMLElement | null} */ (root.querySelector(`[data-field-error="${CSS.escape(control.id)}"]`));
    if (message) message.hidden = true;
  });

  // Datos de una inscripción anterior en esta pestaña.
  const saved = readAttendee();
  if (saved) {
    for (const name of PERSONAL_FIELDS) if (saved[name] && !input(name).value) input(name).value = saved[name];
    if (saved.telefono_pais) country.value = saved.telefono_pais;
    if (saved.telefono) phone.value = formatLocalPhoneInput(saved.telefono.replace(/^\+\d+\s*/, ""), country.value);
  }

  const payload = () => ({
    ...Object.fromEntries(PERSONAL_FIELDS.map((name) => [name, input(name).value])),
    talleres: workshopInputs().filter((i) => i.checked).map((i) => i.value),
    acepta: /** @type {HTMLInputElement} */ (input("acepta")).checked,
    utm: readUtm(),
  });
  const workshops = () =>
    workshopInputs()
      .filter((i) => !i.disabled)
      .map((i) => ({ code: i.value, title: i.dataset.title ?? "", startsAt: i.dataset.starts ?? "", endsAt: i.dataset.ends ?? "" }));

  /** @param {Record<string, string | undefined>} errors */
  const showErrors = (errors) => {
    const first = setFieldErrors(root, errors, "registro");
    first?.focus();
    return first;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = payload();
    const { errors } = validateRegistration(data, { workshops: workshops() });
    renderAlert(alertBox, null);
    if (showErrors(errors)) return;

    setBusy(submit, true);
    try {
      const { status, body } = await postJson(API.registrations(eventId), data);
      if (status === 201) {
        const { value } = validateRegistration(data);
        rememberAttendee({ nombre: value.nombre, email: value.email, empresa: value.empresa, cargo: value.cargo, telefono_pais: value.telefono_pais, telefono: value.telefono });
        showStep(successStep, RegistrationSuccess(body.data), "#registro-confirmado");
        return;
      }
      if (body.code === "already_registered") {
        showStep(successStep, AlreadyRegistered({ email: input("email").value.trim().toLowerCase() }), "#registro-existente");
        return;
      }
      const fields = body.fields ?? {};
      const focused = showErrors(fields);
      // Errores sin campo (cupos, cierre, límite de intentos) o con varios talleres rechazados van en la alerta.
      if (!focused || body.code === "workshops_rejected") {
        renderAlert(alertBox, { tone: "danger", message: body.error ?? "No pudimos completar la inscripción." });
      }
    } catch (error) {
      renderAlert(alertBox, { tone: "danger", message: error instanceof NetworkError ? NETWORK_MESSAGE : "No pudimos completar la inscripción." });
    } finally {
      setBusy(submit, false);
    }
  });

  /** Reemplaza el formulario por un paso (confirmación o aviso) y lleva el foco a su título. */
  function showStep(/** @type {HTMLElement} */ step, /** @type {import("../../../design-system/utils/html.js").Renderable} */ content, /** @type {string} */ headingSelector) {
    step.innerHTML = toHtml(content);
    formStep.hidden = true;
    step.hidden = false;
    const heading = /** @type {HTMLElement | null} */ (step.querySelector(headingSelector));
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }

  function backToForm() {
    successStep.hidden = true;
    successStep.innerHTML = "";
    formStep.hidden = false;
  }

  panel.addEventListener("click", (event) => {
    const action = /** @type {Element} */ (event.target).closest("[data-action]")?.getAttribute("data-action");
    if (action === "reset-registration") {
      for (const name of ["nombre", "email", "cargo", "telefono"]) input(name).value = "";
      for (const box of workshopInputs()) box.checked = false;
      updateSummary();
      backToForm();
      input("nombre").focus();
    } else if (action === "back-to-form") {
      backToForm();
      input("email").focus();
    } else if (action === "request-edit-link") {
      // Pendiente: el envío del enlace para modificar la inscripción se implementa después.
      renderAlert(panel.querySelector("[data-edit-link-status]"), {
        tone: "info",
        message: "Estamos habilitando esta opción. Muy pronto podrás pedir aquí el enlace para modificar tu inscripción.",
      });
    }
  });
}

initShell();
initRegistration();
