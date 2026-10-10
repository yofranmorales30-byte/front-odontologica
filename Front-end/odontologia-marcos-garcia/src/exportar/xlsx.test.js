import { test, expect } from 'vitest';
import { xlsx } from './xlsx';
import { leerZip } from './ayudaTests';

const COLUMNAS = [
  { titulo: 'Nombre', ancho: 30 },
  { titulo: 'Nacimiento', ancho: 20, tipo: 'fecha' },
  { titulo: 'Teléfono', ancho: 16 },
];

const planilla = (filas, columnas = COLUMNAS) => leerZip(xlsx({ hoja: 'Pacientes', columnas, filas }));
const hoja = (filas, columnas) => planilla(filas, columnas)['xl/worksheets/sheet1.xml'].texto;

test('trae las partes que Excel espera, todas con XML bien formado', () => {
  const archivos = planilla([['Ana', '1990-03-12', '0414']]);

  expect(Object.keys(archivos)).toEqual([
    '[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml',
  ]);
  for (const [nombre, { texto }] of Object.entries(archivos)) {
    const xml = new DOMParser().parseFromString(texto, 'application/xml');
    expect(xml.querySelector('parsererror'), nombre).toBeNull();
  }
  expect(archivos['xl/workbook.xml'].texto).toContain('<sheet name="Pacientes" sheetId="1" r:id="rId1"/>');
});

test('el encabezado va con su estilo, fijo arriba y con filtros', () => {
  const xml = hoja([['Ana', '', ''], ['Luis', '', '']]);

  expect(xml).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Nombre</t></is></c>');
  expect(xml).toContain('<c r="C1" s="1" t="inlineStr"><is><t xml:space="preserve">Teléfono</t></is></c>');
  expect(xml).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
  expect(xml).toContain('<dimension ref="A1:C3"/>');
  expect(xml).toContain('<autoFilter ref="A1:C3"/>');
  expect(xml).toContain('<col min="1" max="1" width="30" customWidth="1"/>');
});

test('un teléfono va como texto: no pierde el 0 de adelante', () => {
  expect(hoja([['Ana', '', '04145550101']]))
    .toContain('<c r="C2" s="0" t="inlineStr"><is><t xml:space="preserve">04145550101</t></is></c>');
});

test('una fecha va como fecha de Excel; si no es una fecha de verdad, como texto', () => {
  expect(hoja([['Ana', '1990-03-12', '']])).toContain('<c r="B2" s="2"><v>32944</v></c>');
  expect(hoja([['Ana', '1990-03-12T00:00:00', '']])).toContain('<c r="B2" s="2"><v>32944</v></c>');
  expect(hoja([['Ana', '1990-02-31', '']])).toContain('<t xml:space="preserve">1990-02-31</t>');
  expect(hoja([['Ana', 'no sé', '']])).toContain('<t xml:space="preserve">no sé</t>');
});

test('una celda sin dato queda vacía', () => {
  const xml = hoja([['Ana', '', null], [undefined, '', '0414']]);

  expect(xml).toContain('<row r="2"><c r="A2" s="0" t="inlineStr"><is><t xml:space="preserve">Ana</t></is></c></row>');
  expect(xml).toContain('<row r="3"><c r="C3" s="0" t="inlineStr"><is><t xml:space="preserve">0414</t></is></c></row>');
});

test('los símbolos de XML se escapan y lo que XML no admite se quita', () => {
  const xml = hoja([[`Pérez & Hijos <"S.A.">${String.fromCharCode(1)}`, '', '']]);

  expect(xml).toContain('Pérez &amp; Hijos &lt;&quot;S.A.&quot;&gt;</t>');
  expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
});

test('las columnas después de la Z siguen con AA, AB…', () => {
  const columnas = Array.from({ length: 28 }, (_, i) => ({ titulo: `C${i}`, ancho: 10 }));
  const xml = hoja([Array.from({ length: 28 }, (_, i) => `v${i}`)], columnas);

  expect(xml).toContain('<c r="Z2" s="0" t="inlineStr"><is><t xml:space="preserve">v25</t></is></c>');
  expect(xml).toContain('<c r="AB2" s="0" t="inlineStr"><is><t xml:space="preserve">v27</t></is></c>');
  expect(xml).toContain('<autoFilter ref="A1:AB2"/>');
});
