import { test, expect } from 'vitest';
import { filtrar, normalizar } from './buscar';

const PACIENTES = [
  { nombre: 'José García Peña', sexo: 'Masculino', telefono: '04145550101' },
  { nombre: 'Valentina Moncada', sexo: 'Femenino', telefono: '04265550102' },
  { nombre: 'Ángel Niño', sexo: 'Masculino', telefono: null },
];
const campos = (p) => [p.nombre, p.telefono];
const categorias = (p) => [p.sexo];
const buscar = (texto) => filtrar(PACIENTES, texto, campos, categorias).map((p) => p.nombre);

test('no distingue mayúsculas ni acentos, de ninguno de los dos lados', () => {
  expect(normalizar('  ÁNGEL Niño ')).toBe('angel nino');
  expect(buscar('garcia')).toEqual(['José García Peña']);
  expect(buscar('GARCÍA')).toEqual(['José García Peña']);
  expect(buscar('nino')).toEqual(['Ángel Niño']);
  expect(buscar('peña')).toEqual(['José García Peña']);
});

test('sin nada escrito (o solo espacios) devuelve todas las filas', () => {
  expect(filtrar(PACIENTES, '', campos)).toBe(PACIENTES);
  expect(buscar('   ')).toHaveLength(3);
});

test('con varias palabras tienen que estar todas, en cualquier orden y en cualquier columna', () => {
  expect(buscar('peña jose')).toEqual(['José García Peña']);
  expect(buscar('masculino angel')).toEqual(['Ángel Niño']);
  expect(buscar('jose moncada')).toEqual([]);
});

test('en los textos alcanza con un pedazo de la palabra', () => {
  expect(buscar('valen')).toEqual(['Valentina Moncada']);
  expect(buscar('cada')).toEqual(['Valentina Moncada']);
});

test('el sexo o el estado se encuentran por su comienzo, no por un pedazo del medio', () => {
  expect(buscar('femenino')).toEqual(['Valentina Moncada']);
  expect(buscar('masc')).toEqual(['José García Peña', 'Ángel Niño']);
  // "nino" está dentro de "Femenino": buscar ese apellido no trae a todas las pacientes
  expect(buscar('niño')).toEqual(['Ángel Niño']);
  expect(buscar('lino')).toEqual([]);
  // Con una o dos letras no alcanza: "ma" no trae a todos los de sexo masculino
  expect(buscar('ma')).toEqual([]);
});

test('un teléfono se encuentra aunque se escriba con guiones, puntos o paréntesis', () => {
  expect(buscar('0426')).toEqual(['Valentina Moncada']);
  expect(buscar('0414-555-0101')).toEqual(['José García Peña']);
  expect(buscar('(0414) 555.0101')).toEqual(['José García Peña']);
});

test('una fecha se encuentra tal como está escrita (los guiones no se le quitan)', () => {
  const citas = [{ fecha: '2026-10-12' }, { fecha: '2026-10-13' }];
  expect(filtrar(citas, '2026-10-12', (c) => [c.fecha])).toEqual([citas[0]]);
});

test('una fila con datos vacíos no rompe la búsqueda', () => {
  expect(filtrar([{ nombre: null }, { nombre: undefined }], 'x', (f) => [f.nombre], (f) => [f.nombre])).toEqual([]);
});
