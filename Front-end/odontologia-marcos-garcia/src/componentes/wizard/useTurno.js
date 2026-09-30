import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api';
import { hoyStr, horaActualStr, rangosOcupados, seSuperpone, horarioDelDia, errorHorario } from '../../utils/agenda';

export const ERROR_OCUPADO = 'Ese horario se superpone con otra cita. Elegí otro horario.';
export const ERROR_HORA_PASADA = 'No podés seleccionar una hora que ya pasó.';

// Horarios ocupados de la clínica (/disponibilidad: sin datos de pacientes)
export function useDisponibilidad() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await apiFetch('/disponibilidad');
        if (res.ok) {
          const data = await res.json();
          setCitas(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error al cargar la disponibilidad:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return { citas, cargando };
}

// Validaciones del paso "turno" a partir de fecha (date_cita_1), hora (date_cita_2) y duración.
// El servidor vuelve a validar todo; esto es para avisar antes de enviar.
export function useTurno(form, citas) {
  const { date_cita_1: fecha, date_cita_2: hora, time_cita: duracion } = form;

  const bookedRanges = useMemo(() => (fecha ? rangosOcupados(citas, fecha) : []), [fecha, citas]);

  const horarioDia = fecha ? horarioDelDia(fecha) : null;
  const isDateClosed = !!fecha && !horarioDia;
  const isDatePast = !!fecha && fecha < hoyStr();
  const isDateValid = !!fecha && !isDatePast && !isDateClosed;

  // Considera la duración elegida: 10:00 (2 h) choca con una cita de 11:00
  const isTimeBooked = !!hora && seSuperpone(bookedRanges, hora, duracion);
  const isTimePast = fecha === hoyStr() && !!hora && hora <= horaActualStr();
  const scheduleError = horarioDia && hora ? errorHorario(fecha, hora, duracion) : null;

  const timeError = scheduleError || (isTimeBooked ? ERROR_OCUPADO : isTimePast ? ERROR_HORA_PASADA : null);

  return { bookedRanges, horarioDia, isDateClosed, isDatePast, isDateValid, isTimeBooked, timeError };
}
