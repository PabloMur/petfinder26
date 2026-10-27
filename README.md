# Pet Finder

App para reunir mascotas perdidas con sus familias: mapa de reportes cercanos, publicación en 3 pasos sin necesidad de cuenta, matching automático entre "perdida" y "encontrada", y cartel imprimible con QR.

El diseño de referencia (13 pantallas) está en [`design/mockup.html`](design/mockup.html).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Neon** — Postgres + PostGIS, consultado solo desde los route handlers (`pg`)
- **Vercel Blob** — fotos de los reportes, subidas directo desde el navegador
- **Mapbox GL JS** (`react-map-gl`) — mapa y heatmap
- **React Hook Form + Zod** — flujo de publicación en 3 pasos
- **`@react-pdf/renderer` + `qrcode`** — cartel imprimible, generado en el cliente
- Desplegado en **Vercel**, con Neon y Blob conectados desde el Marketplace (free tier)

## Estructura

```
app/
  api/               route handlers: el único acceso a la base (lectura y escritura)
  (onboarding)/     pantalla 1
  mapa/              pantallas 2, 3, 4 (mapa, filtros, heatmap)
  publicar/[paso]/   pantallas 5, 6, 7 (flujo de 3 pasos)
  reportes/[id]/     pantallas 8-10, 13 (publicado, detalle, match, reencuentro)
  alertas/           pantalla 11
  perfil/            pantalla 12
lib/
  data/              funciones del cliente que llaman a app/api
  server/            conexión a Neon, validación y Turnstile (solo servidor)
  claim-token.ts     manejo de claim tokens anónimos en localStorage
  matching/          lógica de scoring en el cliente (espejo del SQL)
  pdf/               generador del cartel
db/
  schema.sql         esquema SQL (PostGIS, vistas públicas, matching)
```

## Cómo funciona el modelo de dueño anónimo

Publicar un reporte no requiere cuenta. Cada reporte anónimo lleva un `claim_token`
(UUID) generado en el cliente y guardado en `localStorage` — es lo que te deja
editar o cerrar tu propio caso sin login. El acceso con cuenta y la sincronización
entre dispositivos todavía no están implementados; los reportes se gestionan desde
el navegador donde se publicaron.

El navegador nunca habla con la base: todo pasa por `app/api`, que es donde se
controla quién puede leer o cambiar qué. Las ubicaciones públicas se muestran
aproximadas (redondeadas a ~100 m). Los datos de contacto no se
incluyen en la respuesta pública de reportes: la persona que publica autoriza
mostrarlos y los visitantes deben superar Turnstile al tocar «Contactar». Las
fotos admitidas son JPG, PNG o WebP, de hasta 5 MB cada una y seis por publicación.

## Setup local

```bash
npm install
vercel link && vercel env pull .env.local   # trae DATABASE_URL y BLOB_READ_WRITE_TOKEN
npm run db:schema                            # solo la primera vez, sobre una base vacía
npm run dev
```

Para habilitar publicaciones, creá un widget Turnstile y configurá su site key
en `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, su secret en `TURNSTILE_SECRET_KEY`, los
hostnames permitidos en `TURNSTILE_ALLOWED_HOSTNAMES` (separados por coma). El
secret de Turnstile y las credenciales de Neon y Blob son solo del servidor: no
uses el prefijo `NEXT_PUBLIC_`.
