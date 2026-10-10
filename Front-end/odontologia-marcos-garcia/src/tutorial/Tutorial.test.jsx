import { test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tutorial from './Tutorial';

const PASOS = [
  { id: 'bienvenida', titulo: 'Te damos la bienvenida', texto: 'Te mostramos el panel.' },
  { id: 'calendario', titulo: 'Calendario', texto: 'La agenda de la clínica.', objetivo: 'menu-calendario', vista: 'calendario', puntos: ['Tocá un turno para verlo.'] },
  { id: 'fin', titulo: 'Eso es todo', texto: 'Ya conocés tu panel.', leyenda: [{ color: '#d97706', nombre: 'Pendiente', detalle: 'falta confirmarlo' }] },
];

function abrir() {
  const alPaso = vi.fn();
  const alCerrar = vi.fn();
  const vista = render(<Tutorial pasos={PASOS} alPaso={alPaso} alCerrar={alCerrar} />);
  return { alPaso, alCerrar, ...vista };
}

const boton = (name) => screen.getByRole('button', { name });
const titulo = () => screen.getByRole('dialog').querySelector('h2').textContent;

test('explica un paso por vez y avanza con "Continuar" hasta terminar', () => {
  const { alPaso, alCerrar } = abrir();
  expect(screen.getByRole('dialog', { name: 'Te damos la bienvenida' })).toBeTruthy();
  expect(screen.getByText('Paso 1 de 3')).toBeTruthy();

  fireEvent.click(boton('Empezar'));
  expect(titulo()).toBe('Calendario');
  expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
  expect(screen.getByText('Tocá un turno para verlo.')).toBeTruthy();
  expect(alPaso).toHaveBeenLastCalledWith(PASOS[1]); // el panel muestra detrás ese módulo

  fireEvent.click(boton('Continuar'));
  expect(titulo()).toBe('Eso es todo');
  expect(screen.getByRole('dialog').textContent).toMatch(/Pendiente: falta confirmarlo/);
  expect(alCerrar).not.toHaveBeenCalled();

  fireEvent.click(boton('Entendido'));
  expect(alCerrar).toHaveBeenCalledTimes(1);
});

test('"Atrás" vuelve al paso anterior', () => {
  const { alPaso } = abrir();
  fireEvent.click(boton('Empezar'));
  fireEvent.click(boton('Atrás'));

  expect(titulo()).toBe('Te damos la bienvenida');
  expect(alPaso).toHaveBeenLastCalledWith(PASOS[0]);
  expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull(); // en el primero no hay a dónde volver
});

test('se puede saltear con la X, con "Ahora no" y con Escape', () => {
  const conLaX = abrir();
  fireEvent.click(boton('Saltar tutorial'));
  expect(conLaX.alCerrar).toHaveBeenCalledTimes(1);
  conLaX.unmount();

  const ahoraNo = abrir();
  fireEvent.click(boton('Ahora no'));
  expect(ahoraNo.alCerrar).toHaveBeenCalledTimes(1);
  ahoraNo.unmount();

  const conEscape = abrir();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(conEscape.alCerrar).toHaveBeenCalledTimes(1);
});

test('con el teclado: Enter y la flecha derecha avanzan, la izquierda vuelve', () => {
  const { alCerrar } = abrir();
  fireEvent.keyDown(document, { key: 'ArrowRight' });
  expect(titulo()).toBe('Calendario');
  fireEvent.keyDown(document, { key: 'ArrowLeft' });
  expect(titulo()).toBe('Te damos la bienvenida');
  fireEvent.keyDown(document, { key: 'ArrowLeft' }); // ya está en el primero
  expect(titulo()).toBe('Te damos la bienvenida');

  fireEvent.keyDown(document, { key: 'Enter' });
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(titulo()).toBe('Eso es todo');
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(alCerrar).toHaveBeenCalledTimes(1);
});

test('volver al primer paso con "Atrás" no deja el foco en "Ahora no" (Enter lo cerraría)', () => {
  const { alCerrar } = abrir();
  fireEvent.click(boton('Empezar'));
  boton('Atrás').focus();
  fireEvent.click(boton('Atrás'));

  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(titulo()).toBe('Calendario');
  expect(alCerrar).not.toHaveBeenCalled();
});

test('mientras está abierto la página no se desplaza y el foco queda en la tarjeta', () => {
  const antes = document.body.appendChild(document.createElement('button'));
  antes.focus();

  const { unmount } = abrir();
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement).toBe(screen.getByRole('dialog'));

  // Tab da la vuelta dentro de la tarjeta, para los dos lados
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(boton('Empezar'));
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(document.activeElement).toBe(boton('Saltar tutorial'));
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(boton('Empezar'));

  unmount();
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(antes); // el foco vuelve a donde estaba
  antes.remove();
});

test('los pasos quedan fijos al abrir: si la lista cambia por el medio, no se mueve el paso actual', () => {
  const { rerender } = abrir();
  fireEvent.click(boton('Empezar'));

  rerender(<Tutorial pasos={[{ id: 'otro', titulo: 'Otro', texto: 'x' }, ...PASOS]} alCerrar={() => {}} />);
  expect(titulo()).toBe('Calendario');
  expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
});
