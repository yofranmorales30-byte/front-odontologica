const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { hashPassword } = require('../utils/password');
const { ROLES, ROL_PACIENTE_ID, buildSession } = require('../middleware/auth');
const { ERROR_FECHA, ERROR_OCUPADO, ERROR_ESTADO, normalizeFechaCita, normalizeEstado, validarHorario } = require('../utils/agenda');
const { resolverDoctor } = require('../utils/doctor');
const { esSolapamiento, esEmailDuplicado } = require('../db/errores');

const ERROR_EMAIL = 'Ya existe una cuenta con ese email';
const ERROR_REACTIVAR = 'No se puede reactivar la cita: su horario ya lo ocupa otra cita.';
const ERROR_CAMBIO_SIMULTANEO = 'La cita cambió mientras la editabas. Actualizá la agenda y probá de nuevo.';

// Fecha canónica + horario de atención. Devuelve { date_cita } o { error }.
function validarFechaCita(body) {
  const date_cita = normalizeFechaCita(body.date_cita);
  if (!date_cita) return { error: ERROR_FECHA };
  const errorHorario = validarHorario(date_cita, body.time_cita);
  return errorHorario ? { error: errorHorario } : { date_cita };
}

// Cita + paciente + usuario, con columnas explícitas: key_user nunca sale de la base
const CITA_COMPLETA_SELECT = `
  SELECT c.*,
         p.id_paciente, p.fk_user, p.name_paciente, p.genre_paciente, p.birth_paciente,
         p.dir_paciente, p.telf_paciente, p.logic_paciente,
         u.id_user, u.name_user, u.email_user, u.fk_rol
  FROM paciente p
  INNER JOIN citas c ON p.id_paciente = c.fk_paciente
  LEFT JOIN user u ON p.fk_user = u.id_user`;

// Pacientes con cuenta propia, o cargados por el personal sin cuenta de acceso
const SOLO_PACIENTES = `(u.fk_rol = ${ROL_PACIENTE_ID} OR p.fk_user IS NULL)`;

// Sentencias para crear la ficha del paciente y su cita en un mismo batch.
// fkUserSql: 'last_insert_rowid()' si la cuenta se crea justo antes en el batch, o 'NULL'
function sentenciasPacienteYCita(fkUserSql, body, { status_cita, logic_cita }) {
  const {
    name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente,
    fk_doctor, date_cita, time_cita, desc_cita
  } = body;

  return [
    [
      `INSERT INTO paciente (fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente)
       VALUES (${fkUserSql}, $1, $2, $3, $4, $5, 'A') RETURNING *`,
      [name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente],
    ],
    // last_insert_rowid() es la ficha recién creada
    [
      `INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita)
       VALUES (last_insert_rowid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
      [fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita],
    ],
  ];
}

// Registro público: cuenta de paciente + ficha + primera cita. Devuelve la sesión iniciada.
exports.registrarPaciente = async (req, res) => {
  const { email_user, key_user, name_paciente } = req.body;

  if (!email_user || !key_user || !name_paciente) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }
  const email = String(email_user).trim().toLowerCase();

  const { date_cita, error } = validarFechaCita(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const hash = await hashPassword(key_user);

  try {
    // Da el mensaje amable; la garantía ante registros simultáneos es el índice único
    const existente = await db.query(
      'SELECT id_user FROM user WHERE LOWER(email_user) = $1',
      [email]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: ERROR_EMAIL });
    }

    const doctor = await resolverDoctor(req.body.fk_doctor);
    if (doctor.error) {
      return res.status(400).json({ error: doctor.error });
    }

    // Cuenta, ficha y cita en un solo batch: si el trigger rechaza la cita, no queda
    // ni la cuenta ni la ficha. El rol y el estado los decide el servidor, nunca el body.
    const cita = { ...req.body, date_cita, fk_doctor: doctor.fk_doctor };
    const [{ rows: [user] }, { rows: [paciente] }] = await db.batch([
      [
        `INSERT INTO user (name_user, email_user, key_user, fk_rol, logic_user)
         VALUES ($1, $2, $3, $4, 'A') RETURNING *`,
        [name_paciente, email, hash, ROL_PACIENTE_ID],
      ],
      ...sentenciasPacienteYCita('last_insert_rowid()', cita, { status_cita: 'PENDIENTE', logic_cita: 'A' }),
    ]);

    res.status(201).json(buildSession({ ...user, ...paciente, nombre_rol: ROLES.PACIENTE }));
  } catch (err) {
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    if (esEmailDuplicado(err)) {
      return res.status(409).json({ error: ERROR_EMAIL });
    }
    errorInterno(res, err);
  }
};

// Alta por el personal: ficha de paciente SIN cuenta de acceso + cita
exports.createCitaCompleta = async (req, res) => {
  if (!req.body.name_paciente) {
    return res.status(400).json({ error: 'El nombre del paciente es requerido' });
  }

  const { date_cita, error } = validarFechaCita(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const estado = {
    status_cita: normalizeEstado(req.body.status_cita || 'PENDIENTE'),
    logic_cita: req.body.logic_cita || 'A',
  };
  if (!estado.status_cita) {
    return res.status(400).json({ error: ERROR_ESTADO });
  }

  try {
    const doctor = await resolverDoctor(req.body.fk_doctor);
    if (doctor.error) {
      return res.status(400).json({ error: doctor.error });
    }

    // Ficha y cita en un solo batch: si el trigger rechaza la cita, tampoco queda la ficha
    const datos = { ...req.body, date_cita, fk_doctor: doctor.fk_doctor };
    const [, { rows: [cita] }] = await db.batch(sentenciasPacienteYCita('NULL', datos, estado));

    res.status(201).json(cita);
  } catch (err) {
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    errorInterno(res, err);
  }
};

async function listarCitas(res, filtroExtra, params = []) {
  try {
    const result = await db.query(
      `${CITA_COMPLETA_SELECT}
       WHERE c.logic_cita = 'A' ${filtroExtra}
       ORDER BY c.date_cita DESC`,
      params
    );
    res.status(200).json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
}

exports.getCitasCompletas = (req, res) =>
  listarCitas(res, `AND ${SOLO_PACIENTES}`);

exports.getCitasVistas = (req, res) =>
  listarCitas(res, `AND ${SOLO_PACIENTES} AND c.status_cita = 'COMPLETADA'`);

exports.getCitasPorVer = (req, res) =>
  listarCitas(res, `AND ${SOLO_PACIENTES} AND c.status_cita = 'CONFIRMADA'`);

// Citas del paciente logueado (el filtro lo hace el servidor con el id del token)
exports.getMisCitas = (req, res) =>
  listarCitas(res, 'AND p.fk_user = $1', [req.user.id_user]);

// Solo horarios ocupados, sin datos de pacientes: lo usan el registro y el formulario de turnos
exports.getDisponibilidad = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT date_cita, time_cita FROM citas WHERE logic_cita = 'A' AND COALESCE(UPPER(status_cita), '') <> 'CANCELADA'"
    );
    res.json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
};

exports.UpdateSatusCita = async (req,res) => {
  const { id } = req.params;
  const status_cita = normalizeEstado(req.body.status_cita);
  if (!status_cita) {
    return res.status(400).json({ error: ERROR_ESTADO });
  }
  try {
    const result = await db.query(
      'UPDATE citas SET status_cita = $1 WHERE id_citas = $2 RETURNING *',
      [ status_cita, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    // El trigger rechaza reactivar una cancelada si su horario ya se ocupó
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_REACTIVAR });
    }
    errorInterno(res, err);
  }

}

exports.UpdateDateCita = async (req,res) => {
  const { id } = req.params;

  const date_cita = normalizeFechaCita(req.body.date_cita);
  if (!date_cita) {
    return res.status(400).json({ error: ERROR_FECHA });
  }

  try {
    const actual = await db.query('SELECT time_cita FROM citas WHERE id_citas = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    const { time_cita } = actual.rows[0];
    const errorHorario = validarHorario(date_cita, time_cita);
    if (errorHorario) {
      return res.status(400).json({ error: errorHorario });
    }

    // Solo si la duración sigue siendo la que se validó (otro pudo cambiarla en el medio)
    const result = await db.query(
      'UPDATE citas SET date_cita = $1 WHERE id_citas = $2 AND time_cita IS $3 RETURNING *',
      [ date_cita, id, time_cita]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: ERROR_CAMBIO_SIMULTANEO });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    errorInterno(res, err);
  }

}

// Cambiar la duración (estirar la cita en el calendario)
exports.UpdateDuracionCita = async (req, res) => {
  const { id } = req.params;

  const horas = Number(req.body.time_cita);
  if (!Number.isInteger(horas) || horas < 1) {
    return res.status(400).json({ error: 'La duración tiene que ser un número entero de horas (mínimo 1).' });
  }

  try {
    const actual = await db.query('SELECT date_cita FROM citas WHERE id_citas = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    const { date_cita } = actual.rows[0];
    const fecha = normalizeFechaCita(date_cita);
    if (!fecha) {
      return res.status(400).json({ error: ERROR_FECHA });
    }
    const errorHorario = validarHorario(fecha, horas);
    if (errorHorario) {
      return res.status(400).json({ error: errorHorario });
    }

    // Solo si la fecha sigue siendo la que se validó (otro pudo moverla en el medio)
    const result = await db.query(
      'UPDATE citas SET time_cita = $1 WHERE id_citas = $2 AND date_cita IS $3 RETURNING *',
      [String(horas), id, date_cita]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: ERROR_CAMBIO_SIMULTANEO });
    }
    res.json(result.rows[0]);
  } catch (err) {
    // El trigger también chequea la duración: estirarla no puede pisar la cita siguiente
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    errorInterno(res, err);
  }
};

exports.logicCita = async (req,res) => {
  const { id } = req.params;
  const { logic_cita } = req.body;
  try {
    const result = await db.query(
      'UPDATE citas SET logic_cita = $1 WHERE id_citas = $2 RETURNING *',
      [ logic_cita, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    // Volver a mostrar una cita oculta también la reactiva
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_REACTIVAR });
    }
    errorInterno(res, err);
  }

}

    /*
      id: id_cita
      title : fk_name_paciente
      start: date_cita
      end : date_cita + time_cita de alguna forma
      description: desc_cita
      sexo: genre_paciente
      birth: birth_paciente
      direccion_paciente: dir_paciente
      telefono: telf_paciente
      status : status_cita
   */
