/**
 * Contenido editorial del sitio (copys del template). Separado de la presentación para
 * poder moverlo a un CMS sin tocar componentes.
 */

export const CONTACT = {
  email: "eventos@transworld.cl",
  phone: "(56 2) 2760 4100",
  phoneHref: "tel:+56227604100",
  address: ["Calle Nueva 1890, Huechuraba", "Santiago, Chile"],
};

/** @param {string} subject */
export const mailto = (subject) => `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`;

export const LANDING_CONTENT = {
  meta: {
    title: "Agenda de eventos Transworld",
    description:
      "Agenda oficial de eventos Transworld para Chile y Perú. Elige una fecha, inscríbete en un minuto y recibe tu código QR de acceso por correo.",
  },
  tagline: "Agenda eventos",
  heroTitle: "Agenda de eventos Transworld",
  hero: {
    kicker: "Próximo evento",
    allEvents: "Ver todos los eventos",
    emptyTitle: "Agenda de eventos Transworld",
    emptyText: "Pronto publicaremos nuevas fechas en Chile y Perú. Mientras tanto, revisa los eventos que ya realizamos.",
  },
  calendar: {
    eyebrow: "Agenda",
    title: "Próximos eventos",
  },
  galleryTeaser: {
    eyebrow: "Galería",
    title: "Cómo se viven nuestras jornadas",
    action: "Ver fotos y videos",
  },
  galleryPage: {
    title: "Galería · Transworld",
    eyebrow: "Galería",
    heading: "Lo que pasó en cada evento",
    text: "Fotos y videos de nuestros eventos en Chile y Perú.",
  },
  webinarsPage: {
    title: "Webinars · Transworld",
    eyebrow: "Webinars · en vivo y on demand",
    heading: "Sesiones técnicas desde donde estés",
    text: "Transmisiones de 45 minutos con nuestros especialistas y marcas representadas. Quedan grabadas para verlas cuando quieras.",
    cta: "Recibir avisos",
  },
  subscribe: {
    title: "Suscríbete a la agenda",
    text: "Te avisamos cada vez que abrimos inscripciones para eventos, capacitaciones o webinars de tu interés.",
    submit: "Activar avisos",
    dismiss: "Ahora no",
    successTitle: "Avisos activados",
  },
  footer: {
    about: "Expertos en infraestructura tecnológica y conectividad empresarial.",
    columns: [
      {
        title: "Agenda",
        links: [
          { label: "Próximos eventos", href: "/#calendario" },
          { label: "Galería", href: "/galeria" },
        ],
      },
      {
        title: "Participar",
        links: [
          { label: "Visita al showroom", href: mailto("Visita al showroom") },
          { label: "Ser marca invitada", href: mailto("Postulación marca invitada") },
        ],
      },
    ],
    legal: "© Transworld. Todos los derechos reservados.",
  },
};
