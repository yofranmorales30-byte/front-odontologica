// Errores inesperados: el detalle queda en el log del servidor y al cliente le llega
// un mensaje genérico (un err.message de SQL revela tablas, columnas y consultas).
function errorInterno(res, err) {
  console.error('❌ Error interno:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

// Para cualquier ruta que no existe (antes Express respondía con HTML)
function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// Último middleware: JSON mal formado y errores que se escaparon de un handler
// (Express 5 manda acá los rechazos de los handlers async)
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande' });
  }
  errorInterno(res, err);
}

module.exports = { errorInterno, rutaNoEncontrada, manejadorErrores };
