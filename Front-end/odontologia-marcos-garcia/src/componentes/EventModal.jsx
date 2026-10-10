import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import '../styles/modal.css';
import whatsapp from '../assets/images/whatsapp.svg'
import email from '../assets/images/email.svg'
import { apiFetch } from '../api';
import { mostrarFechaHora } from '../utils/agenda';
import { whatsappUrl } from '../utils/telefono';
import { colorEvento } from '../utils/estados';
import { textoSexo } from '../utils/formato';
import { movil } from '../estilos/medidas';

const ModalOverlay = styled.div`
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    padding: 16px;

    ${movil} {
        padding: 10px;
    }
`;

const ModalContent = styled.div`
    background-color: #ffffff;
    padding: 28px;
    width: 85%;
    max-width: 800px;
    max-height: 85vh;
    overflow-y: auto;
    border-radius: 20px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
    border-top: 5px solid ${props => props.$color || '#5c0e6d'};
    position: relative;
    animation: fadeInUp 0.25s ease-out;
    ${movil} {
        width: 100%;
        max-height: 92vh;
        padding: 16px;
        border-radius: 16px;
    }
`;

const CloseButton = styled.button`
    background: #f3f4f6;
    color: #6b7280;
    font-size: 1.2rem;
    font-weight: bold;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    position: absolute;
    top: 16px;
    right: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
        background: #e5e7eb;
        color: #1a1a2e;
        transform: rotate(90deg);
    }
    ${movil} {
        top: 10px;
        right: 10px;
    }
`;

const ModalTitle = styled.h2`
    background: ${props => props.$color || '#5c0e6d'};
    color: white;
    text-align: center;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 20px;
    ${movil} {
        /* deja lugar arriba para el botón de cerrar */
        margin: 40px 0 16px;
        padding: 12px 16px;
        font-size: 1.05rem;
    }
`;

const ModalBody = styled.div`
    background: #f9fafb;
    padding: 20px;
    border-radius: 12px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    ${movil} {
        padding: 14px;
        gap: 8px;
    }
`;

const InfoColumn = styled.div`
    flex: ${props => props.$flex || 1};
    min-width: min(200px, 100%);
`;

const InfoLabel = styled.strong`
    display: block;
    font-size: 0.8rem;
    color: #9167f9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    margin-top: 12px;

    &:first-child {
        margin-top: 0;
    }
`;

const InfoText = styled.p`
    font-size: 0.95rem;
    color: #4b5563;
    margin: 0 0 8px 0;
    line-height: 1.5;
`;

const DateGroup = styled.div`
    background: #f3f4f6;
    border-radius: 10px;
    padding: 12px;
    margin-top: 8px;
`;

const DateRow = styled.div`
    display: flex;
    gap: 12px;
`;

const DateBadge = styled.div`
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    background: #ffffff;
    font-size: 0.85rem;
    color: #1a1a2e;
    text-align: center;
    border: 1px solid #e5e7eb;
`;

const StatusBadge = styled.div`
    background: ${props => props.$color || '#868686'};
    color: white;
    border-radius: 10px;
    padding: 16px;
    margin-top: 12px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
`;

const ActionButton = styled.button`
    flex: 1;
    min-height: 44px;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const CancelButton = styled(ActionButton)`
    background: #fef2f2;
    color: #dc2626;

    &:hover {
        background: #dc2626;
        color: #ffffff;
    }
`;

const ConfirmButton = styled(ActionButton)`
    background: #f0fdf4;
    color: #16a34a;

    &:hover {
        background: #9de03e;
        color: #1a1a2e;
    }
`;

const LogicButton = styled.button`
    background: #9de03e;
    border: none;
    border-radius: 8px;
    color: #1a1a2e;
    font-size: 0.9rem;
    font-weight: 700;
    min-height: 44px;
    padding: 10px 16px;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #86c935;
        transform: translateY(-1px);
    }
`;

// "Ver historial": lleva a la ficha del paciente con todos sus procedimientos
const HistorialButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    margin-top: 14px;
    padding: 10px 16px;
    border: 1.5px solid #e9d5ff;
    border-radius: 8px;
    background: #ffffff;
    color: #5c0e6d;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #faf5ff;
        border-color: #c084fc;
    }
`;

const LogicSection = styled.div`
    background: #f0fdf4;
    border-radius: 10px;
    padding: 16px;
    margin-top: 12px;
`;

const EventModal = ({ isOpen, onClose, info, trigger, onVerHistorial }) => {
    const cerrarRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        cerrarRef.current?.focus();
        const alTeclear = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [isOpen, onClose]);

    const handleOutsideClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose(); 
        }
    };

    if (!info && isOpen) {
       return null; 
    }

    // PUT a la API; si falla muestra el motivo y devuelve false. Si sale bien, recarga el calendario.
    async function actualizarCita(ruta, body, mensajeError) {
        try {
            const response = await apiFetch(ruta, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                // p. ej. 409: se quiere reactivar una cita cancelada cuyo horario ya se ocupó
                const data = await response.json().catch(() => ({}));
                window.alert(data.error || mensajeError);
                return;
            }
            trigger();
            onClose();
        } catch {
            window.alert('Error de conexión con el servidor.');
        }
    }

    function cambiarEstado(e, status_cita) {
        e.preventDefault();
        const id = info?.extendedProps?.id;
        return actualizarCita(`/citaCompletaStatus/${id}`, { status_cita }, 'No se pudo actualizar la cita.');
    }

    const confirmarCita = (e) => cambiarEstado(e, "CONFIRMADA");
    const cancelarCita = (e) => cambiarEstado(e, "CANCELADA");

    function logicCita(e) {
        e.preventDefault();

        if (window.confirm("¿Estás seguro?") === false) {
            return;
        }

        const id = info?.extendedProps?.id;
        return actualizarCita(`/citaCompletaLogic/${id}`, { logic_cita: 'I' }, 'No se pudo ocultar la cita.');
    }

    const color = colorEvento(info?.extendedProps?.estatus);

    // Se pueden quitar de la agenda las completadas y las canceladas
    const esCancelada = info?.extendedProps?.estatus === "CANCELADA";
    let logic = "none";
    if (info?.extendedProps?.estatus === "COMPLETADA" || esCancelada) {
        logic = "block";
    }
    let ilogical = "block";
    if (info?.extendedProps?.estatus === "COMPLETADA") {
        ilogical = "none"; 
    }

    const urlWhatsApp = whatsappUrl(info?.extendedProps?.telefono);
    const nacimiento = info?.extendedProps?.nacimiento;

    return (
        <ModalOverlay $isOpen={isOpen} onClick={handleOutsideClick}>
            <ModalContent $color={color} role="dialog" aria-modal="true" aria-labelledby="titulo-cita">
                <CloseButton ref={cerrarRef} onClick={onClose} aria-label="Cerrar">&times;</CloseButton>
                
                <ModalTitle id="titulo-cita" $color={color}>{info?.title}</ModalTitle>

                <ModalBody>
                    <InfoColumn $flex={2}>
                        <InfoLabel>Descripción</InfoLabel>
                        <InfoText>{info?.extendedProps?.description}</InfoText>

                        <InfoLabel>Fecha y hora</InfoLabel>
                        <DateGroup>
                            <strong>Inicio</strong>
                            <DateRow>
                                <DateBadge>{mostrarFechaHora(info?.extendedProps?.start)}</DateBadge>
                            </DateRow>
                            <strong style={{display: 'block', marginTop: '8px'}}>Fin</strong>
                            <DateRow>
                                <DateBadge>{mostrarFechaHora(info?.extendedProps?.end)}</DateBadge>
                            </DateRow>
                        </DateGroup>

                        {onVerHistorial && info?.extendedProps?.idPaciente != null && (
                            <HistorialButton type="button" onClick={() => onVerHistorial(info.extendedProps.idPaciente)}>
                                Ver historial del paciente
                            </HistorialButton>
                        )}
                    </InfoColumn>

                    <InfoColumn $flex={1}>
                        <InfoLabel>Sexo</InfoLabel>
                        <InfoText>{textoSexo(info?.extendedProps?.sexo)}</InfoText>

                        <InfoLabel>Fecha de nacimiento</InfoLabel>
                        {/* Puede faltar (pacientes cargados por API): antes esto rompía toda la pantalla */}
                        <InfoText>{nacimiento ? String(nacimiento).slice(0, 10) : '—'}</InfoText>

                        <InfoLabel>Teléfono</InfoLabel>
                        <InfoText>{info?.extendedProps?.telefono || '—'}</InfoText>
                        <div className="png-container">
                            {/* wa.me necesita el número internacional (58…); en otra pestaña para no perder la sesión */}
                            {urlWhatsApp && (
                                <a aria-label="Contactar por WhatsApp?" href={urlWhatsApp} target="_blank" rel="noopener noreferrer"><img alt="Contactar por WhatsApp?" title="Contactar por WhatsApp?" className="what" src={whatsapp}/></a>
                            )}
                            {/* Los pacientes cargados por el personal no tienen cuenta ni email */}
                            {info?.extendedProps?.email && (
                                <a href={`mailto:${info.extendedProps.email}`}><img alt="Contactar por email" className="email" src={email} title="contactar por email?"/></a>
                            )}
                        </div>
                        
                        <InfoLabel>Dirección</InfoLabel>
                        <InfoText>{info?.extendedProps?.direccion || '—'}</InfoText>

                        <StatusBadge $color={color} style={{ display: ilogical }}>
                            <InfoText style={{color: 'white', margin: 0, fontWeight: 600}}>
                                Estado: {info?.extendedProps?.estatus}
                            </InfoText>
                            <p style={{color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '8px 0 0'}}>
                                ¿Confirmar la cita?
                            </p>
                            <ButtonGroup>
                                <CancelButton onClick={(e) => cancelarCita(e)}>Cancelar</CancelButton>
                                <ConfirmButton onClick={(e) => confirmarCita(e)}>Confirmar</ConfirmButton>
                            </ButtonGroup>
                        </StatusBadge>

                        <LogicSection style={{ display: logic }}>
                            <InfoLabel style={{color: '#16a34a'}}>Ocultar cita</InfoLabel>
                            <p style={{fontSize: '0.85rem', color: '#4b5563', margin: '4px 0 12px'}}>
                                {esCancelada ? 'Esta cita fue cancelada.' : 'Esta cita ya pasó.'} ¿Querés quitarla de la agenda?
                            </p>
                            <LogicButton onClick={(e) => logicCita(e)}>Ocultar cita</LogicButton>
                        </LogicSection>
                    </InfoColumn>
                </ModalBody>
            </ModalContent>
        </ModalOverlay>
    );
};

export default EventModal;
