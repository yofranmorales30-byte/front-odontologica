const db = require('../db/db');
const { errorInterno } = require('../middleware/manejoErrores');
const { verifyPassword } = require('../utils/password');
const { buildSession } = require('../middleware/auth');

// Datos de la sesión: usuario, rol y (si es paciente) su ficha
const SESION_SELECT = `
  SELECT u.id_user, u.name_user, u.email_user, u.key_user, u.fk_rol, r.nombre_rol,
         p.id_paciente, p.name_paciente, p.genre_paciente, p.birth_paciente, p.dir_paciente, p.telf_paciente
  FROM "user" u
  JOIN "rol" r ON u.fk_rol = r.id_rol
  LEFT JOIN "paciente" p ON u.id_user = p.fk_user`;

exports.login = async (req, res) => {
  const { email_user, key_user } = req.body;

  if (!email_user || !key_user) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const result = await db.query(
      `${SESION_SELECT}
       WHERE LOWER(u.email_user) = LOWER($1) AND u.logic_user = 'A'`,
      [String(email_user).trim()]
    );

    // Puede haber emails duplicados de datos viejos: vale la primera fila cuya contraseña coincida
    let user = null;
    for (const row of result.rows) {
      if (await verifyPassword(key_user, row.key_user)) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    res.json(buildSession(user));
  } catch (err) {
    errorInterno(res, err);
  }
};

// Recupera la sesión al recargar la página: valida el token contra la base
// (un usuario dado de baja pierde el acceso aunque su token no haya vencido)
// y devuelve los datos con un token nuevo.
exports.me = async (req, res) => {
  try {
    const result = await db.query(
      `${SESION_SELECT}
       WHERE u.id_user = $1 AND u.logic_user = 'A'`,
      [req.user.id_user]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
    res.json(buildSession(result.rows[0]));
  } catch (err) {
    errorInterno(res, err);
  }
};
