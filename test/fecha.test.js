const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseFechaYmd,
  isEventoFinalizado,
} = require("../src/fecha");

test("parseFechaYmd: ISO y DD-MM-YYYY", () => {
  assert.equal(parseFechaYmd("2026-08-26"), "2026-08-26");
  assert.equal(parseFechaYmd("2026-08-26T15:00:00.000Z"), "2026-08-26");
  assert.equal(parseFechaYmd("26-08-2026"), "2026-08-26");
  assert.equal(parseFechaYmd("26/08/2026"), "2026-08-26");
  assert.equal(parseFechaYmd(""), null);
  assert.equal(parseFechaYmd("sin-fecha"), null);
});

test("isEventoFinalizado: se cierra al día siguiente en Chile", () => {
  // 26 ago 2026 00:00 CLT (UTC-4) = 26 ago 04:00 UTC — el evento de ese día sigue abierto
  const diaDelEvento = new Date("2026-08-26T04:00:00.000Z");
  assert.equal(isEventoFinalizado("2026-08-26", diaDelEvento), false);
  assert.equal(isEventoFinalizado("26-08-2026", diaDelEvento), false);

  // 27 ago 2026 00:00 CLT — ya finalizó
  const diaSiguiente = new Date("2026-08-27T04:00:00.000Z");
  assert.equal(isEventoFinalizado("2026-08-26", diaSiguiente), true);

  // un minuto antes de medianoche del día del evento (26 ago 23:59 CLT)
  const casiMedianoche = new Date("2026-08-27T03:59:00.000Z");
  assert.equal(isEventoFinalizado("2026-08-26", casiMedianoche), false);

  // sin fecha parseable no se bloquea
  assert.equal(isEventoFinalizado("", diaSiguiente), false);
});
