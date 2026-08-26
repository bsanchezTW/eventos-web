/**
 * Fecha de evento (día calendario, zona America/Santiago).
 * Acepta ISO (YYYY-MM-DD…) o DD-MM-YYYY / DD/MM/YYYY.
 */

const TZ_CHILE = "America/Santiago";

function parseFechaYmd(fechaRaw) {
  const value = String(fechaRaw || "").trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  return null;
}

function ymdEnChile(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_CHILE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** true si el día calendario en Chile es posterior a la fecha del evento */
function isEventoFinalizado(fechaRaw, now = new Date()) {
  const eventoYmd = parseFechaYmd(fechaRaw);
  if (!eventoYmd) return false;
  return ymdEnChile(now) > eventoYmd;
}

module.exports = {
  TZ_CHILE,
  parseFechaYmd,
  ymdEnChile,
  isEventoFinalizado,
};
