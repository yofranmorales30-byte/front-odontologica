import { test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegistrationWizard from './RegistrationWizard';

// API falsa: registra las llamadas y responde según la ruta
let mockLlamadas = [];
let mockRespuestas = {};
vi.mock('../api', () => ({
  apiFetch: async (ruta, opciones = {}) => {
    mockLlamadas.push({ ruta, metodo: opciones.method || 'GET', body: opciones.body && JSON.parse(opciones.body) });
    const [status, body] = mockRespuestas[ruta] || [200, []];
    return { ok: status < 400, status, json: async () => body };
  },
}));

beforeEach(() => {
  mockLlamadas = [];
  mockRespuestas = {};
});

const cambiar = (el, value) => fireEvent.change(el, { target: { value } });
const siguiente = () => fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

function completarDatos() {
  cambiar(screen.getByPlaceholderText('Tu nombre completo'), 'Ana Pérez');
  cambiar(screen.getAllByRole('combobox')[0], 'F');
  cambiar(document.querySelector('input[type="date"]'), '1990-05-15');
  cambiar(screen.getByPlaceholderText('tu@correo.com'), 'ana@x.com');
  cambiar(screen.getByPlaceholderText('Tu contraseña'), 'clave123');
  cambiar(screen.getByPlaceholderText('Repetí tu contraseña'), 'clave123');
}

function elegirTurno(fecha, hora, duracion) {
  cambiar(document.querySelector('input[type="date"]'), fecha);
  if (duracion) cambiar(screen.getByRole('combobox'), duracion);
  if (hora) cambiar(document.querySelector('input[type="time"]'), hora);
}

async function irAlTurno() {
  render(<RegistrationWizard embedded onRegister={() => {}} onBackToLogin={() => {}} />);
  await waitFor(() => expect(mockLlamadas.some((l) => l.ruta === '/disponibilidad')).toBe(true));
  completarDatos();
  siguiente();
  expect(screen.getByText('Seleccioná tu turno')).toBeTruthy();
}

test('consulta la disponibilidad y no los datos de las citas', async () => {
  render(<RegistrationWizard embedded onRegister={() => {}} onBackToLogin={() => {}} />);
  await waitFor(() => expect(mockLlamadas.map((l) => l.ruta)).toEqual(['/disponibilidad']));
});

test('avisa si las contraseñas no coinciden', async () => {
  render(<RegistrationWizard embedded onRegister={() => {}} onBackToLogin={() => {}} />);
  completarDatos();
  cambiar(screen.getByPlaceholderText('Repetí tu contraseña'), 'otra');
  siguiente();
  expect(screen.getAllByText(/Las contraseñas no coinciden/).length).toBeGreaterThan(0);
});

test('registro completo: envía la cita en hora local y sin rol ni doctor', async () => {
  const onRegister = vi.fn();
  mockRespuestas['/registro'] = [201, { token: 't', name_user: 'Ana Pérez', nombre_rol: 'Paciente' }];
  render(<RegistrationWizard embedded onRegister={onRegister} onBackToLogin={() => {}} />);
  completarDatos();
  siguiente();
  elegirTurno('2030-03-12', '10:00', '2'); // martes
  siguiente();
  cambiar(screen.getByPlaceholderText(/motivo de tu consulta/), 'Limpieza');
  fireEvent.click(screen.getByRole('button', { name: /Crear cuenta y agendar/ }));

  await waitFor(() => expect(screen.getByText(/Bienvenido, Ana Pérez/)).toBeTruthy());
  const registro = mockLlamadas.find((l) => l.ruta === '/registro');
  expect(registro.metodo).toBe('POST');
  expect(registro.body).toEqual({
    email_user: 'ana@x.com', key_user: 'clave123', name_paciente: 'Ana Pérez', genre_paciente: 'F',
    birth_paciente: '1990-05-15', dir_paciente: '', telf_paciente: '',
    date_cita: '2030-03-12T10:00:00', time_cita: '2', desc_cita: 'Limpieza',
  });
  await waitFor(() => expect(onRegister).toHaveBeenCalledWith(expect.objectContaining({ token: 't' })), { timeout: 3000 });
});

test('el domingo está cerrado', async () => {
  await irAlTurno();
  elegirTurno('2030-03-10');
  expect(screen.getByText(/Los domingos la clínica está cerrada/)).toBeTruthy();
  expect(document.querySelector('input[type="time"]').disabled).toBe(true);
});

test('muestra los horarios ocupados y rechaza superposiciones', async () => {
  mockRespuestas['/disponibilidad'] = [200, [{ date_cita: '2030-03-12T10:00:00', time_cita: '2' }]];
  await irAlTurno();
  elegirTurno('2030-03-12', '11:00', '1');
  expect(screen.getByText('10:00–12:00')).toBeTruthy();
  expect(screen.getByText(/se superpone con otra cita/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /Siguiente/ }).disabled).toBe(true);
});

test('el sábado la cita tiene que terminar a las 12', async () => {
  await irAlTurno();
  elegirTurno('2030-03-16', '11:30', '1'); // sábado
  expect(screen.getByText(/último turno empieza a las 11:00/)).toBeTruthy();
  expect(screen.getByText(/Atención ese día: 08:00 a 12:00/)).toBeTruthy();
});

test('muestra el error del servidor (p. ej. horario tomado por otro)', async () => {
  mockRespuestas['/registro'] = [409, { error: 'Ese horario se superpone con otra cita. Elegí otro horario.' }];
  await irAlTurno();
  elegirTurno('2030-03-12', '10:00', '1');
  siguiente();
  fireEvent.click(screen.getByRole('button', { name: /Crear cuenta y agendar/ }));
  await waitFor(() => expect(screen.getByText(/Ese horario se superpone con otra cita. Elegí otro horario./)).toBeTruthy());
});

test('fuera del modo embebido se ve con su propia tarjeta', () => {
  render(<RegistrationWizard onRegister={() => {}} onBackToLogin={() => {}} />);
  expect(screen.getByText('Creá tu cuenta y agendá tu turno')).toBeTruthy();
  expect(screen.getByPlaceholderText('Tu nombre completo')).toBeTruthy();
});
