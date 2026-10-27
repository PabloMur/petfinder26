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
editar o cerrar tu propio caso sin login. El acceso con cuenta y la sincronización
entre dispositivos todavía no están implementados; los reportes se gestionan desde
el navegador donde se publicaron.

Las ubicaciones públicas se muestran aproximadas. Los datos de contacto no se
incluyen en la respuesta pública de reportes: la persona que publica autoriza
mostrarlos y los visitantes deben superar Turnstile al tocar «Contactar». Las
fotos admitidas son JPG, PNG o WebP, de hasta 5 MB cada una y seis por publicación.

## Setup local

```bash
npm install
cp .env.local.example .env.local   # completar con las credenciales de tu proyecto Supabase
npm run dev
```

Para habilitar publicaciones, creá un widget Turnstile y configurá su site key
en `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, su secret en `TURNSTILE_SECRET_KEY`, los
hostnames permitidos en `TURNSTILE_ALLOWED_HOSTNAMES` (separados por coma) y la
clave secreta de Supabase en `SUPABASE_SECRET_KEY`. La clave secreta de Supabase
y el secret de Turnstile son solo del servidor: no uses el prefijo `NEXT_PUBLIC_`.

Aplicar el esquema: pegar el contenido de `supabase/migrations/*.sql`, en orden,
en el SQL Editor de tu proyecto Supabase (o usar `supabase db push` con el CLI).
