// Cambiar la duración de una cita (estirarla en el calendario)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, ficha } = require('./helpers');

let srv, ASIS, cita;
const duracion = (id, time_cita, token = ASIS) =>
  srv.api('PUT', `/citaCompletaDuracion/${id}`, { token, body: { time_cita } });
const alta = async (date_cita) => (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('P', date_cita) })).data;

before(async () => {
  srv = await levantarServidor();
  ASIS = await srv.login('laura@odontologia.com');
  cita = await alta('2030-07-02T10:00:00'); // martes 10–11
  await alta('2030-07-02T13:00:00');        // 13–14
});
after(() => srv.detener());

test('estirar hasta el borde de la cita siguiente, pero no más', async () => {
  const dos = await duracion(cita.id_citas, '2');
  assert.equal(dos.status, 200);
  assert.equal(dos.data.time_cita, '2');
  assert.equal((await duracion(cita.id_citas, 3)).status, 200, '10–13 termina justo cuando empieza la otra');
  assert.equal((await duracion(cita.id_citas, 4)).status, 409, '10–14 pisa la de las 13');
  assert.equal((await duracion(cita.id_citas, 1)).status, 200, 'achicar');
});

test('la duración tiene que ser en horas enteras', async () => {
  for (const valor of [1.5, 0, 'abc']) {
    assert.equal((await duracion(cita.id_citas, valor)).status, 400, JSON.stringify(valor));
  }
  assert.equal((await duracion(9999, 1)).status, 404);
});

test('respeta el horario de atención', async () => {
  const sabado = await alta('2030-07-06T11:00:00');
  assert.equal((await duracion(sabado.id_citas, 2)).status, 400, 'sábado 11–13');
  const lunes = await alta('2030-07-01T17:00:00');
  assert.equal((await duracion(lunes.id_citas, 2)).status, 400, 'lunes 17–19');
});

test('el doctor (calendario de solo lectura) y el paciente no pueden', async () => {
  assert.equal((await duracion(cita.id_citas, 1, await srv.login('dr.garcia@odontologia.com'))).status, 403);
  assert.equal((await duracion(cita.id_citas, 1, await srv.login('paciente@odontologia.com'))).status, 403);
});
