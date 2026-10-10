// Historial de un paciente: su ficha y todas sus citas
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { levantarServidor, ficha } = require('./helpers');

let srv, ADMIN, ASIS, DOCTOR, PACIENTE, idPaciente, idOtro, idConCuenta;
const ids = {};

before(async () => {
  srv = await levantarServidor();
  ADMIN = await srv.login('admin@odontologia.com');
  ASIS = await srv.login('laura@odontologia.com');
  DOCTOR = await srv.login('dr.garcia@odontologia.com');

  // Una paciente con historia: dos citas ya pasadas (2020), una futura y una futura cancelada
  const alta = await srv.api('POST', '/citaCompleta', {
    token: ASIS,
    body: ficha('Marta Historia', '2020-01-06T09:00:00', { desc_cita: 'Limpieza dental', telf_paciente: '04145550101', dir_paciente: 'Calle 5' }),
  });
  ids.limpieza = alta.data.id_citas;
  idPaciente = alta.data.fk_paciente;
  const otra = async (date_cita, desc_cita) => (await srv.api('POST', '/citas', {
    token: ASIS, body: { fk_paciente: idPaciente, date_cita, time_cita: '2', desc_cita, logic_cita: 'A' },
  })).data.id_citas;
  ids.resina = await otra('2020-02-03T10:00:00', 'Resina en molar');
  ids.control = await otra('2030-06-03T08:00:00', 'Control');
  ids.cancelada = await otra('2030-06-04T08:00:00', 'Blanqueamiento');
  await srv.api('PUT', `/citaCompletaStatus/${ids.cancelada}`, { token: ASIS, body: { status_cita: 'CANCELADA' } });

  // Otro paciente, con cuenta propia, para ver que las historias no se mezclan
  idOtro = (await srv.api('POST', '/citaCompleta', { token: ASIS, body: ficha('Otro Paciente', '2020-01-07T09:00:00') })).data.fk_paciente;
  const registro = await srv.api('POST', '/registro', {
    body: { ...ficha('Con Cuenta', '2030-06-05T08:00:00'), email_user: 'con.cuenta@x.com', key_user: 'clave123' },
  });
  PACIENTE = registro.data.token;
  idConCuenta = registro.data.id_paciente;
});
after(() => srv.detener());

const historial = (id, token = ADMIN) => srv.api('GET', `/pacientes/${id}/historial`, { token });

test('devuelve la ficha del paciente y todas sus citas, de la más reciente a la más antigua', async () => {
  const { status, data } = await historial(idPaciente);

  assert.equal(status, 200);
  assert.deepEqual(data.paciente, {
    id_paciente: idPaciente, name_paciente: 'Marta Historia', genre_paciente: 'F', birth_paciente: '1990-01-01',
    dir_paciente: 'Calle 5', telf_paciente: '04145550101', email_user: null,
  });
  assert.deepEqual(data.citas.map((c) => c.id_citas), [ids.cancelada, ids.control, ids.resina, ids.limpieza]);
  assert.deepEqual(data.citas.map((c) => c.status_cita), ['CANCELADA', 'PENDIENTE', 'COMPLETADA', 'COMPLETADA']);
});

test('cada cita trae lo que se hizo, cuánto duró y quién atendió', async () => {
  const resina = (await historial(idPaciente)).data.citas.find((c) => c.id_citas === ids.resina);

  assert.deepEqual(resina, {
    id_citas: ids.resina, date_cita: '2020-02-03T10:00:00', time_cita: '2', desc_cita: 'Resina en molar',
    status_cita: 'COMPLETADA', logic_cita: 'A', name_doctor: 'Dr. García',
  });
});

test('una cita oculta de la agenda sigue en el historial', async () => {
  await srv.api('PUT', `/citaCompletaLogic/${ids.limpieza}`, { token: ASIS, body: { logic_cita: 'I' } });

  const agenda = (await srv.api('GET', '/citaCompleta', { token: ADMIN })).data.map((c) => c.id_citas);
  assert.ok(!agenda.includes(ids.limpieza), 'ya no está en la agenda');

  const limpieza = (await historial(idPaciente)).data.citas.find((c) => c.id_citas === ids.limpieza);
  assert.equal(limpieza.status_cita, 'COMPLETADA');
  assert.equal(limpieza.logic_cita, 'I');
});

test('solo trae las citas de ese paciente', async () => {
  const otro = (await historial(idOtro)).data;
  assert.equal(otro.paciente.name_paciente, 'Otro Paciente');
  assert.equal(otro.citas.length, 1);
});

test('de un paciente con cuenta trae el email, y nunca la contraseña', async () => {
  const { data, texto } = await historial(idConCuenta);
  assert.equal(data.paciente.email_user, 'con.cuenta@x.com');
  assert.ok(!/key_user/.test(texto));
});

test('lo ve todo el personal; un paciente o alguien sin sesión, no', async () => {
  for (const token of [ADMIN, ASIS, DOCTOR]) assert.equal((await historial(idPaciente, token)).status, 200);
  assert.equal((await historial(idPaciente, PACIENTE)).status, 403);
  assert.equal((await historial(idConCuenta, PACIENTE)).status, 403, 'ni siquiera el propio');
  assert.equal((await historial(idPaciente, null)).status, 401);
});

test('un paciente que no existe da 404', async () => {
  const { status, data } = await historial(99999);
  assert.equal(status, 404);
  assert.equal(data.error, 'Paciente no encontrado');
});
