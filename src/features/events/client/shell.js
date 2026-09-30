/**
 * Comportamiento común a todas las páginas del sitio: DS + modal de suscripción.
 */
import { initDesignSystem, openModal } from "../../../design-system/behaviors/index.js";
import { SUBSCRIBE_MODAL_ID } from "../components/subscribe-modal.js";
import { API } from "../domain/links.js";
import { validateSubscription } from "../domain/registration.js";
import { NETWORK_MESSAGE, NetworkError, postJson, renderAlert, setBusy, setFieldErrors } from "./forms.js";
import { captureUtm } from "./session.js";

function initSubscribeModal() {
  const dialog = document.getElementById(SUBSCRIBE_MODAL_ID);
  const form = /** @type {HTMLFormElement | null} */ (dialog?.querySelector("[data-subscribe-form]") ?? null);
  if (!dialog || !form) return;

  const formStep = /** @type {HTMLElement} */ (dialog.querySelector('[data-subscribe-step="form"]'));
  const successStep = /** @type {HTMLElement} */ (dialog.querySelector('[data-subscribe-step="success"]'));
  const alertBox = form.querySelector("[data-form-alert]");
  const submit = /** @type {HTMLButtonElement | null} */ (form.querySelector('button[type="submit"]'));
  const chips = () => [.../** @type {NodeListOf<HTMLButtonElement>} */ (form.querySelectorAll("[data-subscribe-category]"))];

  form.addEventListener("click", (event) => {
    const chip = /** @type {Element} */ (event.target).closest("[data-subscribe-category]");
    if (chip) chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = chips().filter((c) => c.getAttribute("aria-pressed") === "true");
    const payload = {
      email: /** @type {HTMLInputElement} */ (form.elements.namedItem("email")).value,
      categorias: selected.map((c) => c.dataset.subscribeCategory ?? ""),
    };
    const { errors } = validateSubscription(payload, payload.categorias);
    const invalid = setFieldErrors(form, errors, "subscribe");
    renderAlert(alertBox, null);
    if (invalid) return invalid.focus();

    setBusy(submit, true);
    try {
      const { status, body } = await postJson(API.subscriptions, payload);
      if (status !== 201) {
        setFieldErrors(form, body.fields ?? {}, "subscribe");
        return renderAlert(alertBox, { tone: "danger", message: body.error ?? "No pudimos activar los avisos." });
      }
      const names = selected.map((c) => c.textContent?.trim()).filter(Boolean);
      const summary = /** @type {HTMLElement} */ (successStep.querySelector("[data-subscribe-summary]"));
      summary.textContent = names.length ? `Te avisaremos sobre: ${names.join(" · ")}.` : "Te avisaremos de todas las convocatorias Transworld.";
      formStep.hidden = true;
      successStep.hidden = false;
      /** @type {HTMLElement | null} */ (successStep.querySelector("button"))?.focus();
    } catch (error) {
      renderAlert(alertBox, { tone: "danger", message: error instanceof NetworkError ? NETWORK_MESSAGE : "No pudimos activar los avisos." });
    } finally {
      setBusy(submit, false);
    }
  });

  // Al cerrar, el próximo uso parte desde el formulario.
  dialog.addEventListener("close", () => {
    if (!successStep.hidden) {
      form.reset();
      chips().forEach((c) => c.setAttribute("aria-pressed", "false"));
      formStep.hidden = false;
      successStep.hidden = true;
    }
    if (location.hash === `#${SUBSCRIBE_MODAL_ID}`) history.replaceState(null, "", location.pathname + location.search);
  });

  const openFromHash = () => {
    if (location.hash === `#${SUBSCRIBE_MODAL_ID}`) openModal(SUBSCRIBE_MODAL_ID);
  };
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
}

export function initShell() {
  initDesignSystem();
  initSubscribeModal();
  captureUtm();
}
