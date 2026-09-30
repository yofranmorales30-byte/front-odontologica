// Utilidades para los tests de integración: levantan el servidor real contra una base temporal.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createClient } = require('@libsql/client');

const BACKEND = path.join(__dirname, '..');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function baseTemporal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'armonia-test-'));
  return path.join(dir, 'test.db');
}

// Siempre un archivo local: los tests nunca usan la base de Turso del .env
const urlBase = (dbPath) => pathToFileURL(dbPath).href;

// Arranca `node src/server.js` en un puerto libre. Si la base es nueva, lee del log
// las credenciales aleatorias del seed. `creds` permite reusarlas al reiniciar.
async function levantarServidor({ dbPath = baseTemporal(), creds = {}, env = {} } = {}) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: BACKEND,
    env: {
      ...process.env,
      PORT: '0',
      TURSO_DATABASE_URL: urlBase(dbPath),
      TURSO_AUTH_TOKEN: '',
      JWT_SECRET: 'secreto-de-test',
      CLINIC_TZ: 'America/Caracas',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let salida = '';
  child.stderr.on('data', (d) => { salida += d; });
  const terminado = new Promise((resolve) => child.once('exit', resolve));

  const port = await new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => {
      salida += d;
      const m = salida.match(/Server is running on port (\d+)/);
      if (m) resolve(Number(m[1]));
    });
    terminado.then((code) => reject(new Error(`El servidor terminó (código ${code}):\n${salida}`)));
  });

  const base = `http://127.0.0.1:${port}/api`;

  async function api(method, ruta, { token, body, raw } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + ruta, {
      method,
      headers,
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const texto = await res.text();
    let data = null;
    try { data = JSON.parse(texto); } catch { /* respuesta sin JSON */ }
    return { status: res.status, data, texto, tipo: res.headers.get('content-type') || '' };
  }

  // Confirma que la API ya responde (la base se inicializa antes de escuchar)
  await api('GET', '/disponibilidad');

  const credenciales = { ...creds };
  for (const m of salida.matchAll(/'([^']+@[^']+)'\s*│\s*'([^']+)'/g)) credenciales[m[1]] = m[2];

  async function login(email, clave = credenciales[email]) {
    const r = await api('POST', '/login', { body: { email_user: email, key_user: clave } });
    return r.data?.token;
  }

  return {
    dbPath,
    creds: credenciales,
    api,
    login,
    salida: () => salida,
    async detener() {
      child.kill();
      await terminado;
    },
  };
}

// Acceso directo a la base (sin pasar por la API), con el servidor detenido
function abrirBase(dbPath) {
  const client = createClient({ url: urlBase(dbPath) });
  return {
    // Resultado de libSQL (rowsAffected, lastInsertRowid…)
    run: (sql, args = []) => client.execute({ sql, args }),
    // Filas como arrays de valores, en el orden de las columnas
    async valores(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return rs.rows.map((row) => rs.columns.map((_, i) => row[i]));
    },
    cerrar: () => client.close(),
  };
}

// Datos mínimos para dar de alta un paciente con su cita
function ficha(nombre, date_cita, extra = {}) {
  return {
    name_paciente: nombre, genre_paciente: 'F', birth_paciente: '1990-01-01', dir_paciente: '', telf_paciente: '',
    date_cita, time_cita: '1', desc_cita: 'control', ...extra,
  };
}

const conteo = (respuestas) =>
  respuestas.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

module.exports = { levantarServidor, abrirBase, baseTemporal, urlBase, ficha, conteo, esperar };
