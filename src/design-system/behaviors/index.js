/**
 * Comportamientos del Design System para el navegador. Se activan por atributos
 * `data-tw-*` que emiten los componentes, así cualquier página los obtiene con:
 *
 *   import { initDesignSystem } from "/design-system/behaviors/index.js";
 *   initDesignSystem();
 */
import { Toast, ToastRegion } from "../components/feedback.js";
import { Icon } from "../icons/index.js";
import { toHtml } from "../utils/html.js";

const bound = new WeakSet();

/** @param {string} markup */
function fromHtml(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return /** @type {HTMLElement} */ (template.content.firstElementChild);
}

/* ── Disclosure (menú móvil) ─────────────────────────────────────── */
/** @param {ParentNode} root */
export function initDisclosures(root = document) {
  root.querySelectorAll("[data-tw-disclosure]").forEach((node) => {
    const button = /** @type {HTMLButtonElement} */ (node);
    if (bound.has(button)) return;
    bound.add(button);
    const panel = document.getElementById(button.dataset.twDisclosure ?? "");
    if (!panel) return;

    const set = (/** @type {boolean} */ open) => {
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      button.innerHTML = toHtml(Icon({ name: open ? "close" : "menu", size: 20 }));
      panel.hidden = !open;
    };

    button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
    panel.addEventListener("click", (event) => {
      if (/** @type {Element} */ (event.target).closest("a")) set(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        set(false);
        button.focus();
      }
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", (event) => {
      if (event.matches) set(false);
    });
  });
}

/* ── Modal (<dialog>) ────────────────────────────────────────────── */
/** @param {string} id */
export function openModal(id) {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  dialog.showModal();
  document.body.classList.add("tw-scroll-locked");
  dialog.dispatchEvent(new CustomEvent("tw:open"));
}

/** @param {string} id */
export function closeModal(id) {
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

let modalsBound = false;
export function initModals() {
  if (modalsBound) return;
  modalsBound = true;

  document.addEventListener("click", (event) => {
    const target = /** @type {Element} */ (event.target);
    const opener = target.closest("[data-tw-modal-open]");
    if (opener) {
      event.preventDefault();
      openModal(opener.getAttribute("data-tw-modal-open") ?? "");
      return;
    }
    const closer = target.closest("[data-tw-modal-close]");
    const dialog = target.closest("dialog[data-tw-modal]");
    if (closer && dialog instanceof HTMLDialogElement) {
      dialog.close();
      return;
    }
    // Click en el scrim (el propio <dialog>, fuera del panel) cierra.
    if (target instanceof HTMLDialogElement && target.matches("[data-tw-modal]")) target.close();
  });

  document.addEventListener(
    "close",
    (event) => {
      if (event.target instanceof HTMLDialogElement && !document.querySelector("dialog[open]")) {
        document.body.classList.remove("tw-scroll-locked");
      }
    },
    true,
  );
}

/* ── Carrusel del hero ───────────────────────────────────────────── */
/** @param {HTMLElement} el */
function createCarousel(el) {
  const panels = [...el.querySelectorAll("[data-tw-slide]")];
  const backdrops = [...el.querySelectorAll("[data-tw-slide-backdrop]")];
  const dots = [...el.querySelectorAll(".tw-dots__dot")];
  const counter = el.querySelector("[data-tw-carousel-counter]");
  const toggle = el.querySelector("[data-tw-carousel-toggle]");
  const track = el.querySelector("[data-tw-carousel-track]");
  const total = panels.length;
  if (total < 2) return;

  const interval = Number(el.dataset.interval) || 6500;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
  let index = 0;
  let playing = !reducedMotion;
  let hovering = false;
  let focused = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  const go = (/** @type {number} */ next) => {
    index = (next + total) % total;
    panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
    backdrops.forEach((backdrop, i) => backdrop.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
    if (counter) counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
  };

  const schedule = () => {
    clearTimeout(timer);
    const blocked = !playing || hovering || focused || document.hidden || document.querySelector("dialog[open]");
    if (blocked) return;
    timer = setTimeout(() => {
      go(index + 1);
      schedule();
    }, interval);
  };

  const setPlaying = (/** @type {boolean} */ value) => {
    playing = value;
    if (toggle) {
      toggle.setAttribute("aria-label", value ? "Pausar carrusel" : "Reanudar carrusel");
      toggle.innerHTML = toHtml(Icon({ name: value ? "pause" : "play", size: 20 }));
    }
    track?.setAttribute("aria-live", value ? "off" : "polite");
    schedule();
  };

  // Usar los controles detiene el autoplay: el usuario tomó el control del carrusel.
  const manual = (/** @type {number} */ next) => {
    go(next);
    setPlaying(false);
  };
  el.querySelector("[data-tw-carousel-prev]")?.addEventListener("click", () => manual(index - 1));
  el.querySelector("[data-tw-carousel-next]")?.addEventListener("click", () => manual(index + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => manual(i)));
  toggle?.addEventListener("click", () => setPlaying(!playing));

  el.addEventListener("mouseenter", () => { hovering = true; schedule(); });
  el.addEventListener("mouseleave", () => { hovering = false; schedule(); });
  el.addEventListener("focusin", () => { focused = true; schedule(); });
  el.addEventListener("focusout", (event) => {
    if (!el.contains(/** @type {Node | null} */ (event.relatedTarget))) {
      focused = false;
      schedule();
    }
  });
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("close", schedule, true);

  setPlaying(playing);
}

/** @param {ParentNode} root */
export function initCarousels(root = document) {
  root.querySelectorAll("[data-tw-carousel]").forEach((node) => {
    if (bound.has(node)) return;
    bound.add(node);
    createCarousel(/** @type {HTMLElement} */ (node));
  });
}

/* ── Toast ───────────────────────────────────────────────────────── */
/**
 * @param {string} message
 * @param {{ tone?: "default" | "danger", duration?: number }} [options]
 */
export function showToast(message, { tone = "default", duration = 4000 } = {}) {
  let region = document.querySelector("[data-tw-toast-region]");
  if (!region) {
    region = fromHtml(toHtml(ToastRegion()));
    document.body.append(region);
  }
  const toast = fromHtml(toHtml(Toast({ message, tone })));
  region.append(toast);
  setTimeout(() => toast.remove(), duration);
}

/** Activa todos los comportamientos del sistema. @param {ParentNode} [root] */
export function initDesignSystem(root = document) {
  initDisclosures(root);
  initModals();
  initCarousels(root);
}
