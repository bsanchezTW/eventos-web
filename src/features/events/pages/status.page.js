/**
 * Páginas de estado (404 / error) con el mismo lenguaje visual.
 */
import { Button, EmptyState, Section } from "../../../design-system/index.js";
import { renderPage } from "./shell.js";

/**
 * @param {{ status: 404 | 500 | 503, categories?: Array<{ id: string, name: string }> }} props
 */
export function renderStatusPage({ status, categories = [] }) {
  const copy =
    status === 404
      ? { title: "No encontramos esta página", text: "El evento pudo haber cambiado de fecha o el enlace está incompleto. Revisa la agenda para ver las próximas fechas." }
      : { title: "La agenda no está disponible en este momento", text: "Estamos teniendo problemas para cargar los eventos. Intenta nuevamente en unos minutos." };

  return renderPage({
    title: `${copy.title} · Transworld`,
    categories,
    main: Section({
      spacing: "tight",
      children: EmptyState({
        title: copy.title,
        text: copy.text,
        headingLevel: 1,
        action: Button({ label: "Ir a la agenda", variant: "accent", href: "/" }),
      }),
    }),
  });
}
