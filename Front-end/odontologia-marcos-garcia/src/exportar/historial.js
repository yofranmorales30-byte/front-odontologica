import { xlsx } from './xlsx';
import { pdfTabla } from './pdf';
import { descargar, TIPO_EXCEL, TIPO_PDF } from './descargar';
import { diaMesAnio, generado, cuantos, capitalizar } from './textos';
import { finCita, hoyStr } from '../utils/agenda';
import { textoSexo } from '../utils/formato';
import { normalizar } from '../utils/buscar';
import { partesDelHistorial, textoEdad } from '../utils/historial';

// El historial de un paciente en Excel y en PDF: su ficha y sus citas (hechas, por venir y canceladas).
// Recibe lo que devuelve la API: { paciente, citas }.

const dia = (cita) => String(cita.date_cita || '').slice(0, 10);
const hora = (fechaHora) => String(fechaHora || '').slice(11, 16);
const hasta = (cita) => hora(finCita(cita.date_cita, cita.time_cita));

// "José García Peña" → "jose-garcia-pena", para el nombre del archivo
const paraArchivo = (nombre) => normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'paciente';
const nombreArchivo = (paciente, extension) => `historial-${paraArchivo(paciente.name_paciente)}-${hoyStr()}.${extension}`;

export function exportarHistorialExcel({ paciente, citas }) {
  const { realizados, proximos, cancelados } = partesDelHistorial(citas);
  const planilla = xlsx({
    hoja: 'Historial',
    columnas: [
      { titulo: 'Paciente', ancho: 32 },
      { titulo: 'Fecha', ancho: 14, tipo: 'fecha' },
      { titulo: 'Desde', ancho: 10 },
      { titulo: 'Hasta', ancho: 10 },
      { titulo: 'Procedimiento', ancho: 46 },
      { titulo: 'Doctor', ancho: 24 },
      { titulo: 'Estado', ancho: 15 },
    ],
    filas: [...proximos, ...realizados, ...cancelados].map((c) => [
      paciente.name_paciente, dia(c), hora(c.date_cita), hasta(c), c.desc_cita, c.name_doctor, capitalizar(c.status_cita),
    ]),
  });
  descargar(nombreArchivo(paciente, 'xlsx'), planilla, TIPO_EXCEL);
}

export function exportarHistorialPdf({ paciente, citas }) {
  const { realizados, proximos, cancelados } = partesDelHistorial(citas);
  const nacimiento = /^\d{4}-\d{2}-\d{2}/.test(paciente.birth_paciente || '') ? paciente.birth_paciente.slice(0, 10) : '';

  // La ficha, arriba: solo los datos que hay
  const ficha = [
    [
      paciente.genre_paciente && textoSexo(paciente.genre_paciente),
      nacimiento && `${textoEdad(nacimiento)} (nació el ${diaMesAnio(nacimiento)})`,
    ],
    [paciente.telf_paciente && `Tel. ${paciente.telf_paciente}`, paciente.email_user, paciente.dir_paciente],
  ].map((renglon) => renglon.filter(Boolean).join(' · '));

  const seccion = (titulo, lista) => (lista.length === 0 ? [] : [
    { grupo: `${titulo} (${lista.length})` },
    ...lista.map((c) => [
      dia(c) ? diaMesAnio(dia(c)) : '—', `${hora(c.date_cita)}–${hasta(c)}`, c.desc_cita || '—', c.name_doctor || '—', capitalizar(c.status_cita),
    ]),
  ]);

  const documento = pdfTabla({
    titulo: `Historial de ${paciente.name_paciente}`,
    detalle: [...ficha, `${cuantos(realizados.length, 'procedimiento realizado', 'procedimientos realizados')} · ${generado()}`],
    pie: 'Historial de un paciente: uso interno de la clínica.',
    vacio: 'Este paciente todavía no tiene citas.',
    columnas: [
      { titulo: 'Fecha', ancho: 13 },
      { titulo: 'Horario', ancho: 14 },
      { titulo: 'Procedimiento', ancho: 38 },
      { titulo: 'Doctor', ancho: 22 },
      { titulo: 'Estado', ancho: 13 },
    ],
    filas: [
      ...seccion('Procedimientos realizados', realizados),
      ...seccion('Próximos turnos', proximos),
      ...seccion('Turnos cancelados', cancelados),
    ],
  });
  descargar(nombreArchivo(paciente, 'pdf'), documento, TIPO_PDF);
}
