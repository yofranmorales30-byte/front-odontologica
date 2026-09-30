import { useSyncExternalStore } from 'react';

// true si el navegador tiene conexión; se actualiza con los eventos online/offline
export function useEnLinea() {
  return useSyncExternalStore(
    (avisar) => {
      window.addEventListener('online', avisar);
      window.addEventListener('offline', avisar);
      return () => {
        window.removeEventListener('online', avisar);
        window.removeEventListener('offline', avisar);
      };
    },
    () => navigator.onLine,
    () => true
  );
}
