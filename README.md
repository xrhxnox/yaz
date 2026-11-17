# Yaz & Ric

Nuestro espacio a distancia:

- **Inicio:** días juntos, hora y clima de cada uno, cuenta regresiva para el reencuentro y mensajes rápidos ("Pensé en ti", "Te extraño"…) que llegan como notificación.
- **Pregunta del día:** la misma pregunta para los dos; la respuesta del otro se ve hasta que contestas la tuya.
- **Lista:** pendientes compartidos (películas y series, lugares, planes).
- **Fotos:** varias fotos al día de cada uno (hasta 12) y el álbum de días anteriores.
- **Momentos:** línea del tiempo de la relación, con fotos.
- **Perfiles** (botón arriba a la derecha): tallas, wishlist con links (el otro puede marcar "Ya lo compré" sin que el dueño lo vea) y colores personalizados de fondo y acento para tu app.

Hecha con Next.js, Supabase (base de datos y fotos), Web Push (PWA) y Open-Meteo (clima, sin llave).

## Puesta en marcha

### 1. Crear el proyecto en Supabase (gratis)

1. Entra a [supabase.com](https://supabase.com) → **Start your project** y crea una cuenta.
2. **New project**:
   - **Name:** el que quieras (ej. `rick-yaz`).
   - **Database password:** genera una y guárdala (la app no la usa, pero Supabase la pide).
   - **Region:** la más cercana, por ejemplo **West US (North California)**.
3. Espera 1–2 minutos a que termine de crearse.

### 2. Crear las tablas

1. En el menú izquierdo: **SQL Editor** → **New query**.
2. Pega **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
3. Debe decir *Success. No rows returned*. Crea 10 tablas, sus datos iniciales (ciudades y el primer momento) y la carpeta privada `fotos`.

Se puede correr otra vez sin problema (por ejemplo, cuando agreguemos funciones nuevas): no borra ni duplica nada.

### 3. Copiar las llaves a `.env.local`

En Supabase ve a **Project Settings** (engrane abajo a la izquierda):

| Qué copiar | Dónde está | Variable en `.env.local` |
| --- | --- | --- |
| Project URL (`https://xxxx.supabase.co`) | **Data API** (o el botón **Connect** arriba) | `SUPABASE_URL` |
| **Secret key** (`sb_secret_…`) | **API Keys** → *Secret keys* (crea una si no hay). Si solo ves las *legacy*, usa `service_role` | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ Usa la llave **secreta**, no la *publishable* ni la *anon*. La app solo la usa en el servidor; nunca llega al navegador. No la compartas ni la subas a GitHub (`.env.local` ya está ignorado).

Además, para iniciar sesión desde el navegador:

| Qué copiar | Dónde está | Variable |
| --- | --- | --- |
| La misma Project URL | | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`) | **API Keys** (o la legacy `anon`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

Esta sí es pública: está hecha para el navegador y por sí sola no da acceso a los datos.

### 3b. Crear las cuentas

1. En Supabase: **Authentication → Users → Add user → Create new user**.
2. Pon el correo y una contraseña para cada uno, y marca **Auto Confirm User**.
3. En `.env.local` pon esos correos en `CORREO_A` (Rick) y `CORREO_B` (Yaz). **Solo esos dos correos** pueden usar la app; cualquier otra cuenta queda bloqueada.
4. Recomendado: en **Authentication → Sign In / Providers** desactiva *Allow new users to sign up*, para que nadie más pueda crear cuentas.

Cada quien puede cambiar su contraseña desde la app, en su perfil.

Lo demás en `.env.local` ya está listo: nombres, fecha, zona horaria y llaves de notificaciones. Opcional: cambia `VAPID_SUBJECT` por `mailto:` con tu correo.

### 4. Verificar

```bash
npm run verificar
```

Revisa las variables, la conexión, las 10 tablas, las 2 cuentas, que la carpeta de fotos sea privada y que se puedan subir fotos. Si algo falla, te dice qué y dónde arreglarlo. Nunca imprime las llaves.

### 5. Probar en tu compu

```bash
npm run dev
```

Abre http://localhost:3000 y entra con tu correo y contraseña.

### Límites del plan gratis

- **Fotos:** 1 GB. Cada foto se comprime a ~300 KB, así que caben unas 3,000.
- **Pausa por inactividad:** Supabase pausa los proyectos gratis si nadie los usa en 7 días. Usándola seguido no pasa; si pasa, se reactiva desde el panel con un clic.

### 6. Publicar (Vercel, gratis)

1. Sube el proyecto a un repo **privado** de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. En **Environment Variables** pega todas las variables de `.env.local`.
4. Deploy. Vas a tener un link tipo `https://rick-yaz.vercel.app`.

### 7. Instalarla en el celular

- **iPhone (Safari):** abrir el link → **Compartir** → **Agregar a inicio**, abrirla desde el ícono y tocar **Activar notificaciones**. En iPhone las notificaciones solo funcionan si está instalada así (iOS 16.4 o superior).
- **Android (Chrome):** abrir el link → menú ⋮ → **Instalar app** → **Activar notificaciones**.
- **Compu:** abrir el link en Chrome/Edge y **Activar notificaciones**.

Cada quien entra con su correo y contraseña; la app sabe quién es por su cuenta.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `app/page.tsx` | Pantalla principal |
| `app/componentes/` | Cada sección y pieza de la interfaz |
| `app/api/*` | Endpoints (estado, pensar, pregunta, ubicación, pendientes, fotos, momentos…) |
| `lib/config.ts` | Nombres, fecha de inicio, mensajes rápidos y categorías |
| `lib/preguntas.ts` | Lista de preguntas del día |
| `public/sw.js` | Service worker que muestra las notificaciones |
| `supabase/schema.sql` | Tablas de la base de datos y carpeta de fotos |
| `scripts/verificar.mjs` | Revisa que todo esté configurado (`npm run verificar`) |
