import { test, expect } from 'vitest';
import { fechaHoraCita } from './formato';

test('fechaHoraCita muestra el día y el horario de la cita', () => {
  expect(fechaHoraCita('2026-09-30T09:00:00', '1')).toBe('mié, 30 sept 2026 · 09:00–10:00 hs');
  expect(fechaHoraCita('2030-03-12T16:00:00', '2')).toBe('mar, 12 mar 2030 · 16:00–18:00 hs');
});

test('fechaHoraCita sin duración asume 1 hora y sin fecha muestra un guion', () => {
  expect(fechaHoraCita('2030-03-12T10:30:00', '')).toBe('mar, 12 mar 2030 · 10:30–11:30 hs');
  expect(fechaHoraCita(undefined, '1')).toBe('—');
});
