import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { FiWifiOff, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { tablet } from '../estilos/medidas';
import { useEnLinea } from './useEnLinea';

const Contenedor = styled.div`
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(480px, calc(100% - 24px));

  /* Por encima de la barra inferior del panel */
  ${tablet} {
    bottom: calc(76px + env(safe-area-inset-bottom));
  }
`;

const Aviso = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${props => ({ error: '#1a1a2e', exito: '#166534' }[props.$tipo] || '#4a0b5a')};
  color: #ffffff;
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  line-height: 1.4;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

  svg {
    flex-shrink: 0;
    font-size: 1.1rem;
  }
`;

const Texto = styled.span`
  flex: 1;
`;

const Boton = styled.button`
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${props => (props.$principal ? '#9de03e' : 'transparent')};
  color: ${props => (props.$principal ? '#1a1a2e' : '#ffffff')};
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
`;

const AVISO_INSTALADA_MS = 7000;

// true por unos segundos justo después de que la app se instala
function useRecienInstalada() {
  const [reciente, setReciente] = useState(false);

  useEffect(() => {
    let temporizador;
    const alInstalar = () => {
      setReciente(true);
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setReciente(false), AVISO_INSTALADA_MS);
    };
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('appinstalled', alInstalar);
      clearTimeout(temporizador);
    };
  }, []);

  return reciente;
}

// Avisos de la app: recién instalada, sin conexión y versión nueva disponible
export default function AvisosPWA() {
  const enLinea = useEnLinea();
  const recienInstalada = useRecienInstalada();
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW();

  if (enLinea && !hayVersionNueva && !recienInstalada) return null;

  return (
    <Contenedor>
      {recienInstalada && (
        <Aviso role="status" $tipo="exito">
          <FiCheckCircle aria-hidden />
          <Texto>¡Listo! Armonía ya está instalada. Buscá su ícono para abrirla.</Texto>
        </Aviso>
      )}
      {!enLinea && (
        <Aviso role="status" $tipo="error">
          <FiWifiOff aria-hidden />
          <Texto>Sin conexión. Podés ver la app, pero para reservar o ver tus turnos necesitás internet.</Texto>
        </Aviso>
      )}
      {hayVersionNueva && (
        <Aviso role="alert">
          <FiRefreshCw aria-hidden />
          <Texto>Hay una versión nueva de Armonía.</Texto>
          <Boton type="button" onClick={() => setHayVersionNueva(false)}>Después</Boton>
          <Boton type="button" $principal onClick={() => updateServiceWorker(true)}>Actualizar</Boton>
        </Aviso>
      )}
    </Contenedor>
  );
}
