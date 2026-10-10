// Datos de demostración (npm run demo:cargar / demo:borrar): creíbles, sin tocar lo que ya había, y reversibles
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { levantarServidor, abrirBase, baseTemporal, urlBase } = require('./helpers');
const { validarHorario, ahoraClinica } = require('../src/utils/agenda');

const BACKEND = path.join(__dirname, '..');
const dbPath = baseTemporal();

// Siempre contra la base temporal: nunca la del .env
const correr = (archivo, ...args) => spawnSync(process.execPath, [archivo, ...args], {
  cwd: BACKEND,
  encoding: 'utf8',
  env: { ...process.env, TURSO_DATABASE_URL: urlBase(dbPath), TURSO_AUTH_TOKEN: '', JWT_SECRET: 'secreto-de-test', CLINIC_TZ: 'America/Caracas' },
});

const TELEFONO_FICTICIO = /^04\d{2}55501\d{2}$/;
const creds = {};
const real = {};
let claves, claveDemo, emailsDemo;

const totales = async (db) => {
  const [[users, pacientes, citas]] = await db.valores('SELECT (SELECT COUNT(*) FROM "user"), (SELECT COUNT(*) FROM paciente), (SELECT COUNT(*) FROM citas)');
  return { users, pacientes, citas };
};
const clavesActuales = (db) => db.valores('SELECT id_user, key_user FROM "user" WHERE id_user <= 4 ORDER BY id_user');

test('cargar agrega pacientes y citas creíbles sin tocar lo que ya había', async () => {
  const migrar = correr('src/db/migrar.js');
  assert.equal(migrar.status, 0, migrar.stderr);
  for (const m of migrar.stdout.matchAll(/'([^']+@[^']+)'\s*│\s*'([^']+)'/g)) creds[m[1]] = m[2];

  // Un paciente real con una cita el próximo día hábil a las 10:00
  const dia = new Date(`${ahoraClinica().slice(0, 10)}T00:00:00Z`);
  do { dia.setUTCDate(dia.getUTCDate() + 1); } while (dia.getUTCDay() === 0 || dia.getUTCDay() === 6);
  real.fecha = `${dia.toISOString().slice(0, 10)}T10:00:00`;
  let db = abrirBase(dbPath);
  real.paciente = Number((await db.run(`INSERT INTO paciente (name_paciente, genre_paciente, telf_paciente, logic_paciente) VALUES ('Paciente Real', 'F', '04147771234', 'A')`)).lastInsertRowid);
  real.cita = Number((await db.run(`INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita) VALUES (?, 2, ?, '1', 'Cita real', 'PENDIENTE', 'A')`, [real.paciente, real.fecha])).lastInsertRowid);
  claves = await clavesActuales(db);
  db.cerrar();

  const cargar = correr('src/db/datosDemo.js', 'cargar');
  assert.equal(cargar.status, 0, cargar.stderr);
  claveDemo = cargar.stdout.match(/contraseña: (\S+)/)[1];
  emailsDemo = cargar.stdout.match(/[\w.]+@example\.com/g);

  db = abrirBase(dbPath);
  const idsDemo = async (tabla) => (await db.valores('SELECT id FROM datos_demo WHERE tabla = ?', [tabla])).flat();

  // Pacientes: muchos, con teléfonos ficticios y sin repetir
  const pacientes = await db.valores(`SELECT name_paciente, telf_paciente FROM paciente WHERE id_paciente IN (${(await idsDemo('paciente')).join(',')})`);
  assert.ok(pacientes.length >= 60, `${pacientes.length} pacientes`);
  assert.ok(pacientes.every(([, telf]) => TELEFONO_FICTICIO.test(telf)), 'teléfonos con el patrón ficticio 555-01xx');
  assert.equal(new Set(pacientes.map(([nombre]) => nombre)).size, pacientes.length, 'sin nombres repetidos');

  // Citas: dentro del horario, con estados coherentes con la fecha y asignadas al doctor
  const citas = await db.valores(`SELECT date_cita, time_cita, status_cita, fk_doctor, desc_cita FROM citas WHERE id_citas IN (${(await idsDemo('citas')).join(',')})`);
  assert.ok(citas.length >= 120, `${citas.length} citas`);
  const ahora = ahoraClinica();
  for (const [fecha, horas, estado, doctor, motivo] of citas) {
    assert.equal(validarHorario(fecha, horas), null, `${fecha} por ${horas} h está en horario`);
    assert.equal(doctor, 2);
    assert.ok(motivo.length > 5);
    const fin = new Date(Date.parse(`${fecha}Z`) + horas * 3600000).toISOString().slice(0, 19);
    if (fin <= ahora) assert.ok(['COMPLETADA', 'CANCELADA'].includes(estado), `${fecha} ya pasó y está ${estado}`);
    else assert.ok(['CONFIRMADA', 'PENDIENTE', 'CANCELADA'].includes(estado), `${fecha} es futura y está ${estado}`);
  }
  assert.ok(citas.some(([, , estado]) => estado === 'COMPLETADA') && citas.some(([, , estado]) => estado === 'CONFIRMADA') && citas.some(([, , estado]) => estado === 'PENDIENTE'));

  // Ninguna cita activa se pisa con otra, incluida la real
  const [[solapadas]] = await db.valores(`
    SELECT COUNT(*) FROM citas a JOIN citas b ON a.id_citas < b.id_citas
    WHERE a.status_cita <> 'CANCELADA' AND b.status_cita <> 'CANCELADA'
      AND strftime('%s', a.date_cita) < strftime('%s', b.date_cita) + CAST(b.time_cita AS INTEGER) * 3600
      AND strftime('%s', b.date_cita) < strftime('%s', a.date_cita) + CAST(a.time_cita AS INTEGER) * 3600`);
  assert.equal(solapadas, 0);

  // Cuentas nuevas: solo pacientes, con email de demostración
  const cuentas = await db.valores(`SELECT email_user, fk_rol, key_user FROM "user" WHERE id_user IN (${(await idsDemo('user')).join(',')})`);
  assert.ok(cuentas.length >= 10);
  assert.deepEqual(cuentas.map(([email]) => email).sort(), [...emailsDemo].sort());
  assert.ok(cuentas.every(([email, rol, clave]) => email.endsWith('@example.com') && rol === 4 && clave.startsWith('$2')));

  // Lo que ya había sigue igual: contraseñas, el paciente real y su cita
  assert.deepEqual(await clavesActuales(db), claves, 'las contraseñas de las cuentas existentes no cambian');
  assert.deepEqual(await db.valores('SELECT date_cita, status_cita, desc_cita FROM citas WHERE id_citas = ?', [real.cita]), [[real.fecha, 'PENDIENTE', 'Cita real']]);
  // La cuenta de paciente del seed recibe citas para probar "Mis citas"
  const [[delSeed]] = await db.valores('SELECT COUNT(*) FROM citas WHERE fk_paciente = 1');
  assert.ok(delSeed >= 4, `${delSeed} citas de la cuenta del seed`);
  db.cerrar();
});

test('las cuentas de siempre entran con su contraseña y las de demostración con la nueva', async () => {
  const srv = await levantarServidor({ dbPath, creds });
  try {
    const admin = await srv.login('admin@odontologia.com');
    assert.ok(admin, 'el admin entra con su contraseña de siempre');
    const paciente = await srv.login('paciente@odontologia.com');
    assert.ok((await srv.api('GET', '/mis-citas', { token: paciente })).data.length >= 4);

    const demo = await srv.login(emailsDemo[0], claveDemo);
    assert.ok(demo, 'una cuenta de demostración entra con la contraseña mostrada');
    assert.ok((await srv.api('GET', '/mis-citas', { token: demo })).data.length >= 1);

    const agenda = await srv.api('GET', '/citaCompleta', { token: admin });
    assert.equal(agenda.status, 200);
    assert.ok(agenda.data.length >= 120);
    assert.ok(!JSON.stringify(agenda.data).includes('key_user'));
  } finally {
    await srv.detener();
  }
});

test('cargar dos veces no duplica', async () => {
  let db = abrirBase(dbPath);
  const antes = await totales(db);
  db.cerrar();

  const otraVez = correr('src/db/datosDemo.js', 'cargar');
  assert.equal(otraVez.status, 1);
  assert.match(otraVez.stderr, /Ya hay datos de demostración/);

  db = abrirBase(dbPath);
  assert.deepEqual(await totales(db), antes);
  db.cerrar();
});

test('borrar quita solo lo de demostración', async () => {
  // Alguien probó el sistema y le agendó otro turno a un paciente de demostración
  let db = abrirBase(dbPath);
  const [[pacienteDemo]] = await db.valores(`SELECT id FROM datos_demo WHERE tabla = 'paciente' LIMIT 1`);
  await db.run(`INSERT INTO citas (fk_paciente, date_cita, time_cita, status_cita, logic_cita) VALUES (?, '2031-03-04T10:00:00', '1', 'PENDIENTE', 'A')`, [pacienteDemo]);
  db.cerrar();

  const borrar = correr('src/db/datosDemo.js', 'borrar');
  assert.equal(borrar.status, 0, borrar.stderr);

  db = abrirBase(dbPath);
  // Quedan las 4 cuentas del seed; su paciente y el real; la cita del seed y la real
  assert.deepEqual(await totales(db), { users: 4, pacientes: 2, citas: 2 });
  assert.deepEqual(await clavesActuales(db), claves);
  assert.deepEqual((await db.valores('SELECT id_citas FROM citas ORDER BY id_citas')).flat(), [1, real.cita]);
  assert.deepEqual(await db.valores(`SELECT name FROM sqlite_master WHERE name = 'datos_demo'`), []);
  db.cerrar();

  const sinNada = correr('src/db/datosDemo.js', 'borrar');
  assert.equal(sinNada.status, 0);
  assert.match(sinNada.stdout, /No hay datos de demostración/);
});

test('sin preparar la base avisa qué hacer', () => {
  const vacia = spawnSync(process.execPath, ['src/db/datosDemo.js', 'cargar'], {
    cwd: BACKEND,
    encoding: 'utf8',
    env: { ...process.env, TURSO_DATABASE_URL: urlBase(baseTemporal()), TURSO_AUTH_TOKEN: '', JWT_SECRET: 'x' },
  });
  assert.equal(vacia.status, 1);
  assert.match(vacia.stderr, /npm run migrar/);
});
