import { useSyncExternalStore } from 'react';

// Instalación de la PWA. Chrome/Edge/Android avisan con `beforeinstallprompt` cuando la app se
// puede instalar; se guarda el evento para abrir el diálogo desde un botón propio.
// En iOS no existe: ahí se instala desde Compartir → "Agregar a inicio".
// El evento llega una sola vez, a veces antes de que se monte ningún componente: se escucha
// desde que se carga este módulo y lo comparten todos (el botón de la barra y la promo).
let aviso = null;
const suscriptos = new Set();
const cambiar = (nuevo) => {
  aviso = nuevo;
  suscriptos.forEach((avisar) => avisar());
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // que no aparezca el banner del navegador: usamos nuestros botones
    cambiar(e);
  });
  window.addEventListener('appinstalled', () => cambiar(null));
}

const suscribir = (avisar) => {
  suscriptos.add(avisar);
  return () => suscriptos.delete(avisar);
};

// Abre el diálogo del navegador. Devuelve 'aceptada', 'rechazada' o null si no había nada que instalar.
async function instalar() {
  if (!aviso) return null;
  const evento = aviso;
  cambiar(null); // el evento sirve una sola vez
  evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === 'accepted' ? 'aceptada' : 'rechazada';
}

export function useInstalarApp() {
  const puedeInstalar = useSyncExternalStore(suscribir, () => !!aviso, () => false);
  return { puedeInstalar, instalar };
}

// Ya abierta como app instalada (Android/escritorio, o iOS desde la pantalla de inicio)
export function estaInstalada() {
  return !!window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

// iPhone/iPad (el iPad con iPadOS se presenta como Mac, pero con pantalla táctil)
export function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Abre la invitación a instalar (PromoInstalacion) desde cualquier parte de la app
export const EVENTO_PROMO = 'armonia:promo-instalacion';
export const abrirPromoInstalacion = () => window.dispatchEvent(new Event(EVENTO_PROMO));

// Para los botones "Instalar app": si mostrarlos y qué hacer al tocarlos.
// Con el aviso del navegador se abre directo su diálogo; en iPhone/iPad, la invitación con los pasos.
export function useOfrecerInstalacion() {
  const { puedeInstalar, instalar } = useInstalarApp();
  const disponible = (puedeInstalar || esIOS()) && !estaInstalada();
  const alTocar = () => (puedeInstalar ? instalar() : abrirPromoInstalacion());
  return { disponible, alTocar };
}
