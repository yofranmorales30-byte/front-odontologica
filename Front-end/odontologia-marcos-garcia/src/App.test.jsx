import { test, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

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
  window.history.pushState({}, '', '/sign-up');
});

test('al recargar con un token guardado recupera la sesión', async () => {
  sessionStorage.setItem('armonia.token', 'token-guardado');
  const llamadas = mockApi({ '/me': [200, ADMIN] });

  render(<App />);

  // El panel se carga en diferido (lazy): la primera vez tarda más que el segundo por defecto
  expect(await screen.findByText('Hola, Admin Marcos', {}, { timeout: 5000 })).toBeTruthy();
  expect(llamadas[0]).toEqual({ ruta: '/me', auth: 'Bearer token-guardado' });
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
  sessionStorage.setItem('armonia.token', 'token-paciente');
  mockApi({
    '/me': [200, { token: 't', id_user: 5, name_user: 'Ana Pérez', fk_rol: 4, nombre_rol: 'Paciente', id_paciente: 3 }],
    '/mis-citas': [200, [{ id_citas: 9, date_cita: '2030-03-12T16:00:00', time_cita: '2', desc_cita: 'Limpieza', status_cita: 'PENDIENTE' }]],
  });

  render(<App />);

  // El horario va en su propio elemento para que nunca se parta en dos renglones
  const horario = await screen.findByText('16:00–18:00 hs');
  expect(horario.parentElement.textContent).toBe('mar, 12 mar 2030 · 16:00–18:00 hs');
});

test('una ruta que no existe vuelve al inicio (en vez de una página vacía)', async () => {
  mockApi({});
  window.history.pushState({}, '', '/no-existe');

  render(<App />);

  await waitFor(() => expect(window.location.pathname).toBe('/'));
});

test('sin token guardado no consulta /me y muestra el login', async () => {
  const llamadas = mockApi({});

  render(<App />);

  expect(await screen.findByText('Bienvenido')).toBeTruthy();
  expect(llamadas.some((l) => l.ruta === '/me')).toBe(false);
});
