/**
 * Orden de las hojas de estilo del Design System (cascada: tokens → base → layout →
 * componentes → layouts de sitio → utilidades). El servidor las concatena en un único
 * bundle `/design-system/tw.css`. Al agregar un componente con CSS propio, registrarlo aquí.
 * Rutas relativas a src/design-system/.
 */
export const STYLESHEETS = [
  "tokens/tokens.css",
  "styles/fonts.css",
  "styles/base.css",
  "styles/layout.css",
  "styles/components/typography.css",
  "styles/components/button.css",
  "styles/components/selection.css",
  "styles/components/badge.css",
  "styles/components/card.css",
  "styles/components/form.css",
  "styles/components/feedback.css",
  "styles/components/overlay.css",
  "styles/components/calendar.css",
  "styles/layouts/site.css",
  "styles/layouts/hero.css",
  "styles/utilities.css",
];
