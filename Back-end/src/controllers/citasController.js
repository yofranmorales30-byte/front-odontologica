const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { ROLES } = require('../middleware/auth');
const { ERROR_FECHA, ERROR_OCUPADO, ERROR_ESTADO, normalizeFechaCita, normalizeEstado, validarHorario } = require('../utils/agenda');
const { resolverDoctor } = require('../utils/doctor');
const { esSolapamiento, esViolacionFK } = require('../db/errores');

const ERROR_PACIENTE = 'El paciente indicado (fk_paciente) no existe';

// Obtener todas las citas
exports.getCitas = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM citas ORDER BY id_citas');
    res.json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Obtener una cita por ID
exports.getCitaById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM citas WHERE id_citas = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Crear una cita nueva
exports.createCita = async (req, res) => {
  let { fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita } = req.body;

  // Un paciente solo puede sacar turnos para sí mismo y siempre quedan pendientes
  if (req.user.nombre_rol === ROLES.PACIENTE) {
    if (!req.user.id_paciente) {
      return res.status(400).json({ error: 'Tu usuario no tiene una ficha de paciente asociada' });
    }
    fk_paciente = req.user.id_paciente;
    status_cita = 'PENDIENTE';
    logic_cita = 'A';
  }

  status_cita = normalizeEstado(status_cita ?? 'PENDIENTE');
  if (!status_cita) {
    return res.status(400).json({ error: ERROR_ESTADO });
  }
  date_cita = normalizeFechaCita(date_cita);
  if (!date_cita) {
    return res.status(400).json({ error: ERROR_FECHA });
  }
  const errorHorario = validarHorario(date_cita, time_cita);
  if (errorHorario) {
    return res.status(400).json({ error: errorHorario });
  }

  //fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita
  try {
    // Sin fk_doctor en el body se asigna el doctor de la clínica
    const doctor = await resolverDoctor(fk_doctor);
    if (doctor.error) {
      return res.status(400).json({ error: doctor.error });
    }
    fk_doctor = doctor.fk_doctor;

    const result = await db.query(
      'INSERT INTO citas (fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [ fk_paciente, fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // El trigger de la base rechaza horarios superpuestos, aunque lleguen dos requests a la vez
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_PACIENTE });
    }
    errorInterno(res, err);
  }
};

// Actualizar una cita
exports.updateCita = async (req, res) => {
  const { id } = req.params;
  const { fk_paciente, time_cita, desc_cita, logic_cita } = req.body;

  const status_cita = normalizeEstado(req.body.status_cita);
  if (!status_cita) {
    return res.status(400).json({ error: ERROR_ESTADO });
  }
  const date_cita = normalizeFechaCita(req.body.date_cita);
  if (!date_cita) {
    return res.status(400).json({ error: ERROR_FECHA });
  }
  const errorHorario = validarHorario(date_cita, time_cita);
  if (errorHorario) {
    return res.status(400).json({ error: errorHorario });
  }

  try {
    const doctor = await resolverDoctor(req.body.fk_doctor);
    if (doctor.error) {
      return res.status(400).json({ error: doctor.error });
    }

    const result = await db.query(
      'UPDATE citas SET fk_paciente = $1, fk_doctor = $2, date_cita = $3, time_cita = $4, desc_cita = $5, status_cita = $6, logic_cita = $7 WHERE id_citas = $8 RETURNING *',
      [ fk_paciente, doctor.fk_doctor, date_cita, time_cita, desc_cita, status_cita, logic_cita , id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (esSolapamiento(err)) {
      return res.status(409).json({ error: ERROR_OCUPADO });
    }
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_PACIENTE });
    }
    errorInterno(res, err);
  }
};

// Eliminar una cita
exports.deleteCita = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM citas WHERE id_citas = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ message: 'Cita eliminada' });
  } catch (err) {
    errorInterno(res, err);
  }
};
