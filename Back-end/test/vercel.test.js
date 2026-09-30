// Modo Vercel: src/server.js se importa (no se ejecuta). Tiene que exportar la app sin
// escuchar un puerto ni preparar la base, y fallar con un mensaje claro si falta configuración.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { baseTemporal, urlBase } = require('./helpers');

const BACKEND = path.join(__dirname, '..');

// Antes de importar la app: base local temporal y el entorno que pone Vercel
Object.assign(process.env, {
  TURSO_DATABASE_URL: urlBase(baseTemporal()),
  TURSO_AUTH_TOKEN: '',
  JWT_SECRET: 'secreto-de-test',
  CLINIC_TZ: 'America/Caracas',
  VERCEL: '1',
});
const app = require('../src/server');
const db = require('../src/db/db');
const { hashPassword } = require('../src/utils/password');

let servidor, base;
before(async () => {
  // Lo que hace Vercel con la app exportada: la atiende en su propio servidor
  servidor = http.createServer(app).listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => new Promise((resolve) => servidor.close(resolve)));

async function api(method, ruta, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + ruta, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

test('importar server.js exporta la app y no prepara la base', async () => {
  assert.equal(typeof app, 'function');
  const salud = await api('GET', '/salud');
  assert.equal(salud.status, 503, 'sin npm run migrar la base no tiene tablas');
  assert.equal(salud.data.ok, false);
});

test('después de preparar la base, la API funciona sin servidor propio ni job', async () => {
  // Lo mismo que hace npm run migrar (sin mostrar las credenciales del seed)
  const { log, table } = console;
  console.log = console.table = () => {};
  try {
    await db.prepararBase();
  } finally {
    Object.assign(console, { log, table });
  }
  assert.deepEqual((await api('GET', '/salud')).data, { ok: true });

  // El seed genera contraseñas al azar: se le pone una conocida al admin
  await db.query(`UPDATE "user" SET key_user = $1 WHERE email_user = 'admin@odontologia.com'`, [await hashPassword('clave-de-test')]);
  const login = await api('POST', '/login', { body: { email_user: 'admin@odontologia.com', key_user: 'clave-de-test' } });
  assert.equal(login.status, 200);

  // La cita del seed ya terminó: se completa al consultarla, sin setInterval
  const citas = await api('GET', '/citaCompleta', { token: login.data.token });
  assert.equal(citas.data.find((c) => c.desc_cita === 'Limpieza dental').status_cita, 'COMPLETADA');
});

test('en Vercel, sin JWT_SECRET o sin TURSO_DATABASE_URL falla con un mensaje claro', () => {
  const importar = (env) => spawnSync(process.execPath, ['-e', "require('./src/server')"], {
    cwd: BACKEND,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

  const sinSecreto = importar({ JWT_SECRET: '' });
  assert.notEqual(sinSecreto.status, 0);
  assert.match(sinSecreto.stderr, /Falta JWT_SECRET/);

  const sinBase = importar({ TURSO_DATABASE_URL: '' });
  assert.notEqual(sinBase.status, 0);
  assert.match(sinBase.stderr, /Falta TURSO_DATABASE_URL/);
});
