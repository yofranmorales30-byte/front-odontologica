import { test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import Calendar from './Calendar';

// Captura las props que Calendar le pasa al modal, para disparar trigger() como lo hace "Confirmar"
let mockModalProps = null;
vi.mock('./EventModal', () => ({ default: (props) => { mockModalProps = props; return null; } }));

let mockFetches = 0;
vi.mock('../api', () => ({
  apiFetch: async () => {
    mockFetches++;
    return {
      ok: true,
      json: async () => [{
        id_citas: 1, name_paciente: 'Ana', date_cita: '2030-03-12T10:00:00', time_cita: '1',
        status_cita: 'PENDIENTE', desc_cita: 'x',
      }],
    };
  },
}));

beforeEach(() => { mockFetches = 0; });

test('recargar las citas no devuelve el calendario a la semana actual', async () => {
  const { container } = render(<Calendar rol={{ rol: 'secreto' }} />);
  await waitFor(() => expect(container.querySelector('.fc-toolbar-title')).not.toBeNull());
  const titulo = () => container.querySelector('.fc-toolbar-title').textContent;

  const semanaActual = titulo();
  fireEvent.click(container.querySelector('.fc-next-button'));
  fireEvent.click(container.querySelector('.fc-next-button'));
  const semanaElegida = titulo();
  expect(semanaElegida).not.toBe(semanaActual);

  const nodoAntes = container.querySelector('.fc-toolbar-title');
  await act(async () => { mockModalProps.trigger(); });
  await waitFor(() => expect(mockFetches).toBe(2));

  expect(screen.queryByText('Cargando turnos...')).toBeNull();
  expect(titulo()).toBe(semanaElegida);
  expect(container.querySelector('.fc-toolbar-title')).toBe(nodoAntes); // no se desmontó
});

test('muestra de lunes a sábado (el domingo está cerrado)', async () => {
  const { container } = render(<Calendar rol={{ rol: 'secreto' }} />);
  await waitFor(() => expect(container.querySelector('.fc-col-header')).not.toBeNull());
  const dias = [...container.querySelectorAll('.fc-col-header-cell')].map((th) => th.className);
  expect(dias).toHaveLength(6);
  expect(dias.some((c) => c.includes('fc-day-sat'))).toBe(true);
  expect(dias.some((c) => c.includes('fc-day-sun'))).toBe(false);
});
