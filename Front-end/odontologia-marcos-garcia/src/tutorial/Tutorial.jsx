import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import { FiArrowRight, FiCheck, FiX } from 'react-icons/fi';
import { movil } from '../estilos/medidas';
import { medir, hueco, desplazamiento, ubicar } from './ubicar';

const latir = keyframes`
  from { box-shadow: 0 0 0 0 rgba(157, 224, 62, 0.7); }
  to { box-shadow: 0 0 0 12px rgba(157, 224, 62, 0); }
`;

// Tapa toda la pantalla: mientras dura el tutorial no se puede tocar nada de lo que hay detrás
const Capa = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2200; /* por encima de los avisos y de la invitación a instalar */
  touch-action: none;
  font-family: 'Poppins', sans-serif;
`;

// La parte iluminada. Lo oscuro de alrededor es su sombra, así el hueco se mueve de un paso a otro.
const Hueco = styled.div`
  position: fixed;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(26, 26, 46, 0.72);
  pointer-events: none;
  ${(props) => props.$animar && css`
    transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
  `}

  &::before,
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: ${(props) => (props.$marcar ? 1 : 0)};
  }

  &::before {
    border: 2px solid #9de03e;
  }

  &::after {
    animation: ${latir} 1.6s ease-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      animation: none;
    }
  }
`;

const Tarjeta = styled.div`
  position: fixed;
  width: min(380px, calc(100vw - 24px));
  outline: none; /* recibe el foco al abrirse, para que el lector de pantalla la anuncie */
  opacity: ${(props) => (props.$medida ? 1 : 0)};
  transition: opacity 0.2s ease${(props) => props.$animar && ', top 0.3s ease, left 0.3s ease'};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Apunta desde la tarjeta al elemento iluminado
const Flecha = styled.span`
  position: absolute;
  width: 16px;
  height: 16px;
  background: #ffffff;
  transform: rotate(45deg);
`;

const Contenido = styled.div`
  position: relative;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  padding: 20px 22px 18px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);

  ${movil} {
    padding: 16px 18px 14px;
  }
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const Chip = styled.div`
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background: #f3e8ff;
  color: #5c0e6d;
  font-size: 1.2rem;

  img {
    width: 100%;
    height: 100%;
  }
`;

const Contador = styled.span`
  flex: 1;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #9167f9;
`;

const Saltar = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #1a1a2e;
  }
`;

const Titulo = styled.h2`
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a2e;
`;

const Texto = styled.p`
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #4b5563;
`;

const Puntos = styled.ul`
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 0.87rem;
    line-height: 1.45;
    color: #374151;
  }

  svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    padding: 3px;
    border-radius: 50%;
    background: #ecfccb;
    color: #4d7c0f;
  }
`;

const Leyenda = styled.ul`
  list-style: none;
  margin: 12px 0 0;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 12px;
  background: #f9fafb;
  /* Solo colores con su nombre: entran varios por renglón */
  ${(props) => props.$enFila && css`
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px 16px;
  `}

  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 0.82rem;
    line-height: 1.4;
    color: #4b5563;
  }

  strong {
    color: #1a1a2e;
    font-weight: 600;
  }
`;

const Color = styled.span`
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => props.$color};
`;

const Nota = styled.p`
  margin: 10px 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #6b7280;
`;

const Pie = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Con muchos pasos en una pantalla angosta, los botones bajan a su propio renglón */
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 16px;
`;

const Avance = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Punto = styled.span`
  width: ${(props) => (props.$actual ? '18px' : '6px')};
  height: 6px;
  border-radius: 3px;
  background: ${(props) => (props.$hecho ? '#5c0e6d' : '#e5e7eb')};
  transition: width 0.2s ease, background 0.2s ease;
`;

const Botones = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  white-space: nowrap;
`;

const BotonTexto = styled.button`
  min-height: 44px;
  padding: 0 12px;
  border: none;
  background: none;
  color: #6b7280;
  font-family: 'Poppins', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: #5c0e6d;
  }
`;

const BotonPrincipal = styled.button`
  min-height: 44px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #9de03e, #86c935);
  color: #1a1a2e;
  font-family: 'Poppins', sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(157, 224, 62, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(157, 224, 62, 0.5);
  }
`;

// De qué borde de la tarjeta sale la flecha, según de qué lado del elemento quedó la tarjeta
function estiloFlecha({ lado, flecha }) {
  const a = flecha - 8;
  return {
    abajo: { top: -7, left: a },
    arriba: { bottom: -7, left: a },
    derecha: { left: -7, top: a },
    izquierda: { right: -7, top: a },
  }[lado];
}

// Tutorial guiado, como los de los juegos: oscurece la pantalla, ilumina una parte por vez y explica
// para qué sirve. No se puede tocar nada de atrás hasta terminarlo o saltearlo.
//
// pasos: [{ id, titulo, texto, objetivo?, lado?, icono?, imagen?, puntos?, leyenda?, nota?, ... }] (ver pasos.js)
// alPaso(paso): al llegar a cada paso, para que el panel muestre detrás lo que se está explicando
export default function Tutorial({ pasos, alPaso, alCerrar }) {
  // Los pasos quedan fijos al abrir: si la lista cambiara por el medio, se movería el paso actual
  const [lista] = useState(pasos);
  const [indice, setIndice] = useState(0);
  const [geo, setGeo] = useState(null); // { hueco, tarjeta }: dónde va cada cosa, en píxeles
  const [cuadros, setCuadros] = useState(0); // 0: sin medir · 1: recién ubicado · 2: ya se mueve con animación
  const tarjetaRef = useRef(null);

  const paso = lista[indice];
  const ultimo = indice === lista.length - 1;
  const Icono = paso.icono;

  const ir = useCallback((n) => {
    setIndice(n);
    alPaso?.(lista[n]);
  }, [alPaso, lista]);
  const avanzar = useCallback(() => (ultimo ? alCerrar() : ir(indice + 1)), [ultimo, alCerrar, ir, indice]);
  const retroceder = useCallback(() => { if (indice > 0) ir(indice - 1); }, [indice, ir]);

  // Sigue al elemento cuadro a cuadro: la página puede moverse o cambiar de tamaño, y lo que se
  // explica puede terminar de cargar después de que aparece el paso
  useEffect(() => {
    let cuadro;
    let acercado = false;
    const seguir = () => {
      const tarjeta = tarjetaRef.current;
      if (tarjeta) {
        const pantalla = { ancho: document.documentElement.clientWidth, alto: window.innerHeight };
        const medidas = { ancho: tarjeta.offsetWidth, alto: tarjeta.offsetHeight };
        let rect = medir(paso.objetivo);
        if (rect && !acercado) {
          acercado = true;
          const cuanto = desplazamiento(rect, medidas, pantalla);
          if (cuanto) {
            window.scrollBy({ top: cuanto, behavior: 'instant' });
            rect = medir(paso.objetivo);
          }
        }
        const iluminado = hueco(rect, pantalla);
        const nueva = {
          // Sin elemento que iluminar, el hueco se cierra en el centro y queda todo oscuro
          hueco: iluminado || { top: Math.round(pantalla.alto / 2), left: Math.round(pantalla.ancho / 2), width: 0, height: 0 },
          marcar: !!iluminado,
          tarjeta: ubicar(iluminado, medidas, pantalla, paso.lado),
        };
        setGeo((actual) => (JSON.stringify(actual) === JSON.stringify(nueva) ? actual : nueva));
        setCuadros((n) => Math.min(n + 1, 2));
      }
      cuadro = requestAnimationFrame(seguir);
    };
    cuadro = requestAnimationFrame(seguir);
    return () => cancelAnimationFrame(cuadro);
  }, [paso]);

  // Mientras está abierto: la página de atrás no se desplaza y, al cerrar, el foco vuelve a donde estaba
  useEffect(() => {
    const antes = document.activeElement;
    const desplazamientoAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = desplazamientoAntes;
      antes?.focus?.({ preventScroll: true });
    };
  }, []);

  // El foco va a la tarjeta, no a un botón: así no aparece un botón remarcado a quien usa el dedo o
  // el mouse. Si al cambiar de paso desaparece el botón que tenía el foco, vuelve a la tarjeta.
  useEffect(() => {
    const tarjeta = tarjetaRef.current;
    if (!tarjeta.contains(document.activeElement)) tarjeta.focus({ preventScroll: true });
  }, [indice]);

  // Enter y la flecha derecha continúan, la izquierda vuelve, Escape lo saltea y Tab no sale de la tarjeta
  useEffect(() => {
    const alTeclear = (e) => {
      const foco = document.activeElement;
      if (e.key === 'Escape') {
        alCerrar();
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && foco?.tagName !== 'BUTTON')) {
        avanzar();
      } else if (e.key === 'ArrowLeft') {
        retroceder();
      } else if (e.key === 'Tab') {
        const botones = [...(tarjetaRef.current?.querySelectorAll('button') || [])];
        const [primero, ultimoBoton] = [botones[0], botones[botones.length - 1]];
        if (e.shiftKey && (foco === primero || !botones.includes(foco))) {
          e.preventDefault();
          ultimoBoton.focus();
        } else if (!e.shiftKey && foco === ultimoBoton) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [alCerrar, avanzar, retroceder]);

  // Directo en <body>: así queda por encima de todo, esté donde esté el panel que lo abre
  return createPortal(
    // Tocar lo oscuro no hace nada, ni le saca el foco a la tarjeta
    <Capa onMouseDown={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}>
      <Hueco aria-hidden style={geo?.hueco} $marcar={geo?.marcar} $animar={cuadros === 2} />

      <Tarjeta
        ref={tarjetaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
        aria-describedby="tutorial-texto"
        style={geo && { top: geo.tarjeta.top, left: geo.tarjeta.left }}
        $medida={!!geo}
        $animar={cuadros === 2}
      >
        {geo && geo.tarjeta.lado !== 'centro' && <Flecha aria-hidden style={estiloFlecha(geo.tarjeta)} />}

        <Contenido>
          <Cabecera>
            <Chip aria-hidden>{paso.imagen ? <img src={paso.imagen} alt="" /> : Icono && <Icono />}</Chip>
            <Contador>Paso {indice + 1} de {lista.length}</Contador>
            <Saltar type="button" aria-label="Saltar tutorial" title="Saltar tutorial" onClick={alCerrar}>
              <FiX aria-hidden />
            </Saltar>
          </Cabecera>

          <div aria-live="polite">
            <Titulo id="tutorial-titulo">{paso.titulo}</Titulo>
            <Texto id="tutorial-texto">{paso.texto}</Texto>

            {paso.puntos && (
              <Puntos>
                {paso.puntos.map((punto) => (
                  <li key={punto}><FiCheck aria-hidden /> <span>{punto}</span></li>
                ))}
              </Puntos>
            )}

            {paso.leyenda && (
              <Leyenda $enFila={paso.leyenda.every((item) => !item.detalle)}>
                {paso.leyenda.map(({ color, nombre, detalle }) => (
                  <li key={nombre}>
                    <Color aria-hidden $color={color} />
                    <span><strong>{nombre}</strong>{detalle && `: ${detalle}`}</span>
                  </li>
                ))}
              </Leyenda>
            )}

            {paso.nota && <Nota>{paso.nota}</Nota>}
          </div>

          <Pie>
            <Avance aria-hidden>
              {lista.map((p, i) => <Punto key={p.id} $actual={i === indice} $hecho={i <= indice} />)}
            </Avance>
            <Botones>
              {/* Con key distinta: "Atrás" no se convierte en "Ahora no" conservando el foco */}
              {indice === 0
                ? <BotonTexto key="ahora-no" type="button" onClick={alCerrar}>Ahora no</BotonTexto>
                : <BotonTexto key="atras" type="button" onClick={retroceder}>Atrás</BotonTexto>}
              <BotonPrincipal type="button" onClick={avanzar}>
                {ultimo ? 'Entendido' : <>{indice === 0 ? 'Empezar' : 'Continuar'} <FiArrowRight aria-hidden /></>}
              </BotonPrincipal>
            </Botones>
          </Pie>
        </Contenido>
      </Tarjeta>
    </Capa>,
    document.body
  );
}
