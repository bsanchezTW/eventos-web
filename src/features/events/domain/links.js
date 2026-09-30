/** Rutas públicas de la feature (compartidas por servidor y navegador). */

/** @param {string} id */
export const eventHref = (id) => `/eventos/${encodeURIComponent(id)}`;

/** @param {string} slug */
export const albumHref = (slug) => `/galeria/${encodeURIComponent(slug)}`;

/** @param {string} categoryId */
export const categoryHref = (categoryId) => `/?categoria=${encodeURIComponent(categoryId)}#calendario`;

export const API = {
  events: "/api/eventos",
  /** @param {string} id */
  registrations: (id) => `/api/eventos/${encodeURIComponent(id)}/inscripciones`,
  subscriptions: "/api/suscripciones",
};
