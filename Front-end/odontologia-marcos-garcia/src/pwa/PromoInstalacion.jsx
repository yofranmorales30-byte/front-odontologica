import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { FiZap, FiCalendar, FiSmartphone, FiMonitor, FiDownload, FiShare, FiPlusSquare, FiX } from 'react-icons/fi';
import { movil, ANCHO_MOVIL } from '../estilos/medidas';
import { useMediaQuery } from '../utils/useMediaQuery';
import { useInstalarApp, estaInstalada, esIOS, EVENTO_PROMO } from './useInstalarApp';

// Cuándo invitar sola: en la página de inicio a los pocos segundos y al entrar al panel
// (nunca en medio de un formulario), y sin insistir si la persona dijo "Ahora no"
const DEMORA_INICIO_CELULAR_MS = 4000;
const DEMORA_INICIO_COMPUTADORA_MS = 7000;
const DEMORA_PANEL_MS = 1500;
const PAUSA_MS = 14 * 24 * 60 * 60 * 1000;
const CLAVE = 'armonia.promoInstalacion';
const RUTAS_INICIO = ['/', '/home'];
const RUTA_PANEL = '/sign-up';

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

const escribiendo = () => /^(input|select|textarea)$/i.test(document.activeElement?.tagName || '');

const aclarar = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const subir = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const aparecer = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Fondo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2100; /* por encima de los avisos de conexión y de las barras */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(3px);
  animation: ${aclarar} 0.25s ease-out;

  /* En el celular es un panel que sube desde abajo, al alcance del pulgar */
  ${movil} {
    align-items: flex-end;
    padding: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Tarjeta = styled.div`
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: #ffffff;
  border-radius: 24px;
  font-family: 'Poppins', sans-serif;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
  animation: ${aparecer} 0.3s ease-out;

  ${movil} {
    max-width: none;
    max-height: 92vh;
    border-radius: 28px 28px 0 0;
    animation-name: ${subir};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Encabezado = styled.div`
  position: relative;
  height: 104px;
  border-radius: 24px 24px 0 0;
  background:
    radial-gradient(circle at 88% 20%, rgba(157, 224, 62, 0.35) 0, transparent 34%),
    radial-gradient(circle at 12% 110%, rgba(255, 255, 255, 0.18) 0, transparent 40%),
    linear-gradient(135deg, #4a0b5a, #7b1fa2);

  ${movil} {
    border-radius: 28px 28px 0 0;
  }
`;

const IconoApp = styled.img`
  position: absolute;
  left: 24px;
  bottom: -30px;
  width: 76px;
  height: 76px;
  border-radius: 20px;
  border: 4px solid #ffffff;
  box-shadow: 0 8px 20px rgba(92, 14, 109, 0.3);
`;

const Cerrar = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const Cuerpo = styled.div`
  padding: 46px 24px 20px;

  ${movil} {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
`;

const Titulo = styled.h2`
  margin: 0 0 4px;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
  color: #1a1a2e;
`;

const Subtitulo = styled.p`
  margin: 0 0 18px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #6b7280;
`;

const Beneficios = styled.ul`
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Beneficio = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;

  strong {
    display: block;
    font-size: 0.92rem;
    font-weight: 600;
    color: #1a1a2e;
  }

  span {
    display: block;
    font-size: 0.82rem;
    line-height: 1.4;
    color: #6b7280;
  }
`;

const Chip = styled.div`
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.15rem;
  background: ${(props) => props.$fondo};
  color: ${(props) => props.$color};
`;

const Pasos = styled.ol`
  list-style: none;
  margin: 0 0 20px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  background: #f5f0f7;
  font-size: 0.9rem;
  color: #374151;
  counter-reset: paso;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    counter-increment: paso;
  }

  li::before {
    content: counter(paso);
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #5c0e6d;
    color: #ffffff;
    font-size: 0.8rem;
    font-weight: 700;
  }

  svg {
    vertical-align: -2px;
    color: #5c0e6d;
  }
`;

const BotonPrincipal = styled.button`
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #9de03e, #86c935);
  color: #1a1a2e;
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(157, 224, 62, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(157, 224, 62, 0.5);
  }
`;

const BotonTexto = styled.button`
  width: 100%;
  min-height: 44px;
  margin-top: 4px;
  border: none;
  background: none;
  color: #6b7280;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: #5c0e6d;
  }
`;

const Nota = styled.p`
  margin: 10px 0 0;
  text-align: center;
  font-size: 0.75rem;
  color: #6b7280;
`;

// Invitación a instalar la app. Con el aviso del navegador (Android, Chrome, Edge) abre su diálogo
// de instalación; en iPhone/iPad explica cómo agregarla a la pantalla de inicio.
// `sesion`: null (sin sesión), 'paciente' o 'personal'.
export default function PromoInstalacion({ sesion = null }) {
  const { pathname } = useLocation();
  const { puedeInstalar, instalar } = useInstalarApp();
  const pantallaChica = useMediaQuery(`(max-width: ${ANCHO_MOVIL}px)`);
  const enCelular = useMediaQuery('(pointer: coarse)');
  const [descartada, setDescartada] = useState(pospuesta);
  const [abiertaEn, setAbiertaEn] = useState(null); // dónde se abrió sola: 'inicio' | 'panel'
  const [pedida, setPedida] = useState(false); // la abrió la persona con un botón "Instalar app"
  const tarjetaRef = useRef(null);
  const principalRef = useRef(null);

  const ios = !puedeInstalar && esIOS();
  const instalable = (puedeInstalar || ios) && !estaInstalada();
  const lugar = sesion && pathname === RUTA_PANEL ? 'panel' : RUTAS_INICIO.includes(pathname) ? 'inicio' : null;
  const invitar = instalable && !descartada && !!lugar;
  const visible = instalable && (pedida || (invitar && abiertaEn === lugar));

  useEffect(() => {
    if (!invitar) return undefined;
    const demora = lugar === 'panel' ? DEMORA_PANEL_MS : enCelular ? DEMORA_INICIO_CELULAR_MS : DEMORA_INICIO_COMPUTADORA_MS;
    const temporizador = setTimeout(() => {
      // Si ya está completando algo, no se la interrumpe
      if (!escribiendo()) setAbiertaEn(lugar);
    }, demora);
    return () => clearTimeout(temporizador);
  }, [invitar, lugar, enCelular]);

  // Los botones "Instalar app" la abren aunque esté pospuesta
  useEffect(() => {
    const abrir = () => setPedida(true);
    window.addEventListener(EVENTO_PROMO, abrir);
    return () => window.removeEventListener(EVENTO_PROMO, abrir);
  }, []);

  const cerrar = useCallback(() => {
    posponer();
    setDescartada(true);
    setPedida(false);
  }, []);

  // Mientras está abierta: foco en la acción principal, Escape la cierra, Tab no sale del
  // diálogo y la página de atrás no se desplaza
  useEffect(() => {
    if (!visible) return undefined;
    principalRef.current?.focus();

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        cerrar();
      } else if (e.key === 'Tab') {
        const botones = [...(tarjetaRef.current?.querySelectorAll('button') || [])];
        const [primero, ultimo] = [botones[0], botones[botones.length - 1]];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener('keydown', alTeclear);

    const desplazamiento = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = desplazamiento;
    };
  }, [visible, cerrar]);

  const alInstalar = async () => {
    const resultado = await instalar();
    // Si la instaló, la invitación ya no aplica; si cerró el diálogo del navegador, no se insiste
    if (resultado !== 'aceptada') posponer();
    setDescartada(true);
    setPedida(false);
  };

  if (!visible) return null;

  const dispositivo = enCelular ? 'tu celular' : 'tu computadora';

  return (
    <Fondo onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <Tarjeta ref={tarjetaRef} role="dialog" aria-modal="true" aria-labelledby="promo-instalar-titulo">
        <Encabezado>
          <Cerrar type="button" aria-label="Cerrar" onClick={cerrar}><FiX aria-hidden /></Cerrar>
          <IconoApp src="/pwa-192x192.png" alt="" />
        </Encabezado>

        <Cuerpo>
          <Titulo id="promo-instalar-titulo">{enCelular ? 'Llevá Armonía en tu celular' : 'Instalá Armonía en tu computadora'}</Titulo>
          <Subtitulo>Abrila con un {pantallaChica || enCelular ? 'toque' : 'clic'}, sin buscar la página cada vez.</Subtitulo>

          <Beneficios>
            <Beneficio>
              <Chip $fondo="#f3e8ff" $color="#5c0e6d"><FiZap aria-hidden /></Chip>
              <div>
                <strong>Abre al instante</strong>
                <span>Como cualquier app, sin escribir la dirección.</span>
              </div>
            </Beneficio>
            <Beneficio>
              <Chip $fondo="#ecfccb" $color="#4d7c0f"><FiCalendar aria-hidden /></Chip>
              <div>
                <strong>{sesion === 'personal' ? 'La agenda, a mano' : 'Tus turnos, a mano'}</strong>
                <span>{sesion === 'personal' ? 'Abrí el calendario del día en segundos.' : 'Agendá y revisá tus citas en segundos.'}</span>
              </div>
            </Beneficio>
            <Beneficio>
              <Chip $fondo="#e0f2fe" $color="#0369a1">{enCelular ? <FiSmartphone aria-hidden /> : <FiMonitor aria-hidden />}</Chip>
              <div>
                <strong>Con su propio ícono</strong>
                <span>{enCelular ? 'Queda en tu pantalla de inicio.' : 'Queda en tu escritorio o en la barra de tareas.'}</span>
              </div>
            </Beneficio>
          </Beneficios>

          {ios ? (
            <>
              <Pasos aria-label={`Cómo instalarla en ${dispositivo}`}>
                <li><span>Tocá <FiShare aria-hidden /> <strong>Compartir</strong> (el cuadrado con la flecha)</span></li>
                <li><span>Elegí <FiPlusSquare aria-hidden /> <strong>Agregar a inicio</strong></span></li>
              </Pasos>
              <BotonPrincipal ref={principalRef} type="button" onClick={cerrar}>Entendido</BotonPrincipal>
            </>
          ) : (
            <>
              <BotonPrincipal ref={principalRef} type="button" onClick={alInstalar}>
                <FiDownload aria-hidden /> Instalar app
              </BotonPrincipal>
              <BotonTexto type="button" onClick={cerrar}>Ahora no</BotonTexto>
            </>
          )}
          <Nota>Gratis · Sin tienda de apps · Se instala en segundos</Nota>
        </Cuerpo>
      </Tarjeta>
    </Fondo>
  );
}
