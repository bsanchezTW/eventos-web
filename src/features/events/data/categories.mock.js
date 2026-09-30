/**
 * Líneas de producto (categorías de la agenda). Mock hasta que exista la API.
 * @type {import("../domain/event.js").Category[]}
 */
export const CATEGORIES = [
  {
    id: "fibra-optica",
    name: "Fibra óptica",
    description: "Diseño, fusión y certificación de redes FTTx y backbone.",
    icon: "fiber",
  },
  {
    id: "networking",
    name: "Networking",
    description: "Switching, Wi‑Fi corporativo y enlaces inalámbricos carrier-class.",
    icon: "network",
  },
  {
    id: "cctv",
    name: "CCTV",
    description: "Videovigilancia IP, almacenamiento y analítica de video.",
    icon: "camera",
  },
  {
    id: "seguridad-maquinas",
    name: "Seguridad de máquinas",
    description: "Vallados perimetrales, sensores y normativa para plantas.",
    icon: "shield",
  },
  {
    id: "energia",
    name: "Energía",
    description: "Respaldo UPS, continuidad operacional y salas críticas.",
    icon: "bolt",
  },
];
