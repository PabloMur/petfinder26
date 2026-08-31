# Pet Finder

App para reunir mascotas perdidas con sus familias: mapa de reportes cercanos, publicación en 3 pasos sin necesidad de cuenta, matching automático entre "perdida" y "encontrada", y cartel imprimible con QR.

El diseño de referencia (13 pantallas) está en [`design/mockup.html`](design/mockup.html).

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — Postgres + PostGIS, Auth, Storage, Realtime
- **Mapbox GL JS** (`react-map-gl`) — mapa y heatmap
- **React Hook Form + Zod** — flujo de publicación en 3 pasos
- **`@react-pdf/renderer` + `qrcode`** — cartel imprimible, generado en el cliente
- Desplegado en **Vercel** (frontend) + **Supabase Cloud** (backend), ambos free tier

## Estructura

```
app/
  (onboarding)/     pantalla 1
  mapa/              pantallas 2, 3, 4 (mapa, filtros, heatmap)
  publicar/[paso]/   pantallas 5, 6, 7 (flujo de 3 pasos)
  reportes/[id]/     pantallas 8-10, 13 (publicado, detalle, match, reencuentro)
  alertas/           pantalla 11
  perfil/            pantalla 12
lib/
  supabase/          clientes browser/server + manejo de claim tokens anónimos
  matching/          lógica de scoring en el cliente (espejo del SQL)
  pdf/               generador del cartel
supabase/
  migrations/        esquema SQL (PostGIS, RLS, función de matching)
```

## Cómo funciona el modelo de dueño anónimo

Publicar un reporte no requiere cuenta. Cada reporte anónimo lleva un `claim_token`
(UUID) generado en el cliente y guardado en `localStorage` — es lo que te deja
editar o cerrar tu propio caso sin login. Crear una cuenta (magic link por email)
es opcional y solo suma sincronizar reportes entre dispositivos.

## Setup local

```bash
npm install
cp .env.local.example .env.local   # completar con las credenciales de tu proyecto Supabase
npm run dev
```

Aplicar el esquema: pegar el contenido de `supabase/migrations/*.sql`, en orden,
en el SQL Editor de tu proyecto Supabase (o usar `supabase db push` con el CLI).
