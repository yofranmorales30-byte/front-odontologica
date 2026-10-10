import { test, expect } from 'vitest';
import { partesDelHistorial, edad, textoEdad } from './historial';

const cita = (id_citas, date_cita, status_cita) => ({ id_citas, date_cita, status_cita });

test('separa lo que ya se hizo, lo que viene y lo cancelado', () => {
  const { realizados, proximos, cancelados } = partesDelHistorial([
    cita(1, '2026-11-04T16:00:00', 'CONFIRMADA'),
    cita(2, '2026-10-21T14:00:00', 'PENDIENTE'),
    cita(3, '2026-10-05T14:00:00', 'COMPLETADA'),
    cita(4, '2026-09-19T10:00:00', 'COMPLETADA'),
    cita(5, '2026-09-10T09:00:00', 'CANCELADA'),
  ]);

  expect(realizados.map((c) => c.id_citas)).toEqual([3, 4]);
  expect(proximos.map((c) => c.id_citas)).toEqual([2, 1]);
  expect(cancelados.map((c) => c.id_citas)).toEqual([5]);
});

test('lo hecho va del más reciente al más antiguo; lo que viene, con el más cercano primero', () => {
  const { realizados, proximos } = partesDelHistorial([
    cita(1, '2026-01-10T09:00:00', 'COMPLETADA'),
    cita(2, '2026-03-10T09:00:00', 'COMPLETADA'),
    cita(3, '2026-12-01T09:00:00', 'PENDIENTE'),
    cita(4, '2026-11-01T09:00:00', 'CONFIRMADA'),
  ]);

  expect(realizados.map((c) => c.id_citas)).toEqual([2, 1]);
  expect(proximos.map((c) => c.id_citas)).toEqual([4, 3]);
});

test('sin citas, las tres partes quedan vacías', () => {
  expect(partesDelHistorial([])).toEqual({ realizados: [], proximos: [], cancelados: [] });
});

test('la edad son los años cumplidos a hoy', () => {
  expect(edad('2001-02-07', '2026-10-10')).toBe(25);
  expect(edad('2001-10-10', '2026-10-10')).toBe(25); // hoy cumple
  expect(edad('2001-10-11', '2026-10-10')).toBe(24); // cumple mañana
  expect(edad('1990-03-12T00:00:00', '2026-10-10')).toBe(36);
});

test('sin una fecha de nacimiento válida no hay edad', () => {
  expect(edad(null)).toBeNull();
  expect(edad('')).toBeNull();
  expect(edad('no sé')).toBeNull();
  expect(edad('2030-01-01', '2026-10-10')).toBeNull(); // todavía no nació
  expect(textoEdad(null)).toBe('');
});

test('la edad se escribe en años', () => {
  expect(textoEdad('2001-02-07', '2026-10-10')).toBe('25 años');
  expect(textoEdad('2025-06-01', '2026-10-10')).toBe('1 año');
  expect(textoEdad('2026-06-01', '2026-10-10')).toBe('menos de 1 año');
});
