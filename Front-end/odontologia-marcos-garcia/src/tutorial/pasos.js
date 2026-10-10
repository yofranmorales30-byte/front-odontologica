import { FiCheckCircle, FiClipboard, FiCompass, FiDownload, FiLogOut, FiPlusCircle, FiTag } from 'react-icons/fi';
import { colorEtiqueta, colorEvento } from '../utils/estados';

// Los pasos del tutorial de cada rol (los muestra Tutorial.jsx).
// - objetivo: lo que se ilumina, marcado en la pantalla con data-tutorial="..."; sin objetivo, la tarjeta va al centro.
// - vista: el módulo del panel del personal que se muestra detrás mientras se explica.
// - lado: de qué lado del objetivo va la tarjeta, si entra ('arriba', 'abajo', 'izquierda', 'derecha').
// - puntos, leyenda y nota: lo que acompaña al texto.

const ICONO_APP = '/pwa-192x192.png';

const bienvenida = (nombre, texto) => ({
  id: 'bienvenida',
  imagen: ICONO_APP,
  titulo: nombre ? `Te damos la bienvenida, ${nombre}` : 'Te damos la bienvenida',
  texto,
  nota: 'Avanzá con "Continuar". Si preferís verlo después, cerralo con la X: queda en el botón "Tutorial".',
});

const instalar = {
  id: 'instalar',
  objetivo: 'instalar',
  lado: 'abajo',
  icono: FiDownload,
  titulo: 'Instalar la app',
  texto: 'Instalá Armonía en este dispositivo para abrirla directo desde su ícono, como cualquier app. Es gratis y no pasa por la tienda de apps.',
};

const salir = (motivo) => ({
  id: 'salir',
  objetivo: 'salir',
  lado: 'abajo',
  icono: FiLogOut,
  titulo: 'Cerrar sesión',
  texto: `Cuando termines, cerrá la sesión desde acá. ${motivo}`,
});

const fin = {
  id: 'fin',
  objetivo: 'tutorial',
  lado: 'abajo',
  icono: FiCheckCircle,
  titulo: 'Eso es todo',
  texto: 'Ya conocés tu panel. Si querés repasarlo, este botón vuelve a mostrar el tutorial cuando quieras.',
};

// ─── Paciente ───

const ESTADOS_PACIENTE = [
  { color: colorEtiqueta('PENDIENTE'), nombre: 'Pendiente', detalle: 'la clínica todavía no lo confirmó' },
  { color: colorEtiqueta('CONFIRMADA'), nombre: 'Confirmada', detalle: 'te esperamos ese día' },
  { color: colorEtiqueta('COMPLETADA'), nombre: 'Completada', detalle: 'el turno ya pasó' },
  { color: colorEtiqueta('CANCELADA'), nombre: 'Cancelada', detalle: 'el turno se suspendió' },
];

// `conInstalar`: si en la pantalla está el botón "Instalar app" (no aparece con la app ya instalada)
export function pasosPaciente({ nombre, conInstalar }) {
  return [
    bienvenida(nombre, 'Desde tu panel sacás turnos y seguís tus citas con la clínica. En un minuto te mostramos cómo.'),
    {
      id: 'agendar',
      objetivo: 'agendar',
      lado: 'abajo',
      icono: FiPlusCircle,
      titulo: 'Sacá un turno',
      texto: 'Con este botón pedís un turno nuevo, en dos pasos:',
      puntos: ['Elegís el día, la hora y cuánto dura.', 'Contás el motivo de la consulta y confirmás.'],
      nota: 'El formulario te avisa qué horarios ya están ocupados.',
    },
    {
      id: 'mis-citas',
      objetivo: 'mis-citas',
      icono: FiClipboard,
      titulo: 'Tus citas',
      texto: 'Acá quedan todos tus turnos, con el día, el horario y el motivo de cada uno.',
      nota: 'Para cambiar o cancelar un turno, comunicate con la clínica.',
    },
    {
      id: 'estados',
      objetivo: 'mis-citas',
      icono: FiTag,
      titulo: 'El estado de cada turno',
      texto: 'La etiqueta de cada turno dice en qué estado está:',
      leyenda: ESTADOS_PACIENTE,
    },
    ...(conInstalar ? [instalar] : []),
    salir('Es importante si usás un celular o una computadora que no es tuya.'),
    fin,
  ];
}

// ─── Personal de la clínica ───

const BIENVENIDA_PERSONAL = {
  Administrador: 'Entraste como Administrador: tenés acceso a todos los módulos del panel.',
  Asistente: 'Entraste como Asistente: llevás la agenda de la clínica.',
  Doctor: 'Entraste como Doctor: desde acá seguís tu agenda y tus pacientes.',
};

// Mover y estirar turnos, cargar pacientes y agendar: administrador y asistente (igual que en la API)
const gestiona = (rol) => rol !== 'Doctor';

const COLORES_CALENDARIO = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada']
  .map((nombre) => ({ color: colorEvento(nombre.toUpperCase()), nombre }));

// Qué se explica de cada módulo del menú. El título y el ícono son los del menú.
const MODULOS = {
  inicio: () => ({
    texto: 'El resumen de la clínica de un vistazo:',
    puntos: [
      'Cuántos pacientes hay registrados.',
      'Cuántas citas hay hoy.',
      'Cuántas falta confirmar y cuántas ya se completaron.',
    ],
  }),
  calendario: (rol) => ({
    texto: 'La agenda de la clínica, de lunes a sábado. Cada turno tiene el color de su estado.',
    puntos: gestiona(rol)
      ? [
          'Tocá un turno para ver los datos del paciente, y confirmarlo o cancelarlo.',
          'Arrastralo para pasarlo a otro horario.',
          'Estiralo desde abajo para cambiar cuánto dura.',
        ]
      : [
          'Tocá un turno para ver los datos del paciente y el motivo de la consulta.',
          'Desde ahí podés confirmarlo o cancelarlo.',
          'Mover un turno o cambiar su duración lo hace quien lleva la agenda: asistente o administrador.',
        ],
    leyenda: COLORES_CALENDARIO,
  }),
  pacientes: (rol) => ({
    texto: 'La lista de los pacientes de la clínica, con su sexo y su teléfono.',
    puntos: gestiona(rol)
      ? [
          'Los que se registran desde la web aparecen acá solos.',
          'A los demás los cargás desde "Agendar turno", al darles su primer turno.',
        ]
      : undefined,
  }),
  citas: () => ({
    texto: 'Todas las citas en una sola lista, con el paciente, la fecha, el motivo y el estado.',
    nota: 'Sirve para repasar los turnos sin recorrer el calendario semana por semana.',
  }),
  agendar: () => ({
    texto: 'Para cargar un turno a nombre de un paciente, en tres pasos:',
    puntos: [
      'Elegís un paciente de la lista o creás uno nuevo.',
      'Elegís el día, la hora y cuánto dura.',
      'Escribís el motivo y confirmás.',
    ],
    nota: 'El formulario te avisa qué horarios ya están ocupados.',
  }),
};

// `menu`: los módulos que ese rol tiene en el menú del panel ([{ key, label, icon }]); se explica uno por paso.
// `conInstalar`: si en la pantalla está el botón "Instalar app".
export function pasosPersonal({ rol, nombre, menu, conInstalar }) {
  return [
    bienvenida(nombre, `${BIENVENIDA_PERSONAL[rol] || 'Este es el panel de la clínica.'} En un minuto te mostramos para qué sirve cada módulo.`),
    {
      id: 'menu',
      objetivo: 'menu',
      icono: FiCompass,
      titulo: 'El menú',
      texto: 'Desde acá pasás de un módulo a otro. El que tenés abierto queda marcado en verde.',
    },
    ...menu.filter((item) => MODULOS[item.key]).map((item) => ({
      id: `modulo-${item.key}`,
      objetivo: `menu-${item.key}`,
      vista: item.key,
      icono: item.icon,
      titulo: item.label,
      ...MODULOS[item.key](rol),
    })),
    ...(conInstalar ? [instalar] : []),
    salir('Es importante en una computadora o un celular compartido: el panel tiene datos de pacientes.'),
    fin,
  ];
}
