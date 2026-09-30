// Fragmentos SQL de la agenda, compartidos por los triggers (db.js) y el
// completado de citas terminadas (jobs/completarCitas.js). `t` es el alias de la tabla citas.

// Misma regla que /disponibilidad: activa y no cancelada
const ocupa = (t) => `(COALESCE(${t}.logic_cita, '') = 'A' AND COALESCE(UPPER(${t}.status_cita), '') <> 'CANCELADA')`;

// Inicio y fin en segundos. date_cita no tiene zona; strftime la toma como UTC,
// lo que da igual porque todas las fechas se comparan en la misma escala.
// Duración igual que utils/agenda.js: horas enteras, mínimo 1.
const inicio = (t) => `CAST(strftime('%s', ${t}.date_cita) AS INTEGER)`;
const fin = (t) => `(${inicio(t)} + MAX(COALESCE(CAST(${t}.time_cita AS INTEGER), 0), 1) * 3600)`;
const seSuperponen = (a, b) => `(${inicio(a)} < ${fin(b)} AND ${inicio(b)} < ${fin(a)})`;

module.exports = { ocupa, inicio, fin, seSuperponen };
