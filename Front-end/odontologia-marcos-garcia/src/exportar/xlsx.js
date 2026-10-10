import { zip } from './zip';

// Planilla de Excel (.xlsx) de una tabla, sin librerías: una hoja con el encabezado fijo y con filtros.
// Los textos van como texto (un teléfono no pierde el 0 de adelante) y las fechas como fechas de Excel,
// que se pueden ordenar y filtrar.

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const HOJA_CALCULO = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const PAQUETE = 'http://schemas.openxmlformats.org/package/2006';
const DOCUMENTO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

// Estilos de celda (posición en <cellXfs> de ESTILOS)
const NORMAL = 0;
const ENCABEZADO = 1;
const FECHA = 2;

// XML no admite caracteres de control (salvo tabulación y saltos de línea) ni mitades sueltas de un emoji
function limpio(texto) {
  return Array.from(String(texto)).filter((c) => {
    const n = c.codePointAt(0);
    return n === 9 || n === 10 || n === 13 || (n >= 32 && !(n >= 0xd800 && n <= 0xdfff) && n !== 0xfffe && n !== 0xffff);
  }).join('');
}

const escapar = (texto) => limpio(texto)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 0 → "A", 25 → "Z", 26 → "AA"
function letra(columna) {
  let nombre = '';
  for (let n = columna + 1; n > 0; n = Math.floor((n - 1) / 26)) nombre = String.fromCharCode(65 + ((n - 1) % 26)) + nombre;
  return nombre;
}

// "1990-03-12" → el número con que Excel guarda ese día; null si no es una fecha que Excel maneje bien
function serieDeFecha(fecha) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha));
  if (!partes) return null;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const dias = Date.UTC(anio, mes - 1, dia) / 86400000 + 25569; // días desde el 30/12/1899
  const existe = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDate() === dia; // no un 31/02
  return existe && dias > 60 ? dias : null; // antes de marzo de 1900 el calendario de Excel está corrido
}

function celda(referencia, valor, tipo, estilo = NORMAL) {
  if (valor === null || valor === undefined || valor === '') return '';
  const serie = tipo === 'fecha' ? serieDeFecha(valor) : null;
  if (serie !== null) return `<c r="${referencia}" s="${FECHA}"><v>${serie}</v></c>`;
  return `<c r="${referencia}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`;
}

const ESTILOS = `${XML}<styleSheet xmlns="${HOJA_CALCULO}">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF5C0E6D"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// hoja: nombre de la pestaña (sin espacios ni símbolos)
// columnas: [{ titulo, ancho (en caracteres), tipo?: 'fecha' }] · filas: una lista de valores por fila
export function xlsx({ hoja, columnas, filas }) {
  const rango = `A1:${letra(columnas.length - 1)}${filas.length + 1}`;
  const rangoFijo = `$A$1:$${letra(columnas.length - 1)}$${filas.length + 1}`;

  const encabezado = `<row r="1" ht="22" customHeight="1">${columnas.map((c, j) => celda(`${letra(j)}1`, c.titulo, 'texto', ENCABEZADO)).join('')}</row>`;
  const datos = filas.map((fila, i) =>
    `<row r="${i + 2}">${columnas.map((c, j) => celda(`${letra(j)}${i + 2}`, fila[j], c.tipo)).join('')}</row>`);

  const planilla = `${XML}<worksheet xmlns="${HOJA_CALCULO}">
<dimension ref="${rango}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columnas.map((c, j) => `<col min="${j + 1}" max="${j + 1}" width="${c.ancho}" customWidth="1"/>`).join('')}</cols>
<sheetData>
${encabezado}
${datos.join('\n')}
</sheetData>
<autoFilter ref="${rango}"/>
</worksheet>`;

  const libro = `${XML}<workbook xmlns="${HOJA_CALCULO}" xmlns:r="${DOCUMENTO}">
<bookViews><workbookView/></bookViews>
<sheets><sheet name="${escapar(hoja)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${escapar(hoja)}'!${rangoFijo}</definedName></definedNames>
</workbook>`;

  return zip([
    {
      nombre: '[Content_Types].xml',
      contenido: `${XML}<Types xmlns="${PAQUETE}/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="${TIPO}.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${TIPO}.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="${TIPO}.styles+xml"/>
</Types>`,
    },
    {
      nombre: '_rels/.rels',
      contenido: `${XML}<Relationships xmlns="${PAQUETE}/relationships">
<Relationship Id="rId1" Type="${DOCUMENTO}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    { nombre: 'xl/workbook.xml', contenido: libro },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      contenido: `${XML}<Relationships xmlns="${PAQUETE}/relationships">
<Relationship Id="rId1" Type="${DOCUMENTO}/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="${DOCUMENTO}/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { nombre: 'xl/styles.xml', contenido: ESTILOS },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: planilla },
  ]);
}
