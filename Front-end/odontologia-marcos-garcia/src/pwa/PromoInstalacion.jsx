import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { FiCalendar, FiClock, FiSmartphone, FiDownload, FiShare, FiPlusSquare } from 'react-icons/fi';
import { ANCHO_TABLET } from '../estilos/medidas';
import { useMediaQuery } from '../utils/useMediaQuery';
import { useInstalarApp, estaInstalada, esIOS } from './useInstalarApp';

// Cuándo invitar: en el celular, en la página de inicio (no en medio de un formulario),
// unos segundos después de entrar, y sin insistir si la persona dijo "Ahora no"
const DEMORA_MS = 4000;
const PAUSA_MS = 14 * 24 * 60 * 60 * 1000;
const CLAVE = 'armonia.promoInstalacion';
const RUTAS = ['/', '/home'];

function pospuesta() {
  try {
    return Date.now() - Number(localStorage.getItem(CLAVE) || 0) < PAUSA_MS;
  } catch {
    return false;
  }
}

function posponer() {
  try {
    localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin almacenamiento (navegación privada): vuelve a aparecer en la próxima visita
  }
}

const subir = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const Fondo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2100; /* por encima de los avisos de conexión y de la barra */
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(26, 26, 46, 0.55);
`;

const Hoja = styled.div`
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px calc(20px + env(safe-area-inset-bottom));
  font-family: 'Poppins', sans-serif;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
  animation: ${subir} 0.3s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
`;

const Icono = styled.img`
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(92, 14, 109, 0.25);
`;

const Titulo = styled.h2`
  margin: 0 0 2px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
`;

const Subtitulo = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
`;

const Lista = styled.ul`
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    color: #374151;
  }

  svg {
    flex-shrink: 0;
    font-size: 1.1rem;
    color: #5c0e6d;
  }
`;

const Pasos = styled.ol`
  margin: 0 0 20px;
  padding: 14px 16px 14px 34px;
  border-radius: 12px;
  background: #f5f0f7;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.8;
  list-style: decimal; /* los estilos globales se la quitan a las listas */

  li::marker {
    color: #5c0e6d;
    font-weight: 700;
  }

  svg {
    vertical-align: -2px;
    color: #5c0e6d;
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 10px;

  button {
    flex: 1;
    min-height: 48px;
    border-radius: 12px;
    font-family: 'Poppins', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
  }
`;

const BotonPrincipal = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: linear-gradient(135deg, #9de03e, #86c935);
  color: #1a1a2e;
`;

const BotonSecundario = styled.button`
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #5c0e6d;
`;

// Invitación a instalar la app en el celular. Con el aviso del navegador (Android, Chrome, Edge)
// abre su diálogo de instalación; en iPhone/iPad explica cómo agregarla a la pantalla de inicio.
export default function PromoInstalacion() {
  const { pathname } = useLocation();
  const { puedeInstalar, instalar } = useInstalarApp();
  const esMovil = useMediaQuery(`(pointer: coarse) and (max-width: ${ANCHO_TABLET}px)`);
  const [descartada, setDescartada] = useState(pospuesta);
  const [abierta, setAbierta] = useState(false);
  const principalRef = useRef(null);

  const ios = !puedeInstalar && esIOS();
  const elegible = esMovil && !descartada && RUTAS.includes(pathname) && (puedeInstalar || ios) && !estaInstalada();
  const visible = abierta && elegible;

  useEffect(() => {
    if (!elegible) return undefined;
    const temporizador = setTimeout(() => setAbierta(true), DEMORA_MS);
    return () => clearTimeout(temporizador);
  }, [elegible]);

  const cerrar = useCallback(() => {
    posponer();
    setDescartada(true);
  }, []);

  // Foco en la acción principal y Escape para cerrar
  useEffect(() => {
    if (!visible) return undefined;
    principalRef.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [visible, cerrar]);

  const alInstalar = async () => {
    const resultado = await instalar();
    // Si la instaló, la promo ya no aplica; si cerró el diálogo del navegador, no se insiste
    if (resultado !== 'aceptada') posponer();
    setDescartada(true);
  };

  if (!visible) return null;

  return (
    <Fondo onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <Hoja role="dialog" aria-modal="true" aria-labelledby="promo-instalar-titulo">
        <Cabecera>
          <Icono src="/pwa-192x192.png" alt="" />
          <div>
            <Titulo id="promo-instalar-titulo">Instalá Armonía en tu celular</Titulo>
            <Subtitulo>Se abre como una app, sin buscarla en el navegador.</Subtitulo>
          </div>
        </Cabecera>

        <Lista>
          <li><FiCalendar aria-hidden /> Agendá tu turno en segundos</li>
          <li><FiClock aria-hidden /> Mirá tus citas cuando quieras</li>
          <li><FiSmartphone aria-hidden /> Entrá directo desde la pantalla de inicio</li>
        </Lista>

        {ios ? (
          <>
            <Pasos>
              <li>Tocá <FiShare aria-hidden /> <strong>Compartir</strong> (el cuadrado con la flecha)</li>
              <li>Elegí <FiPlusSquare aria-hidden /> <strong>Agregar a inicio</strong></li>
            </Pasos>
            <Acciones>
              <BotonPrincipal ref={principalRef} type="button" onClick={cerrar}>Entendido</BotonPrincipal>
            </Acciones>
          </>
        ) : (
          <Acciones>
            <BotonSecundario type="button" onClick={cerrar}>Ahora no</BotonSecundario>
            <BotonPrincipal ref={principalRef} type="button" onClick={alInstalar}>
              <FiDownload aria-hidden /> Instalar
            </BotonPrincipal>
          </Acciones>
        )}
      </Hoja>
    </Fondo>
  );
}
