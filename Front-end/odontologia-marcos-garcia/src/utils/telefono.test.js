import { test, expect } from 'vitest';
import { telefonoInternacional, whatsappUrl } from './telefono';

test.each([
  ['04121234567', '584121234567'],
  ['0414-371.39.71', '584143713971'],
  ['4121234567', '584121234567'],
  ['+58 412 123 4567', '584121234567'],
  ['00584121234567', '584121234567'],
  ['584121234567', '584121234567'],
  ['02763456789', '582763456789'],      // fijo de Táchira
  ['+57 300 123 4567', '573001234567'], // otro país
  ['0000000000', null],                 // el valor falso que guardaba el formulario
  ['00000000000', null],
  ['550101', null],
  ['', null],
  [null, null],
  [undefined, null],
])('telefonoInternacional(%p) → %p', (entrada, esperado) => {
  expect(telefonoInternacional(entrada)).toBe(esperado);
});

test('whatsappUrl', () => {
  expect(whatsappUrl('04121234567')).toBe('https://wa.me/584121234567');
  expect(whatsappUrl('0000000000')).toBeNull(); // sin número válido se oculta el botón
});
