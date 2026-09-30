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
    title: "Agenda de eventos Transworld · Capacitaciones, demos y webinars",
    description:
      "Agenda oficial de eventos Transworld para Chile y Perú: capacitaciones con certificado, demos en terreno y webinars técnicos. Reserva tu cupo en un minuto.",
  },
  tagline: "Agenda eventos",
  heroTitle: "Agenda de eventos Transworld",
  headerCta: "Inscribirme",
  promoSlide: {
    kicker: "Inscripciones abiertas",
    title: "Capacitaciones, demos y webinars técnicos",
    body: "Agenda oficial Transworld para Chile y Perú. Elige una fecha, reserva tu cupo en un minuto y recibe tu comprobante al instante.",
    cta: "Ver próximas fechas",
  },
  gallerySlide: {
    kicker: "Galería",
    title: "Revive cada jornada técnica",
    body: "Fotos y grabaciones de las sesiones en Santiago, Antofagasta y Lima, disponibles cuando quieras.",
    cta: "Ver galería",
  },
  stats: {
    formats: "Presencial · Webinar · En terreno",
  },
  calendar: {
    eyebrow: "Calendario",
    title: "Próximas fechas",
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
  cta: {
    title: "¿Necesitas una capacitación para tu equipo?",
    text: "Coordinamos sesiones técnicas en tus instalaciones o de forma remota, según tus proyectos.",
    action: "Solicitar contacto",
    href: mailto("Solicitud de capacitación para mi equipo"),
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
          { label: "Webinars en vivo", href: "/webinars" },
          { label: "Grabaciones", href: "/webinars#grabaciones" },
          { label: "Galería", href: "/galeria" },
        ],
      },
      {
        title: "Participar",
        links: [
          { label: "Suscribirme a la agenda", href: "#suscribirme" },
          { label: "Capacitación a medida", href: mailto("Capacitación a medida") },
          { label: "Visita al showroom", href: mailto("Visita al showroom") },
          { label: "Ser marca invitada", href: mailto("Postulación marca invitada") },
        ],
      },
    ],
    legal: "© Transworld. Todos los derechos reservados.",
  },
};
