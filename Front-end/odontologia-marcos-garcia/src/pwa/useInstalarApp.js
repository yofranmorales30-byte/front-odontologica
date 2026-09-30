import { useEffect, useState } from 'react';

// Instalación de la PWA. Chrome/Edge/Android avisan con `beforeinstallprompt` cuando la app se
// puede instalar; se guarda el evento para abrir el diálogo desde un botón propio.
// En iOS no existe: ahí se instala desde Compartir → "Agregar a inicio".
export function useInstalarApp() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const alOfrecer = (e) => {
      e.preventDefault(); // que no aparezca el banner del navegador: usamos el botón
      setAviso(e);
    };
    const alInstalar = () => setAviso(null);
    window.addEventListener('beforeinstallprompt', alOfrecer);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const instalar = async () => {
    if (!aviso) return;
    aviso.prompt();
    await aviso.userChoice;
    setAviso(null); // el evento sirve una sola vez
  };

  return { puedeInstalar: !!aviso, instalar };
}
