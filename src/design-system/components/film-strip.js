import { IconButton } from "./button.js";
import { attrs, cx, html } from "../utils/html.js";

/**
 * @typedef {object} FilmFrame
 * @property {string | null} src     foto (miniatura reducida); null = placeholder del sistema
 * @property {string} href           a dónde lleva la foto (su álbum)
 * @property {string} title          título que se muestra arriba cuando la foto queda al centro
 * @property {string} [slot]         texto del placeholder
 */

/**
 * Rollo fotográfico: tira oscura con perforaciones donde las fotos avanzan solas; la del centro
 * se destaca y su título va arriba (behaviors: data-tw-filmstrip). El autoplay se pausa con
 * hover/foco, con la pestaña oculta y con reduced-motion. Sin JS es una tira con scroll.
 *
 * @param {{ label: string, frames: FilmFrame[], interval?: number, id?: string }} props
 */
export function FilmStrip({ label, frames, interval = 3200, id }) {
  return html`<div class="tw-filmstrip"${attrs({ id, role: "region", "aria-roledescription": "carrusel", "aria-label": label, "data-tw-filmstrip": "", "data-interval": interval })}>
    <div class="tw-filmstrip__head">
      ${IconButton({ icon: "chevron-left", label: "Foto anterior", size: "sm", attrs: { "data-tw-filmstrip-prev": "" } })}
      <p class="tw-filmstrip__title" data-tw-filmstrip-title>${frames[0]?.title ?? ""}</p>
      ${IconButton({ icon: "chevron-right", label: "Foto siguiente", size: "sm", attrs: { "data-tw-filmstrip-next": "" } })}
    </div>
    <div class="tw-filmstrip__reel">
      <ul class="tw-filmstrip__track" role="list" data-tw-filmstrip-track>
        ${frames.map(
          (frame, i) => html`<li class="${cx("tw-filmstrip__frame", i === 0 && "is-active")}" data-title="${frame.title}">
            <a class="tw-filmstrip__link" href="${frame.href}" aria-label="${frame.title}: ver álbum">
              ${frame.src
                ? html`<img class="tw-filmstrip__img" src="${frame.src}" alt="" loading="lazy" decoding="async">`
                : html`<span class="tw-media__slot" aria-hidden="true">${frame.slot ?? "[ FOTO ]"}</span>`}
            </a>
          </li>`,
        )}
      </ul>
    </div>
  </div>`;
}
