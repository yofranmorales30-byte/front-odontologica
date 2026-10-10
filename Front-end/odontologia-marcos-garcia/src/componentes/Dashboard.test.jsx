import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Dashboard from './Dashboard';
import { pasosPersonal } from '../tutorial/pasos';

// La API responde listas vacías: acá se prueba el recorrido, no los datos
vi.mock('../api', () => ({
  apiFetch: async () => ({ ok: true, status: 200, json: async () => [] }),
}));
// El calendario de verdad (FullCalendar) tiene sus propios tests y tarda en dibujarse
vi.mock('./Calendar', () => ({ default: () => <div>Calendario de la semana</div> }));

const USUARIOS = {
  Administrador: { id_user: 1, name_user: 'Admin Marcos', nombre_rol: 'Administrador' },
  Doctor: { id_user: 2, name_user: 'Marcos García', nombre_rol: 'Doctor' },
  Asistente: { id_user: 3, name_user: 'Laura', nombre_rol: 'Asistente' },
};

// El menú de cada rol, como lo ve la persona
const MENU = {
  Administrador: ['Inicio', 'Calendario', 'Pacientes', 'Citas', 'Agendar turno'],
  Asistente: ['Inicio', 'Calendario', 'Pacientes', 'Citas', 'Agendar turno'],
  Doctor: ['Inicio', 'Calendario', 'Mis pacientes'],
};

beforeEach(() => localStorage.clear());
// El aviso de instalación del navegador es compartido: se descarta entre tests
afterEach(() => act(() => { window.dispatchEvent(new Event('appinstalled')); }));

const entrar = (rol) => render(<Dashboard user={USUARIOS[rol]} onLogout={() => {}} />);
const yaLoVio = (rol) => localStorage.setItem(`armonia.tutorial.${USUARIOS[rol].id_user}`, '1');
const tutorial = () => screen.queryByRole('dialog');
const titulo = () => tutorial().querySelector('h2').textContent;
const continuar = () => fireEvent.click(screen.getByRole('button', { name: /^(Empezar|Continuar|Entendido)$/ }));
const moduloAbierto = () => document.querySelector('nav [aria-current="page"]').getAttribute('aria-label');
// Todo lo que el panel tiene marcado para iluminar
const marcas = () => [...document.querySelectorAll('[data-tutorial]')].flatMap((el) => el.dataset.tutorial.split(' '));

test.each(Object.keys(MENU))('%s: la primera vez el tutorial se abre solo y explica cada módulo de su menú', async (rol) => {
  entrar(rol);
  expect(titulo()).toBe(`Te damos la bienvenida, ${USUARIOS[rol].name_user}`);
  expect(tutorial().textContent).toContain(`Entraste como ${rol}`);

  continuar();
  expect(titulo()).toBe('El menú');
  expect(moduloAbierto()).toBe('Inicio'); // todavía no se movió de donde estaba

  for (const modulo of MENU[rol]) {
    await act(async () => { continuar(); }); // cada módulo carga sus datos al mostrarse
    expect(titulo()).toBe(modulo);
    expect(moduloAbierto()).toBe(modulo); // el panel lo muestra detrás mientras se explica
  }

  continuar();
  expect(titulo()).toBe('Cerrar sesión');
  expect(moduloAbierto()).toBe('Inicio'); // de vuelta a lo que tenía abierto
  continuar();
  expect(titulo()).toBe('Eso es todo');

  continuar();
  expect(tutorial()).toBeNull();
  expect(localStorage.getItem(`armonia.tutorial.${USUARIOS[rol].id_user}`)).not.toBeNull();
}, 20000); // dibuja todos los módulos del panel: en una máquina cargada pasa los 5 s por defecto

test.each(Object.keys(MENU))('%s: todo lo que su tutorial ilumina está en el panel', (rol) => {
  // Con el botón "Instalar app" a la vista, para incluir ese paso
  act(() => { window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt() {} })); });
  yaLoVio(rol);
  entrar(rol);

  const enPantalla = marcas();
  const menu = enPantalla.filter((m) => m.startsWith('menu-')).map((m) => ({ key: m.slice(5), label: m, icon: () => null }));
  const objetivos = pasosPersonal({ rol, menu, conInstalar: true }).map((p) => p.objetivo).filter(Boolean);

  expect(menu).toHaveLength(MENU[rol].length);
  expect(objetivos).toContain('instalar');
  for (const objetivo of objetivos) expect(enPantalla).toContain(objetivo);
});

test('la segunda vez no se abre solo, y el botón "Tutorial" lo vuelve a mostrar', () => {
  yaLoVio('Doctor');
  entrar('Doctor');
  expect(tutorial()).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  expect(titulo()).toBe('Te damos la bienvenida, Marcos García');

  fireEvent.click(screen.getByRole('button', { name: 'Saltar tutorial' }));
  expect(tutorial()).toBeNull();
});

test('saltearlo también lo da por visto', () => {
  const primera = entrar('Asistente');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(tutorial()).toBeNull();
  primera.unmount();

  entrar('Asistente');
  expect(tutorial()).toBeNull();
});

test('cada cuenta ve su tutorial una vez, aunque otra ya lo haya visto en ese navegador', () => {
  yaLoVio('Administrador');
  entrar('Asistente');
  expect(tutorial()).not.toBeNull();
});

test('repasar el tutorial no borra un turno a medio cargar', async () => {
  yaLoVio('Asistente');
  entrar('Asistente');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Agendar turno' })); });
  fireEvent.click(screen.getByRole('button', { name: 'Crear nuevo paciente' }));
  fireEvent.change(screen.getByPlaceholderText('Nombre del paciente'), { target: { value: 'Juana Rosales' } });

  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  continuar(); // El menú
  await act(async () => { continuar(); }); // Inicio: el panel muestra otro módulo
  expect(moduloAbierto()).toBe('Inicio');
  fireEvent.keyDown(document, { key: 'Escape' });

  expect(moduloAbierto()).toBe('Agendar turno');
  expect(screen.getByPlaceholderText('Nombre del paciente').value).toBe('Juana Rosales');
});
