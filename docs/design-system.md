# Design System Transworld

Lenguaje visual de la app, incorporado en el código a partir del template de Claude Design
"Agenda de Eventos Transworld" (`templates/template-eventos-v1.zip`). **La fuente de verdad ya
es este repositorio**: el template se puede borrar o cambiar sin afectar la app.

Guía viva con todos los tokens y componentes renderizados: **`/sistema-de-diseno`**
(en desarrollo siempre; en producción solo con `DS_SHOWCASE=1`).

## Dónde está cada cosa

```text
src/design-system/
├── tokens/tokens.css        ← colores, tipografía, espaciado, radios, sombras, motion, z-index
├── styles/                  ← CSS por capa (base, layout, components/, layouts/, utilities)
│   └── manifest.js          ← orden de la cascada; el servidor lo concatena en /design-system/tw.css
├── primitives/              ← Container, Section, SectionHeader, Heading, Text, Eyebrow, Kicker, Grid, Stack, Cluster…
├── components/              ← Button, IconButton, SegmentedControl, Chip, OptionGroup, ChoiceGroup, ChoiceCard,
│                              Badge, Tag, Card, CardLink, StatCard, DateBadge, MediaFrame, IconCircle, FactList,
│                              Timeline, CodeDisplay, Field, Input, InputGroup, Select, Checkbox, SearchField,
│                              SearchBar, Alert, EmptyState,
│                              Skeleton, Toast, SuccessState, Modal, MonthCalendar
├── layouts/                 ← Document, SiteHeader, SiteFooter, Brand, HeroCarousel, Banner, CtaBand
├── icons/                   ← set SVG de trazo (Icon)
├── behaviors/               ← JS de navegador: menú móvil, modal, carrusel, toasts (data-tw-*)
├── assets/                  ← fuentes (woff2, OFL), logo y foto de marca
├── showcase/                ← guía viva
├── utils/html.js            ← motor de plantillas con escape (html``, attrs, cx, raw)
├── index.js                 ← punto de entrada isomórfico
└── server.js                ← integración Express (solo Node)
```

## Cómo funciona (adaptación a Node.js)

El template es un prototipo con estilos inline y un runtime propio (`support.js`, React).
La app es Express sin bundler, así que el sistema se implementó como:

- **Componentes = funciones puras que devuelven HTML escapado** (`SafeHtml`). Los mismos
  módulos ES corren en Node (SSR, SEO) y en el navegador (re-render de regiones).
- **CSS con clases `tw-*` y variables `--tw-*`**. Nada de estilos inline: la CSP es
  `style-src 'self'` y un test lo verifica.
- El DS se monta en **`/design-system`** (mismo nombre que la carpeta) para que los imports
  relativos funcionen igual en servidor y navegador, sin import maps.
- Comportamientos por atributos: cualquier HTML con `data-tw-modal-open="id"`,
  `data-tw-disclosure`, `data-tw-carousel` funciona tras `initDesignSystem()`.

## Usar el sistema

```js
// En el servidor (páginas SSR) — ruta relativa a src/design-system
import { Button, Card, Heading, Section, SectionHeader, html } from "../../../design-system/index.js";

export const MiSeccion = ({ items }) =>
  Section({
    id: "novedades",
    children: html`
      ${SectionHeader({ eyebrow: "Novedades", title: "Lo último" })}
      ${items.map((item) => Card({ children: html`${Heading({ level: 3, variant: "title", children: item.title })}` }))}
      ${Button({ label: "Ver más", variant: "accent", href: "/novedades" })}`,
  });
```

```js
// En el navegador (mismos componentes)
import { toHtml } from "/design-system/index.js";
import { initDesignSystem, openModal, showToast } from "/design-system/behaviors/index.js";

initDesignSystem();
region.innerHTML = toHtml(MiSeccion({ items }));
```

Todo valor interpolado en `html\`\`` se escapa. `raw()` solo para HTML propio y confiable.

## Tokens

Usar siempre el **token semántico** (`--tw-color-text-body`, `--tw-color-surface`,
`--tw-shadow-card`…), nunca la paleta base ni hex. Un test falla si aparece un hex fuera de
`tokens.css`. Resumen:

| Rol | Token | Valor |
|---|---|---|
| Marca (navy) | `--tw-color-brand` | `#293f68` (hover `#1f2f4e`) |
| Acento (lime) | `--tw-color-accent` | `#aef839` — siempre con texto navy encima |
| Fondo / superficie | `--tw-color-bg` / `--tw-color-surface` | `#eef1f4` / `#fff` |
| Texto título / cuerpo / muted | `--tw-color-text-title` / `-body` / `-muted` | `#12263a` / `#5f6b77` / `#6c7783` |
| Texto sobre lime translúcido | `--tw-color-text-accent` | `#48740c` |
| Radios | `--tw-radius-md` … `-5xl`, `-pill` | 14 inputs · 18 fecha · 22–32 tarjetas · 999 botones |
| Sombras | `--tw-shadow-card`, `-card-hover`, `-stat`, `-modal`… | valores exactos del template |
| Contenedor | `--tw-container` / `--tw-gutter` | 1240px / 28px (24 tablet, 18 móvil) |
| Espaciado de secciones | `--tw-section-gap` / `-sm`, `Section({ spacing })` | 56 · 52 (`wide`) · 44 (`tight`) · 34 (`page`) · 26 (`compact`) |
| Movimiento | `--tw-duration-fast` / `-enter` / `-slide` | .18s / .4s / .9s (anulados con `prefers-reduced-motion`) |

Breakpoints de referencia: `640px` (móvil), `768px`, `960px` (nav colapsa), `1024px`.

## Crear una página nueva respetando el lenguaje visual

1. Página SSR en `src/features/<feature>/pages/` que devuelva `Document({ title, body, scripts })`
   (o el `renderPage` del shell de la feature si comparte header/footer).
2. Componer con primitivas y componentes del DS. Layouts típicos:
   `Section` + `SectionHeader` + `Grid({ min })` (grillas auto-fit del template),
   `.tw-split` + `.tw-split__aside` (contenido + panel sticky), `Card({ variant: "panel" })`.
3. Estados: `Skeleton` (carga), `EmptyState` (vacío, siempre con acción), `Alert` (error),
   `SuccessState` (éxito), `Button({ disabled })` / `Button({ loading })`.
4. Interacción de cliente en `src/features/<feature>/client/`, llamando `initDesignSystem()`.
5. La feature **no trae CSS propio** (un test lo impide): si falta un patrón visual, se agrega al DS.

## Agregar un componente al sistema

1. Función en `src/design-system/components/<grupo>.js` con JSDoc de props; clases `tw-<nombre>`
   y modificadores `tw-<nombre>--<variante>`.
2. CSS en `styles/components/<grupo>.css` usando solo tokens; si es un archivo nuevo, registrarlo
   en `styles/manifest.js` (un test verifica que manifiesto y disco coincidan).
3. Exportarlo en `src/design-system/index.js`.
4. Sumar su muestra en `showcase/page.js` y un test en `test/design-system/components.test.js`.
5. Accesibilidad: nombre accesible obligatorio en controles de solo ícono, foco visible, estados
   con atributos ARIA (`aria-pressed`, `aria-current`, `aria-invalid`, `aria-busy`).

## Qué viene del template y qué se adaptó

**Directo del template** (valores exactos): paleta navy/lime, Montserrat + IBM Plex Mono y la
tabla de roles tipográficos, radios, sombras, contenedor 1240/28, keyframe `tw-up`, crossfade
del hero (.9s, 6.5s por slide, dots de 38px), header sticky con blur, grillas auto-fit,
componentes (botones, píldoras, chips, badges, tarjeta de evento con bloque de fecha, stat card,
calendario, formulario, modal, banda CTA, footer), copys de marketing, logo y foto de casa matriz.

**Adaptaciones**:

- **Contraste AA**: cuerpo `#6c7783 → #5f6b77`, oliva `#4e7d0f/#5f8f14 → #48740c`;
  `#9aa6b2` queda solo para deshabilitado/decorativo. Todo más oscuro, nunca más claro
  (pares verificados por test).
- **Tamaños de control consolidados**: 38 / 40 / 46 / 54 px (el prototipo tenía 42–56 sueltos).
- **Responsive explícito** (el template no tenía breakpoints): tipografía escalada por tokens,
  nav → menú desplegable bajo 960px, bloque de fecha 64px en móvil, barra de filtros en 2 columnas,
  etiquetas cortas de mes, `min(Xpx, 100%)` en grillas para evitar desborde.
- **Accesibilidad**: `<dialog>` nativo para modales, foco visible navy/lime, carrusel con pausa
  (WCAG 2.2.2), H1 estable fuera del carrusel, tarjetas con enlace estirado único.
- **Assets**: fuentes self-hosted (sin Google Fonts), logo reducido de 1 MB a 9 KB, íconos SVG
  en lugar de glifos `‹ › ← ↳`.
- **Nuevos patrones** construidos con el mismo lenguaje (disponibles, aunque la agenda no los usa
  para respetar el template): `SearchBar`, `FilterBar`, `Skeleton`, `Toast`, `specimen`.
- **Carrusel sin botón de pausa** (el template no lo tiene): el autoplay se pausa con hover/foco,
  se detiene al usar flechas o dots y no corre con `prefers-reduced-motion`.

## Fidelidad con el template (medida)

Las vistas Agenda, Galería, Webinars y Detalle se compararon midiendo el DOM del template
renderizado contra la app a 1440px (posición y tamaño de cada bloque). Valores que conviene
no "redondear" al crear pantallas nuevas:

| Elemento | Valor |
|---|---|
| Botones | xs 36.5 (píldora de tarjeta) · sm 40 · md 44 · lg 52 · xl 54 (hero) · 2xl 56; sin borde salvo on-dark/outline |
| Badges | 22.5px de alto, texto tal cual (sin mayúsculas forzadas) |
| Radios de tarjeta | 24 (evento, webinar, media) · 26 `roomy` (detalle, formas de participar) · 28 panel · 30 bandas/modal · 32 banner |
| Títulos | página 36 · sección 34 · panel 20 · card 18 navy · fila 18 · tarjeta 19 · media 16 |
| Hero | 620px, texto reservado a 3 líneas (84px) para que los botones no salten entre slides |
| Calendario | 2 tarjetas junto al calendario, estiradas a su altura |
