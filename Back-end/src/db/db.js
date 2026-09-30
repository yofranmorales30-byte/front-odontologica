const path = require('path');
const { pathToFileURL } = require('url');
const { isHashed, hashPasswordSync, randomPassword } = require('../utils/password');
const { normalizeFechaCita, normalizeEstado } = require('../utils/agenda');
const { CITA_SOLAPADA, UX_USER_EMAIL } = require('./errores');
const { ocupa, seSuperponen } = require('./sqlAgenda');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Conexión: Turso (libsql://…, con TURSO_AUTH_TOKEN). Sin TURSO_DATABASE_URL se
// usa un archivo SQLite local, que es lo que usan los tests (file:…).
// libSQL y Turso validan las claves foráneas por defecto.
// ---------------------------------------------------------------------------

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  // En Vercel el disco es de solo lectura: sin Turso no hay dónde guardar nada
  if (process.env.VERCEL) {
    throw new Error('Falta TURSO_DATABASE_URL en las variables de entorno del proyecto de Vercel.');
  }
  const archivo = path.join(__dirname, '../../odontologia.db');
  url = pathToFileURL(archivo).href;
  console.warn(`⚠️  TURSO_DATABASE_URL no está definido en .env: se usa la base local ${archivo}`);
}

// Turso va por HTTP, sin binarios nativos (es lo que corre en Vercel). El archivo
// local necesita el driver nativo de libSQL, que solo se carga en ese caso.
const { createClient } = url.startsWith('file:') ? require('@libsql/client') : require('@libsql/client/http');
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

// ---------------------------------------------------------------------------
// Consultas
// No se usan transacciones interactivas (client.transaction): contra Turso cada
// paso sería un viaje de red con la base bloqueada para las demás escrituras.
// Lo que tiene que ser atómico va en un batch: un solo viaje, y si una sentencia
// falla (p. ej. el trigger de solapamiento) no queda ninguna.
// ---------------------------------------------------------------------------

// Placeholders $1, $2… (como en pg): SQLite los numera igual con ?1, ?2…
// undefined se guarda como NULL (libSQL no lo acepta)
function sentencia(sql, params = []) {
  return {
    sql: sql.replace(/\$(\d+)/g, '?$1'),
    args: params.map((p) => (p === undefined ? null : p)),
  };
}

// Filas como objetos planos { columna: valor } y cuántas filas cambió
function resultado(rs) {
  return {
    rows: rs.rows.map((row) => Object.fromEntries(rs.columns.map((col, i) => [col, row[i]]))),
    changes: rs.rowsAffected,
  };
}

async function query(sql, params) {
  return resultado(await client.execute(sentencia(sql, params)));
}

// Varias escrituras atómicas: [[sql, params], …] → un resultado por sentencia
async function batch(sentencias) {
  const resultados = await client.batch(sentencias.map(([sql, params]) => sentencia(sql, params)), 'write');
  return resultados.map(resultado);
}

const leer = async (sql, params) => (await query(sql, params)).rows;

// ---------------------------------------------------------------------------
// Preparación de la base: schema, datos semilla, migraciones y reglas.
// La corre `node src/server.js` antes de escuchar, y `npm run migrar` a mano.
// En Vercel la API no la corre: cada arranque en frío la haría más lenta.
// ---------------------------------------------------------------------------

async function prepararBase() {
  await batch([
    [`
      CREATE TABLE IF NOT EXISTS "rol" (
        id_rol     INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_rol TEXT NOT NULL,
        desc_rol   TEXT,
        logic_rol  TEXT DEFAULT 'A'
      )
    `],
    [`
      CREATE TABLE IF NOT EXISTS "user" (
        id_user    INTEGER PRIMARY KEY AUTOINCREMENT,
        name_user  TEXT NOT NULL,
        email_user TEXT NOT NULL,
        key_user   TEXT NOT NULL,
        fk_rol     INTEGER REFERENCES "rol"(id_rol),
        logic_user TEXT DEFAULT 'A'
      )
    `],
    [`
      CREATE TABLE IF NOT EXISTS "paciente" (
        id_paciente    INTEGER PRIMARY KEY AUTOINCREMENT,
        fk_user        INTEGER REFERENCES "user"(id_user),
        name_paciente  TEXT NOT NULL,
        genre_paciente TEXT,
        birth_paciente TEXT,
        dir_paciente   TEXT,
        telf_paciente  TEXT,
        logic_paciente TEXT DEFAULT 'A'
      )
    `],
    [`
      CREATE TABLE IF NOT EXISTS "citas" (
        id_citas    INTEGER PRIMARY KEY AUTOINCREMENT,
        fk_paciente INTEGER REFERENCES "paciente"(id_paciente),
        fk_doctor   INTEGER,
        date_cita   TEXT,  -- hora local de la clínica, sin zona: YYYY-MM-DDTHH:mm:ss
        time_cita   TEXT,  -- duración en horas ("1", "2")
        desc_cita   TEXT,
        status_cita TEXT,
        logic_cita  TEXT DEFAULT 'A'
      )
    `],
  ]);

  // Seed data — solo si la tabla "rol" está vacía
  const [{ cnt }] = await leer('SELECT COUNT(*) AS cnt FROM "rol"');
  if (cnt === 0) await sembrar();

  // Las migraciones corren sin los triggers (una cita vieja superpuesta no debe abortar
  // el arranque), pero en el mismo batch que los reinstala: no hay un momento en que
  // otra instancia del servidor pueda escribir sin las reglas
  const migraciones = await prepararMigraciones();
  await batch([...quitarReglasAgenda(), ...migraciones.sentencias, ...instalarReglasAgenda()]);
  migraciones.avisos.forEach((aviso) => aviso());

  await avisarSuperpuestas();
  await instalarEmailUnico();
}

async function sembrar() {
  const roles = [
    ['Administrador', 'Acceso total al sistema'],
    ['Doctor', 'Gestión de citas y pacientes'],
    ['Asistente', 'Apoyo administrativo'],
    ['Paciente', 'Acceso a sus propias citas'],
  ];

  // Contraseñas aleatorias: se muestran UNA sola vez en consola al crear la base
  const seedUsers = [
    ['Admin Marcos', 'admin@odontologia.com', 1],
    ['Dr. García', 'dr.garcia@odontologia.com', 2],
    ['Asistente Laura', 'laura@odontologia.com', 3],
    ['Paciente Demo', 'paciente@odontologia.com', 4],
  ];
  const credenciales = seedUsers.map(([, email]) => ({ email, password: randomPassword() }));

  await batch([
    ...roles.map(([nombre, desc]) => [`INSERT INTO "rol" (nombre_rol, desc_rol, logic_rol) VALUES (?, ?, 'A')`, [nombre, desc]]),
    ...seedUsers.map(([name, email, rol], i) => [
      `INSERT INTO "user" (name_user, email_user, key_user, fk_rol, logic_user) VALUES (?, ?, ?, ?, 'A')`,
      [name, email, hashPasswordSync(credenciales[i].password), rol],
    ]),
    [`INSERT INTO "paciente" (fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente) VALUES (?, ?, ?, ?, ?, ?, ?)`, [4, 'Paciente Demo', 'F', '1990-01-01', 'Sin especificar', '04140000000', 'A']],
    [`INSERT INTO "citas" (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita) VALUES (?, ?, ?, ?, ?, ?, ?)`, [1, 2, '2026-08-19T08:00:00', '1', 'Limpieza dental', 'Pendiente', 'A']],
  ]);

  console.log('✅ Base de datos inicializada con datos de semilla. Credenciales iniciales (guardalas, no se vuelven a mostrar):');
  console.table(credenciales);
}

// ---------------------------------------------------------------------------
// Reglas de la agenda en la base: ninguna cita activa puede superponerse con otra.
// El chequeo y la escritura van en la misma sentencia, así que es imposible que
// dos requests simultáneas reserven el mismo horario (el trigger lo rechaza con
// CITA_SOLAPADA y el controlador responde 409).
// Se reinstalan en cada arranque para que la definición siempre sea la actual.
// ---------------------------------------------------------------------------

function quitarReglasAgenda() {
  return [
    ['DROP TRIGGER IF EXISTS citas_sin_solapamiento_insert'],
    ['DROP TRIGGER IF EXISTS citas_sin_solapamiento_update'],
  ];
}

function instalarReglasAgenda() {
  return [
    [`
      CREATE TRIGGER citas_sin_solapamiento_insert
      BEFORE INSERT ON "citas"
      WHEN ${ocupa('NEW')}
      BEGIN
        SELECT RAISE(ABORT, '${CITA_SOLAPADA}')
        WHERE EXISTS (SELECT 1 FROM "citas" c WHERE ${ocupa('c')} AND ${seSuperponen('c', 'NEW')});
      END
    `],
    // Solo si la cita pasa a ocupar la agenda (reactivar una cancelada) o cambia de horario:
    // confirmar una pendiente no vuelve a chequear, para no trabar citas superpuestas de antes
    [`
      CREATE TRIGGER citas_sin_solapamiento_update
      BEFORE UPDATE OF date_cita, time_cita, status_cita, logic_cita ON "citas"
      WHEN ${ocupa('NEW')} AND (
        NOT ${ocupa('OLD')} OR NEW.date_cita IS NOT OLD.date_cita OR NEW.time_cita IS NOT OLD.time_cita
      )
      BEGIN
        SELECT RAISE(ABORT, '${CITA_SOLAPADA}')
        WHERE EXISTS (
          SELECT 1 FROM "citas" c
          WHERE c.id_citas <> NEW.id_citas AND ${ocupa('c')} AND ${seSuperponen('c', 'NEW')}
        );
      END
    `],
  ];
}

// Citas que ya estaban superpuestas antes de esta regla (p. ej. por el bug de zona horaria)
async function avisarSuperpuestas() {
  const pares = await leer(`
    SELECT a.id_citas AS a, b.id_citas AS b FROM "citas" a
    JOIN "citas" b ON a.id_citas < b.id_citas
    WHERE ${ocupa('a')} AND ${ocupa('b')} AND ${seSuperponen('a', 'b')}
  `);
  if (pares.length) {
    console.warn(`⚠️  Hay citas superpuestas registradas antes de esta validación (ids): ${pares.map(({ a, b }) => `${a}↔${b}`).join(', ')}. Reprogramá o cancelá una de cada par.`);
  }
}

// Un email por cuenta: el índice impide duplicados aunque dos registros lleguen a la vez
async function instalarEmailUnico() {
  try {
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS ${UX_USER_EMAIL} ON "user"(LOWER(email_user))`);
  } catch {
    const repetidos = (await leer(`SELECT LOWER(email_user) AS email FROM "user" GROUP BY LOWER(email_user) HAVING COUNT(*) > 1`)).map((r) => r.email);
    console.warn(`⚠️  No se pudo impedir emails duplicados porque ya hay repetidos: ${repetidos.join(', ')}. Corregilos y reiniciá el servidor.`);
  }
}

// ---------------------------------------------------------------------------
// Migraciones de datos viejos. Cada una lee lo que necesita y agrega sus UPDATE
// al batch del arranque; los avisos se muestran cuando quedaron aplicadas.
// ---------------------------------------------------------------------------

async function prepararMigraciones() {
  const migracion = { sentencias: [], avisos: [] };
  await migratePlaintextPasswords(migracion);
  await migrateFechasCitas(migracion);
  await migrateEstadosCitas(migracion);
  await migrateDoctorCitas(migracion);
  return migracion;
}

// ---------------------------------------------------------------------------
// Migración: date_cita se guardaba como "…T10:00:00.000Z", pero esa Z era falsa
// (la hora ya era la local elegida en el formulario). Se quita la zona sin
// mover la hora. Es idempotente: las fechas ya canónicas no se tocan.
// ---------------------------------------------------------------------------

async function migrateFechasCitas({ sentencias, avisos }) {
  const rows = await leer('SELECT id_citas, date_cita FROM "citas"');
  let migradas = 0;
  const invalidas = [];

  for (const { id_citas: id, date_cita: fecha } of rows) {
    const canonica = normalizeFechaCita(fecha);
    if (!canonica) {
      invalidas.push(id);
    } else if (canonica !== fecha) {
      sentencias.push(['UPDATE "citas" SET date_cita = ? WHERE id_citas = ?', [canonica, id]]);
      migradas++;
    }
  }

  if (migradas) {
    avisos.push(() => console.log(`🕒 Migración de fechas: ${migradas} citas pasadas a hora local sin zona (YYYY-MM-DDTHH:mm:ss).`));
  }
  if (invalidas.length) {
    console.warn(`⚠️  Citas con date_cita en formato desconocido (no se modificaron), ids: ${invalidas.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Migración: status_cita en mayúsculas ("Pendiente" del seed viejo → "PENDIENTE"),
// que es como lo comparan el frontend y los listados
// ---------------------------------------------------------------------------

async function migrateEstadosCitas({ sentencias, avisos }) {
  const rows = await leer('SELECT id_citas, status_cita FROM "citas"');
  let migradas = 0;
  const invalidas = [];

  for (const { id_citas: id, status_cita: estado } of rows) {
    const normalizado = normalizeEstado(estado);
    if (!normalizado) {
      invalidas.push(`${id} (${estado})`);
    } else if (normalizado !== estado) {
      sentencias.push(['UPDATE "citas" SET status_cita = ? WHERE id_citas = ?', [normalizado, id]]);
      migradas++;
    }
  }

  if (migradas) {
    avisos.push(() => console.log(`🏷️  Migración de estados: ${migradas} citas pasadas a mayúsculas.`));
  }
  if (invalidas.length) {
    console.warn(`⚠️  Citas con un estado desconocido (no se modificaron): ${invalidas.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Migración: el frontend mandaba fk_doctor = 1, que es el administrador.
// Si la clínica tiene un solo doctor activo, las citas que no apuntan a un
// doctor pasan a ser suyas (las de doctores dados de baja se respetan).
// ---------------------------------------------------------------------------

async function migrateDoctorCitas({ sentencias, avisos }) {
  const doctores = `SELECT u.id_user FROM "user" u JOIN "rol" r ON u.fk_rol = r.id_rol WHERE r.nombre_rol = 'Doctor'`;
  const activos = (await leer(`${doctores} AND u.logic_user = 'A'`)).map((r) => r.id_user);
  const sinDoctor = `fk_doctor IS NULL OR fk_doctor NOT IN (${doctores})`;
  const [{ pendientes }] = await leer(`SELECT COUNT(*) AS pendientes FROM "citas" WHERE ${sinDoctor}`);
  if (!pendientes) return;

  if (activos.length !== 1) {
    console.warn(`⚠️  ${pendientes} citas no tienen un doctor válido y hay ${activos.length} doctores activos: asignalas a mano.`);
    return;
  }

  sentencias.push([`UPDATE "citas" SET fk_doctor = ? WHERE ${sinDoctor}`, [activos[0]]]);
  avisos.push(() => console.log(`🩺 Migración de doctor: ${pendientes} citas asignadas al doctor (id ${activos[0]}).`));
}

// ---------------------------------------------------------------------------
// Migración: bases creadas antes del hashing guardaban key_user en texto plano
// ---------------------------------------------------------------------------

// Contraseñas que estuvieron escritas en el código (seed y alta de pacientes)
const LEAKED_PASSWORDS = ['admin123', 'doc123', 'asis123', '1234', 'paciente2024'];
// Contraseña que el frontend asignaba a los pacientes creados por el personal
const STAFF_DEFAULT_PASSWORD = 'paciente2024';

async function migratePlaintextPasswords({ sentencias, avisos }) {
  const rows = await leer('SELECT id_user, email_user, key_user FROM "user"');
  let migrated = 0;
  let disabled = 0;
  const weak = [];

  for (const { id_user: id, email_user: email, key_user: key } of rows) {
    if (isHashed(key)) continue;

    if (key === STAFF_DEFAULT_PASSWORD) {
      // El paciente nunca eligió esta contraseña: se bloquea con una aleatoria
      sentencias.push(['UPDATE "user" SET key_user = ? WHERE id_user = ?', [hashPasswordSync(randomPassword()), id]]);
      disabled++;
      continue;
    }

    sentencias.push(['UPDATE "user" SET key_user = ? WHERE id_user = ?', [hashPasswordSync(key), id]]);
    migrated++;
    if (LEAKED_PASSWORDS.includes(key)) weak.push(email);
  }

  if (migrated || disabled) {
    avisos.push(() => console.log(`🔐 Migración de contraseñas: ${migrated} hasheadas, ${disabled} cuentas con contraseña por defecto bloqueadas.`));
  }
  if (weak.length) {
    avisos.push(() => console.warn(`⚠️  Estas cuentas usan una contraseña que estuvo publicada en el código; cambiala con PUT /api/users/:id: ${weak.join(', ')}`));
  }
}

module.exports = { query, batch, prepararBase };
