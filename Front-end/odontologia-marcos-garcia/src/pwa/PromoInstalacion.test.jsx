import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PromoInstalacion from './PromoInstalacion';

// Pantalla táctil chica o no, y si ya está abierta como app instalada
const medios = { movil: true, instalada: false };

beforeEach(() => {
  vi.useFakeTimers();
  medios.movil = true;
  medios.instalada = false;
  window.matchMedia = (query) => ({
    matches: query.includes('display-mode') ? medios.instalada : medios.movil,
    addEventListener() {},
    removeEventListener() {},
  });
});

afterEach(() => {
  // El aviso del navegador es compartido: se descarta entre tests
  act(() => { window.dispatchEvent(new Event('appinstalled')); });
  localStorage.clear();
  delete navigator.userAgent;
  delete window.matchMedia;
  vi.useRealTimers();
});

// Lo que manda Chrome/Android cuando la app se puede instalar
function navegadorOfreceInstalar(outcome = 'accepted') {
  const evento = new Event('beforeinstallprompt');
  Object.assign(evento, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome }) });
  act(() => { window.dispatchEvent(evento); });
  return evento;
}

const mostrar = (ruta = '/') => render(<MemoryRouter initialEntries={[ruta]}><PromoInstalacion /></MemoryRouter>);
const esperarDemora = () => act(() => { vi.advanceTimersByTime(4000); });
const promo = () => screen.queryByRole('dialog', { name: /Instalá Armonía/ });

test('en el celular invita a instalar a los pocos segundos y abre el diálogo del navegador', async () => {
  const evento = navegadorOfreceInstalar();
  mostrar();
  expect(promo()).toBeNull(); // no aparece de golpe al entrar

  esperarDemora();
  expect(promo()).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Instalar/ })); });
  expect(evento.prompt).toHaveBeenCalled();
  expect(promo()).toBeNull();
});

test('"Ahora no" la esconde y no vuelve a aparecer en la próxima visita', () => {
  navegadorOfreceInstalar();
  const { unmount } = mostrar();
  esperarDemora();
  fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
  expect(promo()).toBeNull();

  unmount();
  mostrar();
  esperarDemora();
  expect(promo()).toBeNull();
});

test('se cierra con Escape', () => {
  navegadorOfreceInstalar();
  mostrar();
  esperarDemora();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(promo()).toBeNull();
});

test('en iPhone explica cómo agregarla a la pantalla de inicio', () => {
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', configurable: true });
  mostrar();
  esperarDemora();
  expect(promo().textContent).toMatch(/Compartir.*Agregar a inicio/);
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(promo()).toBeNull();
});

test('no aparece en la computadora, ni con la app ya instalada, ni fuera del inicio, ni si no se puede instalar', () => {
  navegadorOfreceInstalar();
  medios.movil = false;
  const escritorio = mostrar();
  esperarDemora();
  expect(promo()).toBeNull();
  escritorio.unmount();

  medios.movil = true;
  medios.instalada = true;
  const instalada = mostrar();
  esperarDemora();
  expect(promo()).toBeNull();
  instalada.unmount();

  medios.instalada = false;
  const formulario = mostrar('/sign-up');
  esperarDemora();
  expect(promo()).toBeNull();
  formulario.unmount();

  act(() => { window.dispatchEvent(new Event('appinstalled')); }); // Android sin aviso del navegador
  mostrar();
  esperarDemora();
  expect(promo()).toBeNull();
});
