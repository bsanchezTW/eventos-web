import assert from "node:assert/strict";
import test from "node:test";
import {
  Badge,
  Button,
  Card,
  Chip,
  ChoiceCard,
  ChoiceGroup,
  Field,
  Icon,
  IconButton,
  Input,
  MapFrame,
  InputGroup,
  Select,
  MediaFrame,
  Modal,
  MonthCalendar,
  SegmentedControl,
  monthGrid,
} from "../../src/design-system/index.js";

test("Button: variantes y tamaños se traducen a clases del sistema", () => {
  const out = String(Button({ label: "Inscribirme", variant: "accent", size: "lg" }));
  assert.match(out, /^<button class="tw-btn tw-btn--accent tw-btn--lg" type="button">/);
});

test("Button: href → enlace; disabled ignora href; decorative → span aria-hidden", () => {
  assert.match(String(Button({ label: "Ver", href: "/eventos/x" })), /^<a class="tw-btn[^"]*" href="\/eventos\/x">/);
  assert.match(String(Button({ label: "Ver", href: "/x", disabled: true })), /^<button[^>]* disabled>/);
  assert.match(String(Button({ label: "Ver", decorative: true })), /^<span class="tw-btn[^"]*" aria-hidden="true">/);
  assert.match(String(Button({ label: "Enviar", loading: true })), /aria-busy="true"/);
});

test("IconButton siempre tiene nombre accesible", () => {
  const out = String(IconButton({ icon: "close", label: "Cerrar" }));
  assert.match(out, /aria-label="Cerrar"/);
  assert.match(out, /<svg[^>]*aria-hidden="true"/);
});

test("Icon: decorativo por defecto, con label es role=img; nombre desconocido falla", () => {
  assert.match(String(Icon({ name: "search" })), /aria-hidden="true"/);
  assert.match(String(Icon({ name: "search", label: "Buscar" })), /role="img" aria-label="Buscar"/);
  assert.throws(() => Icon({ name: "no-existe" }), /no existe/);
});

test("Field conecta label, error y aria-describedby", () => {
  const ok = String(Field({ id: "f", label: "Correo", control: (a11y) => Input({ id: "f", name: "email", ...a11y }) }));
  assert.match(ok, /<label class="tw-field__label" for="f">Correo<\/label>/);
  assert.doesNotMatch(ok, /aria-invalid/);
  assert.match(ok, /id="f-error"[^>]*hidden/);

  const bad = String(Field({ id: "f", label: "Correo", error: "Revisa el correo", control: (a11y) => Input({ id: "f", name: "email", ...a11y }) }));
  assert.match(bad, /aria-invalid="true"/);
  assert.match(bad, /aria-describedby="f-error"/);
  assert.match(bad, />Revisa el correo<\/p>/);
});

test("SegmentedControl: pressed usa botones aria-pressed, nav usa enlaces aria-current", () => {
  const pressed = String(SegmentedControl({ label: "Mes", items: [{ label: "Octubre", value: "10", active: true }, { label: "Noviembre", value: "11" }] }));
  assert.match(pressed, /role="group"/);
  assert.match(pressed, /aria-pressed="true"[^>]*>Octubre/);
  const nav = String(SegmentedControl({ label: "Principal", mode: "nav", items: [{ label: "Agenda", href: "/", active: true }] }));
  assert.match(nav, /^<nav/);
  assert.match(nav, /aria-current="page"/);
});

test("Chip y Badge", () => {
  assert.match(String(Chip({ label: "CCTV", pressed: true })), /aria-pressed="true"/);
  assert.match(String(Badge({ label: "En curso", variant: "accent-soft", live: true })), /tw-badge--live/);
});

test("Card: layout e interactividad por modificadores", () => {
  const out = String(Card({ children: "x", layout: "row", interactive: true, as: "article" }));
  assert.equal(out, '<article class="tw-card tw-card--row tw-card--interactive">x</article>');
});

test("MediaFrame: video con controles nativos y nombre accesible", () => {
  const out = String(MediaFrame({ src: "https://x/v.mp4", kind: "video", alt: "Resumen" }));
  assert.match(out, /<video class="tw-media__img tw-media__img--contain" src="https:\/\/x\/v.mp4" controls preload="metadata" playsinline aria-label="Resumen"><\/video>/);
});

test("MediaFrame muestra placeholder sin imagen", () => {
  assert.match(String(MediaFrame({ src: null, slot: "[ FOTO ]" })), /tw-media__slot[^>]*>\[ FOTO \]/);
  assert.match(String(MediaFrame({ src: "/a.jpg", alt: "Sala" })), /<img class="tw-media__img" src="\/a.jpg" alt="Sala"/);
});

test("Modal usa <dialog> con título asociado y cierre accesible", () => {
  const out = String(Modal({ id: "m", titleId: "t", children: "x" }));
  assert.match(out, /^<dialog[^>]*id="m" aria-labelledby="t" data-tw-modal/);
  assert.match(out, /data-tw-modal-close[^>]*aria-label="Cerrar"|aria-label="Cerrar"[^>]*data-tw-modal-close/);
});

test("monthGrid: semana desde el lunes", () => {
  assert.deepEqual(monthGrid(2026, 10), { lead: 3, days: 31 }); // 1 oct 2026 = jueves
  assert.deepEqual(monthGrid(2026, 2), { lead: 6, days: 28 }); // 1 feb 2026 = domingo
});

test("MonthCalendar: solo los días marcados son botones", () => {
  const out = String(MonthCalendar({ year: 2026, month: 10, title: "Octubre 2026", markers: { 8: 1, 15: 2 }, selected: 15 }));
  assert.equal((out.match(/<button/g) ?? []).length, 2);
  assert.match(out, /data-day="15" aria-pressed="true" aria-label="15: 2 eventos"/);
  assert.equal((out.match(/tw-calendar__day" aria-hidden="true"/g) ?? []).length, 3);
});

test("ChoiceCard: checkbox nativo; deshabilitada no se puede marcar", () => {
  const on = String(ChoiceCard({ name: "talleres", value: "a7k2mq", title: "Taller IA", meta: "10:00–11:30", checked: true }));
  assert.match(on, /^<label class="tw-choice">/);
  assert.match(on, /<input class="tw-choice__input" type="checkbox" name="talleres" value="a7k2mq" checked>/);
  assert.match(on, /tw-choice__meta">10:00–11:30</);
  assert.match(String(ChoiceCard({ name: "t", value: "b", title: "B", disabled: true })), /type="checkbox"[^>]* disabled>/);
});

test("ChoiceGroup: leyenda, ayuda y error con la convención de Field", () => {
  const out = String(ChoiceGroup({ id: "g", legend: "Talleres", hint: "Opcional", children: "x" }));
  assert.match(out, /^<fieldset class="tw-field" id="g" tabindex="-1" aria-describedby="g-hint">/);
  assert.match(out, /<legend class="tw-field__label">Talleres<\/legend>/);
  assert.match(out, /id="g-error" data-field-error="g" hidden/);
  assert.match(String(ChoiceGroup({ id: "g", legend: "T", error: "Elige otro", children: "x" })), /aria-invalid="true"/);
});

test("InputGroup agrupa prefijo y control en una fila", () => {
  const out = String(InputGroup({ children: [Select({ id: "p", name: "p", options: [{ value: "CL", label: "+56 CL" }] }), Input({ id: "t", name: "t" })] }));
  assert.match(out, /^<div class="tw-input-group"><select[^>]*>[\s\S]*<\/select><input/);
});

test("MapFrame: iframe con nombre accesible y carga diferida", () => {
  const out = String(MapFrame({ src: "https://www.google.com/maps/embed?pb=1&x=2", title: "Mapa: Casa Piedra" }));
  assert.equal(out.replace(/\s+/g, " "), '<div class="tw-map"> <iframe class="tw-map__frame" src="https://www.google.com/maps/embed?pb=1&amp;x=2" title="Mapa: Casa Piedra" loading="lazy" allowfullscreen></iframe> </div>');
});

test("MonthCalendar: selector de mes y días realizados en gris", () => {
  const out = String(MonthCalendar({ year: 2026, month: 8, title: "Agosto 2026", markers: { 25: 9, 27: 1 }, past: [25, 27], nav: { prev: { label: "Ver julio", attrs: { "data-month": "2026-07" } }, next: null } }));
  assert.match(out, /aria-label="Ver julio" data-month="2026-07"/);
  assert.match(out, /aria-label="Sin mes siguiente" disabled/);
  assert.equal((out.match(/tw-calendar__day--past/g) ?? []).length, 2);
});

test("Card muted marca lo que ya ocurrió", () => {
  assert.equal(String(Card({ children: "x", layout: "row", muted: true })), '<div class="tw-card tw-card--row tw-card--muted">x</div>');
});

test("Badge truncate: una línea con el texto completo en title", () => {
  const out = String(Badge({ label: "Lanzamiento de la línea de video", truncate: true, attrs: { title: "Lanzamiento de la línea de video" } }));
  assert.equal(out, '<span class="tw-badge tw-badge--neutral tw-badge--truncate" title="Lanzamiento de la línea de video"><span class="tw-badge__text">Lanzamiento de la línea de video</span></span>');
});
