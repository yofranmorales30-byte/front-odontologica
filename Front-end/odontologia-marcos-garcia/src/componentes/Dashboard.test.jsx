import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Dashboard from './Dashboard';
import { pasosPersonal } from '../tutorial/pasos';
import { leerZip, leerPdf } from '../exportar/ayudaTests';
import { textoEdad } from '../utils/historial';

// Estos tests dibujan el panel entero: con la máquina cargada tardan más que los 5 s por defecto
vi.setConfig({ testTimeout: 20000 });

// Lo que responde la API en cada ruta (una lista vacía si el test no dice otra cosa).
// { falla: 500 } hace que esa ruta responda con ese error.
let mockRespuestas = {};
vi.mock('../api', () => ({
  apiFetch: async (ruta) => {
    const respuesta = mockRespuestas[ruta] || [];
    const status = respuesta.falla || 200;
    return { ok: status < 400, status, json: async () => respuesta };
  },
}));
// El calendario de verdad (FullCalendar) tiene sus propios tests y tarda en dibujarse.
// Este tiene un solo turno, del paciente 2, desde el que se puede ir a su historial.
vi.mock('./Calendar', () => ({
  default: ({ alVerHistorial }) => (
    <div>
      Calendario de la semana
      <button type="button" onClick={() => alVerHistorial(2)}>Ver historial del paciente</button>
    </div>
  ),
}));
// En vez de bajar el archivo, se guarda lo que se iba a bajar
const mockDescargas = [];
vi.mock('../exportar/descargar', async (original) => ({
  ...(await original()),
  descargar: (nombre, bytes, tipo) => mockDescargas.push({ nombre, bytes, tipo }),
}));

const USUARIOS = {
  Administrador: { id_user: 1, name_user: 'Admin Marcos', nombre_rol: 'Administrador' },
  Doctor: { id_user: 2, name_user: 'Marcos García', nombre_rol: 'Doctor' },
  Asistente: { id_user: 3, name_user: 'Laura', nombre_rol: 'Asistente' },
};

// El menú de cada rol, como lo ve la persona
const MENU = {
  Administrador: ['Inicio', 'Calendario', 'Pacientes', 'Citas', 'Agendar turno'],
  Asistente: ['Inicio', 'Calendario', 'Pacientes', 'Citas', 'Agendar turno'],
  Doctor: ['Inicio', 'Calendario', 'Mis pacientes'],
};

beforeEach(() => {
  localStorage.clear();
  mockRespuestas = {};
  mockDescargas.length = 0;
});
// El aviso de instalación del navegador es compartido: se descarta entre tests
afterEach(() => act(() => { window.dispatchEvent(new Event('appinstalled')); }));

const entrar = (rol) => render(<Dashboard user={USUARIOS[rol]} onLogout={() => {}} />);
const yaLoVio = (rol) => localStorage.setItem(`armonia.tutorial.${USUARIOS[rol].id_user}`, '1');
const tutorial = () => screen.queryByRole('dialog');
const titulo = () => tutorial().querySelector('h2').textContent;
const continuar = () => fireEvent.click(screen.getByRole('button', { name: /^(Empezar|Continuar|Entendido)$/ }));
const moduloAbierto = () => document.querySelector('nav [aria-current="page"]').getAttribute('aria-label');
// Todo lo que el panel tiene marcado para iluminar
const marcas = () => [...document.querySelectorAll('[data-tutorial]')].flatMap((el) => el.dataset.tutorial.split(' '));

test.each(Object.keys(MENU))('%s: la primera vez el tutorial se abre solo y explica cada módulo de su menú', async (rol) => {
  entrar(rol);
  expect(titulo()).toBe(`Te damos la bienvenida, ${USUARIOS[rol].name_user}`);
  expect(tutorial().textContent).toContain(`Entraste como ${rol}`);

  continuar();
  expect(titulo()).toBe('El menú');
  expect(moduloAbierto()).toBe('Inicio'); // todavía no se movió de donde estaba

  for (const modulo of MENU[rol]) {
    await act(async () => { continuar(); }); // cada módulo carga sus datos al mostrarse
    expect(titulo()).toBe(modulo);
    expect(moduloAbierto()).toBe(modulo); // el panel lo muestra detrás mientras se explica
  }

  continuar();
  expect(titulo()).toBe('Cerrar sesión');
  expect(moduloAbierto()).toBe('Inicio'); // de vuelta a lo que tenía abierto
  continuar();
  expect(titulo()).toBe('Eso es todo');

  continuar();
  expect(tutorial()).toBeNull();
  expect(localStorage.getItem(`armonia.tutorial.${USUARIOS[rol].id_user}`)).not.toBeNull();
}, 20000); // dibuja todos los módulos del panel: en una máquina cargada pasa los 5 s por defecto

test.each(Object.keys(MENU))('%s: todo lo que su tutorial ilumina está en el panel', (rol) => {
  // Con el botón "Instalar app" a la vista, para incluir ese paso
  act(() => { window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt() {} })); });
  yaLoVio(rol);
  entrar(rol);

  const enPantalla = marcas();
  const menu = enPantalla.filter((m) => m.startsWith('menu-')).map((m) => ({ key: m.slice(5), label: m, icon: () => null }));
  const objetivos = pasosPersonal({ rol, menu, conInstalar: true }).map((p) => p.objetivo).filter(Boolean);

  expect(menu).toHaveLength(MENU[rol].length);
  expect(objetivos).toContain('instalar');
  for (const objetivo of objetivos) expect(enPantalla).toContain(objetivo);
});

test('la segunda vez no se abre solo, y el botón "Tutorial" lo vuelve a mostrar', () => {
  yaLoVio('Doctor');
  entrar('Doctor');
  expect(tutorial()).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  expect(titulo()).toBe('Te damos la bienvenida, Marcos García');

  fireEvent.click(screen.getByRole('button', { name: 'Saltar tutorial' }));
  expect(tutorial()).toBeNull();
});

test('saltearlo también lo da por visto', () => {
  const primera = entrar('Asistente');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(tutorial()).toBeNull();
  primera.unmount();

  entrar('Asistente');
  expect(tutorial()).toBeNull();
});

test('cada cuenta ve su tutorial una vez, aunque otra ya lo haya visto en ese navegador', () => {
  yaLoVio('Administrador');
  entrar('Asistente');
  expect(tutorial()).not.toBeNull();
});

test('repasar el tutorial no borra un turno a medio cargar', async () => {
  yaLoVio('Asistente');
  entrar('Asistente');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Agendar turno' })); });
  fireEvent.click(screen.getByRole('button', { name: 'Crear nuevo paciente' }));
  fireEvent.change(screen.getByPlaceholderText('Nombre del paciente'), { target: { value: 'Juana Rosales' } });

  fireEvent.click(screen.getByRole('button', { name: 'Ver tutorial' }));
  continuar(); // El menú
  await act(async () => { continuar(); }); // Inicio: el panel muestra otro módulo
  expect(moduloAbierto()).toBe('Inicio');
  fireEvent.keyDown(document, { key: 'Escape' });

  expect(moduloAbierto()).toBe('Agendar turno');
  expect(screen.getByPlaceholderText('Nombre del paciente').value).toBe('Juana Rosales');
});

// ─── Buscadores y descargas de las tablas ───

const PACIENTES = [
  { id_paciente: 1, name_paciente: 'José García Peña', genre_paciente: 'M', birth_paciente: '1990-03-12', telf_paciente: '04145550101', dir_paciente: 'Av. Bolívar' },
  { id_paciente: 2, name_paciente: 'Valentina Moncada', genre_paciente: 'F', birth_paciente: '2001-07-30', telf_paciente: '04265550102', dir_paciente: 'Calle 5' },
  { id_paciente: 3, name_paciente: 'Ángel Niño', genre_paciente: 'M', birth_paciente: null, telf_paciente: null, dir_paciente: null },
];
const CITAS = [
  { id_citas: 7, name_paciente: 'Valentina Moncada', date_cita: '2030-03-13T15:00:00', time_cita: '2', desc_cita: 'Control de ortodoncia', status_cita: 'CONFIRMADA', telf_paciente: '04265550102' },
  { id_citas: 5, name_paciente: 'José García Peña', date_cita: '2030-03-12T09:00:00', time_cita: '1', desc_cita: 'Limpieza dental', status_cita: 'PENDIENTE', telf_paciente: '04145550101' },
  { id_citas: 6, name_paciente: 'Ángel Niño', date_cita: '2030-04-02T11:00:00', time_cita: '1', desc_cita: 'Extracción', status_cita: 'CANCELADA', telf_paciente: null },
];

// Entra como asistente (con el tutorial ya visto) y abre ese módulo del menú
async function abrir(modulo) {
  mockRespuestas = { '/pacientes': PACIENTES, '/citaCompleta': CITAS };
  yaLoVio('Asistente');
  entrar('Asistente');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: modulo })); });
}
const buscar = (etiqueta, texto) => fireEvent.change(screen.getByRole('searchbox', { name: etiqueta }), { target: { value: texto } });
// La primera columna de cada fila de la tabla
const filas = () => screen.queryAllByRole('row').slice(1).map((fila) => fila.cells[0].textContent);

test('pacientes: el buscador filtra por nombre (sin importar acentos), sexo o teléfono', async () => {
  await abrir('Pacientes');
  expect(filas()).toEqual(['José García Peña', 'Valentina Moncada', 'Ángel Niño']);
  expect(screen.getByRole('status').textContent).toBe('3 pacientes');

  buscar('Buscar pacientes', 'garcia');
  expect(filas()).toEqual(['José García Peña']);
  expect(screen.getByRole('status').textContent).toBe('1 de 3 pacientes · Excel y PDF llevan solo estos');

  buscar('Buscar pacientes', 'masculino');
  expect(filas()).toEqual(['José García Peña', 'Ángel Niño']);

  buscar('Buscar pacientes', '0426-555');
  expect(filas()).toEqual(['Valentina Moncada']);
});

test('pacientes: si nada coincide lo dice, y se puede borrar la búsqueda', async () => {
  await abrir('Pacientes');
  buscar('Buscar pacientes', 'zapata');

  expect(filas()).toEqual([]);
  expect(screen.getByText(/No hay pacientes con «zapata»/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Descargar pacientes en Excel' }).disabled).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Borrar la búsqueda' }));
  expect(filas()).toHaveLength(3);
  expect(screen.getByRole('searchbox').value).toBe('');
});

test('pacientes: Escape y la X del buscador también borran lo escrito', async () => {
  await abrir('Pacientes');
  buscar('Buscar pacientes', 'moncada');
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
  expect(filas()).toHaveLength(3);

  buscar('Buscar pacientes', 'moncada');
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar el buscador' }));
  expect(filas()).toHaveLength(3);
});

test('pacientes: Excel y PDF llevan lo que se está viendo', async () => {
  await abrir('Pacientes');
  buscar('Buscar pacientes', 'moncada');
  fireEvent.click(screen.getByRole('button', { name: 'Descargar pacientes en Excel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descargar pacientes en PDF' }));

  const [excel, pdf] = mockDescargas;
  expect(excel.nombre).toMatch(/^pacientes-armonia-.*\.xlsx$/);
  const planilla = leerZip(excel.bytes)['xl/worksheets/sheet1.xml'].texto;
  expect(planilla).toContain('Valentina Moncada');
  expect(planilla).toContain('Calle 5'); // la dirección y el nacimiento van aunque la tabla no los muestre
  expect(planilla).not.toContain('José García Peña');

  expect(pdf.nombre).toMatch(/^pacientes-armonia-.*\.pdf$/);
  const documento = leerPdf(pdf.bytes);
  expect(documento).toContain('(Valentina Moncada) Tj');
  expect(documento).toContain('(1 de 3 pacientes · Búsqueda: «moncada»');
  expect(documento).not.toContain('José García Peña');
});

test('citas: el buscador filtra por paciente, fecha, motivo o estado', async () => {
  await abrir('Citas');
  expect(filas()).toEqual(['Valentina Moncada', 'José García Peña', 'Ángel Niño']);

  buscar('Buscar citas', 'limpieza');
  expect(filas()).toEqual(['José García Peña']);
  expect(screen.getByRole('status').textContent).toBe('1 de 3 citas · Excel y PDF llevan solo estas');

  buscar('Buscar citas', 'cancelada');
  expect(filas()).toEqual(['Ángel Niño']);

  buscar('Buscar citas', 'mar 2030'); // como se ve en la tabla
  expect(filas()).toEqual(['Valentina Moncada', 'José García Peña']);
  buscar('Buscar citas', '12/03/2030');
  expect(filas()).toEqual(['José García Peña']);
  buscar('Buscar citas', '2030-04-02');
  expect(filas()).toEqual(['Ángel Niño']);

  buscar('Buscar citas', 'moncada pendiente');
  expect(screen.getByText(/No hay citas con «moncada pendiente»/)).toBeTruthy();
});

test('citas: Excel y PDF llevan las citas que se están viendo, con su horario', async () => {
  await abrir('Citas');
  buscar('Buscar citas', 'ortodoncia');
  fireEvent.click(screen.getByRole('button', { name: 'Descargar citas en Excel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descargar citas en PDF' }));

  const [excel, pdf] = mockDescargas;
  expect(excel.nombre).toMatch(/^citas-armonia-.*\.xlsx$/);
  const planilla = leerZip(excel.bytes)['xl/worksheets/sheet1.xml'].texto;
  expect(planilla).toContain('Control de ortodoncia');
  expect(planilla).toContain('>15:00<');
  expect(planilla).toContain('>17:00<');
  expect(planilla).not.toContain('Limpieza dental');

  const documento = leerPdf(pdf.bytes);
  expect(documento).toContain('(Listado de citas) Tj');
  expect(documento).toContain('(15:00–17:00) Tj');
  expect(documento).toContain('(1 de 3 citas · Búsqueda: «ortodoncia»');
});

// ─── Historial de un paciente ───

const HISTORIAL = {
  paciente: {
    id_paciente: 2, name_paciente: 'Valentina Moncada', genre_paciente: 'F', birth_paciente: '2001-07-30',
    dir_paciente: 'Calle 5', telf_paciente: '04265550102', email_user: 'valentina@example.com',
  },
  citas: [
    { id_citas: 9, date_cita: '2030-03-13T15:00:00', time_cita: '2', desc_cita: 'Control de ortodoncia', status_cita: 'CONFIRMADA', logic_cita: 'A', name_doctor: 'Dr. García' },
    { id_citas: 8, date_cita: '2026-09-19T10:00:00', time_cita: '2', desc_cita: 'Instalación de brackets', status_cita: 'COMPLETADA', logic_cita: 'A', name_doctor: 'Dr. García' },
    { id_citas: 7, date_cita: '2026-09-10T09:00:00', time_cita: '1', desc_cita: 'Blanqueamiento', status_cita: 'CANCELADA', logic_cita: 'A', name_doctor: 'Dr. García' },
    { id_citas: 6, date_cita: '2026-08-19T08:00:00', time_cita: '1', desc_cita: 'Limpieza dental', status_cita: 'COMPLETADA', logic_cita: 'I', name_doctor: 'Dr. García' },
  ],
};

async function abrirHistorial(historial = HISTORIAL) {
  await abrir('Pacientes');
  mockRespuestas['/pacientes/2/historial'] = historial;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver el historial de Valentina Moncada' })); });
}
const seccion = (nombre) => screen.queryByRole('region', { name: nombre });
const procedimientos = (nombre) => [...seccion(nombre).querySelectorAll('li strong')].map((el) => el.textContent);

test('historial: al tocar un paciente se ven su ficha y todos los procedimientos que se hizo', async () => {
  await abrirHistorial();

  expect(screen.getByRole('heading', { level: 2, name: 'Valentina Moncada' })).toBeTruthy();
  expect(screen.getByText(`Femenino · ${textoEdad('2001-07-30')} (nació el 30/07/2001)`)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe('https://wa.me/584265550102');
  expect(screen.getByRole('link', { name: 'valentina@example.com' }).getAttribute('href')).toBe('mailto:valentina@example.com');
  expect(screen.getByText('Calle 5')).toBeTruthy();

  // Lo hecho, del más reciente al más antiguo (también lo que se ocultó de la agenda), con quién atendió
  expect(procedimientos('Procedimientos realizados')).toEqual(['Instalación de brackets', 'Limpieza dental']);
  expect(seccion('Procedimientos realizados').textContent).toContain('sáb, 19 sept 2026 · 10:00–12:00 hs (2 horas)');
  expect(seccion('Procedimientos realizados').textContent).toContain('Atendió: Dr. García');
  expect(procedimientos('Próximos turnos')).toEqual(['Control de ortodoncia']);
  expect(seccion('Próximos turnos').textContent).toContain('CONFIRMADA');
  expect(procedimientos('Turnos cancelados')).toEqual(['Blanqueamiento']);
});

test('historial: el resumen dice cuántos procedimientos lleva, la última visita y el próximo turno', async () => {
  await abrirHistorial();

  const resumen = screen.getByText('Última visita').closest('div').parentElement.parentElement.textContent;
  expect(resumen).toContain('Procedimientos realizados2');
  expect(resumen).toContain('Última visitasáb, 19 sept 2026');
  expect(resumen).toContain('Próximo turnomié, 13 mar 2030, 15:00');
});

test('historial: tocar la fila del paciente también lo abre', async () => {
  await abrir('Pacientes');
  mockRespuestas['/pacientes/2/historial'] = HISTORIAL;
  await act(async () => { fireEvent.click(screen.getByText('04265550102')); });

  expect(screen.getByRole('heading', { level: 2, name: 'Valentina Moncada' })).toBeTruthy();
});

test('historial: al volver, la lista y lo que se buscó siguen como estaban', async () => {
  await abrir('Pacientes');
  buscar('Buscar pacientes', 'moncada');
  mockRespuestas['/pacientes/2/historial'] = HISTORIAL;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver el historial de Valentina Moncada' })); });
  expect(screen.queryByRole('searchbox')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Volver a pacientes' }));
  expect(screen.getByRole('searchbox').value).toBe('moncada');
  expect(filas()).toEqual(['Valentina Moncada']);
});

test('historial: un paciente sin citas lo dice, sin secciones vacías de más', async () => {
  await abrirHistorial({ ...HISTORIAL, citas: [] });

  expect(screen.getByText('Todavía no tiene procedimientos realizados.')).toBeTruthy();
  expect(seccion('Próximos turnos')).toBeNull();
  expect(seccion('Turnos cancelados')).toBeNull();
});

test('historial: faltando datos del paciente no se rompe', async () => {
  await abrirHistorial({
    paciente: { id_paciente: 2, name_paciente: 'Valentina Moncada', genre_paciente: null, birth_paciente: null, dir_paciente: null, telf_paciente: null, email_user: null },
    citas: [],
  });

  expect(screen.getByRole('heading', { level: 2, name: 'Valentina Moncada' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull();
});

test('historial: si no carga, avisa y deja volver a la lista', async () => {
  await abrirHistorial({ falla: 500 });
  expect(screen.getByText('No se pudo cargar el historial.')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Volver a pacientes' }));
  expect(filas()).toHaveLength(3);
});

test('historial: se descarga en PDF y en Excel, con el nombre del paciente en el archivo', async () => {
  await abrirHistorial();
  fireEvent.click(screen.getByRole('button', { name: 'Descargar el historial en PDF' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descargar el historial en Excel' }));

  const [pdf, excel] = mockDescargas;
  expect(pdf.nombre).toMatch(/^historial-valentina-moncada-\d{4}-\d{2}-\d{2}\.pdf$/);
  const documento = leerPdf(pdf.bytes);
  expect(documento).toContain('(Historial de Valentina Moncada) Tj');
  expect(documento).toContain('(Tel. 04265550102 · valentina@example.com · Calle 5) Tj');
  expect(documento).toContain('(Procedimientos realizados \\(2\\)) Tj');
  expect(documento).toContain('(Instalación de brackets) Tj');
  expect(documento).toContain('(Dr. García) Tj');
  expect(documento.indexOf('(Procedimientos realizados')).toBeLessThan(documento.indexOf('(Próximos turnos'));

  expect(excel.nombre).toMatch(/^historial-valentina-moncada-.*\.xlsx$/);
  const planilla = leerZip(excel.bytes)['xl/worksheets/sheet1.xml'].texto;
  expect(planilla).toContain('Procedimiento</t>');
  expect(planilla).toContain('Limpieza dental');
  expect(planilla).toContain('Completada');
});

test('historial: desde un turno del calendario se va al historial de ese paciente, y se vuelve al calendario', async () => {
  mockRespuestas = { '/pacientes': PACIENTES, '/pacientes/2/historial': HISTORIAL };
  yaLoVio('Doctor');
  entrar('Doctor');
  fireEvent.click(screen.getByRole('button', { name: 'Calendario' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver historial del paciente' })); });

  expect(moduloAbierto()).toBe('Mis pacientes');
  expect(screen.getByRole('heading', { level: 2, name: 'Valentina Moncada' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Volver al calendario' }));
  expect(moduloAbierto()).toBe('Calendario');
  expect(screen.getByText(/Calendario de la semana/)).toBeTruthy();

  // Entrando a Pacientes por el menú se ve la lista, no el último historial
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Mis pacientes' })); });
  expect(filas()).toHaveLength(3);
});
