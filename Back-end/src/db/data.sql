-- ============================================================
-- SCHEMA PARA ODONTOLOGÍA (SQLite)
-- ============================================================
-- NOTA: Este archivo es referencia. La inicialización real
-- se hace automáticamente desde src/db/db.js al arrancar.
-- ============================================================

CREATE TABLE IF NOT EXISTS "rol" (
  id_rol    INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_rol TEXT NOT NULL,
  desc_rol   TEXT,
  logic_rol  TEXT DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS "user" (
  id_user    INTEGER PRIMARY KEY AUTOINCREMENT,
  name_user  TEXT NOT NULL,
  email_user TEXT NOT NULL,
  key_user   TEXT NOT NULL,
  fk_rol     INTEGER REFERENCES "rol"(id_rol),
  logic_user TEXT DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS "paciente" (
  id_paciente    INTEGER PRIMARY KEY AUTOINCREMENT,
  fk_user        INTEGER REFERENCES "user"(id_user),
  name_paciente  TEXT NOT NULL,
  genre_paciente TEXT,
  birth_paciente TEXT,
  dir_paciente   TEXT,
  telf_paciente  TEXT,
  logic_paciente TEXT DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS "citas" (
  id_citas    INTEGER PRIMARY KEY AUTOINCREMENT,
  fk_paciente INTEGER REFERENCES "paciente"(id_paciente),
  fk_doctor   INTEGER,
  date_cita   TEXT,  -- hora local de la clínica, sin zona: YYYY-MM-DDTHH:mm:ss
  time_cita   TEXT,  -- duración en horas ("1", "2")
  desc_cita   TEXT,
  status_cita TEXT,
  logic_cita  TEXT DEFAULT 'A'
);

-- ============================================================
-- SEED DATA
-- ============================================================
-- Los datos semilla se crean desde src/db/db.js (initDatabase),
-- con contraseñas aleatorias hasheadas con bcrypt que se muestran
-- una sola vez en consola. No agregar usuarios con key_user en
-- texto plano acá: el login compara contra hashes de bcrypt.
