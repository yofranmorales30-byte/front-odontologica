// Arma un .zip en el navegador, sin librerías. Un archivo de Excel (.xlsx) es un zip con XML adentro.
// Los archivos van sin comprimir: son listados chicos y así no hace falta un compresor.

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

// Suma de control que el zip guarda de cada archivo
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = TABLA_CRC[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// archivos: [{ nombre: 'xl/workbook.xml', contenido: '<texto>' }] → Uint8Array con el zip
export function zip(archivos, fecha = new Date()) {
  const codificador = new TextEncoder();
  // Fecha y hora en el formato de MS-DOS que usa el zip
  const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1);
  const dia = ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate();

  const partes = [];
  const indice = [];
  let posicion = 0;

  for (const { nombre, contenido } of archivos) {
    const nombreBytes = codificador.encode(nombre);
    const datos = codificador.encode(contenido);
    const crc = crc32(datos);

    // Cabecera de cada archivo, justo antes de sus datos
    const cabecera = new DataView(new ArrayBuffer(30));
    cabecera.setUint32(0, 0x04034b50, true);
    cabecera.setUint16(4, 20, true); // versión de zip necesaria para leerlo
    cabecera.setUint16(6, 0x0800, true); // nombres en UTF-8
    cabecera.setUint16(8, 0, true); // sin comprimir
    cabecera.setUint16(10, hora, true);
    cabecera.setUint16(12, dia, true);
    cabecera.setUint32(14, crc, true);
    cabecera.setUint32(18, datos.length, true);
    cabecera.setUint32(22, datos.length, true);
    cabecera.setUint16(26, nombreBytes.length, true);

    // Su entrada en el índice del final
    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true);
    entrada.setUint16(6, 20, true);
    entrada.setUint16(8, 0x0800, true);
    entrada.setUint16(10, 0, true);
    entrada.setUint16(12, hora, true);
    entrada.setUint16(14, dia, true);
    entrada.setUint32(16, crc, true);
    entrada.setUint32(20, datos.length, true);
    entrada.setUint32(24, datos.length, true);
    entrada.setUint16(28, nombreBytes.length, true);
    entrada.setUint32(42, posicion, true); // dónde empieza su cabecera

    partes.push(new Uint8Array(cabecera.buffer), nombreBytes, datos);
    indice.push(new Uint8Array(entrada.buffer), nombreBytes);
    posicion += 30 + nombreBytes.length + datos.length;
  }

  const largoIndice = indice.reduce((total, parte) => total + parte.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, largoIndice, true);
  fin.setUint32(16, posicion, true); // dónde empieza el índice

  const salida = new Uint8Array(posicion + largoIndice + 22);
  let cursor = 0;
  for (const parte of [...partes, ...indice, new Uint8Array(fin.buffer)]) {
    salida.set(parte, cursor);
    cursor += parte.length;
  }
  return salida;
}
