// Geometría del tutorial: qué parte de la pantalla queda iluminada y dónde va la tarjeta que explica.
// Todo en píxeles de la ventana (lo que devuelve getBoundingClientRect).

export const SEPARACION = 14; // entre el hueco iluminado y la tarjeta
export const BORDE = 12; // mínimo entre la tarjeta y los bordes de la pantalla
const AIRE = 6; // el hueco es un poco más grande que el elemento
const ALTO_MAXIMO = 0.36; // de un elemento muy alto (una lista) se ilumina solo el comienzo
const ESQUINA = 28; // la flecha no llega a las esquinas redondeadas de la tarjeta

const limitar = (valor, minimo, maximo) => Math.max(minimo, Math.min(valor, Math.max(minimo, maximo)));

// Rectángulo que encierra a todos los elementos marcados con ese objetivo, o null si no están en pantalla
export function medir(objetivo) {
  if (!objetivo) return null;
  const rects = [...document.querySelectorAll(`[data-tutorial~="${objetivo}"]`)]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (rects.length === 0) return null;

  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  return {
    top,
    left,
    width: Math.max(...rects.map((r) => r.right)) - left,
    height: Math.max(...rects.map((r) => r.bottom)) - top,
  };
}

// El hueco iluminado para ese rectángulo: con aire alrededor, sin salirse de la pantalla
export function hueco(rect, pantalla) {
  if (!rect) return null;
  const top = Math.max(4, rect.top - AIRE);
  const left = Math.max(4, rect.left - AIRE);
  const alto = Math.min(rect.top + rect.height + AIRE, pantalla.alto - 4) - top;
  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(Math.min(rect.left + rect.width + AIRE, pantalla.ancho - 4) - left),
    height: Math.round(Math.min(alto, pantalla.alto * ALTO_MAXIMO)),
  };
}

// Cuánto hay que desplazar la página para que el elemento quede a la vista con lugar para la tarjeta.
// 0 si ya está bien (siempre es el caso de lo que está fijo: el menú y la barra de arriba).
export function desplazamiento(rect, tarjeta, pantalla) {
  const alto = Math.min(rect.height, pantalla.alto * ALTO_MAXIMO);
  const lugarVertical = tarjeta.alto + SEPARACION + BORDE;
  const lugarHorizontal = tarjeta.ancho + SEPARACION + BORDE;
  const seVe = rect.top >= 8 && rect.top + alto <= pantalla.alto - 8;
  const entraLaTarjeta =
    rect.top >= lugarVertical ||
    pantalla.alto - rect.top - alto >= lugarVertical ||
    rect.left >= lugarHorizontal ||
    pantalla.ancho - rect.left - rect.width >= lugarHorizontal;
  if (seVe && entraLaTarjeta) return 0;
  // El elemento arriba y la tarjeta debajo, centrados entre los dos
  return Math.round(rect.top - Math.max(16, (pantalla.alto - alto - lugarVertical) / 2));
}

// Dónde va la tarjeta: del lado pedido si entra, si no del lado donde sobra más lugar.
// Sin hueco, al centro. `flecha` es la distancia desde la esquina de la tarjeta hasta el centro del hueco.
export function ubicar(huecoActual, tarjeta, pantalla, preferido) {
  if (!huecoActual) {
    return {
      lado: 'centro',
      top: Math.round(Math.max(BORDE, (pantalla.alto - tarjeta.alto) / 2)),
      left: Math.round(Math.max(BORDE, (pantalla.ancho - tarjeta.ancho) / 2)),
      flecha: 0,
    };
  }

  const abajo = huecoActual.top + huecoActual.height;
  const derecha = huecoActual.left + huecoActual.width;
  const sobra = {
    abajo: pantalla.alto - abajo - tarjeta.alto,
    arriba: huecoActual.top - tarjeta.alto,
    derecha: pantalla.ancho - derecha - tarjeta.ancho,
    izquierda: huecoActual.left - tarjeta.ancho,
  };
  const conMasLugar = Object.keys(sobra).reduce((a, b) => (sobra[b] > sobra[a] ? b : a));
  const lado = sobra[preferido] >= SEPARACION + BORDE ? preferido : conMasLugar;
  const vertical = lado === 'abajo' || lado === 'arriba';
  const centroX = huecoActual.left + huecoActual.width / 2;
  const centroY = huecoActual.top + huecoActual.height / 2;

  const left = limitar(
    vertical ? centroX - tarjeta.ancho / 2 : lado === 'derecha' ? derecha + SEPARACION : huecoActual.left - SEPARACION - tarjeta.ancho,
    BORDE,
    pantalla.ancho - tarjeta.ancho - BORDE
  );
  const top = limitar(
    !vertical ? centroY - tarjeta.alto / 2 : lado === 'abajo' ? abajo + SEPARACION : huecoActual.top - SEPARACION - tarjeta.alto,
    BORDE,
    pantalla.alto - tarjeta.alto - BORDE
  );
  const flecha = vertical
    ? limitar(centroX - left, ESQUINA, tarjeta.ancho - ESQUINA)
    : limitar(centroY - top, ESQUINA, tarjeta.alto - ESQUINA);

  return { lado, top: Math.round(top), left: Math.round(left), flecha: Math.round(flecha) };
}
