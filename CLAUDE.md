# CLAUDE.md

Landing de eventos Transworld: Express 5 + ES modules, sin bundler ni framework de UI.

## Reglas para nuevas pantallas

- **Toda UI se construye con el Design System** de `src/design-system` (leer `docs/design-system.md`
  y ver `/sistema-de-diseno`). No depende del template original de Claude Design.
- Las features no llevan CSS propio (hay un test que lo impide). Si falta un patrón visual,
  agregarlo al DS: componente + CSS con tokens + `styles/manifest.js` + export en `index.js` +
  muestra en `showcase/page.js` + test.
- Nada de hex sueltos fuera de `tokens/tokens.css` ni estilos inline (`style=`): la CSP los bloquea.
- Componentes = funciones que devuelven `html\`\`` (escapa todo). Los módulos en `domain/` y
  `components/` deben seguir siendo isomórficos (sin APIs exclusivas de Node o del navegador).
- Datos siempre vía servicio → repositorio; nunca importar mocks desde páginas o componentes.
- Textos de UI en español (es-CL); fechas en la zona horaria del evento (`domain/format.js`).

## Comandos

- `npm run dev` — servidor en http://localhost:3020 con recarga
- `npm run check` — lint + typecheck (JSDoc) + tests; debe quedar en verde
