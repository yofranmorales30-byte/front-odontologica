export const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const TIPO_PDF = 'application/pdf';

// Le entrega a la persona un archivo armado en el navegador: queda en sus descargas
export function descargar(nombre, bytes, tipo) {
  const direccion = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = direccion;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El navegador necesita la dirección un momento más para empezar la descarga
  setTimeout(() => URL.revokeObjectURL(direccion), 10000);
}
