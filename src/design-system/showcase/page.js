/**
 * Guía viva del Design System (/sistema-de-diseno). Equivalente en código de la página
 * "Transworld - Sistema de Diseño" del template: cada muestra es el componente real.
 * Al agregar un componente, sumar aquí su muestra.
 */
import {
  Alert,
  Availability,
  Badge,
  Banner,
  Button,
  CarouselDots,
  Checkbox,
  Chip,
  ChoiceCard,
  ChoiceGroup,
  CodeDisplay,
  Card,
  CtaBand,
  DateBadge,
  Document,
  EmptyState,
  Eyebrow,
  FactList,
  Field,
  Grid,
  Heading,
  Icon,
  IconButton,
  IconCircle,
  Input,
  InputGroup,
  Kicker,
  Legend,
  MapFrame,
  MediaFrame,
  Modal,
  MonthCalendar,
  OptionGroup,
  SearchBar,
  SearchField,
  Section,
  SectionHeader,
  SegmentedControl,
  Select,
  SiteHeader,
  Skeleton,
  StatCard,
  SuccessState,
  Tag,
  Text,
  Timeline,
  Toast,
  html,
  iconNames,
} from "../index.js";
import { BRAND, DS_MOUNT } from "../utils/assets.js";

/** @typedef {import("../utils/html.js").Renderable} Renderable */

/** @param {{ label: string, children: Renderable, spec?: Renderable, dark?: boolean, block?: boolean }} props */
function Specimen({ label, children, spec, dark = false, block = false }) {
  return Card({
    className: "tw-stack tw-gap-3-5",
    children: html`${Eyebrow({ children: label, tone: "muted", as: "p" })}
      <div class="tw-specimen${dark ? " tw-specimen--dark tw-on-dark" : ""}${block ? " tw-specimen--block" : ""}">${children}</div>
      ${spec ? html`<p class="tw-spec">${spec}</p>` : ""}`,
  });
}

/** @param {{ name: string, value: string }} props */
function Swatch({ name, value }) {
  return Card({
    className: "tw-stack tw-gap-2-5",
    children: html`<svg width="100%" height="56" role="img" aria-label="${value}"><rect width="100%" height="56" rx="14" fill="${value}" stroke="#dde3e9"/></svg>
      <strong>${name.replace("--tw-", "")}</strong>
      <span class="tw-spec">${value}</span>`,
  });
}

/**
 * @param {{ tokens: Map<string, string> }} props
 */
export function renderShowcasePage({ tokens }) {
  const palette = [...tokens].filter(([name, value]) => /^--tw-(navy|lime|olive|gray|red|orange)-/.test(name) && value.startsWith("#"));

  const main = html`
    ${Section({
      id: "fundamentos",
      spacing: "tight",
      children: html`${SectionHeader({ eyebrow: "Fundamentos", title: "Color, tipografía y espaciado", description: html`Fuente de verdad: <code>src/design-system/tokens/tokens.css</code>. Los componentes usan tokens semánticos, nunca hex sueltos.` })}
        ${Grid({ min: 180, gap: "3-5", children: palette.map(([name, value]) => Swatch({ name, value })) })}
        <div class="tw-mt-6">${Grid({
          min: 340,
          children: html`${Specimen({
            label: "Tipografía — Montserrat",
            block: true,
            children: html`<div class="tw-stack tw-gap-3">
              ${Heading({ level: 3, variant: "h2", children: "H2 de sección · 34/800" })}
              ${Heading({ level: 3, variant: "h3", children: "H3 panel o modal · 22/800" })}
              ${Heading({ level: 3, variant: "title", children: "Título de tarjeta · 19/700" })}
              ${Text({ children: "Cuerpo · 15/400. Párrafos, metadatos y descripciones secundarias." })}
              ${Text({ variant: "meta", children: "Meta · 13.5/400" })}
            </div>`,
          })}
          ${Specimen({
            label: "Mono — IBM Plex Mono",
            block: true,
            children: html`<div class="tw-stack tw-gap-3">
              ${Eyebrow({ children: "Eyebrow · .16em mayúsculas" })}
              ${Eyebrow({ children: "Label de dato", tone: "muted" })}
              <span class="tw-timeline__time">15:00 — horario de programa</span>
            </div>`,
          })}`,
        })}</div>`,
    })}

    ${Section({
      id: "componentes",
      children: html`${SectionHeader({ eyebrow: "Componentes", title: "Piezas de interfaz" })}
        ${Grid({
          min: 300,
          children: html`
          ${Specimen({ label: "Button · accent / brand", children: html`${Button({ label: "Inscribirme", variant: "accent", size: "lg" })}${Button({ label: "Suscribirme", variant: "brand" })}`, spec: "variant accent | brand · size sm | md | lg | xl" })}
          ${Specimen({ label: "Button · sobre oscuro", dark: true, children: html`${Button({ label: "Ver calendario", variant: "on-dark", size: "lg" })}${IconButton({ icon: "chevron-left", label: "Anterior", variant: "on-dark" })}${IconButton({ icon: "chevron-right", label: "Siguiente", variant: "on-dark" })}` })}
          ${Specimen({ label: "Button · bajo énfasis", children: html`${Button({ label: "Solicitar", variant: "ghost", size: "sm" })}${Button({ label: "Volver", variant: "outline", size: "sm", icon: "arrow-left" })}${Button({ label: "Limpiar filtros", variant: "soft-accent", size: "sm" })}${Button({ label: "Ahora no", variant: "text", size: "sm" })}` })}
          ${Specimen({ label: "Button · estados", children: html`${Button({ label: "Deshabilitado", variant: "accent", disabled: true })}${Button({ label: "Enviando", variant: "brand", loading: true })}` })}
          ${Specimen({ label: "SegmentedControl", children: SegmentedControl({ label: "Demo", items: [{ label: "Agenda", active: true }, { label: "Galería" }, { label: "Webinars" }] }) })}
          ${Specimen({ label: "Chip (filtro múltiple)", children: html`${Chip({ label: "Fibra óptica", pressed: true })}${Chip({ label: "CCTV" })}` })}
          ${Specimen({ label: "Badge", children: html`${Badge({ label: "Webinar", variant: "accent-soft" })}${Badge({ label: "Fibra óptica" })}${Badge({ label: "Destacado", variant: "accent" })}${Badge({ label: "Evento principal", variant: "outline" })}${Badge({ label: "En curso", variant: "accent-soft", live: true })}${Badge({ label: "Cancelado", variant: "danger" })}` })}
          ${Specimen({ label: "Availability · Tag · Legend", children: html`${Availability({ label: "Cupos disponibles" })}${Availability({ label: "Últimos 6 cupos", tone: "urgent" })}${Tag({ label: "Jefaturas TI" })}${Legend({ items: [{ label: "Con evento" }, { label: "Seleccionado", tone: "brand" }] })}` })}
          ${Specimen({ label: "CarouselDots · Kicker", dark: true, children: html`${CarouselDots({ count: 3, active: 1 })}${Kicker({ children: "Inscripciones abiertas" })}` })}
          ${Specimen({ label: "StatCard · IconCircle", children: html`${StatCard({ label: "Próxima fecha", value: "Jue 8 de octubre" })}${IconCircle()}${IconCircle({ icon: "fiber" })}` })}
          ${Specimen({ label: "MediaFrame", children: html`<div class="tw-tile tw-w-full">${MediaFrame({ slot: "[ FOTO 16:10 ]", badge: Badge({ label: "Foto", variant: "light" }), caption: "Placeholder hasta cargar imagen real" })}</div>` })}
          ${Specimen({ label: "MapFrame (Google Maps)", children: html`<div class="tw-w-full">${MapFrame({ src: "https://maps.google.com/maps?q=Calle%20Nueva%201890%2C%20Huechuraba&output=embed", title: "Mapa: casa matriz Transworld" })}</div>` })}
          ${Specimen({ label: "Card · row · muted (ya ocurrió)", block: true, children: Card({ layout: "row", muted: true, children: html`${DateBadge({ day: "25", month: "AGO" })}<div>${Heading({ level: 3, variant: "title", children: "Evento realizado" })}<p class="tw-card__meta">Misma estructura, en grises</p></div>` }) })}
          ${Specimen({ label: "Card · row", block: true, children: Card({ layout: "row", children: html`${DateBadge({ day: "15", month: "OCT" })}<div>${Heading({ level: 3, variant: "title", children: "Tarjeta en fila" })}<p class="tw-card__meta">Visual fijo + contenido</p></div>` }) })}
          ${Specimen({ label: "FactList · Timeline · CodeDisplay", block: true, children: html`<div class="tw-stack tw-gap-4">${FactList({ items: [{ label: "Fecha", value: "Jueves 8 de octubre" }, { label: "Valor", value: "Sin costo" }] })}${Timeline({ items: [{ time: "15:00", title: "Apertura", detail: "Equipo Transworld" }] })}${CodeDisplay({ value: "TW-DEMO-4821" })}</div>` })}
          `,
        })}`,
    })}

    ${Section({
      id: "formularios",
      children: html`${SectionHeader({ eyebrow: "Formularios", title: "Campos y validación" })}
        ${Grid({
          min: 300,
          children: html`
          ${Specimen({ label: "Field + Input", block: true, children: html`<div class="tw-stack tw-gap-3">${Field({ id: "sg-nombre", label: "Nombre y apellido", control: (a) => Input({ id: "sg-nombre", name: "n", placeholder: "María Pérez", ...a }) })}${Field({ id: "sg-email", label: "Correo", error: "Revisa el correo: parece incompleto.", control: (a) => Input({ id: "sg-email", name: "e", value: "maria@", ...a }) })}</div>` })}
          ${Specimen({ label: "Select · Checkbox · OptionGroup", block: true, children: html`<div class="tw-stack tw-gap-3">${Field({ id: "sg-sel", label: "Cargo / rol", control: (a) => Select({ id: "sg-sel", name: "s", options: [{ value: "a", label: "Jefatura de proyectos" }], ...a }) })}${OptionGroup({ name: "sg-opt", legend: "Asistentes", value: "1", options: ["1", "2", "3"].map((v) => ({ value: v, label: v })) })}${Checkbox({ name: "sg-c", checked: true, label: "Acepto recibir la confirmación." })}</div>` })}
          ${Specimen({ label: "InputGroup (código de país + teléfono)", block: true, children: Field({ id: "sg-tel", label: "Teléfono", control: (a) => InputGroup({ children: html`${Select({ id: "sg-tel-pais", name: "tp", value: "CL", options: [{ value: "CL", label: "+56 CL" }, { value: "PE", label: "+51 PE" }], attrs: { "aria-label": "Código de país" } })}${Input({ id: "sg-tel", name: "t", type: "tel", placeholder: "9 1234 5678", ...a })}` }) }) })}
          ${Specimen({ label: "ChoiceGroup · ChoiceCard", block: true, children: ChoiceGroup({ id: "sg-talleres", legend: "Talleres (opcional)", hint: "Elige los que quieras, sin topes de horario.", children: html`${ChoiceCard({ name: "sg-t", value: "a", checked: true, title: "Taller de fusión de fibra", meta: "Jue 26 nov · 10:30–12:30 · Sala B", aside: Availability({ label: "Últimos 4 cupos", tone: "urgent" }) })}${ChoiceCard({ name: "sg-t", value: "b", title: "Demo CCTV con analítica", meta: "Jue 26 nov · 14:00–16:00", aside: Availability({ label: "Cupos disponibles" }) })}${ChoiceCard({ name: "sg-t", value: "c", disabled: true, title: "Energía crítica", meta: "Vie 27 nov · 09:30–11:00", aside: Availability({ label: "Cupos agotados", tone: "closed" }) })}` }) })}
          ${Specimen({ label: "SearchField · SearchBar", block: true, children: html`<div class="tw-stack tw-gap-4">${SearchField({ id: "sg-q", name: "q", label: "Buscar", placeholder: "Tema, ciudad o tecnología" })}${SearchBar({ action: "#", name: "sgq", label: "Buscar eventos", placeholder: "Busca por tema" })}</div>` })}
          `,
        })}`,
    })}

    ${Section({
      id: "feedback",
      children: html`${SectionHeader({ eyebrow: "Estados", title: "Carga, vacío, error y éxito" })}
        ${Grid({
          min: 300,
          children: html`
          ${Specimen({ label: "Alert", block: true, children: html`<div class="tw-stack tw-gap-2-5">${Alert({ tone: "danger", message: "Revisa el correo: parece incompleto." })}${Alert({ tone: "success", message: "Inscripción confirmada" })}${Alert({ tone: "info", message: "Esta fecha ya se realizó." })}</div>` })}
          ${Specimen({ label: "EmptyState", block: true, children: EmptyState({ compact: true, title: "Sin fechas para este filtro", text: "Prueba con otro mes o quita los filtros.", action: Button({ label: "Limpiar filtros", variant: "soft-accent", size: "sm" }) }) })}
          ${Specimen({ label: "Skeleton", block: true, children: html`<div class="tw-stack tw-gap-2-5">${Skeleton({ shape: "title", width: 60 })}${Skeleton({ shape: "line", width: 80 })}${Skeleton({ shape: "pill" })}</div>` })}
          ${Specimen({ label: "SuccessState", block: true, children: SuccessState({ title: "Avisos activados", text: "Te avisaremos de todas las convocatorias." }) })}
          ${Specimen({ label: "Toast", children: Toast({ message: "Enlace copiado" }) })}
          ${Specimen({ label: "Modal", children: Button({ label: "Abrir modal", variant: "brand", attrs: { "data-tw-modal-open": "sg-modal" } }) })}
          `,
        })}
        ${Modal({ id: "sg-modal", titleId: "sg-modal-title", children: html`${Heading({ level: 2, variant: "h3", id: "sg-modal-title", className: "tw-modal__title", children: "Modal del sistema" })}${Text({ variant: "body", className: "tw-modal__intro", children: "Basado en <dialog>: Escape, foco atrapado y fondo inerte nativos." })}${Button({ label: "Cerrar", variant: "brand", block: true, attrs: { "data-tw-modal-close": "" } })}` })}`,
    })}

    ${Section({
      id: "patrones",
      children: html`${SectionHeader({ eyebrow: "Patrones", title: "Calendario, banners y bandas CTA" })}
        ${Grid({
          min: 340,
          children: html`${Card({ variant: "panel", children: MonthCalendar({ year: 2026, month: 10, title: "Octubre 2026", titleId: "sg-cal", markers: { 8: 1, 15: 2, 22: 1 }, past: [8], selected: 15, nav: { prev: { label: "Ver septiembre" }, next: null }, legend: [{ label: "Próximo" }, { label: "Realizado", tone: "muted" }, { label: "Seleccionado", tone: "brand" }] }) })}
            ${Banner({ image: { src: BRAND.heroImage }, headingLevel: 2, badges: html`${Badge({ label: "Capacitación", variant: "accent" })}${Badge({ label: "Energía", variant: "on-dark" })}`, title: "Banner de detalle", text: "Imagen al 30% + gradiente diagonal navy." })}`,
        })}
        <div class="tw-stack tw-gap-4 tw-mt-5">
          ${CtaBand({ tone: "accent", title: "Banda CTA lime", text: "Cierre de sección con acción a la derecha.", action: Button({ label: "Solicitar contacto", variant: "light", size: "lg" }) })}
          ${CtaBand({ tone: "brand", eyebrow: "Variante navy", title: "Banda CTA navy", text: "Con resplandor lime.", action: Button({ label: "Recibir avisos", variant: "accent", size: "lg" }) })}
        </div>`,
    })}

    ${Section({
      id: "iconos",
      children: html`${SectionHeader({ eyebrow: "Iconografía", title: "Set de íconos", description: "SVG de trazo 24×24 que heredan currentColor." })}
        ${Grid({ min: 180, gap: "3", children: iconNames().map((name) => Card({ compact: true, className: "tw-cluster tw-gap-3", children: html`${Icon({ name, size: 22 })}<span class="tw-spec">${name}</span>` })) })}`,
    })}`;

  return Document({
    title: "Sistema de diseño · Transworld",
    description: "Guía viva de tokens, componentes y patrones del Design System Transworld.",
    scripts: [`${DS_MOUNT}/showcase/client.js`],
    body: html`<div class="tw-page">
      ${SiteHeader({
        tagline: "Sistema de diseño",
        nav: [
          { label: "Fundamentos", href: "#fundamentos" },
          { label: "Componentes", href: "#componentes" },
          { label: "Formularios", href: "#formularios" },
          { label: "Estados", href: "#feedback" },
          { label: "Patrones", href: "#patrones" },
        ],
        cta: { label: "Ver página real", href: "/" },
      })}
      <main class="tw-page__main" id="contenido">${main}</main>
      <div class="tw-section"></div>
    </div>`,
  });
}
