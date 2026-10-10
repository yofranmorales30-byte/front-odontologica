// Generador de los datos de demostración: pacientes y citas ficticios pero creíbles.
// Es una función pura (no toca la base) y determinista: mismo día y misma agenda → mismos datos.
const { validarHorario } = require('../utils/agenda');

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_ATRAS = 45;      // historia
const DIAS_ADELANTE = 28;   // agenda futura
const MAX_POR_DIA = { semana: 6, sabado: 3 };

// ─── Datos de base (todo ficticio) ───

const NOMBRES = {
  F: ['María Fernanda', 'Ana Sofía', 'Daniela Alejandra', 'Mariana', 'Valentina', 'Carmen Elena', 'Rosa Elena',
    'Yolanda', 'Beatriz', 'Paola Andrea', 'Luisa Fernanda', 'Gladys', 'Isabella', 'Gabriela', 'Andrea Carolina',
    'Yuleima', 'Marisol', 'Norelys', 'Karina', 'Zulay', 'Emily', 'Francis', 'María José', 'Camila'],
  M: ['José Gregorio', 'Luis Alberto', 'Carlos Eduardo', 'Jorge Luis', 'Pedro José', 'Miguel Ángel', 'Francisco Javier',
    'Rafael Antonio', 'Diego Alejandro', 'Andrés Eduardo', 'Samuel Andrés', 'Jesús Alberto', 'Juan Carlos',
    'Víctor Manuel', 'Edgar José', 'Wilmer', 'Yorman', 'Freddy Antonio', 'Óscar David', 'Kevin Alexander',
    'Sebastián', 'Ángel David'],
};

const APELLIDOS = ['Chacón', 'Vivas', 'Zambrano', 'Colmenares', 'Moncada', 'Duque', 'Useche', 'Pernía', 'Roa', 'Omaña',
  'Labrador', 'Rojas', 'Guerrero', 'Contreras', 'Carrero', 'Sánchez', 'Medina', 'Niño', 'Rosales', 'Ramírez', 'Ortega',
  'Pérez', 'Mora', 'Cárdenas', 'Parra', 'Molina', 'Casanova', 'Varela', 'Depablos', 'Sandoval'];

// {n} se reemplaza por un número de casa
const DIRECCIONES = [
  'Urb. Las Acacias, casa {n}, San Juan de Colón',
  'Barrio El Paraíso, calle 3 #4-{n}, San Juan de Colón',
  'Calle 6 entre carreras 4 y 5, casa {n}, Centro, San Juan de Colón',
  'Sector La Pradera, vía principal, casa {n}, San Juan de Colón',
  'Urb. Los Naranjos, vereda 2, casa {n}, San Juan de Colón',
  'Barrio Bolívar, carrera 9 #2-{n}, San Juan de Colón',
  'Urb. Santa Eduviges, casa {n}, San Juan de Colón',
  'Barrio Sucre, calle 1 #3-{n}, San Juan de Colón',
  'Sector El Molino, casa {n}, San Juan de Colón',
  'Carrera 7 con calle 10, casa {n}, Centro, San Juan de Colón',
  'Barrio San Antonio, vereda 4, casa {n}, San Juan de Colón',
  'Av. principal, casa {n}, Michelena',
  'Calle 2 #8-{n}, San Pedro del Río',
  'Sector El Centro, casa {n}, Lobatera',
];

// Números ficticios: operadora + 555-01xx. Tienen formato válido (aparece el botón de
// WhatsApp), pero el patrón 555-01 se usa justamente para que no sean de nadie.
const OPERADORAS = ['0414', '0424', '0412', '0416', '0426'];

// Tratamientos (los servicios de la página): pasos en orden, [motivo, horas, días desde la visita anterior]
const PLANES = [
  { edad: [18, 82], peso: 5, pasos: [['Limpieza dental y revisión general', 1, 0]] },
  { edad: [16, 75], peso: 4, pasos: [['Dolor en una muela: evaluación', 1, 0], ['Resina en molar inferior', 1, 7], ['Control y pulido de resina', 1, 14]] },
  { edad: [13, 40], peso: 3, pasos: [['Evaluación inicial de ortodoncia', 1, 0], ['Instalación de brackets', 2, 10], ['Control mensual de ortodoncia', 1, 28]] },
  { edad: [13, 40], peso: 5, pasos: [['Control mensual de ortodoncia', 1, 0], ['Control mensual de ortodoncia', 1, 28], ['Control mensual de ortodoncia', 1, 28]] },
  { edad: [6, 12], peso: 3, pasos: [['Evaluación de ortodoncia interceptiva', 1, 0], ['Toma de impresiones para el aparato', 1, 7], ['Control de ortodoncia interceptiva', 1, 28]] },
  { edad: [6, 12], peso: 2, pasos: [['Revisión y limpieza dental', 1, 0]] },
  { edad: [18, 60], peso: 3, pasos: [['Valoración para blanqueamiento', 1, 0], ['Blanqueamiento dental: primera sesión', 2, 7], ['Blanqueamiento dental: segunda sesión', 2, 7]] },
  { edad: [17, 45], peso: 2, pasos: [['Evaluación de cordales', 1, 0], ['Extracción de cordal (muela del juicio)', 2, 7], ['Control postoperatorio y retiro de puntos', 1, 7]] },
  { edad: [50, 82], peso: 3, pasos: [['Evaluación para prótesis', 1, 0], ['Toma de impresiones para prótesis', 1, 7], ['Prueba de prótesis', 1, 10], ['Entrega y ajuste de prótesis', 1, 10], ['Control de prótesis', 1, 14]] },
  { edad: [15, 35], peso: 2, pasos: [['Retiro de brackets', 2, 0], ['Entrega y ajuste de retenedores', 1, 7], ['Control de retenedores', 1, 28]] },
  { edad: [16, 70], peso: 2, pasos: [['Urgencia: dolor intenso en una muela', 1, 0], ['Control después de la urgencia', 1, 5]] },
];

// Tratamiento para una cuenta de paciente que ya existía (la de demostración del seed)
const PLAN_EXISTENTE = [
  ['Evaluación inicial de ortodoncia', 1, 0], ['Instalación de brackets', 2, 14], ['Control mensual de ortodoncia', 1, 14],
  ['Control mensual de ortodoncia', 1, 14], ['Control mensual de ortodoncia', 1, 14],
];

// ─── Utilidades ───

// Azar determinista (mulberry32)
function crearAzar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sumarDias = (fecha, n) => new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const diaSemana = (fecha) => new Date(`${fecha}T00:00:00Z`).getUTCDay();
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const aMinutos = (hhmm) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const sinAcentos = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// `ahora`: hora de la clínica ("YYYY-MM-DDTHH:mm:ss"). `ocupadas`: citas activas que ya hay en la base.
function generarDemo({ ahora, ocupadas = [], total = 72 }) {
  const azar = crearAzar(20260929);
  const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

  const hoy = ahora.slice(0, 10);
  const hasta = sumarDias(hoy, DIAS_ADELANTE);

  // Agenda por día: [inicio, fin] en minutos. Arranca con lo que ya está reservado.
  const agenda = new Map();
  const delDia = (fecha) => agenda.get(fecha) || agenda.set(fecha, []).get(fecha);
  for (const c of ocupadas) {
    const inicio = aMinutos(c.date_cita.slice(11, 16));
    delDia(c.date_cita.slice(0, 10)).push([inicio, inicio + Math.max(parseInt(c.time_cita, 10) || 1, 1) * 60]);
  }

  // Busca un hueco desde `fecha` (hasta 10 días después). Devuelve la cita o null.
  function colocar(fecha, horas, turno) {
    for (let i = 0; i < 10 && fecha <= hasta; i++, fecha = sumarDias(fecha, 1)) {
      const sabado = diaSemana(fecha) === 6;
      const dia = delDia(fecha);
      if (dia.length >= (sabado ? MAX_POR_DIA.sabado : MAX_POR_DIA.semana)) continue;

      const candidatos = [];
      for (let inicio = 7 * 60; inicio <= 18 * 60; inicio += 30) {
        const fin = inicio + horas * 60;
        if (validarHorario(`${fecha}T${aHora(inicio)}:00`, horas)) continue;      // fuera del horario de atención
        if (!sabado && inicio < 13 * 60 + 30 && fin > 12 * 60) continue;          // pausa del mediodía
        if (dia.some(([desde, hastaMin]) => inicio < hastaMin && desde < fin)) continue; // ocupado
        // Primero el turno que prefiere el paciente; las horas en punto son las más pedidas
        const preferido = turno === 'mañana' ? inicio < 12 * 60 : inicio >= 13 * 60 + 30;
        candidatos.push({ inicio, orden: azar() + (preferido ? 0 : 1) + (inicio % 60 ? 0.35 : 0) });
      }
      if (!candidatos.length) continue;

      const { inicio } = candidatos.sort((a, b) => a.orden - b.orden)[0];
      dia.push([inicio, inicio + horas * 60]);
      return { fecha, inicio, horas };
    }
    return null;
  }

  // Las que ya terminaron: completadas (algunas canceladas). Las que vienen: confirmadas o pendientes.
  function estado({ fecha, inicio, horas }, puedeCancelarse) {
    const r = azar();
    const pasada = `${fecha}T${aHora(inicio + horas * 60)}:00` <= ahora;
    if (puedeCancelarse && r < (pasada ? 0.1 : 0.05)) return 'CANCELADA';
    if (pasada) return 'COMPLETADA';
    return azar() < (fecha <= sumarDias(hoy, 7) ? 0.6 : 0.35) ? 'CONFIRMADA' : 'PENDIENTE';
  }

  // Visitas de un tratamiento, en orden y con días razonables entre una y otra.
  // Una visita cancelada se reprograma unos días después, y recién ahí sigue el tratamiento.
  function agendar(pasos, primera, turno) {
    const citas = [];
    let objetivo = primera;
    let ultima = null; // día de la última visita agendada
    tratamiento: for (const [motivo, horas, dias] of pasos) {
      if (ultima) objetivo = sumarDias(ultima, dias + (dias >= 7 ? entero(-1, 2) : 0));
      for (let intento = 0; intento < 2; intento++) {
        const lugar = objetivo <= hasta && colocar(objetivo, horas, turno);
        if (!lugar) break tratamiento;
        const status_cita = estado(lugar, intento === 0);
        citas.push({
          date_cita: `${lugar.fecha}T${aHora(lugar.inicio)}:00`,
          time_cita: String(horas),
          desc_cita: motivo,
          status_cita,
        });
        ultima = lugar.fecha;
        if (status_cita !== 'CANCELADA') break;
        objetivo = sumarDias(lugar.fecha, entero(2, 5));
      }
    }
    return citas;
  }

  // La cuenta de paciente que ya existía recibe primero su tratamiento
  const citasPacienteExistente = agendar(PLAN_EXISTENTE, sumarDias(hoy, -36), 'tarde');

  const pacientes = [];
  const nombresUsados = new Set();
  const emailsUsados = new Set();
  const turnoNombre = { F: 0, M: 0 };

  for (let i = 0; i < total; i++) {
    const sexo = azar() < 0.55 ? 'F' : 'M';
    let nombre, dePila, apellido;
    do {
      dePila = NOMBRES[sexo][turnoNombre[sexo]++ % NOMBRES[sexo].length];
      apellido = elegir(APELLIDOS);
      nombre = `${dePila} ${apellido}${azar() < 0.4 ? ` ${elegir(APELLIDOS)}` : ''}`;
    } while (nombresUsados.has(nombre));
    nombresUsados.add(nombre);

    const grupo = azar();
    const edad = grupo < 0.1 ? entero(6, 12) : grupo < 0.25 ? entero(13, 19) : grupo < 0.8 ? entero(20, 55) : entero(56, 82);

    const posibles = PLANES.filter((p) => edad >= p.edad[0] && edad <= p.edad[1]);
    let sorteo = azar() * posibles.reduce((suma, p) => suma + p.peso, 0);
    const plan = posibles.find((p) => (sorteo -= p.peso) < 0) || posibles[0];

    // Con cuenta propia (se registró por la web) solo algunos adultos; al resto lo cargó el personal
    let email = null;
    if (edad >= 18 && azar() < 0.35) {
      const base = `${sinAcentos(dePila.split(' ')[0])}.${sinAcentos(apellido)}`;
      email = `${base}@example.com`;
      for (let n = 2; emailsUsados.has(email); n++) email = `${base}${n}@example.com`;
      emailsUsados.add(email);
    }

    const citas = agendar(plan.pasos, sumarDias(hoy, entero(-DIAS_ATRAS, 16)), azar() < 0.5 ? 'mañana' : 'tarde');
    if (!citas.length) continue; // sin lugar en la agenda: ese paciente no se crea

    pacientes.push({
      name_paciente: nombre,
      genre_paciente: sexo,
      birth_paciente: sumarDias(hoy, -(edad * 365 + entero(0, 364))),
      dir_paciente: elegir(DIRECCIONES).replace('{n}', entero(2, 68)),
      telf_paciente: `${OPERADORAS[i % OPERADORAS.length]}55501${String(i).padStart(2, '0')}`,
      email,
      citas,
    });
  }

  return { pacientes, citasPacienteExistente };
}

module.exports = { generarDemo };
