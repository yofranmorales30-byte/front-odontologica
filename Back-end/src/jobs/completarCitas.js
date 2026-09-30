const db = require('../db/db');
const { ahoraClinica } = require('../utils/agenda');
const { ocupa, fin } = require('../db/sqlAgenda');

const INTERVALO_MS = 60 * 1000;

// Marca COMPLETADA toda cita activa y no cancelada cuya hora de fin ya pasó
// (hora de la clínica). Devuelve cuántas cambió.
async function completarCitasPasadas() {
  const result = await db.query(
    `UPDATE citas SET status_cita = 'COMPLETADA'
     WHERE ${ocupa('citas')}
       AND COALESCE(UPPER(citas.status_cita), '') <> 'COMPLETADA'
       AND ${fin('citas')} <= CAST(strftime('%s', $1) AS INTEGER)`,
    [ahoraClinica()]
  );
  return result.changes;
}

// No hay un proceso siempre encendido que lo haga cada minuto (en Vercel la API
// duerme entre requests): se hace justo antes de mostrar citas, como mucho una
// vez por minuto por instancia. Las requests simultáneas esperan la misma corrida.
let ultimaVez = 0;
let enCurso = null;

function completarSiHaceFalta() {
  if (Date.now() - ultimaVez < INTERVALO_MS) return Promise.resolve();
  if (!enCurso) {
    enCurso = completarCitasPasadas()
      .then((n) => {
        ultimaVez = Date.now();
        if (n) console.log(`✔️  ${n} citas terminadas marcadas como COMPLETADA`);
      })
      // Si falla, la lista se muestra igual y se reintenta en la próxima request
      .catch((err) => console.error('⚠️  No se pudieron completar las citas pasadas:', err.message))
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

// Middleware para las rutas que muestran el estado de las citas
function citasAlDia(req, res, next) {
  completarSiHaceFalta().then(() => next());
}

module.exports = { completarCitasPasadas, citasAlDia };
