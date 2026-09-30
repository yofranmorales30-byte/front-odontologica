// Reservas simultáneas: nunca puede quedar una cita duplicada ni una cuenta repetida
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, abrirBase, ficha, conteo } = require('./helpers');

let srv, ADMIN, ASIS;
const pacientes = [];

const citasDelDia = async (dia) =>
  (await srv.api('GET', '/citaCompleta', { token: ADMIN })).data.filter((c) => c.date_cita.startsWith(dia));

function sinSolapes(citas) {
  const rangos = citas.map((c) => {
    const [h, m] = c.date_cita.slice(11, 16).split(':').map(Number);
    const inicio = h * 60 + m;
    return [inicio, inicio + Math.max(parseInt(c.time_cita, 10) || 1, 1) * 60];
  }).sort((a, b) => a[0] - b[0]);
  return rangos.every((r, i) => i === 0 || rangos[i - 1][1] <= r[0]);
}

before(async () => {
  srv = await levantarServidor();
  ADMIN = await srv.login('admin@odontologia.com');
  ASIS = await srv.login('laura@odontologia.com');
  for (let i = 0; i < 5; i++) {
    const r = await srv.api('POST', '/registro', {
      body: { ...ficha(`Pac ${i}`, `2030-05-06T${String(8 + i).padStart(2, '0')}:00:00`), email_user: `pac${i}@x.com`, key_user: 'clave123' },
    });
    pacientes.push(r.data.token);
  }
});
after(() => srv.detener());

test('30 reservas simultáneas del mismo horario por las tres rutas: gana una sola', async () => {
  const SLOT = '2030-04-09T10:00:00';
  const usersAntes = (await srv.api('GET', '/users', { token: ADMIN })).data.length;
  const fichasAntes = (await srv.api('GET', '/pacientes', { token: ADMIN })).data.length;

  const pedidos = [];
  for (let i = 0; i < 10; i++) {
    pedidos.push(() => srv.api('POST', '/citas', { token: pacientes[i % 5], body: { date_cita: SLOT, time_cita: '1' } }));
    pedidos.push(() => srv.api('POST', '/citaCompleta', { token: i % 2 ? ADMIN : ASIS, body: ficha(`Staff ${i}`, SLOT) }));
    pedidos.push(() => srv.api('POST', '/registro', { body: { ...ficha(`Reg ${i}`, SLOT), email_user: `carrera${i}@x.com`, key_user: 'clave123' } }));
  }
  const respuestas = await Promise.all(pedidos.map((f) => f()));
  assert.deepEqual(conteo(respuestas), { 201: 1, 409: 29 });
  assert.equal((await citasDelDia('2030-04-09')).length, 1);

  // Los rechazados no dejan cuentas ni fichas huérfanas (rollback de la transacción)
  const ganador = respuestas.findIndex((r) => r.status === 201) % 3; // 0 paciente, 1 staff, 2 registro
  const usersDespues = (await srv.api('GET', '/users', { token: ADMIN })).data.length;
  const fichasDespues = (await srv.api('GET', '/pacientes', { token: ADMIN })).data.length;
  assert.equal(usersDespues - usersAntes, ganador === 2 ? 1 : 0);
  assert.equal(fichasDespues - fichasAntes, ganador === 0 ? 0 : 1);
});

test('20 reservas superpuestas a la vez: las que quedan no se pisan', async () => {
  const DIA = '2030-04-10';
  const intentos = [['13:00', 2], ['13:30', 1], ['14:00', 2], ['14:30', 1], ['15:00', 1], ['15:30', 1], ['16:00', 1], ['16:00', 2], ['12:30', 1], ['13:00', 1]];
  const respuestas = await Promise.all([...intentos, ...intentos].map(([hora, dur], i) =>
    srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha(`Rango ${i}`, `${DIA}T${hora}:00`, { time_cita: String(dur) }) })));
  assert.ok(respuestas.every((r) => r.status === 201 || r.status === 409), JSON.stringify(conteo(respuestas)));
  const citas = await citasDelDia(DIA);
  assert.ok(citas.length > 0);
  assert.ok(sinSolapes(citas), JSON.stringify(citas.map((c) => `${c.date_cita}/${c.time_cita}`)));
});

test('10 registros simultáneos con el mismo email: una sola cuenta', async () => {
  const respuestas = await Promise.all(Array.from({ length: 10 }, (_, i) => srv.api('POST', '/registro', {
    body: {
      ...ficha('Duplicado', `2030-04-1${i % 2 ? 5 : 6}T${String(8 + Math.floor(i / 2)).padStart(2, '0')}:00:00`),
      email_user: i % 2 ? 'Dup@X.com' : 'dup@x.com',
      key_user: 'clave123',
    },
  })));
  assert.deepEqual(conteo(respuestas), { 201: 1, 409: 9 });
  const cuentas = (await srv.api('GET', '/users', { token: ADMIN })).data.filter((u) => u.email_user.toLowerCase() === 'dup@x.com');
  assert.equal(cuentas.length, 1);

  const repetido = await srv.api('POST', '/users', { token: ADMIN, body: { name_user: 'x', email_user: 'DUP@x.com', key_user: 'k', fk_rol: 2, logic_user: 'A' } });
  assert.equal(repetido.status, 409);
});

let a;
test('dos citas arrastradas al mismo hueco a la vez: solo una queda ahí', async () => {
  const DIA = '2030-04-11';
  a = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Mover A', `${DIA}T08:00:00`) })).data;
  const b = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Mover B', `${DIA}T09:00:00`) })).data;
  await Promise.all([a, b, a, b].map((c) =>
    srv.api('PUT', `/citaCompletaDate/${c.id_citas}`, { token: ASIS, body: { date_cita: `${DIA}T16:00:00` } })));
  const citas = await citasDelDia(DIA);
  assert.equal(citas.filter((c) => c.date_cita === `${DIA}T16:00:00`).length, 1);
  assert.ok(sinSolapes(citas));
});

test('reactivar una cancelada mientras otro reserva su hueco: gana uno solo', async () => {
  const DIA = '2030-04-11';
  const cancelada = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Cancelada', `${DIA}T11:00:00`) })).data;
  await srv.api('PUT', `/citaCompletaStatus/${cancelada.id_citas}`, { token: ASIS, body: { status_cita: 'CANCELADA' } });
  const respuestas = await Promise.all([
    srv.api('PUT', `/citaCompletaStatus/${cancelada.id_citas}`, { token: ASIS, body: { status_cita: 'CONFIRMADA' } }),
    srv.api('POST', '/citaCompleta', { token: ADMIN, body: ficha('Nueva en su hueco', `${DIA}T11:00:00`) }),
    srv.api('POST', '/citas', { token: pacientes[0], body: { date_cita: `${DIA}T11:00:00`, time_cita: '1' } }),
  ]);
  assert.equal(respuestas.filter((r) => r.status === 200 || r.status === 201).length, 1, JSON.stringify(respuestas.map((r) => r.status)));
  assert.ok(sinSolapes(await citasDelDia(DIA)));
});

test('mover y estirar la misma cita a la vez: nunca termina después del cierre', async () => {
  // Cada cambio por separado es válido (16–17 → 17–18, o 16–17 → 16–18), los dos juntos no (17–19).
  // Contra Turso las requests se intercalan y una recibe 409; con la base local de los tests
  // suelen ir una detrás de otra y la segunda recibe 400. En los dos casos gana una sola.
  for (const dia of ['2030-07-01', '2030-07-02', '2030-07-03', '2030-07-04', '2030-07-05']) {
    const { id_citas } = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Mover y estirar', `${dia}T16:00:00`) })).data;
    const respuestas = await Promise.all([
      srv.api('PUT', `/citaCompletaDate/${id_citas}`, { token: ASIS, body: { date_cita: `${dia}T17:00:00` } }),
      srv.api('PUT', `/citaCompletaDuracion/${id_citas}`, { token: ASIS, body: { time_cita: 2 } }),
    ]);
    assert.equal(respuestas.filter((r) => r.status === 200).length, 1, JSON.stringify(respuestas.map((r) => r.status)));
    const { date_cita, time_cita } = (await srv.api('GET', `/citas/${id_citas}`, { token: ADMIN })).data;
    assert.ok(Number(date_cita.slice(11, 13)) + Number(time_cita) <= 18, `${date_cita} por ${time_cita} h`);
  }
});

test('horario de atención: lunes a viernes 8–18, sábado 8–12, domingo cerrado', async () => {
  const h = async (fecha, dur = '1') => (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Horario', fecha, { time_cita: dur }) })).status;
  assert.equal(await h('2030-04-22T08:00:00'), 201, 'lunes 08:00');
  assert.equal(await h('2030-04-22T07:30:00'), 400, 'lunes 07:30');
  assert.equal(await h('2030-04-22T17:00:00'), 201, 'lunes 17:00, termina 18:00');
  assert.equal(await h('2030-04-22T16:30:00', '2'), 400, 'lunes 16:30 por 2 h');
  assert.equal(await h('2030-04-22T18:00:00'), 400, 'lunes 18:00');
  assert.equal(await h('2030-04-20T08:00:00'), 201, 'sábado 08:00');
  assert.equal(await h('2030-04-20T11:00:00'), 201, 'sábado 11:00, termina 12:00');
  assert.equal(await h('2030-04-20T10:30:00', '2'), 400, 'sábado 10:30 por 2 h');
  assert.equal(await h('2030-04-20T12:00:00'), 400, 'sábado 12:00');
  assert.equal(await h('2030-04-21T10:00:00'), 400, 'domingo');

  const domingo = await srv.api('POST', '/registro', { body: { ...ficha('Dom', '2030-04-21T10:00:00'), email_user: 'dom@x.com', key_user: 'k' } });
  assert.equal(domingo.status, 400);
  assert.match(domingo.data.error, /domingo/i);
  assert.equal((await srv.api('POST', '/citas', { token: pacientes[1], body: { date_cita: '2030-04-27T12:30:00', time_cita: '1' } })).status, 400);

  const mover = (date_cita) => srv.api('PUT', `/citaCompletaDate/${a.id_citas}`, { token: ASIS, body: { date_cita } });
  assert.equal((await mover('2030-04-28T10:00:00')).status, 400, 'a domingo');
  assert.equal((await mover('2030-04-27T11:30:00')).status, 400, 'a sábado 11:30');
  assert.equal((await mover('2030-04-27T10:00:00')).status, 200, 'a sábado 10:00');
});

test('la garantía está en la base: SQL directo tampoco puede duplicar', async () => {
  await srv.detener();
  const db = abrirBase(srv.dbPath);
  const falla = async (sql, params) => { try { await db.run(sql, params); return null; } catch (e) { return e.message; } };

  const triggers = (await db.valores(`SELECT name FROM sqlite_master WHERE type = 'trigger'`)).flat();
  assert.ok(triggers.includes('citas_sin_solapamiento_insert') && triggers.includes('citas_sin_solapamiento_update'));

  const [[idOcupada, fechaOcupada]] = await db.valores(`SELECT id_citas, date_cita FROM citas WHERE date_cita = '2030-04-09T10:00:00' AND logic_cita = 'A'`);
  assert.match(await falla(`INSERT INTO citas (fk_paciente, date_cita, time_cita, status_cita, logic_cita) VALUES (1, ?, '1', 'PENDIENTE', 'A')`, ['2030-04-09T10:30:00']) || '', /CITA_SOLAPADA/);

  const [[idOtra]] = await db.valores(`SELECT id_citas FROM citas WHERE date_cita LIKE '2030-04-22T08%'`);
  assert.match(await falla('UPDATE citas SET date_cita = ? WHERE id_citas = ?', [fechaOcupada, idOtra]) || '', /CITA_SOLAPADA/);

  assert.equal(await falla(`INSERT INTO citas (fk_paciente, date_cita, time_cita, status_cita, logic_cita) VALUES (1, ?, '1', 'CANCELADA', 'A')`, [fechaOcupada]), null, 'una cancelada no ocupa');
  const [[idCancelada]] = await db.valores('SELECT MAX(id_citas) FROM citas');
  assert.match(await falla(`UPDATE citas SET status_cita = 'CONFIRMADA' WHERE id_citas = ?`, [idCancelada]) || '', /CITA_SOLAPADA/, 'reactivarla');
  assert.match(await falla(`INSERT INTO "user" (name_user, email_user, key_user, fk_rol) VALUES ('x', 'PAC0@X.COM', 'h', 4)`) || '', /UNIQUE/);
  assert.equal(await falla(`UPDATE citas SET status_cita = 'CONFIRMADA' WHERE id_citas = ?`, [idOcupada]), null, 'confirmar una ya ubicada no re-chequea');

  // Base vieja con citas ya superpuestas: arranca, avisa y vuelve a proteger el hueco
  await db.run('DROP TRIGGER citas_sin_solapamiento_insert');
  await db.run('DROP TRIGGER citas_sin_solapamiento_update');
  await db.run(`INSERT INTO citas (fk_paciente, date_cita, time_cita, status_cita, logic_cita) VALUES (1, '2031-06-03T10:00:00.000Z', '2', 'PENDIENTE', 'A')`);
  await db.run(`INSERT INTO citas (fk_paciente, date_cita, time_cita, status_cita, logic_cita) VALUES (1, '2031-06-03T11:00:00.000Z', '1', 'PENDIENTE', 'A')`);
  const ids = (await db.valores(`SELECT id_citas FROM citas WHERE date_cita LIKE '2031-06-03%' ORDER BY id_citas`)).flat();
  db.cerrar();

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
  assert.match(srv.salida(), /Migración de fechas: 2 citas/);
  assert.ok(srv.salida().includes(`${ids[0]}↔${ids[1]}`), 'avisa qué citas quedaron superpuestas');
  const asis = await srv.login('laura@odontologia.com');
  assert.equal((await srv.api('POST', '/citaCompleta', { token: asis, body: ficha('x', '2031-06-03T10:30:00') })).status, 409);
});
