const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { esViolacionFK } = require('../db/errores');

// Obtener todos los roles
exports.getRols = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rol ORDER BY id_rol');
    res.json(result.rows);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Obtener un rol por ID
exports.getRolById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM rol WHERE id_rol = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Crear un rol nuevo
exports.createRol = async (req, res) => {
  const { nombre_rol, desc_rol, logic_rol } = req.body;
  
  //nombre_rol, desc_rol, logic_rol
  try {
    const result = await db.query(
      'INSERT INTO rol (nombre_rol, desc_rol, logic_rol) VALUES ($1, $2, $3) RETURNING *',
      [ nombre_rol, desc_rol, logic_rol ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Actualizar un rol
exports.updateRol = async (req, res) => {
  const { id } = req.params;
  const { nombre_rol, desc_rol, logic_rol } = req.body;
  try {
    const result = await db.query(
      'UPDATE rol SET nombre_rol = $1, desc_rol = $2, logic_rol = $3 WHERE id_rol = $4 RETURNING *',
      [ nombre_rol, desc_rol, logic_rol , id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    errorInterno(res, err);
  }
};

// Eliminar un rol
exports.deleteRol = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM rol WHERE id_rol = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'rol no encontrado' });
    }
    res.json({ message: 'rol borrado exitosamente!' });
  } catch (err) {
    if (esViolacionFK(err)) {
      return res.status(409).json({ error: 'No se puede borrar: hay usuarios con ese rol.' });
    }
    errorInterno(res, err);
  }
};
