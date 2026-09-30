// Las citas se guardan en hora local de la clínica, SIN zona horaria: "YYYY-MM-DDTHH:mm:ss".
// new Date() interpreta ese formato como hora local, así que getHours() devuelve
// la misma hora que eligió el paciente. Nunca agregar "Z" ni usar toISOString() acá.

const pad = (n) => String(n).padStart(2, '0');

// Horario de atención por día de la semana (0 = domingo, cerrado).
// Mantener igual que Back-end/src/utils/agenda.js (el servidor lo vuelve a validar) y Contact.js.
export const HORARIO_ATENCION = {
    1: ['08:00', '18:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '18:00'],
    4: ['08:00', '18:00'],
    5: ['08:00', '18:00'],
    6: ['08:00', '12:00'],
};

// Para el prop businessHours de FullCalendar
export const BUSINESS_HOURS = Object.entries(HORARIO_ATENCION).map(([dia, [startTime, endTime]]) => ({
    daysOfWeek: [Number(dia)],
    startTime,
    endTime,
}));

// ['08:00', '18:00'] para "YYYY-MM-DD", o null si ese día está cerrado
export function horarioDelDia(fecha) {
    return HORARIO_ATENCION[new Date(`${fecha}T00:00:00`).getDay()] || null;
}

// "YYYY-MM-DD" de hoy, en hora local
export function hoyStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "HH:mm" actual, en hora local
export function horaActualStr() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Fecha ("YYYY-MM-DD") + hora ("HH:mm") del formulario → valor de date_cita
export function fechaCita(fecha, hora) {
    return `${fecha}T${hora}:00`;
}

// Date (hora local) → valor de date_cita
export function toFechaCita(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// time_cita guarda la duración en horas ("1", "2")
export function duracionHoras(timeCita) {
    const horas = parseInt(timeCita, 10);
    return Number.isFinite(horas) && horas > 0 ? horas : 1;
}

// date_cita de fin, sumando la duración
export function finCita(dateCita, timeCita) {
    const fin = new Date(dateCita);
    fin.setHours(fin.getHours() + duracionHoras(timeCita));
    return toFechaCita(fin);
}

// "2030-03-12T10:00:00" → "2030-03-12, 10:00"
export function mostrarFechaHora(dateCita) {
    return dateCita ? `${dateCita.slice(0, 10)}, ${dateCita.slice(11, 16)}` : '—';
}

const aMinutos = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};
const aHora = (minutos) => `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;

// Rangos ocupados de un día, a partir de la respuesta de /disponibilidad
export function rangosOcupados(citas, fecha) {
    return citas
        .filter(c => typeof c.date_cita === 'string' && c.date_cita.slice(0, 10) === fecha)
        .map(c => {
            const desde = aMinutos(c.date_cita.slice(11, 16));
            const hasta = desde + duracionHoras(c.time_cita) * 60;
            return { desde, hasta, texto: `${aHora(desde)}–${aHora(hasta)}` };
        })
        .sort((a, b) => a.desde - b.desde);
}

// ¿Una cita que empieza a `hora` y dura `timeCita` horas choca con alguno de los rangos?
export function seSuperpone(rangos, hora, timeCita) {
    const inicio = aMinutos(hora);
    const fin = inicio + duracionHoras(timeCita) * 60;
    return rangos.some(r => inicio < r.hasta && r.desde < fin);
}

// Última hora de inicio posible ese día para la duración elegida ("HH:mm"), o null si está cerrado
export function ultimoInicio(fecha, timeCita) {
    const horario = horarioDelDia(fecha);
    return horario ? aHora(aMinutos(horario[1]) - duracionHoras(timeCita) * 60) : null;
}

// null si la cita empieza y termina dentro del horario de atención; si no, el motivo
export function errorHorario(fecha, hora, timeCita) {
    const horario = horarioDelDia(fecha);
    if (!horario) return 'Los domingos la clínica está cerrada.';
    if (!hora) return null;

    const inicio = aMinutos(hora);
    const fin = inicio + duracionHoras(timeCita) * 60;
    if (inicio < aMinutos(horario[0]) || fin > aMinutos(horario[1])) {
        return `Ese día se atiende de ${horario[0]} a ${horario[1]}: con ${duracionHoras(timeCita)} h de duración, ` +
            `el último turno empieza a las ${ultimoInicio(fecha, timeCita)}.`;
    }
    return null;
}
