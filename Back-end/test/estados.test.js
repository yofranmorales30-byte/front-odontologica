// COMPLETADA automático, estados válidos y asignación del doctor
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, abrirBase, ficha } = require('./helpers');
const { ahoraClinica } = require('../src/utils/agenda');

let srv, ADMIN, ASIS, PAC, idAdmin, idDoctor;
const ids = {};

// Hora de la clínica desplazada `min` minutos, en formato date_cita
const relativa = (min) => new Date(Date.parse(ahoraClinica() + 'Z') + min * 60000).toISOString().slice(0, 19);
const cita = async (id) => (await srv.api('GET', `/citas/${id}`, { token: ADMIN })).data;

before(async () => {
  srv = await levantarServidor();
  ADMIN = await srv.login('admin@odontologia.com');
  ASIS = await srv.login('laura@odontologia.com');
  const users = (await srv.api('GET', '/users', { token: ADMIN })).data;
  idAdmin = users.find((u) => u.email_user === 'admin@odontologia.com').id_user;
  idDoctor = users.find((u) => u.email_user === 'dr.garcia@odontologia.com').id_user;
});
after(() => srv.detener());

test('la cita del seed ("Pendiente", ya pasada) aparece COMPLETADA', async () => {
  const seed = (await srv.api('GET', '/citaCompleta', { token: ADMIN })).data.find((c) => c.desc_cita === 'Limpieza dental');
  assert.equal(seed.status_cita, 'COMPLETADA');
  assert.equal(seed.fk_doctor, idDoctor);
});

test('el servidor asigna el doctor de la cita', async () => {
  const alta = (hora, extra) => srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Doc', `2030-06-03T${hora}:00`, extra) });
  const sinDoctor = await alta('08:00');
  assert.equal(sinDoctor.status, 201);
  assert.equal(sinDoctor.data.fk_doctor, idDoctor, 'sin fk_doctor → el único doctor');
  ids.sinDoctor = sinDoctor.data.id_citas;

  assert.equal((await alta('09:00', { fk_doctor: idAdmin })).status, 400, 'el admin no es doctor');
  assert.equal((await alta('09:00', { fk_doctor: 999 })).status, 400);
  const conDoctor = await alta('09:00', { fk_doctor: idDoctor });
  assert.equal(conDoctor.status, 201);
  assert.equal(conDoctor.data.fk_doctor, idDoctor);

  const reg = await srv.api('POST', '/registro', { body: { ...ficha('Reg', '2030-06-03T10:00:00'), email_user: 'reg@x.com', key_user: 'clave123' } });
  PAC = reg.data.token;
  assert.equal((await srv.api('GET', '/mis-citas', { token: PAC })).data[0].fk_doctor, idDoctor);
  const pac = await srv.api('POST', '/citas', { token: PAC, body: { date_cita: '2030-06-03T11:00:00', time_cita: '1' } });
  assert.equal(pac.data.fk_doctor, idDoctor);
  assert.equal((await srv.api('POST', '/citas', { token: PAC, body: { date_cita: '2030-06-03T12:00:00', time_cita: '1', fk_doctor: idAdmin } })).status, 400);
});

test('solo se aceptan los estados válidos, en mayúsculas', async () => {
  const estado = (status_cita) => srv.api('PUT', `/citaCompletaStatus/${ids.sinDoctor}`, { token: ASIS, body: { status_cita } });
  const minus = await estado('confirmada');
  assert.equal(minus.status, 200);
  assert.equal(minus.data.status_cita, 'CONFIRMADA');
  assert.equal((await estado('COMPLETADO')).status, 400);
  assert.equal((await estado(undefined)).status, 400);
  assert.equal((await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('X', '2030-06-03T13:00:00', { status_cita: 'foo' }) })).status, 400);
  const sinEstado = await srv.api('POST', '/citas', { token: ASIS, body: { fk_paciente: 1, date_cita: '2030-06-03T14:00:00', time_cita: '1' } });
  assert.equal(sinEstado.data.status_cita, 'PENDIENTE');
});

test('prepara citas pasadas, futuras y en curso', async () => {
  const pasada = async (hora, nombre) =>
    (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha(nombre, `2020-01-06T${hora}:00`) })).data.id_citas; // lunes
  ids.pendiente = await pasada('09:00', 'Pasada pendiente');
  ids.confirmada = await pasada('10:00', 'Pasada confirmada');
  await srv.api('PUT', `/citaCompletaStatus/${ids.confirmada}`, { token: ASIS, body: { status_cita: 'CONFIRMADA' } });
  ids.cancelada = await pasada('11:00', 'Pasada cancelada');
  await srv.api('PUT', `/citaCompletaStatus/${ids.cancelada}`, { token: ASIS, body: { status_cita: 'CANCELADA' } });
  ids.oculta = await pasada('12:00', 'Pasada oculta');
  await srv.api('PUT', `/citaCompletaLogic/${ids.oculta}`, { token: ASIS, body: { logic_cita: 'I' } });
  ids.futura = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Futura', '2030-06-04T08:00:00') })).data.id_citas;

  await srv.detener();

  // Citas relativas a "ahora" (fuera del horario de atención si hace falta: van por SQL directo)
  const db = abrirBase(srv.dbPath);
  const insertar = async (fecha, estado, desc, doctor = idDoctor) => {
    const rs = await db.run(`INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita) VALUES (1, ?, ?, '1', ?, ?, 'A')`, [doctor, fecha, desc, estado]);
    return Number(rs.lastInsertRowid);
  };
  ids.enCurso = await insertar(relativa(-30), 'CONFIRMADA', 'En curso');
  ids.terminada = await insertar(relativa(-180), 'CONFIRMADA', 'Terminó hace 2 h');
  ids.legacyMinusculas = await insertar('2030-06-04T10:00:00', 'Confirmada', 'Legacy minúsculas y del admin', idAdmin);
  ids.legacyRaro = await insertar('2030-06-05T10:00:00', 'COMPLETADO', 'Legacy estado raro');
  db.cerrar();

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
  ADMIN = await srv.login('admin@odontologia.com');
  ASIS = await srv.login('laura@odontologia.com');
});

test('al consultar, se completan solo las citas terminadas y no canceladas', async () => {
  assert.equal((await cita(ids.pendiente)).status_cita, 'COMPLETADA');
  assert.equal((await cita(ids.confirmada)).status_cita, 'COMPLETADA');
  assert.equal((await cita(ids.cancelada)).status_cita, 'CANCELADA');
  assert.equal((await cita(ids.oculta)).status_cita, 'PENDIENTE', 'las ocultas no se tocan');
  assert.equal((await cita(ids.futura)).status_cita, 'PENDIENTE');
  assert.equal((await cita(ids.enCurso)).status_cita, 'CONFIRMADA', 'en curso (hora de Caracas)');
  assert.equal((await cita(ids.terminada)).status_cita, 'COMPLETADA');
  assert.match(srv.salida(), /citas terminadas marcadas como COMPLETADA/);

  const vistas = (await srv.api('GET', '/citaVista', { token: ADMIN })).data.map((c) => c.id_citas);
  for (const id of [ids.pendiente, ids.confirmada, ids.terminada]) assert.ok(vistas.includes(id));
  assert.ok(!vistas.includes(ids.cancelada));
});

test('migra estados y doctores de datos viejos', async () => {
  const minus = await cita(ids.legacyMinusculas);
  assert.equal(minus.status_cita, 'CONFIRMADA');
  assert.equal(minus.fk_doctor, idDoctor, 'la cita del admin pasa al doctor');
  assert.match(srv.salida(), /Migración de estados: 1 citas/);
  assert.match(srv.salida(), /Migración de doctor: 1 citas/);
  assert.equal((await cita(ids.legacyRaro)).status_cita, 'COMPLETADO', 'un estado desconocido no se toca...');
  assert.match(srv.salida(), /estado desconocido/, '...pero se avisa');
});

test('con dos doctores no se adivina', async () => {
  const doc2 = await srv.api('POST', '/users', {
    token: ADMIN, body: { name_user: 'Dra. Becerra', email_user: 'becerra@x.com', key_user: 'clave123', fk_rol: 2, logic_user: 'A' },
  });
  const ambigua = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Dos doctores', '2030-06-06T08:00:00') });
  assert.equal(ambigua.status, 201);
  assert.equal(ambigua.data.fk_doctor, null, 'sin fk_doctor queda sin asignar');
  const elegida = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Elegida', '2030-06-06T09:00:00', { fk_doctor: doc2.data.id_user }) });
  assert.equal(elegida.data.fk_doctor, doc2.data.id_user);

  await srv.detener();
  const db = abrirBase(srv.dbPath);
  await db.run('UPDATE citas SET fk_doctor = ? WHERE id_citas = ?', [idAdmin, ids.legacyMinusculas]);
  db.cerrar();

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
  assert.match(srv.salida(), /no tienen un doctor válido y hay 2 doctores activos/);
});
