import { test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import Calendar from './Calendar';
import { leerZip, leerPdf } from '../exportar/ayudaTests';

// Captura las props que Calendar le pasa al modal, para disparar trigger() como lo hace "Confirmar"
let mockModalProps = null;
vi.mock('./EventModal', () => ({ default: (props) => { mockModalProps = props; return null; } }));

// Una cita lejana y otra de hoy (la semana que el calendario muestra al abrirse)
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let mockFetches = 0;
vi.mock('../api', () => ({
  apiFetch: async () => {
    mockFetches++;
    return {
      ok: true,
      json: async () => [
        { id_citas: 1, name_paciente: 'Ana', date_cita: '2030-03-12T10:00:00', time_cita: '1', status_cita: 'PENDIENTE', desc_cita: 'x' },
        {
          id_citas: 2, name_paciente: 'Luis Peña', date_cita: `${hoy()}T10:00:00`, time_cita: '2',
          status_cita: 'CONFIRMADA', desc_cita: 'Limpieza dental', telf_paciente: '04145550101',
        },
      ],
    };
  },
}));

// En vez de bajar el archivo, se guarda lo que se iba a bajar
const mockDescargas = [];
vi.mock('../exportar/descargar', async (original) => ({
  ...(await original()),
  descargar: (nombre, bytes, tipo) => mockDescargas.push({ nombre, bytes, tipo }),
}));

beforeEach(() => {
  mockFetches = 0;
  mockDescargas.length = 0;
});

async function abrirCalendario() {
  const vista = render(<Calendar rol={{ rol: 'secreto' }} />);
  await waitFor(() => expect(vista.container.querySelector('.fc-toolbar-title')).not.toBeNull());
  return vista;
}

test('recargar las citas no devuelve el calendario a la semana actual', async () => {
  const { container } = await abrirCalendario();
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
  const { container } = await abrirCalendario();
  await waitFor(() => expect(container.querySelector('.fc-col-header')).not.toBeNull());
  const dias = [...container.querySelectorAll('.fc-col-header-cell')].map((th) => th.className);
  expect(dias).toHaveLength(6);
  expect(dias.some((c) => c.includes('fc-day-sat'))).toBe(true);
  expect(dias.some((c) => c.includes('fc-day-sun'))).toBe(false);
});

test('descarga la agenda de la semana que se está viendo, en PDF y en Excel', async () => {
  const { container } = await abrirCalendario();
  fireEvent.click(screen.getByRole('button', { name: 'Descargar la agenda en PDF' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descargar la agenda en Excel' }));

  const [pdf, excel] = mockDescargas;
  expect(pdf.nombre).toMatch(/^agenda-armonia-\d{4}-\d{2}-\d{2}\.pdf$/);
  const documento = leerPdf(pdf.bytes);
  // El título lleva el período, tal como lo muestra el calendario
  expect(documento).toContain(`(Agenda · ${container.querySelector('.fc-toolbar-title').textContent}) Tj`);
  expect(documento).toContain('(1 turno · Generado el');
  expect(documento).toContain('(10:00–12:00) Tj');
  expect(documento).toContain('(Luis Peña) Tj');
  expect(documento).toContain('(04145550101) Tj');
  expect(documento).toContain('(Limpieza dental) Tj');
  expect(documento).toContain('(Confirmada) Tj');
  expect(documento).not.toContain('(Ana) Tj'); // es de otra semana

  expect(excel.nombre).toMatch(/^agenda-armonia-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const planilla = leerZip(excel.bytes)['xl/worksheets/sheet1.xml'].texto;
  expect(planilla).toContain('Luis Peña');
  expect(planilla).not.toContain('>Ana<');
});

test('en un período sin turnos avisa en vez de descargar un archivo vacío', async () => {
  const aviso = vi.spyOn(window, 'alert').mockImplementation(() => {});
  const { container } = await abrirCalendario();
  fireEvent.click(container.querySelector('.fc-next-button'));
  fireEvent.click(screen.getByRole('button', { name: 'Descargar la agenda en PDF' }));

  expect(mockDescargas).toHaveLength(0);
  expect(aviso).toHaveBeenCalledWith('No hay turnos en este período para descargar.');
  aviso.mockRestore();
});

test('desde el detalle de un turno se puede pedir el historial del paciente', async () => {
  const alVerHistorial = vi.fn();
  render(<Calendar rol={{ rol: 'doctor' }} alVerHistorial={alVerHistorial} />);
  await waitFor(() => expect(document.querySelector('.fc-toolbar-title')).not.toBeNull());

  act(() => { mockModalProps.onVerHistorial(5); });
  expect(alVerHistorial).toHaveBeenCalledWith(5);
});
