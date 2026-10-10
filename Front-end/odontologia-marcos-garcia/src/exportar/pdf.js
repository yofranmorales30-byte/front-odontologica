// PDF de una tabla (un listado para imprimir o compartir), sin librerías.
// Hoja A4 vertical y tipografía Helvetica, que traen todos los lectores de PDF: no hay que incrustar fuentes.
// Todo se arma como texto de un byte por carácter (así su largo en caracteres es su largo en bytes).

const HOJA = { ancho: 595.28, alto: 841.89 }; // A4, en puntos
const MARGEN = 40;
const LETRA = 9;
const RENGLON = 11.5;
const RELLENO = 6; // dentro de cada celda
const MAX_RENGLONES = 3; // por celda; lo que no entra termina en "…"
const ALTO_ENCABEZADO = 22;
const ALTO_GRUPO = 21;
const ALTO_PIE = 26;

// Colores de la app, en RGB de 0 a 1
const MORADO = '0.361 0.055 0.427';
const LILA = '0.953 0.91 1';
const OSCURO = '0.102 0.102 0.18';
const GRIS = '0.42 0.447 0.502';
const LINEA = '0.898 0.906 0.922';
const FRANJA = '0.976 0.98 0.984';
const BLANCO = '1 1 1';

// Ancho de cada carácter de Helvetica (del 32, el espacio, al 126), en milésimas del tamaño de letra
const ANCHOS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
// Signos que no son una letra con acento (esas miden lo mismo que la letra sola)
const ANCHOS_SIGNOS = {
  0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000,
  0xa0: 278, 0xa1: 333, 0xaa: 370, 0xab: 556, 0xb0: 400, 0xb7: 278, 0xba: 365, 0xbb: 556, 0xbf: 611,
};
// La negrita es un poco más ancha; solo se usa en títulos cortos, alcanza con estimarla
const NEGRITA = 1.08;

// Lo que la codificación WinAnsi tiene fuera de Latin-1: … comillas tipográficas, rayas y viñeta
const FUERA_DE_LATIN1 = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94,
  '•': 0x95, '–': 0x96, '—': 0x97,
};
const PUNTOS_SUSPENSIVOS = String.fromCharCode(0x85);

const escribible = (n) => (n >= 0x20 && n <= 0x7e) || (n >= 0xa0 && n <= 0xff);

// Texto → un byte por carácter. Lo que la tipografía no tiene pasa a su letra sin acento, o a "?".
export function codificar(texto) {
  let bytes = '';
  for (const caracter of String(texto ?? '').normalize('NFC')) {
    const n = caracter.codePointAt(0);
    if (escribible(n)) {
      bytes += caracter;
    } else if (FUERA_DE_LATIN1[caracter]) {
      bytes += String.fromCharCode(FUERA_DE_LATIN1[caracter]);
    } else if (n === 9 || n === 10 || n === 13) {
      bytes += ' ';
    } else if (n >= 0x20) {
      const sinAcento = caracter.normalize('NFD')[0];
      bytes += sinAcento.codePointAt(0) <= 0x7e ? sinAcento : '?';
    }
  }
  return bytes;
}

// Ancho en puntos de un texto ya codificado
export function anchoDe(bytes, letra = LETRA) {
  let milesimas = 0;
  for (let i = 0; i < bytes.length; i++) {
    const n = bytes.charCodeAt(i);
    if (n <= 0x7e) {
      milesimas += ANCHOS[n - 0x20];
    } else if (ANCHOS_SIGNOS[n]) {
      milesimas += ANCHOS_SIGNOS[n];
    } else {
      const sinAcento = bytes[i].normalize('NFD').charCodeAt(0);
      milesimas += sinAcento <= 0x7e ? ANCHOS[sinAcento - 0x20] : 556;
    }
  }
  return (milesimas * letra) / 1000;
}

// Parte un texto en renglones que entren en ese ancho. Si necesita más de `maximo`, el último termina en "…".
export function renglones(bytes, ancho, letra = LETRA, maximo = MAX_RENGLONES) {
  const lineas = [];
  let actual = '';
  for (let palabra of bytes.split(' ').filter(Boolean)) {
    // Una palabra más ancha que la columna se corta donde entre
    while (anchoDe(palabra, letra) > ancho && palabra.length > 1) {
      let corte = palabra.length - 1;
      while (corte > 1 && anchoDe(palabra.slice(0, corte), letra) > ancho) corte--;
      if (actual) lineas.push(actual);
      actual = '';
      lineas.push(palabra.slice(0, corte));
      palabra = palabra.slice(corte);
    }
    const junto = actual ? `${actual} ${palabra}` : palabra;
    if (anchoDe(junto, letra) <= ancho) {
      actual = junto;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= maximo) return lineas;

  let ultima = lineas[maximo - 1];
  while (ultima && anchoDe(ultima + PUNTOS_SUSPENSIVOS, letra) > ancho) ultima = ultima.slice(0, -1);
  return [...lineas.slice(0, maximo - 1), ultima.trimEnd() + PUNTOS_SUSPENSIVOS];
}

// Dentro de un texto de PDF, los paréntesis y la barra invertida van con una barra adelante
const entreParentesis = (bytes) => `(${bytes.replace(/[\\()]/g, '\\$&')})`;
const numero = (valor) => String(+valor.toFixed(2));
const dosCifras = (n) => String(n).padStart(2, '0');
// Los datos del documento (el título que muestra el lector) van en UTF-16, que admite cualquier carácter
const enUnicode = (texto) =>
  `<FEFF${Array.from({ length: texto.length }, (_, i) => texto.charCodeAt(i).toString(16).padStart(4, '0')).join('').toUpperCase()}>`;

// titulo y detalle (un texto, o varios para varios renglones): lo que va arriba de la tabla en la primera hoja
// pie: una línea al pie de cada hoja
// columnas: [{ titulo, ancho (proporción del ancho de la hoja), alinear?: 'derecha' }]
// filas: una lista de textos por fila, o { grupo: 'texto' } para un título que separa las filas que siguen
export function pdfTabla({ titulo, detalle, columnas, filas, pie, vacio = 'No hay filas para mostrar.', marca = 'Armonía', fecha = new Date() }) {
  const anchoTabla = HOJA.ancho - 2 * MARGEN;
  const proporciones = columnas.reduce((total, c) => total + c.ancho, 0);
  let x = MARGEN;
  const cols = columnas.map((c) => {
    const col = { ...c, x, ancho: (c.ancho / proporciones) * anchoTabla };
    x += col.ancho;
    return col;
  });

  // Cada hoja es la lista de instrucciones que la dibujan. `y` baja desde el borde de arriba.
  const hojas = [];
  let hoja;
  let y;
  const texto = (bytes, tx, ty, { fuente = 'F1', letra = LETRA, color = OSCURO } = {}) =>
    hoja.push(`BT /${fuente} ${letra} Tf ${color} rg ${numero(tx)} ${numero(ty)} Td ${entreParentesis(bytes)} Tj ET`);
  const caja = (cx, cy, ancho, alto, color) =>
    hoja.push(`${color} rg ${numero(cx)} ${numero(cy)} ${numero(ancho)} ${numero(alto)} re f`);
  const raya = (ry, color) =>
    hoja.push(`${color} RG 0.5 w ${numero(MARGEN)} ${numero(ry)} m ${numero(MARGEN + anchoTabla)} ${numero(ry)} l S`);

  const nuevaHoja = () => {
    hoja = [];
    hojas.push(hoja);
    y = HOJA.alto - MARGEN;

    if (hojas.length === 1) {
      texto(codificar(marca), MARGEN, y - 16, { fuente: 'F2', letra: 20, color: MORADO });
      y -= 36;
      texto(codificar(titulo), MARGEN, y - 12, { fuente: 'F2', letra: 14 });
      y -= 20;
      for (const linea of [detalle].flat().filter(Boolean)) {
        texto(codificar(linea), MARGEN, y - 9, { color: GRIS });
        y -= 14;
      }
      y -= 10;
    }

    // El encabezado de la tabla se repite en cada hoja
    caja(MARGEN, y - ALTO_ENCABEZADO, anchoTabla, ALTO_ENCABEZADO, MORADO);
    for (const c of cols) {
      const bytes = codificar(c.titulo);
      const tx = c.alinear === 'derecha' ? c.x + c.ancho - RELLENO - anchoDe(bytes, 8.5) * NEGRITA : c.x + RELLENO;
      texto(bytes, tx, y - ALTO_ENCABEZADO + 7.5, { fuente: 'F2', letra: 8.5, color: BLANCO });
    }
    y -= ALTO_ENCABEZADO;
  };

  // Primero se mide cada fila (su alto depende de cuántos renglones necesita) y después se dibuja
  const medidas = filas.map((fila) => {
    if (!Array.isArray(fila)) return { grupo: codificar(fila.grupo), alto: ALTO_GRUPO };
    const celdas = cols.map((c, j) => renglones(codificar(fila[j]), c.ancho - 2 * RELLENO));
    return { celdas, alto: Math.max(1, ...celdas.map((lineas) => lineas.length)) * RENGLON + 2 * RELLENO - 2 };
  });

  nuevaHoja();
  let franja = false; // una fila por medio va con fondo
  medidas.forEach(({ grupo, celdas, alto }, i) => {
    // El título de un grupo no queda solo al pie de la hoja: baja junto con su primera fila
    const necesario = grupo !== undefined && medidas[i + 1] ? alto + medidas[i + 1].alto : alto;
    if (y - necesario < MARGEN + ALTO_PIE) nuevaHoja();

    if (grupo !== undefined) {
      caja(MARGEN, y - alto, anchoTabla, alto, LILA);
      texto(grupo, MARGEN + RELLENO, y - alto + 7, { fuente: 'F2', color: MORADO });
      franja = false;
    } else {
      if (franja) caja(MARGEN, y - alto, anchoTabla, alto, FRANJA);
      franja = !franja;
      celdas.forEach((lineas, j) => lineas.forEach((bytes, k) => {
        const c = cols[j];
        const tx = c.alinear === 'derecha' ? c.x + c.ancho - RELLENO - anchoDe(bytes) : c.x + RELLENO;
        texto(bytes, tx, y - RELLENO - 7 - k * RENGLON);
      }));
    }
    y -= alto;
    raya(y, LINEA);
  });
  if (filas.length === 0) texto(codificar(vacio), MARGEN + RELLENO, y - 20, { color: GRIS });

  // El pie lleva el total de hojas: se agrega cuando ya se sabe cuántas son
  hojas.forEach((instrucciones, i) => {
    hoja = instrucciones;
    raya(MARGEN + 14, LINEA);
    if (pie) texto(codificar(pie), MARGEN, MARGEN + 3, { letra: 7.5, color: GRIS });
    const paginas = codificar(`Página ${i + 1} de ${hojas.length}`);
    texto(paginas, MARGEN + anchoTabla - anchoDe(paginas, 7.5), MARGEN + 3, { letra: 7.5, color: GRIS });
  });

  // Los objetos del PDF, numerados desde 1: catálogo, lista de hojas, las dos fuentes,
  // después el contenido y la hoja de cada página, y al final los datos del documento
  const sello = `${fecha.getFullYear()}${dosCifras(fecha.getMonth() + 1)}${dosCifras(fecha.getDate())}`
    + `${dosCifras(fecha.getHours())}${dosCifras(fecha.getMinutes())}${dosCifras(fecha.getSeconds())}`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${hojas.map((_, i) => `${6 + 2 * i} 0 R`).join(' ')}] /Count ${hojas.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  hojas.forEach((instrucciones, i) => {
    const contenido = instrucciones.join('\n');
    objetos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${HOJA.ancho} ${HOJA.alto}] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`);
  });
  objetos.push(`<< /Title ${enUnicode(titulo)} /Producer ${enUnicode(marca)} /CreationDate (D:${sello}) >>`);

  // El archivo: los objetos uno tras otro y, al final, la tabla que dice en qué byte empieza cada uno
  let pdf = `%PDF-1.4\n%${String.fromCharCode(0xe2, 0xe3, 0xcf, 0xd3)}\n`;
  const posiciones = objetos.map((objeto, i) => {
    const posicion = pdf.length;
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    return posicion;
  });
  const tabla = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) pdf += `${String(posicion).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${objetos.length} 0 R >>\nstartxref\n${tabla}\n%%EOF\n`;

  return Uint8Array.from(pdf, (caracter) => caracter.charCodeAt(0));
}
