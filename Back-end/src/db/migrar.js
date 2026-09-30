// npm run migrar: prepara la base del .env (tablas, datos semilla, migraciones y
// reglas de la agenda) sin levantar el servidor. La API en Vercel no lo hace sola:
// correrlo contra Turso la primera vez y cada vez que cambie el schema.
require('dotenv').config();
const { prepararBase } = require('./db');

prepararBase()
  .then(() => {
    console.log('✅ Base de datos lista');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ No se pudo preparar la base de datos:', err.message);
    process.exit(1);
  });
