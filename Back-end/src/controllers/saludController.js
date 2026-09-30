const db = require('../db/db');

// Para comprobar un despliegue: la API responde y la base está preparada
exports.salud = async (req, res) => {
  try {
    await db.query('SELECT COUNT(*) FROM rol');
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ La base no responde o no está preparada (¿falta correr npm run migrar?):', err.message);
    res.status(503).json({ ok: false, error: 'La base de datos no está disponible' });
  }
};
