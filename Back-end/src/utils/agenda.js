// Las citas se guardan en hora local de la clínica, SIN zona horaria: "YYYY-MM-DDTHH:mm:ss".
// La hora que elige el paciente es la que se guarda y la que ve el personal,
// sin importar la zona del navegador ni la del servidor.
//
// Que dos citas no se superpongan lo garantiza la base (trigger en db.js), no este archivo.

const ERROR_FECHA = 'Fecha de la cita inválida (formato esperado: YYYY-MM-DDTHH:mm)';
const ERROR_OCUPADO = 'Ese horario se superpone con otra cita. Elegí otro horario.';

// Horario de atención por día de la semana (0 = domingo, cerrado).
// Mantener igual que Front-end/odontologia-marcos-garcia/src/utils/agenda.js y la página de contacto.
const HORARIO_ATENCION = {
  1: ['08:00', '18:00'],
  2: ['08:00', '18:00'],
  3: ['08:00', '18:00'],
  4: ['08:00', '18:00'],
  5: ['08:00', '18:00'],
  6: ['08:00', '12:00'],
};

// Estados posibles de una cita. COMPLETADA la pone el servidor solo, al consultar citas (jobs/completarCitas.js)
// cuando termina una cita no cancelada; el personal también puede marcarla a mano.
const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'];
const ERROR_ESTADO = `Estado inválido. Valores posibles: ${ESTADOS.join(', ')}`;

// "Confirmada" → "CONFIRMADA"; null si no es un estado válido
function normalizeEstado(value) {
  const estado = String(value ?? '').trim().toUpperCase();
  return ESTADOS.includes(estado) ? estado : null;
}

// Zona horaria de la clínica: define qué hora es "ahora" para saber si una cita ya pasó.
// Las fechas guardadas no dependen de esto (no tienen zona).
let CLINIC_TZ = process.env.CLINIC_TZ || 'America/Caracas';
try {
  new Intl.DateTimeFormat('en', { timeZone: CLINIC_TZ });
} catch {
  console.warn(`⚠️  CLINIC_TZ "${CLINIC_TZ}" no es una zona horaria válida: se usa America/Caracas.`);
  CLINIC_TZ = 'America/Caracas';
}

// Hora actual en la clínica, en el mismo formato que date_cita
function ahoraClinica(date = new Date()) {
  // El locale sv-SE formatea como "2026-09-25 14:30:00"
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: CLINIC_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(date).replace(' ', 'T');
}

const FORMATO = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/;

// Devuelve la fecha en formato canónico, o null si no es válida.
// Acepta el formato viejo "…T10:00:00.000Z" (esa Z era falsa: la hora ya era local)
// y el del seed "2026-08-19 08:00:00".
function normalizeFechaCita(value) {
  const m = FORMATO.exec(String(value ?? '').trim());
  if (!m) return null;

  const [, fecha, hh, mm, ss = '00'] = m;
  if (+hh > 23 || +mm > 59 || +ss > 59) return null;

  const dia = new Date(`${fecha}T00:00:00Z`);
  if (isNaN(dia) || dia.toISOString().slice(0, 10) !== fecha) return null;

  return `${fecha}T${hh}:${mm}:${ss}`;
}

// time_cita guarda la duración en horas ("1", "2")
function duracionHoras(timeCita) {
  const horas = parseInt(timeCita, 10);
  return Number.isFinite(horas) && horas > 0 ? horas : 1;
}

const aMinutos = (hhmm) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

// null si la cita (fecha canónica) empieza y termina dentro del horario; si no, el motivo
function validarHorario(dateCita, timeCita) {
  const dia = new Date(`${dateCita.slice(0, 10)}T00:00:00Z`).getUTCDay();
  const horario = HORARIO_ATENCION[dia];
  if (!horario) {
    return 'Los domingos la clínica está cerrada.';
  }

  const inicio = aMinutos(dateCita.slice(11, 16));
  const fin = inicio + duracionHoras(timeCita) * 60;
  const [abre, cierra] = horario;
  if (inicio < aMinutos(abre) || fin > aMinutos(cierra)) {
    return `Ese día se atiende de ${abre} a ${cierra} y la cita tiene que terminar antes del cierre.`;
  }
  return null;
}

module.exports = {
  ERROR_FECHA,
  ERROR_OCUPADO,
  ERROR_ESTADO,
  normalizeFechaCita,
  normalizeEstado,
  validarHorario,
  ahoraClinica,
};
