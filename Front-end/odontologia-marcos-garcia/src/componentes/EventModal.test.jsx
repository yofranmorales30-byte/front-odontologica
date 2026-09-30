import { test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventModal from './EventModal';

vi.mock('../api', () => ({ apiFetch: async () => ({ ok: true, json: async () => ({}) }) }));

const cita = (extendedProps) => ({
  title: 'Paciente de prueba',
  extendedProps: {
    start: '2030-03-12T10:00:00', end: '2030-03-12T11:00:00', estatus: 'PENDIENTE', id: 1, ...extendedProps,
  },
});
const abrir = (props) => render(<EventModal isOpen onClose={() => {}} trigger={() => {}} info={cita(props)} />);

test('sin fecha de nacimiento ni sexo no rompe y muestra "—"', () => {
  abrir({ nacimiento: null, sexo: null, telefono: '0000000000', email: null });
  expect(screen.getByText('Paciente de prueba')).toBeTruthy();
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByLabelText('Contactar por WhatsApp?')).toBeNull(); // número inválido: sin botón
  expect(screen.queryByAltText('Contactar por email')).toBeNull();      // sin cuenta: sin email
});

test('WhatsApp con el número internacional, en otra pestaña', () => {
  abrir({ nacimiento: '1990-05-15', sexo: 'F', telefono: '04121234567', email: 'ana@x.com' });
  const link = screen.getByLabelText('Contactar por WhatsApp?');
  expect(link.getAttribute('href')).toBe('https://wa.me/584121234567');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(screen.getByText('1990-05-15')).toBeTruthy();
  expect(screen.getByText('Femenino')).toBeTruthy();
  expect(screen.getByText('2030-03-12, 10:00')).toBeTruthy();
});

test('es un diálogo accesible que se cierra con Escape', () => {
  const onClose = vi.fn();
  render(<EventModal isOpen onClose={onClose} trigger={() => {}} info={cita({})} />);
  const dialogo = screen.getByRole('dialog');
  expect(dialogo.getAttribute('aria-modal')).toBe('true');
  expect(screen.getByRole('button', { name: 'Cerrar' })).toBe(document.activeElement); // foco en cerrar
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('una cita cancelada se puede ocultar de la agenda', () => {
  abrir({ estatus: 'CANCELADA' });
  const texto = screen.getByText(/Esta cita fue cancelada\./);
  expect(texto.closest('div').style.display).toBe('block');
});
