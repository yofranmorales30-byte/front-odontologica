const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, abrirBase, ficha } = require('./helpers');

const tieneClave = (x) => JSON.stringify(x).includes('key_user');

let srv, ADMIN, PAC, registro;

before(async () => { srv = await levantarServidor(); });
after(() => srv.detener());

test('el seed genera contraseñas aleatorias y las muestra una vez', () => {
  assert.equal(Object.keys(srv.creds).length, 4);
  for (const clave of Object.values(srv.creds)) {
    assert.ok(!['admin123', 'doc123', 'asis123', '1234'].includes(clave), 'no usa contraseñas fijas');
  }
});

test('sin token (o con uno falso) la API responde 401', async () => {
  for (const [metodo, ruta] of [['GET', '/users'], ['GET', '/citaCompleta'], ['GET', '/pacientes'], ['DELETE', '/users/1']]) {
    assert.equal((await srv.api(metodo, ruta)).status, 401, `${metodo} ${ruta}`);
  }
  assert.equal((await srv.api('GET', '/users', { token: 'abc.def.ghi' })).status, 401);
});

test('login devuelve un token y nunca key_user', async () => {
  const r = await srv.api('POST', '/login', { body: { email_user: 'admin@odontologia.com', key_user: srv.creds['admin@odontologia.com'] } });
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
  assert.ok(!tieneClave(r.data));
  ADMIN = r.data.token;

  assert.ok(await srv.login('ADMIN@odontologia.com', srv.creds['admin@odontologia.com']), 'el email no distingue mayúsculas');
  const mala = await srv.api('POST', '/login', { body: { email_user: 'admin@odontologia.com', key_user: 'admin123' } });
  assert.equal(mala.status, 401);
});

test('los listados no exponen key_user', async () => {
  const users = await srv.api('GET', '/users', { token: ADMIN });
  assert.equal(users.status, 200);
  assert.equal(users.data.length, 4);
  assert.ok(!tieneClave(users.data));

  const citas = await srv.api('GET', '/citaCompleta', { token: ADMIN });
  assert.equal(citas.status, 200);
  assert.equal(citas.data.length, 1);
  assert.ok(!tieneClave(citas.data));
  for (const campo of ['id_citas', 'name_paciente', 'email_user', 'telf_paciente', 'date_cita']) {
    assert.ok(campo in citas.data[0], `conserva ${campo} para el calendario`);
  }
});

test('/disponibilidad es pública y solo trae fecha y duración', async () => {
  const r = await srv.api('GET', '/disponibilidad');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data[0]).sort(), ['date_cita', 'time_cita']);
});

test('el registro ignora el rol y el estado que manda el cliente', async () => {
  const r = await srv.api('POST', '/registro', {
    body: { ...ficha('Ana Test', '2030-01-10T10:00:00'), email_user: 'Ana@Test.com', key_user: 'secreta99', fk_rol: 1, status_cita: 'CONFIRMADA' },
  });
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  assert.equal(r.data.nombre_rol, 'Paciente');
  assert.equal(r.data.fk_rol, 4);
  assert.ok(!tieneClave(r.data));
  registro = r.data;
  PAC = r.data.token;

  const repetido = await srv.api('POST', '/registro', { body: { ...ficha('X', '2030-02-01T10:00:00'), email_user: 'ana@test.com', key_user: 'otra' } });
  assert.equal(repetido.status, 409, 'email repetido');
  const sinClave = await srv.api('POST', '/registro', { body: { name_paciente: 'X', email_user: 'x@x.com' } });
  assert.equal(sinClave.status, 400);
  assert.ok(await srv.login('ana@test.com', 'secreta99'));
});

test('un paciente no accede a datos de la clínica', async () => {
  for (const [metodo, ruta, body] of [['GET', '/users'], ['GET', '/citaCompleta'], ['GET', '/pacientes'], ['PUT', '/citaCompletaStatus/1', { status_cita: 'CANCELADA' }]]) {
    assert.equal((await srv.api(metodo, ruta, { token: PAC, body })).status, 403, `${metodo} ${ruta}`);
  }
});

test('un paciente solo ve y reserva sus propias citas', async () => {
  let mis = await srv.api('GET', '/mis-citas', { token: PAC });
  assert.equal(mis.data.length, 1);
  assert.equal(mis.data[0].name_paciente, 'Ana Test');
  assert.equal(mis.data[0].status_cita, 'PENDIENTE');

  // Intenta reservar a nombre del Paciente Demo (id 1) y ya confirmada
  const nueva = await srv.api('POST', '/citas', {
    token: PAC,
    body: { fk_paciente: 1, date_cita: '2030-01-11T11:00:00', time_cita: '1', status_cita: 'CONFIRMADA' },
  });
  assert.equal(nueva.status, 201);
  assert.equal(nueva.data.fk_paciente, registro.id_paciente);
  assert.equal(nueva.data.status_cita, 'PENDIENTE');
  mis = await srv.api('GET', '/mis-citas', { token: PAC });
  assert.equal(mis.data.length, 2);

  const demo = await srv.login('paciente@odontologia.com');
  const misDemo = await srv.api('GET', '/mis-citas', { token: demo });
  assert.deepEqual(misDemo.data.map((c) => c.name_paciente), ['Paciente Demo']);
});

test('permisos del personal', async () => {
  const ASIS = await srv.login('laura@odontologia.com');
  const DOC = await srv.login('dr.garcia@odontologia.com');

  const alta = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Pedro Sin Cuenta', '2030-01-12T09:00:00') });
  assert.equal(alta.status, 201);
  const users = await srv.api('GET', '/users', { token: ADMIN });
  assert.equal(users.data.length, 5, 'el alta del personal no crea cuenta de acceso');

  const agenda = await srv.api('GET', '/citaCompleta', { token: DOC });
  assert.equal(agenda.status, 200);
  assert.ok(agenda.data.some((c) => c.name_paciente === 'Pedro Sin Cuenta'));

  assert.equal((await srv.api('POST', '/citaCompleta', { token: DOC, body: ficha('z', '2030-01-14T09:00:00') })).status, 403);
  assert.equal((await srv.api('PUT', '/citaCompletaDate/1', { token: DOC, body: { date_cita: '2030-01-14T09:00:00' } })).status, 403);
  assert.equal((await srv.api('PUT', '/citaCompletaStatus/1', { token: DOC, body: { status_cita: 'CONFIRMADA' } })).status, 200);
  assert.equal((await srv.api('GET', '/users', { token: ASIS })).status, 403);
});

test('el admin gestiona usuarios y las contraseñas se hashean', async () => {
  const id = registro.id_user;
  const base = { name_user: 'Ana T', email_user: 'ana@test.com', fk_rol: 4, logic_user: 'A' };

  const sinClave = await srv.api('PUT', `/users/${id}`, { token: ADMIN, body: base });
  assert.equal(sinClave.status, 200);
  assert.ok(!tieneClave(sinClave.data));
  assert.ok(await srv.login('ana@test.com', 'secreta99'), 'sin key_user se conserva la contraseña');

  await srv.api('PUT', `/users/${id}`, { token: ADMIN, body: { ...base, key_user: 'nueva123' } });
  assert.ok(await srv.login('ana@test.com', 'nueva123'));
  assert.equal(await srv.login('ana@test.com', 'secreta99'), undefined);

  const creado = await srv.api('POST', '/users', { token: ADMIN, body: { name_user: 'Doc2', email_user: 'doc2@x.com', key_user: 'pw12345', fk_rol: 2, logic_user: 'A' } });
  assert.equal(creado.status, 201);
  assert.ok(!tieneClave(creado.data));
  assert.ok(await srv.login('doc2@x.com', 'pw12345'));
});

test('las contraseñas en texto plano de bases viejas se migran solas', async () => {
  await srv.detener();

  const db = abrirBase(srv.dbPath);
  await db.run(`UPDATE "user" SET key_user = 'admin123' WHERE email_user = 'admin@odontologia.com'`);
  await db.run(`INSERT INTO "user" (name_user, email_user, key_user, fk_rol, logic_user) VALUES ('Staff Creado', 'juanperez@email.com', 'paciente2024', 4, 'A')`);
  await db.run(`INSERT INTO "user" (name_user, email_user, key_user, fk_rol, logic_user) VALUES ('Legacy', 'legacy@x.com', 'miClaveVieja', 4, 'A')`);
  db.cerrar();

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
  const salida = srv.salida();
  assert.match(salida, /2 hasheadas, 1 cuentas con contraseña por defecto bloqueadas/);
  assert.match(salida, /admin@odontologia\.com/, 'avisa de la contraseña publicada');
  assert.ok(await srv.login('legacy@x.com', 'miClaveVieja'), 'el usuario viejo entra con su contraseña de siempre');
  assert.equal(await srv.login('juanperez@email.com', 'paciente2024'), undefined, 'paciente2024 queda bloqueada');
  assert.ok(await srv.login('admin@odontologia.com', 'admin123'));

  const archivo = abrirBase(srv.dbPath);
  const [[planas]] = await archivo.valores(`SELECT COUNT(*) FROM "user" WHERE key_user NOT LIKE '$2%'`);
  archivo.cerrar();
  assert.equal(planas, 0, 'todas las key_user de la base son bcrypt');
});
