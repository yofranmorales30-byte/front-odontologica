import { describe, test, expect } from 'vitest';
import {
  fechaCita, toFechaCita, finCita, mostrarFechaHora, rangosOcupados, seSuperpone,
  horarioDelDia, ultimoInicio, errorHorario, BUSINESS_HOURS,
} from './agenda';

// Estos helpers tienen que dar lo mismo en cualquier zona horaria del navegador:
// date_cita es hora local de la clínica, sin zona.

test('fechaCita arma la fecha sin zona horaria', () => {
  expect(fechaCita('2030-03-12', '10:00')).toBe('2030-03-12T10:00:00');
});

test('la hora guardada es la que se ve (antes la "Z" falsa corría 4 horas en Caracas)', () => {
  const guardado = fechaCita('2030-03-12', '10:00');
  expect(new Date(guardado).getHours()).toBe(10);
  expect(toFechaCita(new Date(guardado))).toBe(guardado);
});

test('finCita suma la duración', () => {
  expect(finCita('2030-03-12T10:00:00', '2')).toBe('2030-03-12T12:00:00');
  expect(finCita('2030-03-12T10:00:00', '')).toBe('2030-03-12T11:00:00'); // sin duración: 1 h
});

test('mostrarFechaHora', () => {
  expect(mostrarFechaHora('2030-03-12T10:00:00')).toBe('2030-03-12, 10:00');
  expect(mostrarFechaHora(undefined)).toBe('—');
});

describe('rangos ocupados y superposición', () => {
  const disponibilidad = [
    { date_cita: '2030-03-12T10:00:00', time_cita: '2' },
    { date_cita: '2030-03-12T14:00:00', time_cita: '1' },
    { date_cita: '2030-03-13T10:00:00', time_cita: '1' },
  ];
  const rangos = rangosOcupados(disponibilidad, '2030-03-12');

  test('filtra por día y calcula el fin', () => {
    expect(rangos.map((r) => r.texto)).toEqual(['10:00–12:00', '14:00–15:00']);
  });

  test.each([
    ['10:00', '1', true],
    ['11:00', '1', true],   // dentro de 10–12
    ['09:00', '2', true],   // 09–11 pisa 10–11
    ['09:00', '1', false],  // termina justo a las 10
    ['12:00', '1', false],  // empieza cuando termina la otra
    ['13:00', '2', true],   // 13–15 pisa 14–15
  ])('%s por %s h → superpone: %s', (hora, dur, esperado) => {
    expect(seSuperpone(rangos, hora, dur)).toBe(esperado);
  });

  test('otro día sin citas está libre', () => {
    expect(seSuperpone(rangosOcupados(disponibilidad, '2030-03-14'), '10:00', '1')).toBe(false);
  });
});

describe('horario de atención (2030-04-22 lunes, 20 sábado, 21 domingo)', () => {
  test('horario por día', () => {
    expect(horarioDelDia('2030-04-22')).toEqual(['08:00', '18:00']);
    expect(horarioDelDia('2030-04-20')).toEqual(['08:00', '12:00']);
    expect(horarioDelDia('2030-04-21')).toBeNull();
  });

  test('último inicio según la duración', () => {
    expect(ultimoInicio('2030-04-22', '2')).toBe('16:00');
    expect(ultimoInicio('2030-04-20', '1')).toBe('11:00');
    expect(ultimoInicio('2030-04-20', '')).toBe('11:00');
  });

  test('errorHorario', () => {
    expect(errorHorario('2030-04-22', '17:00', '1')).toBeNull();
    expect(errorHorario('2030-04-22', '16:30', '2')).not.toBeNull();
    expect(errorHorario('2030-04-22', '07:59', '1')).not.toBeNull();
    expect(errorHorario('2030-04-20', '11:00', '1')).toBeNull();
    expect(errorHorario('2030-04-20', '10:30', '2')).toMatch(/10:00/); // sugiere el último inicio
    expect(errorHorario('2030-04-21', '10:00', '1')).toMatch(/domingo/i);
  });

  test('BUSINESS_HOURS para FullCalendar: lunes a sábado', () => {
    expect(BUSINESS_HOURS).toHaveLength(6);
    expect(BUSINESS_HOURS.some((b) => b.daysOfWeek.includes(0))).toBe(false);
  });
});
