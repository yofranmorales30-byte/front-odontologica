// npm run demo:cargar / npm run demo:borrar — datos de demostración para probar el sistema.
//
// "cargar" agrega pacientes y citas ficticios (ver datosDemoGenerador.js) a la base del .env;
// "borrar" los quita.
// - No modifica ninguna cuenta existente ni su contraseña: solo agrega filas nuevas.
// - Todo lo que crea queda anotado en la tabla datos_demo: "borrar" quita exactamente eso.
// - Es todo o nada: si algo falla (p. ej. alguien reservó un horario en el medio), no queda nada a medias.
require('dotenv').config();
const db = require('./db');
const { generarDemo } = require('./datosDemoGenerador');
const { esSolapamiento, esEmailDuplicado } = require('./errores');
const { ahoraClinica } = require('../utils/agenda');
const { hashPassword, randomPassword } = require('../utils/password');

// La cuenta de paciente del seed: recibe citas para poder probar "Mis citas" con ella
const EMAIL_PACIENTE_SEED = 'paciente@odontologia.com';
const PK = { user: 'id_user', paciente: 'id_paciente', citas: 'id_citas' };
const TABLAS = Object.keys(PK);

async function hayDemo() {
  const { rows } = await db.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'datos_demo'`);
  return rows.length > 0;
}

function destino() {
  const url = process.env.TURSO_DATABASE_URL;
  return url && !url.startsWith('file:') ? `Turso (${new URL(url).host})` : 'la base local';
}

async function cargar() {
  if (await hayDemo()) {
    throw new Error('Ya hay datos de demostración cargados. Para regenerarlos: npm run demo:borrar y después npm run demo:cargar.');
  }

  const [rolPaciente] = (await db.query(`SELECT id_rol FROM rol WHERE nombre_rol = 'Paciente'`)).rows;
  if (!rolPaciente) throw new Error('Falta el rol Paciente: corré primero npm run migrar.');

  // Igual que el servidor: si hay un solo doctor activo, las citas son suyas
  const doctores = (await db.query(
    `SELECT u.id_user FROM "user" u JOIN rol r ON u.fk_rol = r.id_rol WHERE r.nombre_rol = 'Doctor' AND u.logic_user = 'A'`
  )).rows;
  const fkDoctor = doctores.length === 1 ? doctores[0].id_user : null;

  const [existente] = (await db.query(
    `SELECT p.id_paciente FROM paciente p JOIN "user" u ON p.fk_user = u.id_user
     WHERE LOWER(u.email_user) = $1 ORDER BY p.id_paciente LIMIT 1`,
    [EMAIL_PACIENTE_SEED]
  )).rows;

  // Lo que ya está reservado no se pisa
  const ocupadas = (await db.query(
    `SELECT date_cita, time_cita FROM citas WHERE logic_cita = 'A' AND COALESCE(UPPER(status_cita), '') <> 'CANCELADA'`
  )).rows;

  const { pacientes, citasPacienteExistente } = generarDemo({ ahora: ahoraClinica(), ocupadas });
  const citasExistente = existente ? citasPacienteExistente : [];

  // Una sola contraseña para las cuentas NUEVAS de demostración; se muestra una vez al final
  const clave = randomPassword();
  const hash = await hashPassword(clave);

  const cita = (fkPaciente, c, params = []) => [
    `INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita)
     VALUES (${fkPaciente}, ?, ?, ?, ?, ?, 'A')`,
    [...params, fkDoctor, c.date_cita, c.time_cita, c.desc_cita, c.status_cita],
  ];

  const sentencias = [
    ['CREATE TABLE datos_demo (tabla TEXT NOT NULL, id INTEGER NOT NULL, PRIMARY KEY (tabla, id))'],
    // Hasta dónde llegaban los ids antes de cargar: todo lo que se inserte después, dentro de
    // esta misma transacción, es de la demo (nadie más puede escribir en el medio)
    ...TABLAS.map((t) => [`INSERT INTO datos_demo SELECT '_antes_${t}', COALESCE(MAX(${PK[t]}), 0) FROM "${t}"`]),
  ];

  for (const p of pacientes) {
    if (p.email) {
      sentencias.push([
        `INSERT INTO "user" (name_user, email_user, key_user, fk_rol, logic_user) VALUES (?, ?, ?, ?, 'A')`,
        [p.name_paciente, p.email, hash, rolPaciente.id_rol],
      ]);
    }
    sentencias.push([
      // Con cuenta: la ficha es de la cuenta recién creada. Sin cuenta: la cargó el personal.
      `INSERT INTO paciente (fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente)
       VALUES (${p.email ? 'last_insert_rowid()' : 'NULL'}, ?, ?, ?, ?, ?, 'A')`,
      [p.name_paciente, p.genre_paciente, p.birth_paciente, p.dir_paciente, p.telf_paciente],
    ]);
    // La ficha recién creada es la de id más alto
    for (const c of p.citas) sentencias.push(cita('(SELECT MAX(id_paciente) FROM paciente)', c));
  }
  for (const c of citasExistente) sentencias.push(cita('?', c, [existente.id_paciente]));

  sentencias.push(
    ...TABLAS.map((t) => [
      `INSERT INTO datos_demo SELECT '${t}', ${PK[t]} FROM "${t}"
       WHERE ${PK[t]} > (SELECT id FROM datos_demo WHERE tabla = '_antes_${t}')`,
    ]),
    [`DELETE FROM datos_demo WHERE tabla IN (${TABLAS.map((t) => `'_antes_${t}'`).join(', ')})`],
  );

  try {
    await db.batch(sentencias);
  } catch (err) {
    if (esSolapamiento(err)) {
      throw new Error('Alguien reservó un horario mientras se cargaban los datos. No se cargó nada: volvé a correr npm run demo:cargar.');
    }
    if (esEmailDuplicado(err)) {
      throw new Error('Ya existe una cuenta con uno de los emails de demostración (@example.com). No se cargó nada.');
    }
    throw err;
  }

  const citas = [...pacientes.flatMap((p) => p.citas), ...citasExistente];
  const cuantas = (estado) => citas.filter((c) => c.status_cita === estado).length;
  const fechas = citas.map((c) => c.date_cita.slice(0, 10)).sort();
  const conCuenta = pacientes.filter((p) => p.email);

  console.log(`✅ Datos de demostración cargados en ${destino()}`);
  console.log(`   Pacientes: ${pacientes.length} (${conCuenta.length} con cuenta propia, ${pacientes.length - conCuenta.length} cargados por el personal)`);
  console.log(`   Citas: ${citas.length} del ${fechas[0]} al ${fechas[fechas.length - 1]} — ${cuantas('COMPLETADA')} completadas, ${cuantas('CONFIRMADA')} confirmadas, ${cuantas('PENDIENTE')} pendientes, ${cuantas('CANCELADA')} canceladas`);
  if (existente) console.log(`   La cuenta ${EMAIL_PACIENTE_SEED} recibió ${citasExistente.length} citas (su contraseña no cambió)`);
  console.log('   Ninguna cuenta existente fue modificada.');
  console.log('\n   Cuentas nuevas de pacientes de demostración (guardá la contraseña, no se vuelve a mostrar):');
  console.log(`   contraseña: ${clave}`);
  console.log(`   ${conCuenta.map((p) => p.email).join(', ')}`);
  console.log('\n   Para quitarlos: npm run demo:borrar');
}

async function borrar() {
  if (!(await hayDemo())) {
    console.log('No hay datos de demostración para borrar.');
    return;
  }

  const demo = (tabla) => `(SELECT id FROM datos_demo WHERE tabla = '${tabla}')`;
  const [citas, pacientes, cuentas] = await db.batch([
    // También las citas agendadas después para un paciente de demostración: sin eso no se puede borrar su ficha
    [`DELETE FROM citas WHERE id_citas IN ${demo('citas')} OR fk_paciente IN ${demo('paciente')}`],
    [`DELETE FROM paciente WHERE id_paciente IN ${demo('paciente')}`],
    [`DELETE FROM "user" WHERE id_user IN ${demo('user')}`],
    ['DROP TABLE datos_demo'],
  ]);

  console.log(`🧹 Datos de demostración borrados de ${destino()}: ${citas.changes} citas, ${pacientes.changes} pacientes y ${cuentas.changes} cuentas.`);
  console.log('   Las cuentas y los datos que no eran de demostración no se tocaron.');
}

if (require.main === module) {
  const accion = { cargar, borrar }[process.argv[2]];
  if (!accion) {
    console.error('Uso: npm run demo:cargar | npm run demo:borrar');
    process.exit(1);
  }
  accion()
    .then(() => process.exit(0))
    .catch((err) => {
      const sinTablas = /no such table/i.test(err.message);
      console.error(`❌ ${sinTablas ? 'La base no está preparada: corré primero npm run migrar.' : err.message}`);
      process.exit(1);
    });
}

module.exports = { cargar, borrar };
