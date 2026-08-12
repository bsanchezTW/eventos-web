# Registro de eventos — Transworld

Formulario público de inscripción a eventos, con confirmación por correo y código QR.

Antes vivía dentro de la intranet (`src/registro-forms`). Ahora es un servicio Express independiente: usa su propio proyecto Supabase (NEXUS) y no comparte sesión ni base de datos con la intranet.

## Requisitos

- Node.js 22+
- Credenciales del proyecto Supabase de registro
- API key de Brevo para el correo de confirmación

## Arranque

```bash
cp .env.example .env
# Completa REGISTRO_SUPABASE_*, BREVO_API_KEY y MAIL_FROM
npm install
npm run dev
```

El formulario queda en `http://localhost:3010/?id=<EVENTO_ID>`.

| Ruta | Uso |
|------|-----|
| `GET /` · `GET /registro-forms` | Formulario |
| `GET /api/evento/:id` | Datos del evento y bloques |
| `POST /api/registrar` | Alta del inscrito |
| `POST /enviar-qr` | Correo de confirmación con QR |
| `GET /health` | Liveness |

Las rutas con prefijo `/registro-forms/...` siguen respondiendo, por si se publica detrás de un reverse proxy con ese path.

## Variables de entorno

Ver `.env.example`. Las credenciales de Supabase viven solo en el servidor; el HTML nunca las incluye.

`MAIL_FROM` es la casilla de consultas que aparece en el correo del QR (en Chile, `contacto@transworld.cl`).

## Relación con la intranet

La intranet puede redirigir los enlaces antiguos `/registro-forms?id=...` si define `REGISTRO_FORMS_URL` apuntando a este servicio (por ejemplo `http://localhost:3010` o la URL pública).
