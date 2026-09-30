import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Los íconos salen de react-icons: los emojis se dibujan distinto en cada sistema
// (Android, iPhone, Windows) y le restan prolijidad a la interfaz.
// Emoji_Presentation: los que se ven como emoji (🎯📍✅…); FE0F los fuerza (❤️).
const EMOJI = /\p{Emoji_Presentation}|️/u;
const SRC = path.dirname(fileURLToPath(import.meta.url));

function archivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const ruta = path.join(dir, d.name);
    if (d.isDirectory()) return archivos(ruta);
    return /\.(jsx?|css)$/.test(d.name) && !d.name.includes('.test.') ? [ruta] : [];
  });
}

test('ninguna pantalla usa emojis (los íconos son de react-icons)', () => {
  const lista = archivos(SRC);
  expect(lista.some((ruta) => ruta.endsWith('Contact.jsx'))).toBe(true); // revisa de verdad los componentes
  const conEmojis = lista.flatMap((ruta) =>
    fs.readFileSync(ruta, 'utf8').split('\n')
      .map((linea, i) => (EMOJI.test(linea) ? `${path.relative(SRC, ruta)}:${i + 1}: ${linea.trim()}` : null))
      .filter(Boolean));
  expect(conEmojis).toEqual([]);
});
