/**
 * Validación de inscripción y suscripción. La misma función corre en el navegador
 * (feedback inmediato) y en el servidor (antes de llamar a la base).
 *
 * Campos y reglas del formulario público anterior (formularios-eventos-web): nombre y apellido,
 * empresa, cargo, teléfono con código de país, correo y UTMs. Las reglas de nombre y correo se
 * alinean además con `rpe_validar_datos_asistente` (NEXUS), para no enviar datos que la base rechace.
 */

/**
 * @typedef {object} PhoneCountry
 * @property {string} code         ISO 3166-1 alfa-2
 * @property {string} callingCode
 * @property {string} label
 * @property {number} nationalDigits
 * @property {number} nationalDigitsMax
 * @property {RegExp | null} mobileLeading
 * @property {number[]} groups
 * @property {string} example
 */

/** Chile y Perú primero; el resto de LatAm en orden alfabético. @type {PhoneCountry[]} */
export const PHONE_COUNTRIES = [
  { code: "CL", callingCode: "56", label: "+56 CL", nationalDigits: 9, nationalDigitsMax: 9, mobileLeading: null, groups: [1, 4, 4], example: "9 1234 5678" },
  { code: "PE", callingCode: "51", label: "+51 PE", nationalDigits: 8, nationalDigitsMax: 9, mobileLeading: null, groups: [3, 3, 3], example: "987 654 321" },
  { code: "AR", callingCode: "54", label: "+54 AR", nationalDigits: 10, nationalDigitsMax: 10, mobileLeading: null, groups: [2, 4, 4], example: "11 2345 6789" },
  { code: "BO", callingCode: "591", label: "+591 BO", nationalDigits: 8, nationalDigitsMax: 8, mobileLeading: /^[67]/, groups: [4, 4], example: "7123 4567" },
  { code: "BR", callingCode: "55", label: "+55 BR", nationalDigits: 10, nationalDigitsMax: 11, mobileLeading: null, groups: [2, 5, 4], example: "11 91234 5678" },
  { code: "CO", callingCode: "57", label: "+57 CO", nationalDigits: 10, nationalDigitsMax: 10, mobileLeading: /^3/, groups: [3, 3, 4], example: "300 123 4567" },
  { code: "CR", callingCode: "506", label: "+506 CR", nationalDigits: 8, nationalDigitsMax: 8, mobileLeading: null, groups: [4, 4], example: "8888 8888" },
  { code: "EC", callingCode: "593", label: "+593 EC", nationalDigits: 9, nationalDigitsMax: 9, mobileLeading: /^9/, groups: [2, 3, 4], example: "99 123 4567" },
  { code: "GT", callingCode: "502", label: "+502 GT", nationalDigits: 8, nationalDigitsMax: 8, mobileLeading: null, groups: [4, 4], example: "5123 4567" },
  { code: "MX", callingCode: "52", label: "+52 MX", nationalDigits: 10, nationalDigitsMax: 10, mobileLeading: null, groups: [2, 4, 4], example: "55 1234 5678" },
  { code: "PA", callingCode: "507", label: "+507 PA", nationalDigits: 8, nationalDigitsMax: 8, mobileLeading: null, groups: [4, 4], example: "6123 4567" },
  { code: "PY", callingCode: "595", label: "+595 PY", nationalDigits: 9, nationalDigitsMax: 9, mobileLeading: /^9/, groups: [3, 3, 3], example: "981 123 456" },
  { code: "UY", callingCode: "598", label: "+598 UY", nationalDigits: 8, nationalDigitsMax: 8, mobileLeading: /^9/, groups: [2, 3, 3], example: "94 123 456" },
  { code: "VE", callingCode: "58", label: "+58 VE", nationalDigits: 10, nationalDigitsMax: 10, mobileLeading: /^4/, groups: [3, 3, 4], example: "412 123 4567" },
];

export const DEFAULT_PHONE_COUNTRY = "CL";

/** Parámetros de campaña que viajan con la inscripción (máx. 100 caracteres cada uno en la base). */
export const UTM_KEYS = /** @type {const} */ (["utm_source", "utm_medium", "utm_campaign", "utm_content"]);

/** Tope de talleres por envío que acepta `rpe_publico_registrar`. */
export const MAX_WORKSHOPS = 20;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_LOCAL = /^[a-z0-9]([a-z0-9._%+-]*[a-z0-9])?$/;
const EMAIL_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** @param {unknown} value */
const str = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

/** @param {unknown} value */
export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

/** País de teléfono por código ISO; si no existe, Chile. @param {unknown} code */
export function getPhoneCountry(code) {
  const upper = String(code ?? "").toUpperCase();
  return PHONE_COUNTRIES.find((c) => c.code === upper) ?? /** @type {PhoneCountry} */ (PHONE_COUNTRIES.find((c) => c.code === DEFAULT_PHONE_COUNTRY));
}

/** Código de teléfono sugerido según el país del evento. @param {string} [eventCountry] */
export function defaultPhoneCountry(eventCountry = "") {
  return /^per[uú]$/i.test(eventCountry.trim()) ? "PE" : DEFAULT_PHONE_COUNTRY;
}

/** Opciones del selector de código de país. */
export const phoneCountryOptions = () => PHONE_COUNTRIES.map((c) => ({ value: c.code, label: c.label }));

/** "JUAN PÉREZ" → "Juan Pérez". @param {unknown} value */
export function toTitleCaseName(value) {
  return str(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase("es");
      return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
    })
    .join(" ");
}

/** Solo letras (con tildes y ñ) y espacios. @param {unknown} value */
export function isLettersAndSpaces(value) {
  const trimmed = str(value);
  return trimmed !== "" && /^\p{L}+(?:\s+\p{L}+)*$/u.test(trimmed);
}

/** Al menos dos palabras de dos letras o más (regla de la base). @param {unknown} value */
export function isValidFullName(value) {
  const words = str(value).split(" ").filter(Boolean);
  return isLettersAndSpaces(value) && words.length >= 2 && words.every((w) => w.length >= 2);
}

/** Conserva mayúsculas y símbolos ("P&G", "3M"); solo recorta y colapsa espacios. @param {unknown} value */
export const normalizeEmpresa = (value) => str(value);

/** Mismo criterio que la base: local y dominio sin caracteres raros, TLD de 2+ letras. @param {unknown} value */
export function isValidEmail(value) {
  const email = str(value).toLowerCase();
  if (!EMAIL.test(email) || email.length > 254 || email.includes("..")) return false;
  const [local, domain, extra] = email.split("@");
  if (extra !== undefined || !EMAIL_LOCAL.test(local)) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((l) => EMAIL_LABEL.test(l)) && /^[a-z]{2,}$/.test(labels[labels.length - 1]);
}

/** @param {number[]} groups @param {string} digits */
function groupDigits(digits, groups) {
  const out = [];
  let rest = digits;
  for (const size of groups) {
    if (!rest) break;
    out.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  if (rest) out.push(rest);
  return out.join(" ");
}

/** Agrupación visible según país y tipo de número (móvil o fijo). @param {PhoneCountry} cfg @param {string} digits */
function groupsFor(cfg, digits) {
  if (cfg.code === "CL") return digits.startsWith("2") || digits.startsWith("9") ? [1, 4, 4] : [2, 3, 4];
  if (cfg.code === "PE") {
    if (digits.length === 9) return [3, 3, 3];
    return digits.startsWith("1") ? [1, 3, 4] : [2, 3, 3];
  }
  if (cfg.code === "BR" && digits.length <= 10) return [2, 4, 4];
  return cfg.groups;
}

/** @param {PhoneCountry} cfg @param {string} digits */
function isValidCountryDigits(cfg, digits) {
  if (cfg.code === "CL") return digits.length === 9 && /^[2-79]/.test(digits);
  if (cfg.code === "PE") return digits.length === 9 ? digits.startsWith("9") : digits.length === 8 && /^[14-8]/.test(digits);
  if (digits.length < cfg.nationalDigits || digits.length > cfg.nationalDigitsMax) return false;
  return !cfg.mobileLeading || cfg.mobileLeading.test(digits);
}

/** "912345678" → "9 1234 5678" (quita el código de país o el 0 inicial si vienen). @param {unknown} raw @param {string} countryCode */
export function formatLocalPhoneInput(raw, countryCode) {
  const cfg = getPhoneCountry(countryCode);
  let digits = digitsOnly(raw);
  if (digits.startsWith(cfg.callingCode) && digits.length > cfg.nationalDigitsMax) digits = digits.slice(cfg.callingCode.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, cfg.nationalDigitsMax);
  return digits ? groupDigits(digits, groupsFor(cfg, digits)) : "";
}

/** @param {unknown} local @param {string} countryCode */
export function isValidNationalPhone(local, countryCode) {
  return isValidCountryDigits(getPhoneCountry(countryCode), digitsOnly(local));
}

/**
 * Acepta "+56 9 1234 5678" o el número local con el código de país aparte.
 * @param {unknown} telefono
 * @param {unknown} [countryHint]
 * @returns {{ ok: true, country: string, formatted: string } | { ok: false, error: string }}
 */
export function normalizePhone(telefono, countryHint) {
  const raw = str(telefono);
  if (!raw) return { ok: false, error: "Ingresa un teléfono" };

  let cfg = getPhoneCountry(countryHint);
  let local = raw;
  const intl = /^\+(\d{1,3})\s*(.*)$/.exec(raw);
  if (intl) {
    const byCallingCode = PHONE_COUNTRIES.find((c) => c.callingCode === intl[1]);
    if (!byCallingCode) return { ok: false, error: "Código de país no soportado" };
    cfg = byCallingCode;
    local = intl[2];
  }

  const formatted = formatLocalPhoneInput(local, cfg.code);
  if (!isValidNationalPhone(formatted, cfg.code)) return { ok: false, error: `Ingresa un teléfono válido con formato ${cfg.example}` };
  return { ok: true, country: cfg.code, formatted: `+${cfg.callingCode} ${formatted}` };
}

/**
 * @typedef {object} WorkshopSlot  Taller elegible dentro de un evento
 * @property {string} code
 * @property {string} title
 * @property {string} startsAt
 * @property {string} endsAt
 */

/**
 * Talleres elegidos que se superponen en horario (la base también lo rechaza).
 * @param {WorkshopSlot[]} slots
 * @returns {Array<[WorkshopSlot, WorkshopSlot]>}
 */
export function findOverlaps(slots) {
  /** @type {Array<[WorkshopSlot, WorkshopSlot]>} */
  const pairs = [];
  slots.forEach((a, i) => {
    for (const b of slots.slice(i + 1)) {
      if (Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt)) pairs.push([a, b]);
    }
  });
  return pairs;
}

/**
 * @typedef {object} RegistrationInput
 * @property {string} nombre
 * @property {string} email
 * @property {string} empresa
 * @property {string} cargo
 * @property {string} telefono_pais
 * @property {string} telefono       Normalizado ("+56 9 1234 5678") si es válido
 * @property {string[]} talleres     Códigos de taller
 * @property {Record<typeof UTM_KEYS[number], string | null>} utm
 * @property {boolean} acepta
 */

/** @param {unknown} value */
function toCodeList(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" && value ? value.split(",") : [];
  return [...new Set(list.map((c) => String(c).trim().toLowerCase()).filter((c) => /^[a-z0-9-]{1,120}$/.test(c)))];
}

/**
 * @param {Record<string, unknown>} raw
 * @param {{ workshops?: WorkshopSlot[] }} [options] talleres elegibles del evento (valida códigos y choques de horario)
 * @returns {{ value: RegistrationInput, errors: Partial<Record<"nombre" | "email" | "empresa" | "cargo" | "telefono" | "talleres" | "acepta", string>> }}
 */
export function validateRegistration(raw, { workshops } = {}) {
  const phone = normalizePhone(raw.telefono, raw.telefono_pais);
  const rawUtm = /** @type {Record<string, unknown>} */ (raw.utm && typeof raw.utm === "object" ? raw.utm : raw);
  const value = {
    nombre: toTitleCaseName(raw.nombre).slice(0, 120),
    email: str(raw.email).toLowerCase().slice(0, 254),
    empresa: normalizeEmpresa(raw.empresa).slice(0, 120),
    cargo: toTitleCaseName(raw.cargo).slice(0, 120),
    telefono_pais: phone.ok ? phone.country : getPhoneCountry(raw.telefono_pais).code,
    telefono: phone.ok ? phone.formatted : str(raw.telefono).slice(0, 30),
    talleres: toCodeList(raw.talleres),
    utm: /** @type {RegistrationInput["utm"]} */ (Object.fromEntries(UTM_KEYS.map((key) => [key, str(rawUtm[key]).slice(0, 100) || null]))),
    acepta: raw.acepta === true || raw.acepta === "on" || raw.acepta === "true",
  };

  /** @type {ReturnType<typeof validateRegistration>["errors"]} */
  const errors = {};
  if (!value.nombre) errors.nombre = "Ingresa nombre y apellido";
  else if (!isLettersAndSpaces(value.nombre)) errors.nombre = "Usa solo letras, sin números ni símbolos";
  else if (!isValidFullName(value.nombre)) errors.nombre = "Ingresa nombre y apellido";

  if (!value.empresa) errors.empresa = "Ingresa la empresa";

  if (!value.cargo) errors.cargo = "Ingresa el cargo";
  else if (!isLettersAndSpaces(value.cargo)) errors.cargo = "Usa solo letras, sin números ni símbolos";

  if (!phone.ok) errors.telefono = phone.error;

  if (!value.email) errors.email = "Ingresa un correo electrónico";
  else if (!isValidEmail(value.email)) errors.email = "Ingresa un correo válido";

  if (value.talleres.length > MAX_WORKSHOPS) errors.talleres = `Puedes elegir hasta ${MAX_WORKSHOPS} talleres por inscripción.`;
  else if (workshops) {
    const chosen = value.talleres.map((code) => workshops.find((w) => w.code === code));
    const [overlap] = findOverlaps(/** @type {WorkshopSlot[]} */ (chosen.filter(Boolean)));
    if (chosen.some((w) => !w)) errors.talleres = "Uno de los talleres elegidos ya no está disponible.";
    else if (overlap) errors.talleres = `«${overlap[0].title}» y «${overlap[1].title}» son a la misma hora: elige solo uno.`;
  }

  if (!value.acepta) errors.acepta = "Necesitamos tu autorización para enviarte la confirmación.";

  return { value, errors };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string[]} validCategories
 */
export function validateSubscription(raw, validCategories) {
  const email = str(raw.email).toLowerCase();
  const list = Array.isArray(raw.categorias) ? raw.categorias : str(raw.categorias).split(",");
  const categories = [...new Set(list.map((c) => String(c).trim()).filter((c) => validCategories.includes(c)))];
  /** @type {{ email?: string }} */
  const errors = {};
  if (!EMAIL.test(email)) errors.email = "Revisa el correo: parece incompleto.";
  return { value: { email, categories }, errors };
}
