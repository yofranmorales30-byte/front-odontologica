const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Nombres tal como están en la tabla "rol"
const ROLES = {
  ADMIN: 'Administrador',
  DOCTOR: 'Doctor',
  ASISTENTE: 'Asistente',
  PACIENTE: 'Paciente',
};

// id_rol del rol Paciente (sembrado en db.js)
const ROL_PACIENTE_ID = 4;

const TOKEN_TTL = '8h';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // En Vercel corren varias instancias: cada una inventaría su propio secreto y las
  // sesiones fallarían al azar según qué instancia atienda la request
  if (process.env.VERCEL) {
    throw new Error('Falta JWT_SECRET en las variables de entorno del proyecto de Vercel.');
  }
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET no está definido en .env: se generó uno temporal. Las sesiones se invalidan al reiniciar el servidor.');
}

// Arma la respuesta de login/registro: datos públicos del usuario + token firmado
function buildSession(user) {
  const token = jwt.sign(
    {
      id_user: user.id_user,
      fk_rol: user.fk_rol,
      nombre_rol: user.nombre_rol,
      id_paciente: user.id_paciente ?? null,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  return {
    token,
    id_user: user.id_user,
    name_user: user.name_user,
    email_user: user.email_user,
    fk_rol: user.fk_rol,
    nombre_rol: user.nombre_rol,
    id_paciente: user.id_paciente,
    name_paciente: user.name_paciente,
    genre_paciente: user.genre_paciente,
    birth_paciente: user.birth_paciente,
    dir_paciente: user.dir_paciente,
    telf_paciente: user.telf_paciente,
  };
}

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Necesitás iniciar sesión' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.nombre_rol)) {
      return res.status(403).json({ error: 'No tenés permiso para esta acción' });
    }
    next();
  };
}

module.exports = { ROLES, ROL_PACIENTE_ID, buildSession, requireAuth, requireRole };
