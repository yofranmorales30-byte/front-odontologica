// Sesión (/me), manejo de errores y persistencia
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, abrirBase, ficha } = require('./helpers');

let srv, ADMIN, ASIS;

before(async () => {
  srv = await levantarServidor();
  ADMIN = await srv.login('admin@odontologia.com');
  ASIS = await srv.login('laura@odontologia.com');
});
after(() => srv.detener());

test('GET /me recupera la sesión con un token nuevo', async () => {
  const me = await srv.api('GET', '/me', { token: ADMIN });
  assert.equal(me.status, 200);
  assert.equal(me.data.name_user, 'Admin Marcos');
  assert.equal(me.data.nombre_rol, 'Administrador');
  assert.ok(me.data.token);
  assert.ok(!me.texto.includes('key_user'));
  assert.equal((await srv.api('GET', '/users', { token: me.data.token })).status, 200, 'el token nuevo sirve');

  const pac = await srv.api('GET', '/me', { token: await srv.login('paciente@odontologia.com') });
  assert.equal(pac.data.id_paciente, 1, 'trae la ficha del paciente');

  assert.equal((await srv.api('GET', '/me')).status, 401);
  assert.equal((await srv.api('GET', '/me', { token: 'x.y.z' })).status, 401);
});

test('un usuario dado de baja pierde la sesión aunque su token no haya vencido', async () => {
  const doc = await srv.api('POST', '/login', { body: { email_user: 'dr.garcia@odontologia.com', key_user: srv.creds['dr.garcia@odontologia.com'] } });
  await srv.api('PUT', `/users/${doc.data.id_user}`, {
    token: ADMIN, body: { name_user: 'Dr. García', email_user: 'dr.garcia@odontologia.com', fk_rol: 2, logic_user: 'I' },
  });
  assert.equal((await srv.api('GET', '/me', { token: doc.data.token })).status, 401);
  await srv.api('PUT', `/users/${doc.data.id_user}`, {
    token: ADMIN, body: { name_user: 'Dr. García', email_user: 'dr.garcia@odontologia.com', fk_rol: 2, logic_user: 'A' },
  });
});

test('los errores internos no exponen detalles de la base', async () => {
  const r = await srv.api('POST', '/rols', { token: ADMIN, body: { desc_rol: 'sin nombre' } });
  assert.equal(r.status, 500);
  assert.equal(r.data.error, 'Error interno del servidor');
  assert.doesNotMatch(r.texto, /NOT NULL|constraint|SQL/i);
  assert.match(srv.salida(), /NOT NULL constraint failed/, 'el detalle queda en el log');
});

test('JSON mal formado y rutas inexistentes responden JSON, sin stack trace', async () => {
  const mal = await srv.api('POST', '/login', { raw: '{"email_user": ' });
  assert.equal(mal.status, 400);
  assert.ok(mal.tipo.includes('json'));
  assert.doesNotMatch(mal.texto, /node_modules|at \w+ \(/);

  const noExiste = await srv.api('GET', '/no-existe');
  assert.equal(noExiste.status, 404);
  assert.equal(noExiste.data.error, 'Ruta no encontrada');
});

test('las claves foráneas se validan', async () => {
  const huerfana = await srv.api('POST', '/citas', { token: ASIS, body: { fk_paciente: 9999, date_cita: '2030-08-12T10:00:00', time_cita: '1' } });
  assert.equal(huerfana.status, 400);
  assert.equal((await srv.api('DELETE', '/pacientes/1', { token: ADMIN })).status, 409, 'paciente con citas');
  assert.equal((await srv.api('DELETE', '/users/4', { token: ADMIN })).status, 409, 'usuario con ficha');
  assert.equal((await srv.api('DELETE', '/rols/2', { token: ADMIN })).status, 409, 'rol en uso');
  const rolInexistente = await srv.api('POST', '/users', { token: ADMIN, body: { name_user: 'x', email_user: 'x@x.com', key_user: 'k', fk_rol: 99, logic_user: 'A' } });
  assert.equal(rolInexistente.status, 400);
});

test('lo escrito queda en la base aunque el servidor se corte enseguida', async () => {
  const { data: cita } = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Nuevo', '2030-08-13T10:00:00') });
  await srv.detener();

  const db = abrirBase(srv.dbPath);
  const [[integridad]] = await db.valores('PRAGMA integrity_check');
  const guardada = await db.valores('SELECT date_cita FROM citas WHERE id_citas = ?', [cita.id_citas]);
  db.cerrar();
  assert.equal(integridad, 'ok');
  assert.deepEqual(guardada, [['2030-08-13T10:00:00']]);

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
});
