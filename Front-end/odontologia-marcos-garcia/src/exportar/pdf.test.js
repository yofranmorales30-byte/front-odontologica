import { test, expect } from 'vitest';
import { pdfTabla, codificar, anchoDe, renglones } from './pdf';
import { leerPdf } from './ayudaTests';

const COLUMNAS = [
  { titulo: 'N°', ancho: 5, alinear: 'derecha' },
  { titulo: 'Nombre', ancho: 40 },
  { titulo: 'Dirección', ancho: 55 },
];
const filas = (n) => Array.from({ length: n }, (_, i) => [String(i + 1), `Paciente ${i + 1}`, 'San Juan de Colón']);
const pdf = (opciones) => leerPdf(pdfTabla({ titulo: 'Listado de pacientes', columnas: COLUMNAS, filas: filas(3), ...opciones }));
const veces = (texto, parte) => texto.split(parte).length - 1;

test('es un PDF bien armado: cada objeto está donde dice la tabla del final', () => {
  const texto = pdf();
  expect(texto.startsWith('%PDF-1.4\n')).toBe(true);
  expect(texto.endsWith('%%EOF\n')).toBe(true);

  const tabla = Number(/startxref\n(\d+)\n%%EOF/.exec(texto)[1]);
  expect(texto.slice(tabla, tabla + 5)).toBe('xref\n');
  const posiciones = [...texto.slice(tabla).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  expect(posiciones.length).toBeGreaterThanOrEqual(7); // catálogo, hojas, 2 fuentes, contenido, hoja y datos
  posiciones.forEach((posicion, i) => expect(texto.slice(posicion).startsWith(`${i + 1} 0 obj\n`)).toBe(true));
  expect(texto).toContain(`/Size ${posiciones.length + 1} /Root 1 0 R /Info ${posiciones.length} 0 R`);
});

test('el largo declarado de cada hoja es el real', () => {
  const texto = pdf({ filas: filas(120) });
  const contenidos = [...texto.matchAll(/<< \/Length (\d+) >>\nstream\n/g)];

  expect(contenidos.length).toBeGreaterThan(1);
  for (const contenido of contenidos) {
    const fin = contenido.index + contenido[0].length + Number(contenido[1]);
    expect(texto.slice(fin, fin + 10)).toBe('\nendstream');
  }
});

test('lleva la marca, el título, el detalle, el pie y las filas', () => {
  const texto = pdf({ detalle: '3 pacientes · Generado el 10/10/2026', pie: 'Uso interno de la clínica.' });

  expect(texto).toContain('(Armonía) Tj');
  expect(texto).toContain('(Listado de pacientes) Tj');
  expect(texto).toContain('(3 pacientes · Generado el 10/10/2026) Tj');
  expect(texto).toContain('(Uso interno de la clínica.) Tj');
  expect(texto).toContain('(Paciente 2) Tj');
  expect(texto).toContain('(San Juan de Colón) Tj');
  expect(texto).toContain('(Página 1 de 1) Tj');
});

test('una lista larga sigue en más hojas, con el encabezado repetido y las páginas numeradas', () => {
  const texto = pdf({ filas: filas(120) });
  const hojas = Number(/\/Count (\d+)/.exec(texto)[1]);

  expect(hojas).toBeGreaterThan(1);
  expect(veces(texto, '/Type /Page /Parent')).toBe(hojas);
  expect(veces(texto, '(Nombre) Tj')).toBe(hojas);
  expect(veces(texto, '(Armonía) Tj')).toBe(1); // el título, solo en la primera
  expect(texto).toContain(`(Página ${hojas} de ${hojas}) Tj`);
  expect(texto).toContain('(Paciente 120) Tj');
});

test('el título del documento admite cualquier carácter (va en UTF-16)', () => {
  // "Añ–" → FEFF (marca de orden) + 0041 00F1 2013
  expect(pdf({ titulo: 'Añ–' })).toContain('/Title <FEFF004100F12013> /Producer <FEFF00410072006D006F006E00ED0061>');
});

test('los paréntesis y las barras de un texto no rompen el PDF', () => {
  expect(pdf({ filas: [['1', 'Ana (hija) \\ Luis', '']] })).toContain('(Ana \\(hija\\) \\\\ Luis) Tj');
});

test('escribe los acentos del español; lo que la tipografía no tiene pasa a su letra sin acento o a "?"', () => {
  expect(codificar('Peña Ángel ¿sí?')).toBe('Peña Ángel ¿sí?');
  expect(codificar('Dvořák')).toBe('Dvorák');
  expect(codificar('a\tb\nc')).toBe('a b c');
  expect(codificar('日本')).toBe('??');
  expect(codificar('uno… — dos').split('').every((c) => c.charCodeAt(0) <= 0xff)).toBe(true);
  expect(codificar(null)).toBe('');
});

test('mide los textos con los anchos de Helvetica', () => {
  expect(anchoDe('0000000000', 10)).toBeCloseTo(55.6); // cada número mide 556 milésimas
  expect(anchoDe(codificar('ñ'), 10)).toBe(anchoDe('n', 10)); // una letra con acento mide lo mismo
  expect(anchoDe('iii', 9)).toBeLessThan(anchoDe('WWW', 9));
});

test('un texto largo se parte en renglones, y si no entra termina en puntos suspensivos', () => {
  const direccion = codificar('Calle 5 entre carreras 8 y 9, casa número 12-34, barrio El Carmen, San Juan de Colón, Táchira');
  const lineas = renglones(direccion, 120, 9, 3);

  expect(lineas).toHaveLength(3);
  for (const linea of lineas) expect(anchoDe(linea, 9)).toBeLessThanOrEqual(120);
  expect(lineas[0]).toBe('Calle 5 entre carreras 8 y 9,');
  expect(lineas[2].endsWith(codificar('…'))).toBe(true);

  expect(renglones(codificar('San Juan de Colón'), 120, 9, 3)).toEqual(['San Juan de Colón']);
  expect(renglones('', 120)).toEqual([]);
});

test('una palabra más ancha que la columna se corta en vez de salirse', () => {
  const lineas = renglones('Supercalifragilisticoespialidoso', 60, 9, 3);

  expect(lineas.length).toBeGreaterThan(1);
  for (const linea of lineas) expect(anchoDe(linea, 9)).toBeLessThanOrEqual(60);
});

test('sin filas igual sale un PDF válido, avisando que no hay nada', () => {
  const texto = pdf({ filas: [] });
  expect(texto).toContain('(No hay filas para mostrar.) Tj');
  expect(texto).toContain('/Count 1');
});
