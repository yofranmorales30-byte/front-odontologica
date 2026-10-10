import { test, expect } from 'vitest';
import { crc32, zip } from './zip';
import { leerZip } from './ayudaTests';

test('la suma de control es la CRC-32 estándar', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  expect(crc32(new Uint8Array(0))).toBe(0);
});

test('guarda cada archivo con su nombre, su contenido y su suma de control', () => {
  const bytes = zip([
    { nombre: '[Content_Types].xml', contenido: '<Types/>' },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: '<c>José Peña · 04145550101</c>' },
  ]);

  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]); // "PK": empieza como un zip
  const archivos = leerZip(bytes);
  expect(Object.keys(archivos)).toEqual(['[Content_Types].xml', 'xl/worksheets/sheet1.xml']);
  expect(archivos['xl/worksheets/sheet1.xml'].texto).toBe('<c>José Peña · 04145550101</c>');
  for (const archivo of Object.values(archivos)) expect(archivo.crc).toBe(crc32(archivo.datos));
});

test('la fecha de los archivos es la que se le pasa', () => {
  const bytes = zip([{ nombre: 'a.txt', contenido: 'a' }], new Date(2026, 9, 10, 14, 32, 8));
  const vista = new DataView(bytes.buffer);
  expect(vista.getUint16(12, true)).toBe(((2026 - 1980) << 9) | (10 << 5) | 10);
  expect(vista.getUint16(10, true)).toBe((14 << 11) | (32 << 5) | 4);
});
