// El historial de un paciente: cómo se ordenan y se cuentan sus citas
import { hoyStr } from './agenda';

// Las citas del historial, separadas en lo que ya se hizo, lo que viene y lo que se canceló.
// Una cita cuenta como hecha cuando el sistema la da por COMPLETADA (su horario ya pasó y no se canceló).
export function partesDelHistorial(citas) {
  const porFecha = (a, b) => String(a.date_cita).localeCompare(String(b.date_cita));
  const con = (...estados) => citas.filter((c) => estados.includes(c.status_cita));
  return {
    realizados: con('COMPLETADA').sort((a, b) => porFecha(b, a)), // del más reciente al más antiguo
    proximos: con('PENDIENTE', 'CONFIRMADA').sort(porFecha), // el que viene primero, arriba
    cancelados: con('CANCELADA').sort((a, b) => porFecha(b, a)),
  };
}

// Años cumplidos a hoy, o null si no hay una fecha de nacimiento válida
export function edad(nacimiento, hoy = hoyStr()) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nacimiento || ''));
  if (!partes) return null;
  const [anio, mesDia] = [Number(partes[1]), `${partes[2]}-${partes[3]}`];
  const cumplidos = Number(hoy.slice(0, 4)) - anio - (hoy.slice(5, 10) < mesDia ? 1 : 0);
  return cumplidos >= 0 ? cumplidos : null;
}

// "25 años", "1 año", "menos de 1 año"
export function textoEdad(nacimiento, hoy) {
  const cumplidos = edad(nacimiento, hoy);
  if (cumplidos === null) return '';
  return cumplidos === 0 ? 'menos de 1 año' : `${cumplidos} ${cumplidos === 1 ? 'año' : 'años'}`;
}
