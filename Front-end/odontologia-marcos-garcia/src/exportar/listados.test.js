import { test, expect, vi, beforeEach } from 'vitest';
import { exportarPacientesExcel, exportarPacientesPdf } from './pacientes';
import { exportarCitasExcel, exportarCitasPdf, exportarAgendaExcel, exportarAgendaPdf, turnoDeCita } from './citas';
import { leerZip, leerPdf } from './ayudaTests';

// En vez de bajar el archivo, se guarda lo que se iba a bajar
const mockDescargas = [];
vi.mock('./descargar', async (original) => ({
  ...(await original()),
  descargar: (nombre, bytes, tipo) => mockDescargas.push({ nombre, bytes, tipo }),
}));

beforeEach(() => { mockDescargas.length = 0; });

const HOY = /\d{4}-\d{2}-\d{2}/.source;
const planilla = () => leerZip(mockDescargas[0].bytes)['xl/worksheets/sheet1.xml'].texto;
const documento = () => leerPdf(mockDescargas[0].bytes);
const celda = (referencia, texto) => `<c r="${referencia}" s="0" t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`;

const PACIENTES = [
  { id_paciente: 1, name_paciente: 'José García Peña', genre_paciente: 'M', birth_paciente: '1990-03-12', telf_paciente: '04145550101', dir_paciente: 'Av. Bolívar, casa 4' },
  { id_paciente: 2, name_paciente: 'Valentina Moncada', genre_paciente: 'F', birth_paciente: null, telf_paciente: '', dir_paciente: null },
];

const CITAS = [
  { id_citas: 7, name_paciente: 'Valentina Moncada', date_cita: '2026-10-13T15:00:00', time_cita: '2', desc_cita: 'Control de ortodoncia', status_cita: 'CONFIRMADA', telf_paciente: '04265550102' },
  { id_citas: 5, name_paciente: 'José García Peña', date_cita: '2026-10-12T09:00:00', time_cita: '1', desc_cita: 'Limpieza dental', status_cita: 'PENDIENTE', telf_paciente: '04145550101' },
  { id_citas: 6, name_paciente: 'Ángel Niño', date_cita: '2026-10-12T11:00:00', time_cita: '1', desc_cita: null, status_cita: 'CANCELADA', telf_paciente: null },
];
const TURNOS = CITAS.map(turnoDeCita);

test('pacientes en Excel: una fila por paciente, con la fecha como fecha y el teléfono como texto', () => {
  exportarPacientesExcel(PACIENTES);

  expect(mockDescargas[0].nombre).toMatch(new RegExp(`^pacientes-armonia-${HOY}\\.xlsx$`));
  expect(mockDescargas[0].tipo).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const xml = planilla();
  expect(xml).toContain('Fecha de nacimiento</t>');
  expect(xml).toContain(`<row r="2">${celda('A2', 'José García Peña')}${celda('B2', 'Masculino')}<c r="C2" s="2"><v>32944</v></c>`
    + `${celda('D2', '04145550101')}${celda('E2', 'Av. Bolívar, casa 4')}</row>`);
  // Lo que falta queda vacío, sin guiones de relleno
  expect(xml).toContain(`<row r="3">${celda('A3', 'Valentina Moncada')}${celda('B3', 'Femenino')}</row>`);
});

test('pacientes en PDF: numerados, con la fecha en día/mes/año y un guion donde falta el dato', () => {
  exportarPacientesPdf(PACIENTES);

  expect(mockDescargas[0].nombre).toMatch(new RegExp(`^pacientes-armonia-${HOY}\\.pdf$`));
  expect(mockDescargas[0].tipo).toBe('application/pdf');
  const texto = documento();
  expect(texto).toContain('(Listado de pacientes) Tj');
  expect(texto).toMatch(/\(2 pacientes · Generado el \d\d\/\d\d\/\d{4} a las \d\d:\d\d\) Tj/);
  expect(texto).toContain('(José García Peña) Tj');
  expect(texto).toContain('(12/03/1990) Tj');
  expect(texto).toContain('(04145550101) Tj');
  expect(texto).toContain('(—) Tj');
  expect(texto).toContain('(Datos personales de pacientes: uso interno de la clínica.) Tj');
});

test('con una búsqueda, el PDF aclara que es una parte de la lista', () => {
  exportarPacientesPdf([PACIENTES[1]], { busqueda: ' moncada ', total: 74 });
  expect(documento()).toContain('(1 de 74 pacientes · Búsqueda: «moncada» · Generado el');
});

test('citas en Excel: fecha, desde, hasta, paciente, teléfono, motivo y estado', () => {
  exportarCitasExcel(TURNOS);

  expect(mockDescargas[0].nombre).toMatch(new RegExp(`^citas-armonia-${HOY}\\.xlsx$`));
  const xml = planilla();
  // 13/10/2026, de 15:00 a 17:00 (dura 2 horas)
  expect(xml).toContain(`<row r="2"><c r="A2" s="2"><v>46308</v></c>${celda('B2', '15:00')}${celda('C2', '17:00')}`
    + `${celda('D2', 'Valentina Moncada')}${celda('E2', '04265550102')}${celda('F2', 'Control de ortodoncia')}${celda('G2', 'Confirmada')}</row>`);
  expect(xml).toContain('<autoFilter ref="A1:G4"/>');
});

test('citas en PDF: en el orden de la tabla, con el horario completo', () => {
  exportarCitasPdf(TURNOS, { busqueda: '', total: 3 });

  const texto = documento();
  expect(texto).toContain('(Listado de citas) Tj');
  expect(texto).toContain('(3 citas · Generado el');
  expect(texto).toContain('(13/10/2026) Tj');
  expect(texto).toContain('(15:00–17:00) Tj');
  expect(texto).toContain('(Confirmada) Tj');
  expect(texto.indexOf('(Valentina Moncada) Tj')).toBeLessThan(texto.indexOf('(José García Peña) Tj'));
});

test('agenda en PDF: día por día y en orden de horario, con el período en el título', () => {
  exportarAgendaPdf(TURNOS, { titulo: '12 – 17 oct 2026', desde: '2026-10-12' });

  expect(mockDescargas[0].nombre).toBe('agenda-armonia-2026-10-12.pdf');
  const texto = documento();
  expect(texto).toContain('(Agenda · 12 – 17 oct 2026) Tj');
  expect(texto).toContain('(3 turnos · Generado el');
  const orden = ['(Lunes 12 de octubre de 2026) Tj', '(09:00–10:00) Tj', '(11:00–12:00) Tj', '(Martes 13 de octubre de 2026) Tj', '(15:00–17:00) Tj']
    .map((parte) => texto.indexOf(parte));
  expect(orden.every((posicion) => posicion > 0)).toBe(true);
  expect([...orden].sort((a, b) => a - b)).toEqual(orden);
});

test('agenda en Excel: los turnos del período, en orden', () => {
  exportarAgendaExcel(TURNOS, { titulo: '12 – 17 oct 2026', desde: '2026-10-12' });

  expect(mockDescargas[0].nombre).toBe('agenda-armonia-2026-10-12.xlsx');
  const libro = leerZip(mockDescargas[0].bytes);
  expect(libro['xl/workbook.xml'].texto).toContain('<sheet name="Agenda"');
  const xml = libro['xl/worksheets/sheet1.xml'].texto;
  expect(xml.indexOf('José García Peña')).toBeLessThan(xml.indexOf('Ángel Niño'));
  expect(xml.indexOf('Ángel Niño')).toBeLessThan(xml.indexOf('Valentina Moncada'));
  expect(xml).toContain(celda('G3', 'Cancelada'));
});
