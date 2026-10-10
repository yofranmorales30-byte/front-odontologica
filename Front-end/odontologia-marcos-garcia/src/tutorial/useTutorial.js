import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// El tutorial del panel se abre solo la primera vez que cada cuenta entra desde este navegador;
// después, con el botón "Tutorial". Se recuerda acá: en otro celular o computadora aparece una vez más.
const CLAVE = 'armonia.tutorial.';
// Sin almacenamiento (navegación privada), al menos no se repite durante la visita
const vistosSinAlmacenamiento = new Set();

function yaVisto(idUser) {
  try {
    return localStorage.getItem(CLAVE + idUser) !== null;
  } catch {
    return vistosSinAlmacenamiento.has(idUser);
  }
}

function marcarVisto(idUser) {
  try {
    localStorage.setItem(CLAVE + idUser, String(Date.now()));
  } catch {
    vistosSinAlmacenamiento.add(idUser);
  }
}

// Si está en pantalla ahora mismo: lo consulta el resto de la app (la invitación a instalar espera)
let enPantalla = false;
const suscriptos = new Set();
const cambiar = (nuevo) => {
  enPantalla = nuevo;
  suscriptos.forEach((avisar) => avisar());
};
const suscribir = (avisar) => {
  suscriptos.add(avisar);
  return () => suscriptos.delete(avisar);
};

// Para los paneles: si mostrar el tutorial, y cómo abrirlo y cerrarlo.
// Cerrarlo (terminado o salteado) lo da por visto.
export function useTutorial(user) {
  const idUser = user?.id_user;
  const [abierto, setAbierto] = useState(() => !yaVisto(idUser));

  useEffect(() => {
    if (!abierto) return undefined;
    cambiar(true);
    return () => cambiar(false);
  }, [abierto]);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => {
    marcarVisto(idUser);
    setAbierto(false);
  }, [idUser]);

  return { abierto, abrir, cerrar };
}

// true mientras el tutorial está abierto o por abrirse (la cuenta todavía no lo vio)
export function useTutorialEnCurso(user) {
  const idUser = user?.id_user;
  return useSyncExternalStore(
    suscribir,
    () => enPantalla || (idUser !== undefined && !yaVisto(idUser)),
    () => false
  );
}
