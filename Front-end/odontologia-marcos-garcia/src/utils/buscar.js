// Búsqueda de las tablas: no distingue mayúsculas ni acentos ("garcia" encuentra "García")

export function normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Un teléfono se puede escribir con guiones, puntos o paréntesis: también se compara solo por sus dígitos
const esNumero = (palabra) => /^[\d().+-]+$/.test(palabra) && /\d/.test(palabra);
const soloDigitos = (palabra) => palabra.replace(/\D/g, '');

// Las filas que tienen todas las palabras buscadas, en cualquier orden.
// - `campos(fila)`: los textos de esa fila donde se busca; alcanza con un pedazo ("valen" → "Valentina").
// - `categorias(fila)`: datos con pocos valores posibles (sexo, estado). Se encuentran solo por su
//   comienzo ("pend" → "Pendiente"): si no, buscar el apellido "Niño" traería a todas las de sexo "Femenino".
export function filtrar(filas, busqueda, campos, categorias = () => []) {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return filas;

    return filas.filter((fila) => {
        const texto = normalizar(campos(fila).filter(Boolean).join(' '));
        const etiquetas = categorias(fila).map(normalizar);
        return palabras.every((palabra) =>
            texto.includes(palabra)
            || (esNumero(palabra) && texto.includes(soloDigitos(palabra)))
            || (palabra.length >= 3 && etiquetas.some((etiqueta) => etiqueta.startsWith(palabra))));
    });
}
