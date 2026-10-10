import { xlsx } from './xlsx';
import { pdfTabla } from './pdf';
import { descargar, TIPO_EXCEL, TIPO_PDF } from './descargar';
import { diaMesAnio, generado, alcance } from './textos';
import { textoSexo } from '../utils/formato';
import { hoyStr } from '../utils/agenda';

// La lista de pacientes en Excel y en PDF. Se exporta lo que se le pasa: si en la pantalla hay
// una búsqueda, solo los pacientes encontrados.

const nombreArchivo = (extension) => `pacientes-armonia-${hoyStr()}.${extension}`;
const sexo = (p) => (p.genre_paciente ? textoSexo(p.genre_paciente) : '');
// "1990-03-12" (a veces con hora detrás), o '' si falta
const nacimiento = (p) => (/^\d{4}-\d{2}-\d{2}/.test(p.birth_paciente || '') ? p.birth_paciente.slice(0, 10) : '');

export function exportarPacientesExcel(pacientes) {
  const planilla = xlsx({
    hoja: 'Pacientes',
    columnas: [
      { titulo: 'Nombre', ancho: 36 },
      { titulo: 'Sexo', ancho: 13 },
      { titulo: 'Fecha de nacimiento', ancho: 22, tipo: 'fecha' },
      { titulo: 'Teléfono', ancho: 17 },
      { titulo: 'Dirección', ancho: 50 },
    ],
    filas: pacientes.map((p) => [p.name_paciente, sexo(p), nacimiento(p), p.telf_paciente, p.dir_paciente]),
  });
  descargar(nombreArchivo('xlsx'), planilla, TIPO_EXCEL);
}

// `busqueda` y `total`: para aclarar en el PDF que es una parte de la lista
export function exportarPacientesPdf(pacientes, filtro = {}) {
  const documento = pdfTabla({
    titulo: 'Listado de pacientes',
    detalle: `${alcance(pacientes.length, filtro, 'paciente', 'pacientes')} · ${generado()}`,
    pie: 'Datos personales de pacientes: uso interno de la clínica.',
    columnas: [
      { titulo: 'N°', ancho: 5, alinear: 'derecha' },
      { titulo: 'Nombre', ancho: 30 },
      { titulo: 'Sexo', ancho: 12 },
      { titulo: 'Nacimiento', ancho: 14 },
      { titulo: 'Teléfono', ancho: 16 },
      { titulo: 'Dirección', ancho: 27 },
    ],
    filas: pacientes.map((p, i) => [
      String(i + 1),
      p.name_paciente,
      sexo(p) || '—',
      nacimiento(p) ? diaMesAnio(nacimiento(p)) : '—',
      p.telf_paciente || '—',
      p.dir_paciente || '—',
    ]),
  });
  descargar(nombreArchivo('pdf'), documento, TIPO_PDF);
}
