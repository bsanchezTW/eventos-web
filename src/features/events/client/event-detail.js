/**
 * Detalle de evento: envío de inscripción con validación compartida, formato del teléfono al
 * escribir y datos recordados para inscribirse en otros eventos de la agenda.
 */
import { toHtml } from "../../../design-system/index.js";
import { RegistrationSuccess } from "../components/registration.js";
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
  const workshopInputs = () => [.../** @type {NodeListOf<HTMLInputElement>} */ (form.querySelectorAll('input[name="talleres"]'))];

  // Teléfono: agrupa los dígitos según el país y muestra su formato de ejemplo.
  phone.addEventListener("input", () => {
    phone.value = formatLocalPhoneInput(phone.value, country.value);
  });
  country.addEventListener("change", () => {
    phone.placeholder = getPhoneCountry(country.value).example;
    if (phone.value) phone.value = formatLocalPhoneInput(phone.value, country.value);
  });

  // Al corregir un campo marcado, su error desaparece sin esperar al próximo envío.
  form.addEventListener("input", (event) => {
    const control = /** @type {Element} */ (event.target).closest('[aria-invalid="true"]');
    if (!control) return;
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-describedby");
    const message = /** @type {HTMLElement | null} */ (form.querySelector(`[data-field-error="${CSS.escape(control.id)}"]`));
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
    const first = setFieldErrors(form, errors, "registro");
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
        successStep.innerHTML = toHtml(RegistrationSuccess(body.data));
        formStep.hidden = true;
        successStep.hidden = false;
        const heading = /** @type {HTMLElement | null} */ (successStep.querySelector("#registro-confirmado"));
        heading?.setAttribute("tabindex", "-1");
        heading?.focus();
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

  panel.addEventListener("click", (event) => {
    if (!/** @type {Element} */ (event.target).closest('[data-action="reset-registration"]')) return;
    for (const name of ["nombre", "email", "cargo", "telefono"]) input(name).value = "";
    for (const box of workshopInputs()) box.checked = false;
    successStep.hidden = true;
    successStep.innerHTML = "";
    formStep.hidden = false;
    input("nombre").focus();
  });
}

initShell();
initRegistration();
