require('dotenv').config(); // Debe ir primero: auth.js y db.js leen process.env al cargarse
const express = require('express');
const cors = require('cors'); // Importa el paquete cors
const app = express();
const MainRoutes = require('./routes/MainRoutes');
const db = require('./db/db');
const { rutaNoEncontrada, manejadorErrores } = require('./middleware/manejoErrores');

// Middleware
app.use(express.json()); // Para parsear JSON en las solicitudes
app.use(cors()); // Habilita CORS para todas las rutas

// Rutas
app.use('/api', MainRoutes);

// Siempre JSON: 404 para rutas inexistentes, 400 para JSON mal formado, 500 genérico
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

// En Vercel este archivo se importa: la app se exporta y Vercel la corre como función,
// sin escuchar un puerto ni preparar la base (eso se hace con `npm run migrar`)
module.exports = app;

// Con `node src/server.js` (desarrollo, tests o un servidor propio): prepara la base y escucha
if (require.main === module) {
  // 3001 por defecto: es donde lo busca el frontend (VITE_API_URL en Front-end)
  const PORT = process.env.PORT || 3001;
  db.prepararBase()
    .then(() => {
      const server = app.listen(PORT, () => {
        // El puerto real (con PORT=0 lo elige el sistema: así corren los tests en paralelo)
        console.log(`Server is running on port ${server.address().port}`);
      });
    })
    .catch((err) => {
      console.error('❌ No se pudo preparar la base de datos:', err.message);
      process.exit(1);
    });
}
