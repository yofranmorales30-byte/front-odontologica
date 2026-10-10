# Armonía — turnos online

Sistema de turnos de Armonía Odontología y Estética Facial: página pública, registro de pacientes con su primera cita, panel del paciente y agenda para el personal.

| Carpeta | Qué es |
|---|---|
| `Back-end/` | API REST con Express y base de datos en Turso (libSQL, compatible con SQLite) |
| `Front-end/odontologia-marcos-garcia/` | Aplicación React con Vite |

Requisitos: Node.js 22.12 o superior (lo pide Vitest; probado con Node 24).

## Puesta en marcha

**API** (queda en `http://localhost:3001/api`):

```bash
cd Back-end
npm install
cp .env.example .env    # completar JWT_SECRET y los datos de Turso
npm run dev
```

Si la base está vacía, al arrancar se crean las tablas y los usuarios de ejemplo, y **la consola muestra sus contraseñas una sola vez**. Anotalas.

**Frontend** (queda en `http://localhost:3000`):

```bash
cd Front-end/odontologia-marcos-garcia
npm install
npm run dev
```

## Variables de entorno

Backend (`Back-end/.env`):

| Variable | Por defecto | Para qué |
|---|---|---|
| `JWT_SECRET` | aleatorio en cada arranque | Firma los tokens de sesión. Sin definirlo, las sesiones se cierran al reiniciar el servidor (en Vercel es obligatorio). |
| `TURSO_DATABASE_URL` | archivo local `Back-end/odontologia.db` | URL de la base en Turso (`libsql://…`). |
| `TURSO_AUTH_TOKEN` | — | Token de acceso a esa base. Es secreto: solo va en `.env`. |
| `PORT` | `3001` | Puerto de la API. |
| `CLINIC_TZ` | `America/Caracas` | Zona horaria de la clínica: define qué citas ya terminaron. |

Frontend (`Front-end/odontologia-marcos-garcia/.env`):

| Variable | Por defecto |
|---|---|
| `VITE_API_URL` | `http://localhost:3001/api` en desarrollo; en el build, la de `.env.production` (la API en Vercel) |

## Base de datos (Turso)

La base vive en [Turso](https://turso.tech) (libSQL, un SQLite en la nube). Prepararla significa crear las tablas si faltan, cargar los datos semilla si está vacía, aplicar las migraciones de datos viejos y reinstalar las reglas de la agenda, todo en una sola operación atómica. Lo hace `npm run dev` / `npm start` al arrancar, y `npm run migrar` sin levantar el servidor.

- **Latencia:** cada consulta es un viaje de red hasta la región de la base (hoy `aws-us-west-2`). Conviene desplegar la API en una región cercana.
- **Escrituras atómicas:** lo que tiene que guardarse junto (cuenta + ficha + cita) va en un único `batch`: si una parte falla, no queda nada. No se usan transacciones interactivas, porque contra Turso bloquearían la base durante varios viajes de red.
- **Sin Turso:** sin `TURSO_DATABASE_URL` se usa un archivo SQLite local. Los tests usan siempre un archivo temporal propio, nunca la base de Turso.

## Datos de demostración

Para probar el sistema con una agenda llena, sin cargar todo a mano:

```bash
cd Back-end
npm run demo:cargar   # agrega unos 70 pacientes y 180 citas ficticios a la base del .env
npm run demo:borrar   # los quita
```

- **Qué carga:** pacientes de todas las edades, con y sin cuenta propia, y sus tratamientos en orden (evaluación → brackets → controles, prótesis por etapas, etc.): seis semanas de historia y cuatro de agenda futura, dentro del horario de atención y sin pisar lo que ya esté reservado. Las fechas se calculan desde el día en que se corre.
- **No toca lo que ya hay:** no modifica ninguna cuenta existente ni su contraseña. La cuenta `paciente@odontologia.com` recibe algunas citas para poder probar "Mis citas".
- **Datos que no son de nadie:** los teléfonos usan el patrón ficticio `555-01xx` y los emails son `@example.com`, para que una prueba con los botones de WhatsApp o email no le llegue a una persona real.
- **Cuentas nuevas:** los pacientes con cuenta comparten una contraseña aleatoria que se muestra una sola vez al cargar.
- **Borrar es exacto:** lo creado queda anotado en la tabla `datos_demo`, así que `demo:borrar` quita eso y nada más. También borra las citas que se hayan agendado después para un paciente de demostración.
- **Antes de usar el sistema en serio:** correr `npm run demo:borrar`.

## Desplegar la API en Vercel

`src/server.js` exporta la app de Express: Vercel la detecta sola y la corre como función. En Vercel no escucha un puerto ni prepara la base (haría más lento cada arranque en frío).

1. **Preparar la base** (la primera vez y cada vez que cambie el schema), desde tu máquina con el `.env` apuntando a Turso:
   ```bash
   cd Back-end
   npm run migrar
   ```
2. **Crear el proyecto** en Vercel desde el repositorio, con **Root Directory = `Back-end`**. No hace falta build command ni output directory.
3. **Variables de entorno** del proyecto (Settings → Environment Variables): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `JWT_SECRET`, y `CLINIC_TZ` si la clínica no está en Caracas. Sin `JWT_SECRET` o sin `TURSO_DATABASE_URL` la función falla a propósito con un error claro en los logs.
4. **Comprobar:** `https://<tu-proyecto>.vercel.app/api/salud` tiene que responder `{"ok":true}`. Si responde 503, la base no está preparada o las credenciales están mal.
5. **Conectar el frontend:** `VITE_API_URL=https://<tu-proyecto>.vercel.app/api` en el `.env` (o en las variables del proyecto) del frontend.

Qué tiene en cuenta el código:

- **Región:** `vercel.json` fija las funciones en `pdx1` (Portland), la misma región de AWS que la base. Si la base cambia de región, hay que cambiarla también ahí.
- **Citas COMPLETADA:** no hay un proceso siempre encendido que las marque cada minuto; se marcan justo antes de mostrar citas, como mucho una vez por minuto por instancia. Funciona igual en cualquier plan, sin Cron Jobs.
- **Sin binarios nativos:** contra Turso se usa el cliente HTTP de libSQL; el driver nativo solo se carga para un archivo local.
- **`.vercelignore`** evita subir `.env` y los tests si desplegás con el CLI de Vercel.
- **Plan:** el plan Hobby de Vercel es para uso personal y no comercial; el sistema de turnos de una clínica corresponde al plan Pro.

## Desplegar el frontend en Vercel

Es otro proyecto de Vercel, desde el mismo repositorio.

1. **Crear el proyecto** con **Root Directory = `Front-end/odontologia-marcos-garcia`**. El resto (Vite, `npm run build`, carpeta `build/`) lo toma de `vercel.json`.
2. **URL de la API:** ya está en `Front-end/odontologia-marcos-garcia/.env.production` (`https://front-odontologica.vercel.app/api`). Vite solo la usa en el build, así que `npm run dev` sigue usando la API local. Si ese archivo está en el repositorio no hace falta cargar nada en Vercel; también se puede importar desde *Settings → Environment Variables → Import .env*. Una variable `VITE_API_URL` cargada en Vercel tiene prioridad sobre el archivo. Tiene que ser `https://`: si falta o es `http://`, el build falla a propósito.
3. **Redesplegar si cambia la API:** `VITE_API_URL` queda fija en el código al hacer el build, así que cambiarla en Vercel no alcanza, hay que volver a desplegar.

Qué tiene en cuenta `vercel.json`:

- **Rutas de la app** (`/sign-up`, etc.): cualquier URL que no sea un archivo se sirve con `index.html`, así recargar la página no da 404. Una ruta que la app no conoce vuelve al inicio.
- **Caché:** los archivos de `/assets/` llevan el hash en el nombre y se cachean un año; `sw.js` nunca se cachea, para que los usuarios reciban el aviso de versión nueva en cuanto se despliega.
- **PWA:** Vercel sirve todo por HTTPS, que es lo que necesita el service worker para funcionar e instalarse.

## App instalable (PWA)

El frontend se puede instalar en el celular o la computadora como una app, con el ícono de Armonía.

- **Instalar:** en Android, Chrome o Edge aparece "Instalar app" en el menú de la página (o en la barra del navegador). En iPhone: Compartir → "Agregar a inicio".
- **Invitación a instalarla** (`src/pwa/PromoInstalacion.jsx`): un modal con los beneficios y el botón "Instalar app" (en iPhone, los dos pasos). En el celular sube desde abajo; en la computadora va centrado. Aparece sola en la página de inicio (a los 4 segundos en el celular, a los 7 en la computadora) y al entrar al panel (a los 1,5 segundos). No aparece si el navegador no permite instalar, si la app ya está instalada ni mientras la persona está escribiendo en un formulario. Con "Ahora no" no vuelve por 14 días.
- **Botón "Instalar app":** está en el menú de la página, en el panel del paciente y en la barra del panel del personal. Abre la instalación aunque la invitación esté pospuesta, y al terminar se muestra un aviso de confirmación.
- **Sin conexión:** la app abre igual (página, login y formularios quedan guardados), pero los turnos y los datos de pacientes **nunca se guardan en el dispositivo**: siempre se piden al servidor. Sin internet se muestra un aviso.
- **Actualizaciones:** cuando se publica una versión nueva, la app avisa y el usuario elige cuándo actualizar, para no perder un formulario a medio completar.
- **Probarla:** el service worker no se activa con `npm run dev`. Usar `npm run build && npm run preview`. En producción tiene que servirse por **HTTPS** (los navegadores solo permiten service workers en HTTPS o en `localhost`).
- **Íconos:** salen de `public/favicon.svg`. Si cambia el logo, se regeneran con `npx @vite-pwa/assets-generator@1 --preset minimal-2023 public/favicon.svg` (produce los mismos nombres de archivo que usa `vite.config.js`).

## Tests

```bash
cd Back-end && npm test                              # API: levanta el servidor real contra una base local temporal
cd Front-end/odontologia-marcos-garcia && npm test   # componentes y utilidades
cd Front-end/odontologia-marcos-garcia && npm run lint
```

## Reglas que conviene conocer

- **Roles.** El personal (Administrador, Doctor, Asistente) usa la agenda. El doctor la ve y confirma o cancela citas; el asistente además agenda y reprograma; el administrador además gestiona usuarios y roles. Cada paciente ve solo sus citas.
- **Fechas.** `date_cita` es la hora local de la clínica, sin zona horaria: `YYYY-MM-DDTHH:mm:ss`. No agregar `Z` ni usar `toISOString()` para las citas.
- **Sin superposiciones.** Dos citas activas no pueden pisarse, teniendo en cuenta la duración. Lo garantiza un trigger de SQLite, así que vale aunque lleguen reservas simultáneas.
- **Horario de atención.** Lunes a viernes de 8:00 a 18:00 y sábados de 8:00 a 12:00. La cita tiene que terminar antes del cierre. Está definido en `Back-end/src/utils/agenda.js` y en `src/utils/agenda.js` del frontend: si cambia, hay que actualizar los dos y la página de contacto.
- **Estado COMPLETADA.** Lo pone el servidor solo en las citas que ya terminaron y no estaban canceladas, justo antes de mostrar citas (como mucho una vez por minuto).
