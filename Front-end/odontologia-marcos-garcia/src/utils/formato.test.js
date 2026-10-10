import { test, expect } from 'vitest';
import { diaCita, horarioCita } from './formato';

test('diaCita muestra el día de la cita con el día de la semana', () => {
  expect(diaCita('2026-09-30T09:00:00')).toBe('mié, 30 sept 2026');
  expect(diaCita('2030-03-12T16:00:00')).toBe('mar, 12 mar 2030');
  expect(diaCita(undefined)).toBe('—');
});

test('horarioCita muestra desde y hasta qué hora es la cita', () => {
  expect(horarioCita('2026-09-30T09:00:00', '1')).toBe('09:00–10:00 hs');
  expect(horarioCita('2030-03-12T16:00:00', '2')).toBe('16:00–18:00 hs');
  expect(horarioCita('2030-03-12T10:30:00', '')).toBe('10:30–11:30 hs'); // sin duración: 1 hora
  expect(horarioCita(undefined, '1')).toBe('');
});
