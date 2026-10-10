import { test, expect } from 'vitest';
import { pasosPaciente, pasosPersonal } from './pasos';

// Los módulos que cada rol tiene en el menú del panel
const MENU_GESTION = ['inicio', 'calendario', 'pacientes', 'citas', 'agendar'].map((key) => ({ key, label: key, icon: () => null }));
const MENU_DOCTOR = MENU_GESTION.slice(0, 3);

const ids = (pasos) => pasos.map((p) => p.id);
const paso = (pasos, id) => pasos.find((p) => p.id === id);
const todoElTexto = (p) => [p.titulo, p.texto, ...(p.puntos || []), p.nota || ''].join(' ');

test('personal: saluda según el rol y explica un módulo del menú por paso, en el orden del menú', () => {
  const pasos = pasosPersonal({ rol: 'Asistente', nombre: 'Laura', menu: MENU_GESTION });

  expect(ids(pasos)).toEqual([
    'bienvenida', 'menu', 'modulo-inicio', 'modulo-calendario', 'modulo-pacientes', 'modulo-citas', 'modulo-agendar', 'salir', 'fin',
  ]);
  expect(pasos[0].titulo).toBe('Te damos la bienvenida, Laura');
  expect(pasos[0].texto).toMatch(/Entraste como Asistente/);
  // Cada módulo ilumina su botón del menú y se muestra detrás
  expect(paso(pasos, 'modulo-calendario')).toMatchObject({ objetivo: 'menu-calendario', vista: 'calendario', titulo: 'calendario' });
});

test('el doctor solo ve sus módulos, y no se le dice que puede mover turnos', () => {
  const doctor = pasosPersonal({ rol: 'Doctor', nombre: 'Marcos', menu: MENU_DOCTOR });
  const admin = pasosPersonal({ rol: 'Administrador', nombre: 'Admin', menu: MENU_GESTION });

  expect(ids(doctor)).toEqual(['bienvenida', 'menu', 'modulo-inicio', 'modulo-calendario', 'modulo-pacientes', 'salir', 'fin']);
  expect(todoElTexto(paso(admin, 'modulo-calendario'))).toMatch(/Arrastralo/);
  expect(todoElTexto(paso(doctor, 'modulo-calendario'))).not.toMatch(/Arrastralo|Estiralo/);
  expect(todoElTexto(paso(doctor, 'modulo-calendario'))).toMatch(/confirmarlo o cancelarlo/);
  expect(todoElTexto(paso(doctor, 'modulo-pacientes'))).not.toMatch(/Agendar turno/);
});

test('el calendario explica los colores de los cuatro estados', () => {
  const pasos = pasosPersonal({ rol: 'Doctor', menu: MENU_DOCTOR });
  expect(paso(pasos, 'modulo-calendario').leyenda.map((l) => l.nombre)).toEqual(['Pendiente', 'Confirmada', 'Cancelada', 'Completada']);
});

test('paciente: sacar un turno, sus citas y los estados', () => {
  const pasos = pasosPaciente({ nombre: 'Ana Pérez' });

  expect(ids(pasos)).toEqual(['bienvenida', 'agendar', 'mis-citas', 'estados', 'salir', 'fin']);
  expect(paso(pasos, 'estados').leyenda).toHaveLength(4);
});

test('el paso de instalar la app solo está si el botón está en pantalla', () => {
  expect(ids(pasosPaciente({ conInstalar: true }))).toContain('instalar');
  expect(ids(pasosPaciente({ conInstalar: false }))).not.toContain('instalar');
  expect(ids(pasosPersonal({ rol: 'Doctor', menu: MENU_DOCTOR, conInstalar: true }))).toContain('instalar');
});

test('ningún paso queda sin título, sin texto ni con el id repetido', () => {
  const recorridos = [
    pasosPaciente({ nombre: 'Ana', conInstalar: true }),
    ...['Administrador', 'Asistente'].map((rol) => pasosPersonal({ rol, nombre: 'X', menu: MENU_GESTION, conInstalar: true })),
    pasosPersonal({ rol: 'Doctor', nombre: 'X', menu: MENU_DOCTOR, conInstalar: true }),
  ];

  for (const pasos of recorridos) {
    expect(new Set(ids(pasos)).size).toBe(pasos.length);
    for (const p of pasos) {
      expect(p.titulo).toBeTruthy();
      expect(p.texto).toBeTruthy();
      expect(p.icono || p.imagen).toBeTruthy();
    }
  }
});
