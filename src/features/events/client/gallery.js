/**
 * Álbum de la galería: lightbox con navegación anterior / siguiente (flechas del teclado incluidas).
 */
import { openModal } from "../../../design-system/behaviors/index.js";
import { toHtml } from "../../../design-system/index.js";
import { LightboxContent } from "../components/gallery.js";
import { initShell } from "./shell.js";

/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

function initLightbox() {
  const dataNode = document.getElementById("gallery-data");
  const dialog = document.getElementById("lightbox");
  const content = dialog?.querySelector("[data-lightbox-content]");
  if (!dataNode || !dialog || !content) return;

  /** @type {{ title: string, items: MediaItem[] }} */
  const { title, items } = JSON.parse(dataNode.textContent ?? '{"title":"","items":[]}');
  let index = 0;

  const show = (/** @type {number} */ next) => {
    index = (next + items.length) % items.length;
    content.innerHTML = toHtml(LightboxContent({ item: items[index], index, total: items.length, title }));
  };

  document.addEventListener("click", (event) => {
    const target = /** @type {Element} */ (event.target);
    const card = target.closest("[data-lightbox]");
    if (card) {
      show(Number(card.getAttribute("data-lightbox")));
      openModal("lightbox");
      /** @type {HTMLElement | null} */ (dialog.querySelector("[data-lightbox-next]"))?.focus();
      return;
    }
    if (target.closest("[data-lightbox-prev]")) show(index - 1);
    else if (target.closest("[data-lightbox-next]")) show(index + 1);
    else return;
    // Mantiene el foco en el mismo control tras re-renderizar el contenido.
    const control = target.closest("[data-lightbox-prev]") ? "[data-lightbox-prev]" : "[data-lightbox-next]";
    /** @type {HTMLElement | null} */ (dialog.querySelector(control))?.focus();
  });

  // Un video no sigue sonando con el lightbox cerrado.
  dialog.addEventListener("close", () => dialog.querySelectorAll("video").forEach((video) => video.pause()));

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
  });
}

initShell();
initLightbox();
