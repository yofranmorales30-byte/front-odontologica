import { test, expect, afterEach } from 'vitest';
import { medir, hueco, desplazamiento, ubicar } from './ubicar';

const COMPU = { ancho: 1440, alto: 900 };
const CELULAR = { ancho: 360, alto: 740 };
const TARJETA = { ancho: 380, alto: 300 };
const TARJETA_CELULAR = { ancho: 336, alto: 280 };

afterEach(() => { document.body.innerHTML = ''; });

// jsdom no dibuja: se le dice a cada elemento dónde "está"
function elemento(marca, { top, left, width, height }) {
  const el = document.body.appendChild(document.createElement('div'));
  el.dataset.tutorial = marca;
  el.getBoundingClientRect = () => ({ top, left, width, height, right: left + width, bottom: top + height });
  return el;
}

test('mide el elemento marcado, y si hay varios (los botones del menú), el rectángulo que los encierra', () => {
  elemento('menu menu-inicio', { top: 110, left: 12, width: 216, height: 46 });
  elemento('menu menu-calendario', { top: 158, left: 12, width: 216, height: 46 });

  expect(medir('menu-calendario')).toEqual({ top: 158, left: 12, width: 216, height: 46 });
  expect(medir('menu')).toEqual({ top: 110, left: 12, width: 216, height: 94 });
});

test('lo que no está en pantalla no se ilumina', () => {
  elemento('instalar', { top: 0, left: 0, width: 0, height: 0 }); // oculto (display: none)

  expect(medir('instalar')).toBeNull();
  expect(medir('no-existe')).toBeNull();
  expect(medir(undefined)).toBeNull();
  expect(hueco(null, COMPU)).toBeNull();
});

test('el hueco deja aire alrededor, no se sale de la pantalla y de una lista larga muestra el comienzo', () => {
  expect(hueco({ top: 110, left: 12, width: 216, height: 46 }, COMPU)).toEqual({ top: 104, left: 6, width: 228, height: 58 });

  // Un botón de la barra de abajo del celular, pegado al borde
  expect(hueco({ top: 676, left: 0, width: 72, height: 64 }, CELULAR)).toEqual({ top: 670, left: 4, width: 74, height: 66 });

  const lista = hueco({ top: 300, left: 400, width: 688, height: 2000 }, COMPU);
  expect(lista.top).toBe(294);
  expect(lista.height).toBe(324); // 36% del alto de la pantalla
});

test('sin nada que iluminar, la tarjeta va al centro', () => {
  expect(ubicar(null, TARJETA, COMPU)).toEqual({ lado: 'centro', top: 300, left: 530, flecha: 0 });
});

test('junto al menú de la computadora, la tarjeta va a la derecha y la flecha apunta al botón', () => {
  const boton = { top: 152, left: 6, width: 228, height: 58 }; // centro: y = 181
  const { lado, top, left, flecha } = ubicar(boton, TARJETA, COMPU);

  expect(lado).toBe('derecha');
  expect(left).toBe(248); // 6 + 228 + separación
  expect(top + flecha).toBe(181);
});

test('sobre la barra de abajo del celular, la tarjeta va arriba y no se sale por los costados', () => {
  const boton = { top: 670, left: 4, width: 74, height: 66 };
  const { lado, top, left, flecha } = ubicar(boton, TARJETA_CELULAR, CELULAR);

  expect(lado).toBe('arriba');
  expect(top).toBe(670 - 14 - 280);
  expect(left).toBe(12);
  expect(flecha).toBe(29); // centro del botón (x = 41), medido desde la tarjeta
});

test('respeta el lado pedido si entra; si no, usa el que tiene más lugar', () => {
  const cerrarSesion = { top: 11, left: 1270, width: 150, height: 48 }; // arriba a la derecha
  expect(ubicar(cerrarSesion, TARJETA, COMPU, 'abajo').lado).toBe('abajo');
  expect(ubicar(cerrarSesion, TARJETA, COMPU, 'arriba').lado).not.toBe('arriba');

  const debajo = ubicar(cerrarSesion, TARJETA, COMPU, 'abajo');
  expect(debajo.top).toBe(11 + 48 + 14);
  expect(debajo.left).toBe(1440 - 380 - 12); // pegada al borde, sin salirse
});

test('la página se desplaza solo si hace falta para ver el elemento con lugar para la tarjeta', () => {
  // A la vista y con lugar debajo: no se mueve
  expect(desplazamiento({ top: 220, left: 80, width: 200, height: 44 }, TARJETA_CELULAR, CELULAR)).toBe(0);
  // Lo que está fijo arriba (la barra) tampoco
  expect(desplazamiento({ top: 11, left: 1270, width: 150, height: 48 }, TARJETA, COMPU)).toBe(0);
  // Más abajo de lo que se ve: sube
  expect(desplazamiento({ top: 900, left: 12, width: 336, height: 120 }, TARJETA_CELULAR, CELULAR)).toBeGreaterThan(0);
  // Se ve, pero la tarjeta no entra ni arriba ni abajo: también sube
  expect(desplazamiento({ top: 290, left: 12, width: 336, height: 600 }, TARJETA_CELULAR, CELULAR)).toBeGreaterThan(0);
});
