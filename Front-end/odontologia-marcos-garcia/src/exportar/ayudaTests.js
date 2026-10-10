// Solo para los tests: abre los archivos que se exportan para revisar lo que llevan adentro

const texto = (bytes) => new TextDecoder().decode(bytes);

// Lee un zip sin comprimir, como los de zip.js → { 'xl/workbook.xml': { texto, datos, crc }, ... }
export function leerZip(bytes) {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fin = bytes.length - 22;
  if (vista.getUint32(fin, true) !== 0x06054b50) throw new Error('No termina como un zip');

  const archivos = {};
  let entrada = vista.getUint32(fin + 16, true);
  for (let i = 0; i < vista.getUint16(fin + 10, true); i++) {
    if (vista.getUint32(entrada, true) !== 0x02014b50) throw new Error('El índice del zip está roto');
    const largo = vista.getUint32(entrada + 24, true);
    const largoNombre = vista.getUint16(entrada + 28, true);
    const cabecera = vista.getUint32(entrada + 42, true);
    if (vista.getUint32(cabecera, true) !== 0x04034b50) throw new Error('El índice no apunta a un archivo');

    const inicio = cabecera + 30 + vista.getUint16(cabecera + 26, true);
    const datos = bytes.subarray(inicio, inicio + largo);
    archivos[texto(bytes.subarray(entrada + 46, entrada + 46 + largoNombre))] = {
      texto: texto(datos), datos, crc: vista.getUint32(entrada + 16, true),
    };
    entrada += 46 + largoNombre;
  }
  return archivos;
}

// Un PDF como texto, con cada byte como un carácter (los acentos, como los escribe el PDF)
export const leerPdf = (bytes) => new TextDecoder('windows-1252').decode(bytes);
