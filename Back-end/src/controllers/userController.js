const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { hashPassword } = require('../utils/password');
const { esEmailDuplicado, esViolacionFK } = require('../db/errores');

const ERROR_EMAIL = 'Ya existe una cuenta con ese email';
const ERROR_ROL = 'El rol indicado (fk_rol) no existe';

// Columnas públicas: key_user nunca sale de la base
const PUBLIC_COLUMNS = 'id_user, name_user, email_user, fk_rol, logic_user';

function sinClave(row) {
  const { key_user, ...publico } = row;
  return publico;
}

// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM user ORDER BY id_user`);
    res.json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM user WHERE id_user = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Crear un usuario nuevo
exports.createUser = async (req, res) => {
  const { name_user, email_user, key_user, fk_rol, logic_user } = req.body;

  if (!key_user) {
    return res.status(400).json({ error: 'La contraseña es requerida' });
  }

  //name_user, email_user, key_user, fk_rol, logic_user
  try {
    const hash = await hashPassword(key_user);
    const result = await db.query(
      'INSERT INTO user (name_user, email_user, key_user, fk_rol, logic_user) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [ name_user, email_user, hash, fk_rol, logic_user ]
    );
    res.status(201).json(sinClave(result.rows[0]));
  } catch (err) {
    if (esEmailDuplicado(err)) {
      return res.status(409).json({ error: ERROR_EMAIL });
    }
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_ROL });
    }
    errorInterno(res, err);
  }
};

// Actualizar un usuario
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name_user, email_user, key_user, fk_rol, logic_user } = req.body;
  try {
    // Sin key_user en el body se conserva la contraseña actual
    const hash = key_user ? await hashPassword(key_user) : null;
    const result = await db.query(
      'UPDATE user SET name_user = $1, email_user = $2, key_user = COALESCE($3, key_user), fk_rol = $4, logic_user = $5 WHERE id_user = $6 RETURNING *',
      [ name_user, email_user, hash, fk_rol, logic_user , id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(sinClave(result.rows[0]));
  } catch (err) {
    if (esEmailDuplicado(err)) {
      return res.status(409).json({ error: ERROR_EMAIL });
    }
    if (esViolacionFK(err)) {
      return res.status(400).json({ error: ERROR_ROL });
    }
    errorInterno(res, err);
  }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM user WHERE id_user = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'usuario no encontrado' });
    }
    res.json({ message: 'usuario borrado exitosamente!' });
  } catch (err) {
    if (esViolacionFK(err)) {
      return res.status(409).json({ error: 'No se puede borrar: el usuario tiene una ficha de paciente. Desactivalo con logic_user = I.' });
    }
    errorInterno(res, err);
  }
};
