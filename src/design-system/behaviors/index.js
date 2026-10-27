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

/* ── Rollo fotográfico ───────────────────────────────────────────── */
/**
 * La foto activa queda siempre en la misma posición (`slot`) del centro: al avanzar, la tira se
 * desliza un cuadro y el primero pasa al final (y al revés al retroceder), así el rollo no tiene fin.
 * @param {HTMLElement} el
 */
function createFilmStrip(el) {
  const track = /** @type {HTMLElement | null} */ (el.querySelector("[data-tw-filmstrip-track]"));
  const title = el.querySelector("[data-tw-filmstrip-title]");
  if (!track || track.children.length < 2) return;

  const frames = () => /** @type {HTMLElement[]} */ ([...track.children]);
  const slot = Math.min(Math.floor(track.children.length / 2), 6);
  const interval = Number(el.dataset.interval) || 3200;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slideMs = reducedMotion ? 0 : 950;
  let busy = false;
  let hovering = false;
  let focused = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  el.classList.add("is-enhanced");

  /** Desplaza la tira `shift` cuadros desde la posición de reposo. @param {number} shift @param {boolean} animate */
  const place = (shift, animate) => {
    const [a, b] = frames();
    const step = b.offsetLeft - a.offsetLeft;
    const center = /** @type {HTMLElement} */ (track.parentElement).clientWidth / 2;
    track.classList.toggle("is-moving", animate && slideMs > 0);
    track.style.setProperty("--tw-filmstrip-x", `${center - (a.offsetLeft + slot * step + a.offsetWidth / 2) - shift * step}px`);
  };

  /** @param {number} index */
  const mark = (index) => {
    frames().forEach((frame, i) => frame.classList.toggle("is-active", i === index));
    if (title) title.textContent = frames()[index]?.dataset.title ?? "";
  };

  const settle = (/** @type {() => void} */ done) => setTimeout(done, slideMs);

  const next = () => {
    if (busy) return;
    busy = true;
    mark(slot + 1);
    place(1, true);
    settle(() => {
      track.append(frames()[0]);
      place(0, false);
      mark(slot);
      busy = false;
    });
  };

  const prev = () => {
    if (busy) return;
    busy = true;
    const list = frames();
    track.prepend(list[list.length - 1]);
    place(1, false);
    void track.offsetWidth; // aplica la posición sin animar antes de deslizar
    mark(slot);
    place(0, true);
    settle(() => {
      busy = false;
    });
  };

  const schedule = () => {
    clearTimeout(timer);
    if (reducedMotion || hovering || focused || document.hidden || document.querySelector("dialog[open]")) return;
    timer = setTimeout(() => {
      next();
      schedule();
    }, interval);
  };

  el.querySelector("[data-tw-filmstrip-next]")?.addEventListener("click", () => {
    next();
    schedule();
  });
  el.querySelector("[data-tw-filmstrip-prev]")?.addEventListener("click", () => {
    prev();
    schedule();
  });
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
  window.addEventListener("resize", () => place(0, false));

  place(0, false);
  mark(slot);
  schedule();
}

/** @param {ParentNode} root */
export function initFilmStrips(root = document) {
  root.querySelectorAll("[data-tw-filmstrip]").forEach((node) => {
    if (bound.has(node)) return;
    bound.add(node);
    createFilmStrip(/** @type {HTMLElement} */ (node));
  });
}

/* ── Slider de cabecera de la galería ────────────────────────────── */
/**
 * Fotos que se funden; cada una se descarga recién cuando le toca (y la siguiente queda
 * precargada). Autoplay que se pausa con hover/foco y con la pestaña oculta; flechas, puntos,
 * teclado y deslizar con el dedo.
 * @param {HTMLElement} el
 */
function createGallerySlider(el) {
  const slides = /** @type {HTMLElement[]} */ ([...el.querySelectorAll("[data-tw-slide]")]);
  const dots = [...el.querySelectorAll("[data-tw-slider-go]")];
  if (slides.length < 2) return;
  const interval = Number(el.dataset.interval) || 5500;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let paused = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  /** @param {number} index */
  const preload = (index) => {
    const img = slides[(index + slides.length) % slides.length].querySelector("img");
    if (!img) return Promise.resolve();
    const src = img.getAttribute("data-src");
    if (src) {
      img.src = src;
      img.removeAttribute("data-src");
    }
    return img.complete ? Promise.resolve() : img.decode().catch(() => {});
  };

  const stop = () => clearTimeout(timer);
  const schedule = () => {
    stop();
    if (paused || reducedMotion || document.hidden) return;
    timer = setTimeout(() => go(current + 1), interval);
  };

  /** @param {number} index */
  function go(index) {
    const target = (index + slides.length) % slides.length;
    if (target === current) return;
    stop();
    preload(target).then(() => {
      slides[current].classList.remove("is-active");
      current = target;
      slides[current].classList.add("is-active");
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === current);
        dot.setAttribute("aria-selected", String(i === current));
      });
      preload(current + 1);
      schedule();
    });
  }

  el.addEventListener("click", (event) => {
    const target = /** @type {Element} */ (event.target);
    const move = target.closest("[data-tw-slider-move]");
    if (move) return go(current + Number(move.getAttribute("data-tw-slider-move")));
    const dot = target.closest("[data-tw-slider-go]");
    if (dot) go(Number(dot.getAttribute("data-tw-slider-go")));
  });
  el.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") go(current - 1);
    if (event.key === "ArrowRight") go(current + 1);
  });
  /** @type {number | null} */
  let startX = null;
  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") startX = event.clientX;
  });
  el.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) > 45) go(current + (delta < 0 ? 1 : -1));
  });
  for (const [type, value] of /** @type {const} */ ([["mouseenter", true], ["mouseleave", false], ["focusin", true], ["focusout", false]])) {
    el.addEventListener(type, () => {
      paused = value;
      if (value) stop();
      else schedule();
    });
  }
  document.addEventListener("visibilitychange", schedule);

  preload(1);
  schedule();
}

/** @param {ParentNode} root */
export function initGallerySliders(root = document) {
  root.querySelectorAll("[data-tw-slider]").forEach((node) => {
    if (bound.has(node)) return;
    bound.add(node);
    createGallerySlider(/** @type {HTMLElement} */ (node));
  });
}

/* ── Entrada de fotos (galería) ──────────────────────────────────── */
let revealBurst = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let revealReset;

/**
 * La foto entra al terminar de cargar (desenfoque → nítida), escalonada dentro de cada tanda
 * que llega junta; su marco deja el shimmer.
 * @param {HTMLImageElement} img
 */
function reveal(img) {
  if (img.classList.contains("is-ready")) return;
  img.style.setProperty("--tw-reveal-delay", `${Math.min(revealBurst++, 12) * 45}ms`);
  clearTimeout(revealReset);
  revealReset = setTimeout(() => (revealBurst = 0), 250);
  requestAnimationFrame(() => {
    img.classList.add("is-ready");
    img.parentElement?.classList.remove("is-loading");
  });
}

let revealBound = false;
/** @param {ParentNode} root */
export function initReveal(root = document) {
  root.querySelectorAll("img[data-tw-reveal]").forEach((img) => {
    const image = /** @type {HTMLImageElement} */ (img);
    if (image.complete && image.naturalWidth) reveal(image);
  });
  if (revealBound) return;
  revealBound = true;
  // `load` y `error` no burbujean: se escuchan en captura (también las fotos que llegan después).
  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.hasAttribute("data-tw-reveal")) reveal(event.target);
  }, true);
  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.hasAttribute("data-tw-reveal")) event.target.parentElement?.classList.remove("is-loading");
  }, true);
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
  initFilmStrips(root);
  initGallerySliders(root);
  initReveal(root);
}
