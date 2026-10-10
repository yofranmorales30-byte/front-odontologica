// Textos que comparten los listados que se exportan
import { hoyStr, horaActualStr } from '../utils/agenda';

// "2026-10-12" → "12/10/2026"
export const diaMesAnio = (fecha) => fecha.split('-').reverse().join('/');

// Cuándo se generó el archivo, para el encabezado de los PDF
export const generado = () => `Generado el ${diaMesAnio(hoyStr())} a las ${horaActualStr()}`;

// "1 paciente", "3 pacientes"
export const cuantos = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Qué parte de la lista lleva el archivo: toda, o lo que encontró la búsqueda que había en pantalla
export function alcance(cantidad, { busqueda = '', total = cantidad } = {}, uno, varios) {
  const buscado = busqueda.trim();
  return buscado ? `${cantidad} de ${cuantos(total, uno, varios)} · Búsqueda: «${buscado}»` : cuantos(cantidad, uno, varios);
}

// "PENDIENTE" → "Pendiente"
export const capitalizar = (texto) => (texto ? texto[0].toUpperCase() + texto.slice(1).toLowerCase() : '');
