import { useSyncExternalStore } from 'react';

// true mientras la media query se cumple; se actualiza al girar el celular o cambiar el tamaño.
// Sin matchMedia (tests con jsdom) devuelve false: se muestra la versión de escritorio.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (avisar) => {
      if (!window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', avisar);
      return () => mq.removeEventListener('change', avisar);
    },
    () => (window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}
