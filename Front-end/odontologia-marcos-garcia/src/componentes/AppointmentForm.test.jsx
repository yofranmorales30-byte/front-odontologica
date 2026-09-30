import { test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppointmentForm from './AppointmentForm';

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

const PACIENTE = { nombre_rol: 'Paciente', id_paciente: 7, name_user: 'Ana', name_paciente: 'Ana', genre_paciente: 'F', email_user: 'ana@x.com' };
const ASISTENTE = { nombre_rol: 'Asistente', name_user: 'Laura', email_user: 'laura@x.com' };

const cambiar = (el, value) => fireEvent.change(el, { target: { value } });
const siguiente = () => fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
const envios = () => mockLlamadas.filter((l) => l.metodo === 'POST');

function elegirTurno(fecha, hora, duracion) {
  const selects = screen.getAllByRole('combobox');
  cambiar(document.querySelector('input[type="date"]'), fecha);
  if (duracion) cambiar(selects[selects.length - 1], duracion);
  if (hora) cambiar(document.querySelector('input[type="time"]'), hora);
}

async function confirmar(motivo = 'Control') {
  cambiar(screen.getByPlaceholderText(/motivo de tu consulta/), motivo);
  fireEvent.click(screen.getByRole('button', { name: /Agendar turno/ }));
}

test('paciente: salta sus datos y reserva a su nombre', async () => {
  const onSuccess = vi.fn();
  mockRespuestas['/citas'] = [201, { id_citas: 1 }];
  render(<AppointmentForm user={PACIENTE} onSuccess={onSuccess} />);
  expect(screen.getByText('Seleccioná tu turno')).toBeTruthy(); // primer paso
  elegirTurno('2030-03-12', '10:00', '1');
  siguiente();
  expect(screen.getAllByText('Ana').length).toBe(2); // resumen: paciente y usuario
  await confirmar();

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(envios()).toEqual([{
    ruta: '/citas', metodo: 'POST',
    body: { fk_paciente: 7, date_cita: '2030-03-12T10:00:00', time_cita: '1', desc_cita: 'Control', status_cita: 'PENDIENTE', logic_cita: 'A' },
  }]);
});

test('personal: elige un paciente existente', async () => {
  const onSuccess = vi.fn();
  mockRespuestas['/pacientes'] = [200, [{ id_paciente: 3, name_paciente: 'Juan Pérez', genre_paciente: 'M', telf_paciente: '0414' }]];
  mockRespuestas['/citas'] = [201, { id_citas: 1 }];
  render(<AppointmentForm user={ASISTENTE} onSuccess={onSuccess} />);
  await waitFor(() => expect(screen.getByText(/Juan Pérez \(0414\)/)).toBeTruthy());
  cambiar(screen.getAllByRole('combobox')[0], '3');
  siguiente();
  elegirTurno('2030-03-12', '10:00', '2');
  siguiente();
  await confirmar();

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(envios()).toEqual([{
    ruta: '/citas', metodo: 'POST',
    body: { fk_paciente: 3, date_cita: '2030-03-12T10:00:00', time_cita: '2', desc_cita: 'Control', status_cita: 'PENDIENTE', logic_cita: 'A' },
  }]);
});

test('personal: crea un paciente nuevo sin inventarle credenciales', async () => {
  const onSuccess = vi.fn();
  mockRespuestas['/citaCompleta'] = [201, { id_citas: 1 }];
  render(<AppointmentForm user={ASISTENTE} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Crear nuevo paciente' }));
  cambiar(screen.getByPlaceholderText('Nombre del paciente'), 'Pedro Gómez');
  cambiar(screen.getAllByRole('combobox')[0], 'M');
  cambiar(document.querySelector('input[type="date"]'), '1980-01-01');
  siguiente();
  elegirTurno('2030-03-12', '15:00', '1');
  siguiente();
  await confirmar();

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const [envio] = envios();
  expect(envio.ruta).toBe('/citaCompleta');
  expect(envio.body).toMatchObject({ name_paciente: 'Pedro Gómez', genre_paciente: 'M', birth_paciente: '1980-01-01', date_cita: '2030-03-12T15:00:00', time_cita: '1' });
  for (const campo of ['email_user', 'key_user', 'fk_rol', 'fk_doctor']) expect(envio.body).not.toHaveProperty(campo);
});

test('pide elegir un paciente antes de seguir', () => {
  render(<AppointmentForm user={ASISTENTE} onSuccess={() => {}} />);
  siguiente();
  expect(screen.getByText(/Seleccioná un paciente existente/)).toBeTruthy();
});

test('valida el turno: domingo, superposición y fin del horario', async () => {
  mockRespuestas['/disponibilidad'] = [200, [{ date_cita: '2030-03-12T10:00:00', time_cita: '2' }]];
  render(<AppointmentForm user={PACIENTE} onSuccess={() => {}} />);
  await waitFor(() => expect(mockLlamadas.some((l) => l.ruta === '/disponibilidad')).toBe(true));

  elegirTurno('2030-03-10'); // domingo
  expect(screen.getByText(/Los domingos la clínica está cerrada/)).toBeTruthy();

  elegirTurno('2030-03-12', '11:00', '1');
  await waitFor(() => expect(screen.getByText('10:00–12:00')).toBeTruthy());
  expect(screen.getByText(/se superpone con otra cita/)).toBeTruthy();

  elegirTurno('2030-03-13', '17:00', '2'); // termina 19:00
  expect(screen.getByText(/último turno empieza a las 16:00/)).toBeTruthy();
});

test('muestra el error del servidor', async () => {
  mockRespuestas['/citas'] = [409, { error: 'Ese horario se superpone con otra cita. Elegí otro horario.' }];
  const onSuccess = vi.fn();
  render(<AppointmentForm user={PACIENTE} onSuccess={onSuccess} />);
  elegirTurno('2030-03-12', '10:00', '1');
  siguiente();
  await confirmar();
  await waitFor(() => expect(screen.getByText(/Ese horario se superpone con otra cita. Elegí otro horario./)).toBeTruthy());
  expect(onSuccess).not.toHaveBeenCalled();
});
