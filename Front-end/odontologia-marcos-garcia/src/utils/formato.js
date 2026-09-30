// Textos para mostrar datos de pacientes y citas
import { finCita } from './agenda';

const SEXOS = { M: 'Masculino', F: 'Femenino' };

// "M" → "Masculino"; sin dato → "—"
export function textoSexo(codigo) {
    return SEXOS[codigo] || codigo || '—';
}

// "2030-03-12" → "12 de marzo de 2030"
export function fechaLarga(fecha) {
    if (!fecha) return '—';
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "2026-09-30T09:00:00" + "1" → "mié, 30 sept 2026 · 09:00–10:00 hs"
// Las horas salen del texto (hora local de la clínica), igual en cualquier zona horaria
export function fechaHoraCita(dateCita, timeCita) {
    if (!dateCita) return '—';
    const dia = new Date(`${dateCita.slice(0, 10)}T00:00:00`)
        .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    return `${dia} · ${dateCita.slice(11, 16)}–${finCita(dateCita, timeCita).slice(11, 16)} hs`;
}

// "1" → "1 hora", "2" → "2 horas"
export function textoDuracion(horas) {
    if (!horas) return '—';
    return `${horas} ${horas === '1' ? 'hora' : 'horas'}`;
}
