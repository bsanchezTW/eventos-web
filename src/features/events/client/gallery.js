/**
 * Álbum de la galería (diseño de la intranet): las tandas siguientes del mosaico llegan solas al
 * acercarse al final (con skeletons mientras tanto) y el visor a pantalla completa navega con
 * flechas, teclado y deslizando; al pasar la última pieza cargada, pide la tanda siguiente.
 * "Descargar" baja la versión reducida (no el original).
 */
import { initReveal } from "../../../design-system/behaviors/index.js";
import { toHtml } from "../../../design-system/index.js";
import { MediaTiles, TileSkeletons } from "../components/gallery.js";
import { ALBUM_PAGE } from "../domain/gallery.js";
import { API } from "../domain/links.js";
import { initShell } from "./shell.js";

/** @typedef {import("../domain/gallery.js").MediaItem} MediaItem */

function initAlbum() {
  const dataNode = document.getElementById("gallery-data");
  const mosaic = document.querySelector("[data-album-mosaic]");
  const viewer = document.querySelector("[data-tw-viewer]");
  if (!dataNode || !mosaic || !(viewer instanceof HTMLElement)) return;

  /** @type {{ slug: string, total: number, items: MediaItem[] }} */
  const { slug, total, items } = JSON.parse(dataNode.textContent ?? '{"slug":"","total":0,"items":[]}');
  const sentinel = document.querySelector("[data-album-more]");
  /** @type {Promise<boolean> | null} */
  let loading = null;

  /* ── Tandas al bajar ── */
  /** Trae la tanda siguiente; true si llegaron piezas. */
  const loadMore = () => {
    if (loading) return loading;
    if (items.length >= total) return Promise.resolve(false);
    const skeletons = document.createElement("template");
    skeletons.innerHTML = toHtml(TileSkeletons({ count: Math.min(ALBUM_PAGE, total - items.length) }));
    const placeholders = [...skeletons.content.children];
    mosaic.append(...placeholders);
    loading = fetch(API.albumItems(slug, items.length, ALBUM_PAGE), { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((body) => {
        /** @type {MediaItem[]} */
        const next = body.data.items;
        const from = items.length;
        items.push(...next);
        placeholders.forEach((node) => node.remove());
        mosaic.insertAdjacentHTML("beforeend", toHtml(MediaTiles({ items: next, offset: from, total })));
        initReveal(mosaic);
        return next.length > 0;
      })
      .catch(() => {
        placeholders.forEach((node) => node.remove());
        return false;
      })
      .finally(() => {
        loading = null;
        if (items.length >= total) sentinel?.remove();
      });
    return loading;
  };

  if (sentinel) {
    const nearEnd = () => sentinel.isConnected && sentinel.getBoundingClientRect().top < window.innerHeight + 600;
    // El observador avisa solo al cruzar el borde: si una tanda no alcanza a alejar el final de
    // la pantalla, se sigue pidiendo hasta que lo haga.
    const fill = () => {
      if (nearEnd()) loadMore().then((more) => more && fill());
    };
    new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && fill(), { rootMargin: "600px 0px" }).observe(sentinel);
  }

  /* ── Visor ── */
  const stage = /** @type {HTMLElement} */ (viewer.querySelector("[data-tw-viewer-stage]"));
  const counter = /** @type {HTMLElement} */ (viewer.querySelector("[data-tw-viewer-counter]"));
  const download = /** @type {HTMLAnchorElement} */ (viewer.querySelector("[data-tw-viewer-download]"));
  const prev = /** @type {HTMLButtonElement} */ (viewer.querySelector("[data-tw-viewer-prev]"));
  const next = /** @type {HTMLButtonElement} */ (viewer.querySelector("[data-tw-viewer-next]"));
  const close = /** @type {HTMLButtonElement} */ (viewer.querySelector("[data-tw-viewer-close]"));
  let index = 0;
  /** @type {Element | null} */
  let lastFocus = null;

  const paint = () => {
    const item = items[index];
    if (!item?.src) return;
    stage.replaceChildren();
    const media = document.createElement(item.type === "video" ? "video" : "img");
    if (media instanceof HTMLVideoElement) {
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;
    } else {
      media.alt = "";
    }
    media.className = "tw-photo-viewer__media";
    media.src = item.src;
    stage.append(media);
    counter.textContent = `${index + 1} / ${total}`;
    const name = `${slug}-${index + 1}.${item.type === "video" ? "mp4" : "webp"}`;
    download.href = `${item.src}${item.src.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
    download.setAttribute("download", name);
    prev.hidden = next.hidden = total < 2;
    // La siguiente queda precargada (versión reducida): avanzar se siente inmediato.
    const upcoming = items[index + 1];
    if (upcoming?.type === "foto" && upcoming.src) new Image().src = upcoming.src;
  };

  /** @param {number} delta */
  const move = async (delta) => {
    if (delta > 0 && index === items.length - 1 && items.length < total) await loadMore();
    index = (index + delta + items.length) % items.length;
    paint();
  };

  const closeViewer = () => {
    if (viewer.hidden) return;
    viewer.hidden = true;
    stage.replaceChildren(); // un video no sigue sonando con el visor cerrado
    document.body.classList.remove("tw-viewer-open");
    document.removeEventListener("keydown", onKey);
    if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
  };

  /** @param {KeyboardEvent} event */
  const onKey = (event) => {
    if (event.key === "Escape") return closeViewer();
    if (event.key === "ArrowLeft") return void move(-1);
    if (event.key === "ArrowRight") return void move(1);
    if (event.key === "Tab") {
      const focusables = /** @type {HTMLElement[]} */ ([...viewer.querySelectorAll("button, a[href], video")]).filter((el) => !el.hidden && el.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  /** @param {number} i */
  const openViewer = (i) => {
    index = Math.max(0, Math.min(i, items.length - 1));
    lastFocus = document.activeElement;
    paint();
    viewer.hidden = false;
    document.body.classList.add("tw-viewer-open");
    document.addEventListener("keydown", onKey);
    close.focus({ preventScroll: true });
  };


  mosaic.addEventListener("click", (event) => {
    const tile = /** @type {Element} */ (event.target).closest("[data-viewer-index]");
    if (tile) openViewer(Number(tile.getAttribute("data-viewer-index")));
  });
  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  close.addEventListener("click", closeViewer);
  // Clic en el fondo (fuera de la foto y los controles) cierra, como en la intranet.
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target === stage) closeViewer();
  });
  /** @type {number | null} */
  let startX = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") startX = event.clientX;
  });
  stage.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
  });
}

initShell();
initAlbum();
