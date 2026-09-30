// Tests unitarios de las funciones puras (no levantan el servidor)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFechaCita, normalizeEstado, validarHorario, ahoraClinica } = require('../src/utils/agenda');
const { isHashed, hashPassword, verifyPassword } = require('../src/utils/password');

test('normalizeFechaCita', () => {
  assert.equal(normalizeFechaCita('2030-03-12T10:00'), '2030-03-12T10:00:00');
  assert.equal(normalizeFechaCita('2030-03-12T10:00:00.000Z'), '2030-03-12T10:00:00', 'la Z vieja se quita sin mover la hora');
  assert.equal(normalizeFechaCita('2026-08-19 08:00:00'), '2026-08-19T08:00:00');
  for (const invalida of ['2030-02-30T10:00', '2030-13-01T10:00', '2030-03-12T24:00', '2030-03-12T10:00:00-04:00', 'mañana', '', null, undefined]) {
    assert.equal(normalizeFechaCita(invalida), null, JSON.stringify(invalida));
  }
});

test('normalizeEstado', () => {
  assert.equal(normalizeEstado('Confirmada'), 'CONFIRMADA');
  assert.equal(normalizeEstado(' pendiente '), 'PENDIENTE');
  assert.equal(normalizeEstado('COMPLETADO'), null);
  assert.equal(normalizeEstado(undefined), null);
});

test('validarHorario: lunes a viernes 8–18, sábado 8–12, domingo cerrado', () => {
  assert.equal(validarHorario('2030-04-22T08:00:00', '1'), null);        // lunes
  assert.equal(validarHorario('2030-04-22T16:00:00', '2'), null);        // termina 18:00
  assert.notEqual(validarHorario('2030-04-22T16:30:00', '2'), null);     // termina 18:30
  assert.notEqual(validarHorario('2030-04-22T07:59:00', '1'), null);
  assert.equal(validarHorario('2030-04-20T11:00:00', '1'), null);        // sábado
  assert.notEqual(validarHorario('2030-04-20T11:00:00', '2'), null);
  assert.match(validarHorario('2030-04-21T10:00:00', '1'), /domingo/i);
});

test('ahoraClinica usa la zona de la clínica, no la del servidor', () => {
  const instante = new Date(Date.UTC(2026, 8, 25, 18, 30, 5)); // 18:30:05 UTC
  assert.equal(ahoraClinica(instante), '2026-09-25T14:30:05'); // Caracas, UTC-4
});

test('contraseñas: bcrypt y verificación', async () => {
  const hash = await hashPassword('secreta');
  assert.ok(isHashed(hash));
  assert.ok(await verifyPassword('secreta', hash));
  assert.ok(!(await verifyPassword('otra', hash)));
  assert.ok(!(await verifyPassword('secreta', 'secreta')), 'un texto plano nunca valida');
});
