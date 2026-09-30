const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

// Un hash de bcrypt siempre empieza con $2a$, $2b$ o $2y$ seguido del costo
function isHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Versión síncrona: solo para el arranque (seed y migración), nunca dentro de una request
function hashPasswordSync(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!isHashed(hash)) return false;
  return bcrypt.compare(plain, hash);
}

// Contraseña aleatoria legible (para el seed inicial)
function randomPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

module.exports = { isHashed, hashPassword, hashPasswordSync, verifyPassword, randomPassword };
