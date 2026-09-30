// Reglas que impone la propia base (ver db.js) y cómo reconocer sus errores.
// Son la garantía contra carreras: el chequeo y la escritura ocurren en la misma
// sentencia SQL, así que dos requests simultáneas nunca pueden pasar las dos.

// Mensaje del trigger que rechaza citas superpuestas
const CITA_SOLAPADA = 'CITA_SOLAPADA';

// Índice único sobre LOWER(email_user)
const UX_USER_EMAIL = 'ux_user_email';

// libSQL incluye el error de SQLite en el mensaje, p. ej. "SQLITE_CONSTRAINT: … CITA_SOLAPADA"
const mensaje = (err) => String(err?.message ?? err);

const esSolapamiento = (err) => mensaje(err).includes(CITA_SOLAPADA);
const esEmailDuplicado = (err) => mensaje(err).includes(UX_USER_EMAIL);

// Clave foránea: referencia a una fila que no existe, o borrar una fila que otras usan
const esViolacionFK = (err) => mensaje(err).includes('FOREIGN KEY constraint failed');

module.exports = { CITA_SOLAPADA, UX_USER_EMAIL, esSolapamiento, esEmailDuplicado, esViolacionFK };
