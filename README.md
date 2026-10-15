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
- **Sin conexión:** la app abre igual (página, login y formularios quedan guardados), pero los turnos y los datos de pacientes **nunca se guardan en el dispositivo**: siempre se piden al servidor. Sin internet se muestra un aviso. Las fotos y las fuentes se guardan la primera vez que se ven, no todas de entrada.
- **Actualizaciones:** cuando se publica una versión nueva, la app avisa y el usuario elige cuándo actualizar, para no perder un formulario a medio completar.
- **Probarla:** el service worker no se activa con `npm run dev`. Usar `npm run build && npm run preview`. En producción tiene que servirse por **HTTPS** (los navegadores solo permiten service workers en HTTPS o en `localhost`).
- **Íconos:** salen de `public/favicon.svg`. Si cambia el logo, se regeneran con `npx @vite-pwa/assets-generator@1 --preset minimal-2023 public/favicon.svg` (produce los mismos nombres de archivo que usa `vite.config.js`).

## Rendimiento

Decisiones que hacen que la página cargue rápido en un celular. Conviene no deshacerlas sin medir:

- **Fuentes propias:** Poppins y Dancing Script se sirven desde la app (`@fontsource`, solo el subconjunto latino y los grosores que se usan, importados en `src/index.jsx`). No hay que volver a poner el enlace a Google Fonts: su hoja de estilos frenaba el primer dibujo cerca de un segundo en 4G.
- **Mapa a pedido:** el mapa de Google (`src/componentes/ClinicMap.jsx`) carga unos 430 KB de código, así que solo se abre cuando la persona toca "Ver el mapa". "Cómo llegar" abre Google Maps.
- **Fotos livianas:** las de servicios son WebP de 600×400 y se cargan al acercarse a ellas; las del fondo del login, WebP que se descargan de a una a medida que avanza la presentación. Una foto nueva conviene pasarla a WebP antes de agregarla.
- **Código por partes:** el login, el registro y los paneles se descargan aparte de la página de inicio, y se piden en segundo plano mientras la persona la mira.
- **API despierta:** las funciones de Vercel se duermen sin uso y despertarlas suma cerca de un segundo. La app las despierta con un pedido a `/api/salud` al abrirse sin sesión y al volver a la pestaña después de unos minutos (`src/apiWarmUp.js`).

## Tutorial de cada panel

La primera vez que una cuenta entra a su panel aparece un tutorial guiado, como los de los juegos: la pantalla se oscurece y queda en pausa, se ilumina una parte por vez y una tarjeta explica para qué sirve. Se avanza con "Continuar" y se puede saltear con la X.

- **Uno por rol:** el del personal explica los módulos que ese rol tiene en el menú (el doctor no ve "Citas" ni "Agendar turno", y no se le dice que puede mover turnos); el del paciente explica cómo sacar un turno, sus citas y los estados.
- **Volver a verlo:** con el botón "Tutorial" del panel.
- **Cuándo aparece solo:** una vez por cuenta y por navegador (se recuerda en el dispositivo, no en el servidor: en otro celular o computadora aparece una vez más). La invitación a instalar la app espera a que termine.
- **Cambiar los textos:** están todos en `src/tutorial/pasos.js`. Los pasos del personal salen del menú del panel: un módulo nuevo en el menú necesita su explicación en `MODULOS`.
- **Qué se ilumina:** el elemento marcado con `data-tutorial="..."`; el `objetivo` de cada paso es esa marca. Si el elemento no está en pantalla, la tarjeta va al centro.

## Buscadores y descargas (Excel y PDF)

Las tablas del panel del personal tienen buscador, y los listados se descargan en Excel y en PDF.

- **Buscador** (Pacientes y Citas): filtra mientras se escribe, sin distinguir mayúsculas ni acentos. Con varias palabras tienen que estar todas. Un teléfono se encuentra aunque se escriba con guiones, y una fecha como `12/10/2026`, `2026-10-12` o `12 oct 2026`. El sexo y el estado se encuentran por su comienzo ("pend" → Pendiente), para que buscar el apellido "Niño" no traiga a todas las pacientes de sexo "Femenino".
- **Qué se descarga:**
  - *Pacientes:* nombre, sexo, fecha de nacimiento, teléfono y dirección.
  - *Citas:* fecha, horario, paciente, teléfono, motivo y estado.
  - *Agenda* (en el Calendario): los turnos de la semana o el día que se está viendo; en el PDF, día por día.
- **Con una búsqueda puesta se descarga solo lo encontrado**, y el PDF lo aclara en su encabezado.
- **Quién puede:** quien ve cada pantalla. El doctor descarga pacientes y agenda; administrador y asistente, además, las citas.
- **Sin librerías:** los archivos se arman en el navegador (`src/exportar/`), no pasan por el servidor. En el Excel el teléfono va como texto (no pierde el 0 de adelante) y las fechas como fechas, que se pueden ordenar y filtrar.
- **Sumar otro listado:** `xlsx({ hoja, columnas, filas })` y `pdfTabla({ titulo, detalle, columnas, filas })` sirven para cualquier tabla; `pacientes.js` y `citas.js` muestran cómo usarlos.
- Los archivos llevan datos personales de pacientes: quedan en el dispositivo de quien los descarga.

## Historial de cada paciente

Al tocar un paciente en la tabla de Pacientes se abre su historial: la ficha (edad, teléfono con acceso a WhatsApp, email y dirección) y todas sus citas, en tres partes.

- **Procedimientos realizados:** las citas completadas, de la más reciente a la más antigua, con el motivo, el día, el horario y quién atendió.
- **Próximos turnos** y **turnos cancelados**, si los tiene.
- **También desde el calendario:** el detalle de un turno tiene el botón "Ver historial del paciente".
- **Se descarga** en Excel y en PDF, como los demás listados.
- **De dónde sale:** de las citas, con `GET /api/pacientes/:id/historial` (solo el personal). Incluye las citas que se ocultaron de la agenda: ocultar una cita la saca del calendario, no de la historia del paciente.
- **Qué cuenta como realizado:** una cita queda completada cuando pasa su horario y no fue cancelada. Si el paciente no vino, hay que cancelarla antes para que no figure como procedimiento hecho.
- **Lo que no tiene todavía:** notas clínicas de cada visita (lo que se hizo, observaciones). El procedimiento es el motivo con el que se agendó el turno.

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
