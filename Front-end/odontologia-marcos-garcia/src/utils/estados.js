// Colores por estado de cita, en un solo lugar

// Eventos del calendario y encabezado del modal
const COLOR_EVENTO = {
    PENDIENTE: '#868686',
    CONFIRMADA: '#69a017',
    CANCELADA: '#8A2BE2',
    COMPLETADA: '#525a46',
};

// Etiquetas de estado (Dashboard y panel del paciente): texto de este color sobre el mismo color al 12%
const COLOR_ETIQUETA = {
    PENDIENTE: '#d97706',
    CONFIRMADA: '#16a34a',
    CANCELADA: '#dc2626',
    COMPLETADA: '#6b7280',
};

export const colorEvento = (estado) => COLOR_EVENTO[estado] || '#868686';
export const colorEtiqueta = (estado) => COLOR_ETIQUETA[estado] || '#6b7280';
