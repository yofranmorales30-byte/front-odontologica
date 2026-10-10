// npm run migrar: prepara la base del .env (tablas, datos semilla, migraciones y
// reglas de la agenda) sin levantar el servidor. La API en Vercel no lo hace sola:
// correrlo contra Turso la primera vez y cada vez que cambie el schema.
require('dotenv').config();
const { prepararBase } = require('./db');

// Sin process.exit(): el proceso termina solo cuando se cierran las conexiones. Forzar la
// salida justo después de hablar con Turso puede hacer fallar a Node en Windows.
prepararBase()
  .then(() => console.log('✅ Base de datos lista'))
  .catch((err) => {
    console.error('❌ No se pudo preparar la base de datos:', err.message);
    process.exitCode = 1;
  });
