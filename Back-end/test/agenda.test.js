const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, abrirBase, ficha } = require('./helpers');

const DIA = '2030-03-12'; // martes
let srv, ASIS, base, despues;

const alta = (hora, dur = 1, extra = {}) =>
  srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha(`P ${hora}`, `${DIA}T${hora}:00`, { time_cita: String(dur), ...extra }) });

before(async () => {
  srv = await levantarServidor();
  ASIS = await srv.login('laura@odontologia.com');
});
after(() => srv.detener());

test('las citas se guardan en hora local, sin zona horaria', async () => {
  base = await alta('10:00', 2); // 10–12
  assert.equal(base.status, 201);
  assert.equal(base.data.date_cita, `${DIA}T10:00:00`);
});

test('rechaza cualquier superposición, teniendo en cuenta la duración', async () => {
  assert.equal((await alta('11:00')).status, 409, '11:00 cae dentro de 10–12');
  assert.equal((await alta('10:30')).status, 409);
  assert.equal((await alta('09:00', 2)).status, 409, '09–11 pisa 10–11');
  assert.equal((await alta('10:00')).status, 409, 'misma hora');
});

test('acepta citas que empiezan o terminan justo en el borde', async () => {
  assert.equal((await alta('09:00')).status, 201, '09–10 termina cuando empieza la otra');
  despues = await alta('12:00');
  assert.equal(despues.status, 201, '12:00 empieza cuando termina la otra');
  const otroDia = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Otro día', '2030-03-13T10:00:00') });
  assert.equal(otroDia.status, 201);
});

test('acepta el formato viejo con "Z" y lo guarda sin zona, misma hora', async () => {
  const conZ = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Z', `${DIA}T15:00:00.000Z`) });
  assert.equal(conZ.status, 201);
  assert.equal(conZ.data.date_cita, `${DIA}T15:00:00`);
  const choca = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Z2', `${DIA}T15:30:00.000Z`) });
  assert.equal(choca.status, 409);
});

test('rechaza fechas inválidas', async () => {
  for (const fecha of ['2030-13-40T10:00:00', '2030-02-30T10:00:00', 'mañana', '', '2030-03-12T25:00:00', '2030-03-12T10:00:00-04:00', undefined]) {
    const r = await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('X', fecha) });
    assert.equal(r.status, 400, `fecha ${JSON.stringify(fecha)}`);
  }
});

test('un registro en horario ocupado no crea la cuenta (rollback)', async () => {
  const reg = (hora) => srv.api('POST', '/registro', { body: { ...ficha('Reg', `${DIA}T${hora}:00`), email_user: 'nuevo@x.com', key_user: 'clave123' } });
  assert.equal((await reg('10:30')).status, 409);
  assert.equal(await srv.login('nuevo@x.com', 'clave123'), undefined);

  const ok = await reg('16:00');
  assert.equal(ok.status, 201);
  const PAC = ok.data.token;
  const reserva = (hora) => srv.api('POST', '/citas', { token: PAC, body: { date_cita: `${DIA}T${hora}:00`, time_cita: '1' } });
  assert.equal((await reserva('11:00')).status, 409);
  assert.equal((await reserva('17:00')).status, 201);
});

test('/disponibilidad devuelve fechas canónicas y no incluye canceladas', async () => {
  let disp = (await srv.api('GET', '/disponibilidad')).data;
  assert.ok(disp.every((c) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(c.date_cita)));

  assert.equal((await srv.api('PUT', `/citaCompletaStatus/${base.data.id_citas}`, { token: ASIS, body: { status_cita: 'CANCELADA' } })).status, 200);
  disp = (await srv.api('GET', '/disponibilidad')).data;
  assert.ok(!disp.some((c) => c.date_cita === `${DIA}T10:00:00`));
});

test('cancelar libera el horario; reactivar la cancelada si se ocupó da 409', async () => {
  const ocupa = await alta('10:30');
  assert.equal(ocupa.status, 201);
  const reactivar = await srv.api('PUT', `/citaCompletaStatus/${base.data.id_citas}`, { token: ASIS, body: { status_cita: 'CONFIRMADA' } });
  assert.equal(reactivar.status, 409);
  const confirmar = await srv.api('PUT', `/citaCompletaStatus/${ocupa.data.id_citas}`, { token: ASIS, body: { status_cita: 'CONFIRMADA' } });
  assert.equal(confirmar.status, 200);
});

test('reprogramar (arrastrar en el calendario) respeta las mismas reglas', async () => {
  const mover = (id, date_cita) => srv.api('PUT', `/citaCompletaDate/${id}`, { token: ASIS, body: { date_cita } });
  const id = despues.data.id_citas; // 12–13
  assert.equal((await mover(id, `${DIA}T09:30:00`)).status, 409, 'choca con 09–10');
  assert.equal((await mover(id, `${DIA}T12:30:00`)).status, 200, 'se solapa solo consigo misma');
  const otroDia = await mover(id, '2030-03-14T08:00:00');
  assert.equal(otroDia.status, 200);
  assert.equal(otroDia.data.date_cita, '2030-03-14T08:00:00');
  assert.equal((await mover(id, 'x')).status, 400);
  assert.equal((await mover(9999, `${DIA}T08:00:00`)).status, 404);
});

test('migra las fechas viejas al formato sin zona sin mover la hora', async () => {
  await srv.detener();

  const db = abrirBase(srv.dbPath);
  const insertar = (fecha) => db.run(
    `INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita) VALUES (1, 2, ?, '1', 'legacy', 'PENDIENTE', 'A')`,
    [fecha]
  );
  await insertar('2031-05-05T10:00:00.000Z');
  await insertar('2031-05-06 14:30:00');
  await insertar('2026-12-1');
  db.cerrar();

  srv = await levantarServidor({ dbPath: srv.dbPath, creds: srv.creds });
  assert.match(srv.salida(), /Migración de fechas: 2 citas/);
  assert.match(srv.salida(), /formato desconocido/);

  const archivo = abrirBase(srv.dbPath);
  const fechas = (await archivo.valores(`SELECT date_cita FROM citas WHERE desc_cita = 'legacy' ORDER BY id_citas`)).flat();
  archivo.cerrar();
  assert.deepEqual(fechas, ['2031-05-05T10:00:00', '2031-05-06T14:30:00', '2026-12-1']);
});
