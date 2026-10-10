import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiMail, FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { apiFetch } from '../api';
import { movil } from '../estilos/medidas';
import { diaCita, horarioCita, textoDuracion, textoSexo } from '../utils/formato';
import { whatsappUrl } from '../utils/telefono';
import { partesDelHistorial, textoEdad } from '../utils/historial';
import { exportarHistorialExcel, exportarHistorialPdf } from '../exportar/historial';
import { diaMesAnio } from '../exportar/textos';
import BotonesExportar from './BotonesExportar';
import EtiquetaEstado from './EtiquetaEstado';

const Barra = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`;

const Volver = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px 0 10px;
  border: 1.5px solid #e9d5ff;
  border-radius: 10px;
  background: #ffffff;
  color: #5c0e6d;
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #faf5ff;
  }
`;

const Aviso = styled.div`
  padding: 60px 24px;
  text-align: center;
  font-size: 0.95rem;
  color: ${props => (props.$error ? '#dc2626' : '#6b7280')};
`;

// La ficha del paciente
const Ficha = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  ${movil} {
    gap: 14px;
    padding: 18px 16px;
  }
`;

const Iniciales = styled.div`
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #5c0e6d, #7b1fa2);
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.5px;

  ${movil} {
    width: 48px;
    height: 48px;
    font-size: 1.05rem;
  }
`;

const Nombre = styled.h2`
  margin: 0 0 8px;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a2e;
  overflow-wrap: anywhere;

  ${movil} {
    font-size: 1.12rem;
  }
`;

const Datos = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.88rem;
    color: #4b5563;
    overflow-wrap: anywhere;
  }

  svg {
    flex-shrink: 0;
    color: #9167f9;
  }

  a {
    color: #5c0e6d;
    font-weight: 500;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const WhatsApp = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 20px;
  background: #dcfce7;
  color: #15803d !important;
  font-size: 0.78rem;
  font-weight: 600 !important;

  svg {
    color: #15803d;
  }
`;

// Tres números para leer de un vistazo
const Resumen = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 28px;

  ${movil} {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 22px;
  }
`;

const Dato = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;

  span {
    display: block;
    font-size: 0.76rem;
    color: #6b7280;
  }

  strong {
    display: block;
    font-size: 0.98rem;
    font-weight: 700;
    color: #1a1a2e;
  }
`;

const IconoDato = styled.div`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: ${props => props.$fondo};
  color: ${props => props.$color};
  font-size: 1.05rem;
`;

const Seccion = styled.section`
  margin-bottom: 28px;
`;

const TituloSeccion = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 1.02rem;
  font-weight: 700;
  color: #1a1a2e;

  span {
    padding: 1px 10px;
    border-radius: 20px;
    background: #f3e8ff;
    color: #5c0e6d;
    font-size: 0.78rem;
  }
`;

// Línea de tiempo: una raya a la izquierda con un punto por cada cita
const Linea = styled.ol`
  list-style: none;
  margin: 0 0 0 7px;
  padding: 0;
  border-left: 2px solid #e9d5ff;
`;

const Item = styled.li`
  position: relative;
  margin: 0 0 12px 22px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &:last-child {
    margin-bottom: 0;
  }

  &::before {
    content: '';
    position: absolute;
    left: -30px;
    top: 20px;
    width: 12px;
    height: 12px;
    border: 3px solid #ffffff;
    border-radius: 50%;
    background: ${props => props.$color};
    box-shadow: 0 0 0 1px ${props => props.$color};
  }

  ${movil} {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 14px;
  }
`;

const Procedimiento = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1a2e;
    overflow-wrap: anywhere;
  }

  span {
    display: block;
    margin-top: 2px;
    font-size: 0.82rem;
    color: #6b7280;
  }
`;

const Aparte = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  color: #6b7280;
  text-align: right;

  ${movil} {
    text-align: left;
  }
`;

const Nada = styled.p`
  margin: 0;
  padding: 24px;
  background: #ffffff;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
`;

const COLOR = { realizados: '#16a34a', proximos: '#9167f9', cancelados: '#dc2626' };

// "María Fernanda Omaña" → "MF"
const iniciales = (nombre) => String(nombre || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const fechaValida = (fecha) => /^\d{4}-\d{2}-\d{2}/.test(fecha || '');

// `doctor`: cómo se nombra a quien atiende ("Atendió" en lo ya hecho, "Atiende" en lo que viene)
function Citas({ titulo, citas, color, doctor, conEstado = false, vacio }) {
  if (citas.length === 0 && !vacio) return null;
  return (
    <Seccion aria-label={titulo}>
      <TituloSeccion>{titulo} <span>{citas.length}</span></TituloSeccion>
      {citas.length === 0 ? <Nada>{vacio}</Nada> : (
        <Linea>
          {citas.map((c) => (
            <Item key={c.id_citas} $color={color}>
              <Procedimiento>
                <strong>{c.desc_cita || 'Sin descripción'}</strong>
                <span>{diaCita(c.date_cita)} · {horarioCita(c.date_cita, c.time_cita)} ({textoDuracion(c.time_cita)})</span>
              </Procedimiento>
              <Aparte>
                {doctor && c.name_doctor && <span>{doctor}: {c.name_doctor}</span>}
                {conEstado && <EtiquetaEstado estado={c.status_cita} />}
              </Aparte>
            </Item>
          ))}
        </Linea>
      )}
    </Seccion>
  );
}

// El historial de un paciente: su ficha y todos los procedimientos que se hizo, más lo que tiene por venir.
// `textoVolver` y `alVolver`: a dónde vuelve el botón de arriba (la lista de pacientes o el calendario).
export default function HistorialPaciente({ idPaciente, alVolver, textoVolver = 'Volver a pacientes' }) {
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    apiFetch(`/pacientes/${idPaciente}/historial`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Ese paciente ya no existe.' : 'No se pudo cargar el historial.');
        return res.json();
      })
      .then((datos) => { if (!cancelado) setHistorial(datos); })
      .catch((err) => { if (!cancelado) setError(err.message); });
    return () => { cancelado = true; };
  }, [idPaciente]);

  const barra = (
    <Barra>
      <Volver type="button" onClick={alVolver}><FiArrowLeft aria-hidden /> {textoVolver}</Volver>
      {historial && (
        <BotonesExportar
          que="el historial"
          alExcel={() => exportarHistorialExcel(historial)}
          alPdf={() => exportarHistorialPdf(historial)}
        />
      )}
    </Barra>
  );

  if (error) return <div>{barra}<Aviso $error>{error}</Aviso></div>;
  if (!historial) return <div>{barra}<Aviso>Cargando el historial...</Aviso></div>;

  const { paciente } = historial;
  const { realizados, proximos, cancelados } = partesDelHistorial(historial.citas);
  const nacimiento = fechaValida(paciente.birth_paciente) ? paciente.birth_paciente.slice(0, 10) : null;
  const urlWhatsApp = whatsappUrl(paciente.telf_paciente);
  const [ultimo] = realizados;
  const [proximo] = proximos;

  return (
    <div>
      {barra}

      <Ficha>
        <Iniciales aria-hidden>{iniciales(paciente.name_paciente)}</Iniciales>
        <div>
          <Nombre>{paciente.name_paciente}</Nombre>
          <Datos>
            <li>
              <FiUser aria-hidden />
              {[textoSexo(paciente.genre_paciente), nacimiento && `${textoEdad(nacimiento)} (nació el ${diaMesAnio(nacimiento)})`]
                .filter(Boolean).join(' · ')}
            </li>
            {paciente.telf_paciente && (
              <li>
                <FiPhone aria-hidden /> {paciente.telf_paciente}
                {urlWhatsApp && (
                  <WhatsApp href={urlWhatsApp} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden /> WhatsApp</WhatsApp>
                )}
              </li>
            )}
            {paciente.email_user && (
              <li><FiMail aria-hidden /> <a href={`mailto:${paciente.email_user}`}>{paciente.email_user}</a></li>
            )}
            {paciente.dir_paciente && <li><FiMapPin aria-hidden /> {paciente.dir_paciente}</li>}
          </Datos>
        </div>
      </Ficha>

      <Resumen>
        <Dato>
          <IconoDato $fondo="#dcfce7" $color="#16a34a"><FiCheckCircle aria-hidden /></IconoDato>
          <div><span>Procedimientos realizados</span><strong>{realizados.length}</strong></div>
        </Dato>
        <Dato>
          <IconoDato $fondo="#f3f4f6" $color="#6b7280"><FiClock aria-hidden /></IconoDato>
          <div><span>Última visita</span><strong>{ultimo ? diaCita(ultimo.date_cita) : '—'}</strong></div>
        </Dato>
        <Dato>
          <IconoDato $fondo="#f3e8ff" $color="#5c0e6d"><FiCalendar aria-hidden /></IconoDato>
          <div><span>Próximo turno</span><strong>{proximo ? `${diaCita(proximo.date_cita)}, ${proximo.date_cita.slice(11, 16)}` : '—'}</strong></div>
        </Dato>
      </Resumen>

      <Citas
        titulo="Procedimientos realizados"
        citas={realizados}
        color={COLOR.realizados}
        doctor="Atendió"
        vacio="Todavía no tiene procedimientos realizados."
      />
      <Citas titulo="Próximos turnos" citas={proximos} color={COLOR.proximos} doctor="Atiende" conEstado />
      <Citas titulo="Turnos cancelados" citas={cancelados} color={COLOR.cancelados} />
    </div>
  );
}
