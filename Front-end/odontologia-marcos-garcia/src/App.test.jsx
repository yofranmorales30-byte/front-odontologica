import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act, configure } from '@testing-library/react';
import App from './App';
import { pasosPaciente } from './tutorial/pasos';

// Estos tests dibujan la app entera (página de inicio, login, paneles): con la máquina cargada
// tardan más que los tiempos por defecto (5 s por test y 1 s para que aparezca algo)
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const ADMIN = {
  token: 'token-nuevo', id_user: 1, name_user: 'Admin Marcos', email_user: 'admin@odontologia.com',
  fk_rol: 1, nombre_rol: 'Administrador',
};

// Respuestas falsas de la API según la ruta
function mockApi(respuestas) {
  const llamadas = [];
  global.fetch = async (url, options = {}) => {
    const ruta = url.replace(/^.*\/api/, '');
    llamadas.push({ ruta, auth: options.headers?.Authorization });
    const [status, body] = respuestas[ruta] || [200, []];
    return { ok: status < 400, status, json: async () => body };
  };
  return llamadas;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.history.pushState({}, '', '/sign-up');
});

// El aviso de instalación del navegador es compartido: se descarta entre tests
afterEach(() => act(() => { window.dispatchEvent(new Event('appinstalled')); }));

const PACIENTE = { token: 't', id_user: 5, name_user: 'Ana Pérez', fk_rol: 4, nombre_rol: 'Paciente', id_paciente: 3 };
const CITA = { id_citas: 9, date_cita: '2030-03-12T16:00:00', time_cita: '2', desc_cita: 'Limpieza', status_cita: 'PENDIENTE' };

// Entra al panel del paciente y espera a que aparezca el horario de su cita
// (con la máquina cargada tarda más que el segundo que se espera por defecto)
function entrarComoPaciente() {
  sessionStorage.setItem('armonia.token', 'token-paciente');
  mockApi({ '/me': [200, PACIENTE], '/mis-citas': [200, [CITA]] });
  render(<App />);
  return screen.findByText('16:00–18:00 hs', {}, { timeout: 5000 });
}

const tituloTutorial = () => screen.getByRole('dialog').querySelector('h2').textContent;
const continuar = () => fireEvent.click(screen.getByRole('button', { name: /^(Empezar|Continuar|Entendido)$/ }));

test('al recargar con un token guardado recupera la sesión', async () => {
  sessionStorage.setItem('armonia.token', 'token-guardado');
  const llamadas = mockApi({ '/me': [200, ADMIN] });

  render(<App />);

  // El panel se carga en diferido (lazy): la primera vez tarda más que el segundo por defecto
  expect(await screen.findByText('Hola, Admin Marcos', {}, { timeout: 5000 })).toBeTruthy();
  expect(llamadas[0]).toEqual({ ruta: '/me', auth: 'Bearer token-guardado' });
  // With a saved session /me already wakes the API up: no extra ping
  expect(llamadas.some((l) => l.ruta === '/salud')).toBe(false);
  // /me devuelve un token nuevo y reemplaza al guardado
  expect(sessionStorage.getItem('armonia.token')).toBe('token-nuevo');
});

test('si el servidor rechaza el token guardado, se borra y se muestra el login', async () => {
  sessionStorage.setItem('armonia.token', 'token-vencido');
  mockApi({ '/me': [401, { error: 'Sesión inválida o expirada' }] });

  render(<App />);

  expect(await screen.findByText('Bienvenido')).toBeTruthy();
  await waitFor(() => expect(sessionStorage.getItem('armonia.token')).toBeNull());
});

test('el paciente ve el día y la hora de sus citas', async () => {
  // El horario va en su propio elemento para que nunca se parta en dos renglones
  const horario = await entrarComoPaciente();
  expect(horario.parentElement.textContent).toBe('mar, 12 mar 2030 · 16:00–18:00 hs');
}, 10000);

test('paciente: la primera vez el tutorial le explica su panel, y después queda en el botón "Tutorial"', async () => {
  await entrarComoPaciente();

  const titulos = [];
  for (let i = 0; i < 6; i++) {
    titulos.push(tituloTutorial());
    continuar();
  }
  expect(titulos).toEqual([
    'Te damos la bienvenida, Ana Pérez', 'Sacá un turno', 'Tus citas', 'El estado de cada turno', 'Cerrar sesión', 'Eso es todo',
  ]);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(localStorage.getItem('armonia.tutorial.5')).not.toBeNull();

  // Todo lo que el tutorial ilumina está en el panel
  const enPantalla = [...document.querySelectorAll('[data-tutorial]')].map((el) => el.dataset.tutorial);
  for (const { objetivo } of pasosPaciente({})) {
    if (objetivo) expect(enPantalla).toContain(objetivo);
  }

  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  expect(tituloTutorial()).toBe('Te damos la bienvenida, Ana Pérez');
}, 15000);

test('la invitación a instalar espera a que termine el tutorial', async () => {
  act(() => { window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt() {} })); });
  await entrarComoPaciente();

  // La invitación aparece al segundo y medio de entrar al panel: con el tutorial abierto, no
  await new Promise((listo) => setTimeout(listo, 1700));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(tituloTutorial()).toBe('Te damos la bienvenida, Ana Pérez');

  fireEvent.click(screen.getByRole('button', { name: 'Saltar tutorial' }));
  expect(await screen.findByRole('dialog', { name: 'Instalá Armonía en tu computadora' }, { timeout: 5000 })).toBeTruthy();
}, 20000);

test('una ruta que no existe vuelve al inicio (en vez de una página vacía)', async () => {
  mockApi({});
  window.history.pushState({}, '', '/no-existe');

  render(<App />);

  // Dibuja toda la página de inicio: con la máquina cargada pasa los tiempos por defecto
  await waitFor(() => expect(window.location.pathname).toBe('/'), { timeout: 5000 });
}, 15000);

test('sin token guardado no consulta /me y muestra el login', async () => {
  const llamadas = mockApi({});

  render(<App />);

  expect(await screen.findByText('Bienvenido')).toBeTruthy();
  expect(llamadas.some((l) => l.ruta === '/me')).toBe(false);
});

test('without a saved session the API is woken up right away', async () => {
  const calls = mockApi({});
  render(<App />);

  expect(await screen.findByText('Bienvenido')).toBeTruthy();
  expect(calls.map((c) => c.ruta)).toContain('/salud');
});

// A weekday at least a week ahead, as YYYY-MM-DD
function weekdayAhead() {
  const day = new Date();
  day.setDate(day.getDate() + 7);
  while (day.getDay() === 0 || day.getDay() === 6) day.setDate(day.getDate() + 1);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

test('after signing up and then logging out, the login shows up (not the sign-up form)', async () => {
  mockApi({
    '/registro': [201, { token: 't', id_user: 6, name_user: 'Ana Pérez', fk_rol: 4, nombre_rol: 'Paciente', id_paciente: 3 }],
  });
  render(<App />);
  const change = (element, value) => fireEvent.change(element, { target: { value } });

  fireEvent.click(await screen.findByRole('button', { name: /Registrarse/ }));
  change(await screen.findByPlaceholderText('Tu nombre completo'), 'Ana Pérez');
  change(screen.getAllByRole('combobox')[0], 'F');
  change(document.querySelector('input[type="date"]'), '1990-05-15');
  change(screen.getByPlaceholderText('tu@correo.com'), 'ana@x.com');
  change(screen.getByPlaceholderText('Tu contraseña'), 'clave123');
  change(screen.getByPlaceholderText('Repetí tu contraseña'), 'clave123');
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
  change(document.querySelector('input[type="date"]'), weekdayAhead());
  change(screen.getByRole('combobox'), '1');
  change(document.querySelector('input[type="time"]'), '10:00');
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
  change(screen.getByPlaceholderText(/motivo de tu consulta/), 'Control');
  fireEvent.click(screen.getByRole('button', { name: /Crear cuenta y agendar/ }));

  // The welcome message stays two seconds, then the patient panel opens with its tutorial
  expect(await screen.findByText('Mis citas', {}, { timeout: 8000 })).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  expect(await screen.findByText('Bienvenido')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Crear cuenta y agendar/ })).toBeNull();
});
