import { test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AvisosPWA from './AvisosPWA';

// Estado del service worker que controla cada test
let mockVersionNueva = false;
const mockActualizar = vi.fn();
const mockPosponer = vi.fn();
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockVersionNueva, mockPosponer],
    offlineReady: [false, () => {}],
    updateServiceWorker: mockActualizar,
  }),
}));

const conexion = (enLinea) => {
  Object.defineProperty(navigator, 'onLine', { value: enLinea, configurable: true });
  act(() => { window.dispatchEvent(new Event(enLinea ? 'online' : 'offline')); });
};

beforeEach(() => {
  mockVersionNueva = false;
  mockActualizar.mockClear();
  mockPosponer.mockClear();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

test('con conexión y sin versión nueva no muestra nada', () => {
  const { container } = render(<AvisosPWA />);
  expect(container.innerHTML).toBe('');
});

test('avisa cuando se pierde la conexión y deja de avisar al volver', () => {
  render(<AvisosPWA />);
  conexion(false);
  expect(screen.getByRole('status').textContent).toMatch(/Sin conexión/);
  conexion(true);
  expect(screen.queryByRole('status')).toBeNull();
});

test('avisa cuando la app termina de instalarse y el aviso se va solo', () => {
  vi.useFakeTimers();
  render(<AvisosPWA />);
  act(() => { window.dispatchEvent(new Event('appinstalled')); });
  expect(screen.getByRole('status').textContent).toMatch(/ya está instalada/);

  act(() => { vi.advanceTimersByTime(7000); });
  expect(screen.queryByRole('status')).toBeNull();
  vi.useRealTimers();
});

test('con una versión nueva ofrece actualizar o posponer', () => {
  mockVersionNueva = true;
  render(<AvisosPWA />);
  expect(screen.getByRole('alert').textContent).toMatch(/versión nueva/);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(mockActualizar).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Después' }));
  expect(mockPosponer).toHaveBeenCalledWith(false);
});
