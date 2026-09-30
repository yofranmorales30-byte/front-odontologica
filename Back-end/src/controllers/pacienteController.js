const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { esViolacionFK } = require('../db/errores');

const ERROR_USUARIO = 'El usuario indicado (fk_user) no existe';

// Obtener todos los pacientes
exports.getPacientes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM paciente ORDER BY id_paciente');
    res.json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Obtener un paciente por ID
exports.getPacienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM paciente WHERE id_paciente = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Crear un paciente nuevo
exports.createPaciente = async (req, res) => {
  const { fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente } = req.body;
  
  //fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente
  try {
    const result = await db.query(
      'INSERT INTO paciente (fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [ fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_USUARIO });
    }
    errorInterno(res, err);
  }
};

// Actualizar un paciente
exports.updatePaciente = async (req, res) => {
  const { id } = req.params;
  const { fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente } = req.body;
  try {
    const result = await db.query(
      'UPDATE paciente SET fk_user = $1, name_paciente = $2, genre_paciente = $3, birth_paciente = $4, dir_paciente = $5, telf_paciente = $6, logic_paciente = $7 WHERE id_paciente = $8 RETURNING *',
      [ fk_user, name_paciente, genre_paciente, birth_paciente, dir_paciente, telf_paciente, logic_paciente , id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_USUARIO });
    }
    errorInterno(res, err);
  }
};

// Eliminar un paciente
exports.deletePaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM paciente WHERE id_paciente = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'paciente no encontrado' });
    }
    res.json({ message: 'paciente borrado exitosamente!' });
  } catch (err) {
    if (esViolacionFK(err)) {
      return res.status(409).json({ error: 'No se puede borrar: el paciente tiene citas. Ocultalo con logic_paciente = I.' });
    }
    errorInterno(res, err);
  }
};
