import { test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

const renderNavbar = () => render(<MemoryRouter><Navbar isAuthenticated={false} /></MemoryRouter>);

// El botón de menú solo se ve en pantallas chicas y jsdom no aplica media queries: queda oculto
// y sin nombre accesible, así que se lo busca por el menú que controla
const botonMenu = () => document.querySelector('[aria-controls="menu-principal"]');

test('el botón de menú abre y cierra el menú (y lo anuncia)', () => {
  renderNavbar();
  expect(botonMenu().getAttribute('aria-label')).toBe('Abrir menú');
  expect(botonMenu().getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(botonMenu());
  expect(botonMenu().getAttribute('aria-label')).toBe('Cerrar menú');
  expect(botonMenu().getAttribute('aria-expanded')).toBe('true');

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(botonMenu().getAttribute('aria-expanded')).toBe('false');
});

test('elegir una sección cierra el menú', () => {
  renderNavbar();
  fireEvent.click(botonMenu());
  fireEvent.click(screen.getByRole('button', { name: 'Servicios' }));
  expect(botonMenu().getAttribute('aria-expanded')).toBe('false');
});

test('las secciones son botones (funcionan con teclado)', () => {
  renderNavbar();
  for (const nombre of ['Inicio', 'Nosotros', 'Servicios', 'Contacto']) {
    expect(screen.getByRole('button', { name: nombre })).toBeTruthy();
  }
  expect(screen.getByRole('link', { name: 'Ingresar' }).getAttribute('href')).toBe('/sign-up');
});

test('"Instalar app" aparece solo cuando el navegador ofrece instalar la PWA', async () => {
  renderNavbar();
  expect(screen.queryByRole('button', { name: /Instalar app/ })).toBeNull();

  const prompt = vi.fn();
  const evento = new Event('beforeinstallprompt');
  Object.assign(evento, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  act(() => { window.dispatchEvent(evento); });

  const instalar = screen.getByRole('button', { name: /Instalar app/ });
  await act(async () => { fireEvent.click(instalar); });
  expect(prompt).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /Instalar app/ })).toBeNull(); // el aviso sirve una vez
});

test('con la sesión iniciada la barra no se muestra', () => {
  const { container } = render(<MemoryRouter><Navbar isAuthenticated /></MemoryRouter>);
  expect(container.innerHTML).toBe('');
});
