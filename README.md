# Landing de eventos — Transworld

Agenda pública de eventos para marketing: capacitaciones, demos en terreno y webinars en Chile
y Perú. Servicio Express independiente, con un **Design System interno** (`src/design-system`)
construido a partir del template de Claude Design y reutilizable por futuras pantallas.

## Requisitos

- Node.js 22+

## Arranque

```bash
cp .env.example .env
npm install
npm run dev
```

La landing queda en `http://localhost:3020`. La guía viva del sistema de diseño, en
`http://localhost:3020/sistema-de-diseno`.

| Ruta | Uso |
|------|-----|
| `GET /` | Agenda (hero, calendario, formas de participar, galería). Filtros compartibles por URL: `categoria` (lista con comas), `mes` (`2026-10`), `dia` (`2026-10-15`), `todos=1` |
| `GET /galeria` | Galería por país con lightbox (`?tipo=foto` o `?tipo=video`) |
| `GET /webinars` | Webinars en vivo y grabados |
| `GET /eventos/:id` | Detalle con inscripción |
| `GET /api/eventos` | Explorador (misma query que la landing) |
| `GET /api/eventos/:id` · `GET /api/categorias` | Datos |
| `POST /api/eventos/:id/inscripciones` | Inscripción (NEXUS con `EVENTS_SOURCE=supabase`; en memoria si no). Límite por IP |
| `POST /api/suscripciones` | Avisos de nuevas fechas (en memoria) |
| `GET /sistema-de-diseno` | Guía viva del DS (desarrollo, o `DS_SHOWCASE=1`) |
| `GET /health` | Liveness |

Ejemplo de enlace de campaña: `/?categoria=cctv,networking#calendario`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `npm start` | Servidor con / sin recarga |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos JSDoc con TypeScript (`jsconfig.json`) |
| `npm test` | Tests (`node --test`): DS, dominio, servicios e integración HTTP |
| `npm run check` | Los tres anteriores |
| `npm run fonts:sync` | Recopia las fuentes self-hosted desde `@fontsource` |

No hay paso de build: el servidor concatena el CSS del DS y sirve módulos ES al navegador.

## Arquitectura

```text
src/
├── server.js                 arranque (lee .env)
├── app/                      composición Express, config, cabeceras de seguridad
├── design-system/            lenguaje visual (ver docs/design-system.md)
└── features/events/
    ├── domain/               modelo Event, formato, filtros del explorador, validación (isomórfico)
    ├── data/                 mocks: eventos, categorías, copys de la landing
    ├── services/             EventRepository (mock | API | Supabase), RPC NEXUS, EventService, RegistrationService
    ├── components/           EventCard, explorador, secciones, modal, panel de inscripción (isomórfico)
    ├── pages/                páginas SSR y shell del sitio
    ├── client/               interacción en el navegador
    └── routes.js             páginas, API y assets de la feature
```

Flujo de datos: `UI → EventService → EventRepository → mock | API | Supabase` y
`RegistrationService → RegistrationGateway → Supabase | memoria`.

## Base de datos (NEXUS)

Con `EVENTS_SOURCE=supabase` la agenda y las inscripciones usan el proyecto Supabase **NEXUS**
(el mismo de la app RegisPro, `nexus-app`), solo a través de sus RPC públicas
(contrato: `nexus-app/docs/api-publica.md`). El servidor las llama con la clave **publicable**
del formulario; la clave nunca llega al navegador.

| RPC | Uso aquí |
|-----|----------|
| `rpe_publico_calendario` | Todos los eventos (180 días atrás a 1 año adelante) |
| `rpe_publico_evento` | Detalle de cada evento vigente: descripción, cupos y talleres (sub-eventos) |
| `rpe_publico_registrar` | Inscripción con los talleres elegidos |

- Cada evento vigente se lee con sus talleres; la lectura se reutiliza `EVENTS_CACHE_TTL_S` segundos
  y se descarta después de cada inscripción para mostrar los cupos al día.
- Ids: el evento usa su `slug` (`/eventos/<slug>`); un taller, `<slug>--<código>`. Inscribirse
  desde un taller inscribe en el evento padre con ese taller elegido.
- Formulario: los campos del formulario público anterior (`formularios-eventos-web`): nombre y
  apellido, correo, empresa, cargo, teléfono con código de país y UTMs de la campaña. Los talleres
  son opcionales, varios por persona y sin choques de horario.
- La base controla cupos del evento y de cada taller, solapes y duplicados: el mismo correo en el
  mismo evento **suma talleres** (no se duplica). El correo con el QR lo envía NEXUS
  (`envios_qr` + webhook `enviar-qr`), no esta web.
- La base no guarda modalidad ni categoría: todo evento es presencial (salvo que lugar o nombre
  digan webinar/online), la categoría es la `tematica` y la ciudad sale de la dirección.
- Pendiente para producción (lo pide `api-publica.md`): Cloudflare Turnstile en el formulario.
  El límite por IP ya está (`REGISTRATION_RATE_LIMIT`).

## Variables de entorno

Ver `.env.example`.

## Contenido pendiente

- Fotos reales para la galería (hoy muestran el placeholder rayado del template) y para cada
  evento (hoy todos usan la foto de casa matriz, igual que el template).
- Los eventos mock usan fechas fijas de la temporada oct–dic 2026; su estado (próximo, en curso,
  finalizado) se calcula con la fecha actual.
