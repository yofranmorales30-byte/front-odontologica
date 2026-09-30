const db = require('../db/db');
const { ROLES } = require('../middleware/auth');

const ERROR_DOCTOR = 'El doctor indicado no existe o no está activo';

// Doctor de una cita: el indicado (si es un doctor activo) o, si no se indica,
// el único doctor activo de la clínica (null si hay varios o ninguno).
// Devuelve { fk_doctor } o { error }.
async function resolverDoctor(fkDoctor) {
  const result = await db.query(
    `SELECT u.id_user FROM user u
     JOIN rol r ON u.fk_rol = r.id_rol
     WHERE r.nombre_rol = $1 AND u.logic_user = 'A'
     ORDER BY u.id_user`,
    [ROLES.DOCTOR]
  );
  const doctores = result.rows.map((row) => row.id_user);

  if (fkDoctor != null && fkDoctor !== '') {
    const id = Number(fkDoctor);
    return doctores.includes(id) ? { fk_doctor: id } : { error: ERROR_DOCTOR };
  }
  return { fk_doctor: doctores.length === 1 ? doctores[0] : null };
}

module.exports = { resolverDoctor };
