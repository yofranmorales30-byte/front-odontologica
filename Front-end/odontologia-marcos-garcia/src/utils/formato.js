// Textos para mostrar datos de pacientes y citas

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

// "1" → "1 hora", "2" → "2 horas"
export function textoDuracion(horas) {
    if (!horas) return '—';
    return `${horas} ${horas === '1' ? 'hora' : 'horas'}`;
}
