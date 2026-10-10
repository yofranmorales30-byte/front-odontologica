import { xlsx } from './xlsx';
import { pdfTabla } from './pdf';
import { descargar, TIPO_EXCEL, TIPO_PDF } from './descargar';
import { diaMesAnio, generado, alcance, cuantos, capitalizar } from './textos';
import { finCita, hoyStr } from '../utils/agenda';

// Las citas en Excel y en PDF, de dos maneras:
// - la lista de citas, tal como está en la tabla (con una búsqueda, solo las encontradas);
// - la agenda del período que muestra el calendario, día por día.
// Las dos reciben "turnos": { inicio, fin, paciente, telefono, motivo, estado }, con inicio y fin
// en la hora local de la clínica ("2026-10-12T09:00:00").

const PIE = 'Datos personales de pacientes: uso interno de la clínica.';

// Una cita como la devuelve la API → turno
export const turnoDeCita = (cita) => ({
  inicio: cita.date_cita,
  fin: finCita(cita.date_cita, cita.time_cita),
  paciente: cita.name_paciente,
  telefono: cita.telf_paciente,
  motivo: cita.desc_cita,
  estado: cita.status_cita,
});

const dia = (turno) => String(turno.inicio || '').slice(0, 10); // 2026-10-12
const hora = (fechaHora) => String(fechaHora || '').slice(11, 16); // 09:00
const horario = (turno) => `${hora(turno.inicio)}–${hora(turno.fin)}`;

// "Lunes 12 de octubre de 2026"
function diaLargo(fecha) {
  const texto = new Date(`${fecha}T00:00:00`)
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '');
  return texto[0].toUpperCase() + texto.slice(1);
}

function planilla(hoja, turnos) {
  return xlsx({
    hoja,
    columnas: [
      { titulo: 'Fecha', ancho: 14, tipo: 'fecha' },
      { titulo: 'Desde', ancho: 10 },
      { titulo: 'Hasta', ancho: 10 },
      { titulo: 'Paciente', ancho: 34 },
      { titulo: 'Teléfono', ancho: 17 },
      { titulo: 'Motivo', ancho: 44 },
      { titulo: 'Estado', ancho: 15 },
    ],
    filas: turnos.map((t) => [dia(t), hora(t.inicio), hora(t.fin), t.paciente, t.telefono, t.motivo, capitalizar(t.estado)]),
  });
}

// ─── Lista de citas ───

export function exportarCitasExcel(turnos) {
  descargar(`citas-armonia-${hoyStr()}.xlsx`, planilla('Citas', turnos), TIPO_EXCEL);
}

// `filtro`: { busqueda, total }, para aclarar en el PDF que es una parte de la lista
export function exportarCitasPdf(turnos, filtro = {}) {
  const documento = pdfTabla({
    titulo: 'Listado de citas',
    detalle: `${alcance(turnos.length, filtro, 'cita', 'citas')} · ${generado()}`,
    pie: PIE,
    columnas: [
      { titulo: 'Fecha', ancho: 13 },
      { titulo: 'Horario', ancho: 14 },
      { titulo: 'Paciente', ancho: 24 },
      { titulo: 'Teléfono', ancho: 15 },
      { titulo: 'Motivo', ancho: 21 },
      { titulo: 'Estado', ancho: 13 },
    ],
    filas: turnos.map((t) => [
      dia(t) ? diaMesAnio(dia(t)) : '—', horario(t), t.paciente, t.telefono || '—', t.motivo || '—', capitalizar(t.estado),
    ]),
  });
  descargar(`citas-armonia-${hoyStr()}.pdf`, documento, TIPO_PDF);
}

// ─── Agenda del calendario ───
// `periodo`: { titulo: '5 – 10 oct 2026' (como lo muestra el calendario), desde: '2026-10-05' }

const enOrden = (turnos) => [...turnos].sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));

export function exportarAgendaExcel(turnos, periodo) {
  descargar(`agenda-armonia-${periodo.desde}.xlsx`, planilla('Agenda', enOrden(turnos)), TIPO_EXCEL);
}

export function exportarAgendaPdf(turnos, periodo) {
  // Día por día: un título por cada día que tiene turnos
  const filas = [];
  let diaAnterior = null;
  for (const t of enOrden(turnos)) {
    if (dia(t) !== diaAnterior) {
      diaAnterior = dia(t);
      filas.push({ grupo: diaLargo(diaAnterior) });
    }
    filas.push([horario(t), t.paciente, t.telefono || '—', t.motivo || '—', capitalizar(t.estado)]);
  }

  const documento = pdfTabla({
    titulo: `Agenda · ${periodo.titulo}`,
    detalle: `${cuantos(turnos.length, 'turno', 'turnos')} · ${generado()}`,
    pie: PIE,
    vacio: 'No hay turnos en este período.',
    columnas: [
      { titulo: 'Horario', ancho: 14 },
      { titulo: 'Paciente', ancho: 28 },
      { titulo: 'Teléfono', ancho: 16 },
      { titulo: 'Motivo', ancho: 29 },
      { titulo: 'Estado', ancho: 13 },
    ],
    filas,
  });
  descargar(`agenda-armonia-${periodo.desde}.pdf`, documento, TIPO_PDF);
}
