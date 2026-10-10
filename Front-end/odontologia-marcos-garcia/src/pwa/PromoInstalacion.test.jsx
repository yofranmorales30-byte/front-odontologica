import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PromoInstalacion from './PromoInstalacion';
import { abrirPromoInstalacion } from './useInstalarApp';

// Si es un celular (pantalla táctil chica) y si la app ya está abierta como instalada
const medios = { celular: true, instalada: false };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';

beforeEach(() => {
  vi.useFakeTimers();
  medios.celular = true;
  medios.instalada = false;
  window.matchMedia = (query) => ({
    matches: query.includes('display-mode') ? medios.instalada : medios.celular,
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

const mostrar = (ruta = '/', sesion = null) =>
  render(<MemoryRouter initialEntries={[ruta]}><PromoInstalacion sesion={sesion} /></MemoryRouter>);
const pasar = (ms) => act(() => { vi.advanceTimersByTime(ms); });
const promo = () => screen.queryByRole('dialog');

test('en el celular invita en el inicio a los pocos segundos y abre el diálogo del navegador', async () => {
  const evento = navegadorOfreceInstalar();
  mostrar();
  expect(promo()).toBeNull(); // no aparece de golpe al entrar

  pasar(4000);
  expect(screen.getByRole('dialog', { name: 'Llevá Armonía en tu celular' })).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden'); // la página de atrás no se desplaza

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Instalar app/ })); });
  expect(evento.prompt).toHaveBeenCalled();
  expect(promo()).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

test('"Ahora no" la esconde y no vuelve a aparecer en la próxima visita', () => {
  navegadorOfreceInstalar();
  const { unmount } = mostrar();
  pasar(4000);
  fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
  expect(promo()).toBeNull();

  unmount();
  mostrar();
  pasar(4000);
  expect(promo()).toBeNull();
});

test('se cierra con la X y con Escape, y Tab no sale del diálogo', () => {
  navegadorOfreceInstalar();
  const primera = mostrar();
  pasar(4000);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: /Instalar app/ }));

  screen.getByRole('button', { name: 'Ahora no' }).focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));

  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(promo()).toBeNull();
  primera.unmount();

  localStorage.clear();
  mostrar();
  pasar(4000);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(promo()).toBeNull();
});

test('en la computadora aparece más tarde y habla de la computadora', () => {
  medios.celular = false;
  navegadorOfreceInstalar();
  mostrar();
  pasar(4000);
  expect(promo()).toBeNull();

  pasar(3000);
  expect(screen.getByRole('dialog', { name: 'Instalá Armonía en tu computadora' })).toBeTruthy();
  expect(promo().textContent).toMatch(/escritorio o en la barra de tareas/);
});

test('en iPhone explica cómo agregarla a la pantalla de inicio', () => {
  Object.defineProperty(navigator, 'userAgent', { value: IPHONE, configurable: true });
  mostrar();
  pasar(4000);
  expect(promo().textContent).toMatch(/Compartir.*Agregar a inicio/);
  expect(screen.queryByRole('button', { name: /Instalar app/ })).toBeNull(); // en iPhone no hay diálogo del navegador
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(promo()).toBeNull();
});

test('al entrar al panel invita enseguida, con el texto de cada tipo de usuario', () => {
  navegadorOfreceInstalar();
  const paciente = mostrar('/sign-up', 'paciente');
  pasar(1500);
  expect(promo().textContent).toMatch(/Tus turnos, a mano/);
  paciente.unmount();

  mostrar('/sign-up', 'personal');
  pasar(1500);
  expect(promo().textContent).toMatch(/La agenda, a mano/);
});

test('no interrumpe a quien está completando un formulario', () => {
  navegadorOfreceInstalar();
  const campo = document.body.appendChild(document.createElement('input'));
  campo.focus();

  mostrar('/sign-up', 'paciente');
  pasar(1500);
  expect(promo()).toBeNull();
  campo.remove();
});

test('no aparece con la app ya instalada, sin sesión en /sign-up, ni si el navegador no permite instalar', () => {
  navegadorOfreceInstalar();
  medios.instalada = true;
  const instalada = mostrar();
  pasar(4000);
  expect(promo()).toBeNull();
  instalada.unmount();

  medios.instalada = false;
  const formulario = mostrar('/sign-up');
  pasar(4000);
  expect(promo()).toBeNull();
  formulario.unmount();

  act(() => { window.dispatchEvent(new Event('appinstalled')); }); // p. ej. Firefox: nunca avisa
  mostrar();
  pasar(7000);
  expect(promo()).toBeNull();
});

test('un botón "Instalar app" la abre aunque esté pospuesta', () => {
  Object.defineProperty(navigator, 'userAgent', { value: IPHONE, configurable: true });
  localStorage.setItem('armonia.promoInstalacion', String(Date.now()));
  mostrar('/sign-up', 'paciente');
  pasar(4000);
  expect(promo()).toBeNull(); // pospuesta: sola no aparece

  act(() => { abrirPromoInstalacion(); });
  expect(promo().textContent).toMatch(/Agregar a inicio/);
});
