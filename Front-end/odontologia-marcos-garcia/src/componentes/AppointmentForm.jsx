import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiUser, FiCalendar, FiFileText, FiChevronRight, FiChevronLeft, FiAlertCircle } from 'react-icons/fi';
import { apiFetch } from '../api';
import { movil } from '../estilos/medidas';
import { fechaCita, errorHorario } from '../utils/agenda';
import { textoSexo, fechaLarga, textoDuracion } from '../utils/formato';
import {
  WizardCard, WizardHeader, WizardTitle, WizardSubtitle, FormBody, FieldGroup, FieldLabel, FieldSelect,
  FieldTextarea, StepTitle, StepDescription, NavButtons, BtnPrimary, BtnSecondary, ErrorText,
  ReviewBox, ReviewRow, ReviewLabel, ReviewValue, InfoText,
} from './wizard/estilos';
import { useDisponibilidad, useTurno, ERROR_OCUPADO } from './wizard/useTurno';
import PasoTurno from './wizard/PasoTurno';
import ProgresoPasos from './wizard/ProgresoPasos';
import CamposPaciente from './wizard/CamposPaciente';

const ModeToggleContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  ${movil} {
    flex-direction: column;
    gap: 8px;
  }
`;

const ModeToggleButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? '#5c0e6d' : '#ffffff'};
  color: ${props => props.$active ? '#ffffff' : '#5c0e6d'};
  border: 1.5px solid #5c0e6d;

  &:hover {
    background: ${props => props.$active ? '#4a0b5a' : '#faf5ff'};
  }
`;

// ─── 3 estaciones base (el paciente logueado saltea la primera) ───
const stations = [
  { key: 'paciente', icon: FiUser, label: 'Paciente', title: 'Datos del paciente', desc: 'Contanos quién va a atenderse' },
  { key: 'turno',   icon: FiCalendar, label: 'Turno',    title: 'Seleccioná tu turno', desc: 'Elegí la fecha y hora disponible que te quede mejor' },
  { key: 'consulta', icon: FiFileText, label: 'Consulta', title: 'Motivo de la consulta', desc: 'Revisá tus datos y confirmá el turno' },
];

const PACIENTE_VACIO = { name_paciente: '', genre_paciente: '', birth_paciente: '', dir_paciente: '', telf_paciente: '' };

export default function AppointmentForm({ user, onSuccess }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPatient = user && user.nombre_rol === 'Paciente';
  const isStaff = user && user.nombre_rol !== 'Paciente';

  const [form, setForm] = useState(() => ({
    // El paciente logueado reserva para sí mismo: sus datos ya se conocen
    ...(isPatient
      ? {
          name_paciente: user.name_paciente || user.name_user || '',
          genre_paciente: user.genre_paciente || '',
          birth_paciente: user.birth_paciente || '',
          dir_paciente: user.dir_paciente || '',
          telf_paciente: user.telf_paciente || '',
        }
      : PACIENTE_VACIO),
    date_cita_1: '',
    date_cita_2: '',
    time_cita: '',
    desc_cita: '',
  }));
  const activeStations = isPatient ? stations.filter(s => s.key !== 'paciente') : stations;
  const totalSteps = activeStations.length;
  const station = activeStations[step];

  const [pacientes, setPacientes] = useState([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [creationMode, setCreationMode] = useState('select'); // 'select' | 'create'
  const [loadingPacientes, setLoadingPacientes] = useState(false);

  const disponibilidad = useDisponibilidad();
  const turno = useTurno(form, disponibilidad.citas);

  // ─── cargar lista de pacientes si el usuario es staff ───
  useEffect(() => {
    if (isStaff) {
      const fetchPacientes = async () => {
        setLoadingPacientes(true);
        try {
          const res = await apiFetch('/pacientes');
          if (res.ok) {
            const data = await res.json();
            setPacientes(Array.isArray(data) ? data : []);
          }
        } catch (e) {
          console.error('Error al cargar pacientes:', e);
        } finally {
          setLoadingPacientes(false);
        }
      };
      fetchPacientes();
    }
  }, [isStaff]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const cambiarModo = (modo) => {
    setCreationMode(modo);
    setSelectedPacienteId('');
    setForm(prev => ({ ...prev, ...PACIENTE_VACIO }));
  };

  const elegirPaciente = (id) => {
    setSelectedPacienteId(id);
    const p = id && pacientes.find(x => String(x.id_paciente) === String(id));
    setForm(prev => ({
      ...prev,
      ...(p
        ? {
            name_paciente: p.name_paciente,
            genre_paciente: p.genre_paciente || 'M',
            birth_paciente: p.birth_paciente || '',
            dir_paciente: p.dir_paciente || '',
            telf_paciente: p.telf_paciente || '',
          }
        : PACIENTE_VACIO),
    }));
  };

  const canGoNext = () => {
    switch (station.key) {
      case 'paciente':
        if (isStaff && creationMode === 'select') {
          return selectedPacienteId !== '';
        }
        return form.name_paciente && form.genre_paciente && form.birth_paciente;
      case 'turno':
        return turno.isDateValid && form.date_cita_2 && form.time_cita && !turno.timeError;
      default:
        return true;
    }
  };

  const handleNext = () => {
    setError('');
    if (!canGoNext()) {
      if (station.key === 'paciente') {
        if (isStaff && creationMode === 'select' && !selectedPacienteId) {
          setError('Seleccioná un paciente existente antes de continuar');
        } else {
          setError('Completá todos los campos requeridos antes de continuar');
        }
      } else if (station.key === 'turno') {
        if (turno.isDateClosed) setError('Los domingos la clínica está cerrada');
        else if (!turno.isDateValid) setError('Seleccioná una fecha válida (no puede ser pasada)');
        else if (turno.timeError) setError(turno.timeError);
        else setError('Completá todos los campos requeridos antes de continuar');
      }
      return;
    }
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');

    const fueraDeHorario = errorHorario(form.date_cita_1, form.date_cita_2, form.time_cita);
    if (fueraDeHorario || turno.isTimeBooked) {
      setError(fueraDeHorario || ERROR_OCUPADO);
      return;
    }

    setSubmitting(true);
    try {
      // Hora local de la clínica, sin zona horaria (ver utils/agenda.js)
      const cita = {
        date_cita: fechaCita(form.date_cita_1, form.date_cita_2),
        time_cita: form.time_cita,
        desc_cita: form.desc_cita,
        status_cita: 'PENDIENTE',
        logic_cita: 'A',
      };
      let ruta = '/citas';
      let body;

      if (isPatient) {
        // El servidor asigna la cita a la ficha del paciente logueado
        body = { fk_paciente: parseInt(user.id_paciente, 10), ...cita };
      } else if (isStaff && creationMode === 'select' && selectedPacienteId) {
        body = { fk_paciente: parseInt(selectedPacienteId, 10), ...cita };
      } else {
        // Paciente nuevo cargado por el personal: se crea la ficha sin cuenta de acceso
        ruta = '/citaCompleta';
        body = {
          name_paciente: form.name_paciente,
          genre_paciente: form.genre_paciente || 'M',
          birth_paciente: form.birth_paciente || '2000-01-01',
          dir_paciente: form.dir_paciente || 'Sin especificar',
          telf_paciente: form.telf_paciente,
          logic_paciente: 'A',
          ...cita,
        };
      }

      const response = await apiFetch(ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al registrar la cita');

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── render de cada paso ───

  const renderStep = () => {
    switch (station.key) {
      case 'paciente':
        return (
          <>
            <StepTitle>{station.title}</StepTitle>
            <StepDescription>{station.desc}</StepDescription>

            {isStaff && (
              <ModeToggleContainer>
                <ModeToggleButton type="button" $active={creationMode === 'select'} onClick={() => cambiarModo('select')}>
                  Seleccionar paciente existente
                </ModeToggleButton>
                <ModeToggleButton type="button" $active={creationMode === 'create'} onClick={() => cambiarModo('create')}>
                  Crear nuevo paciente
                </ModeToggleButton>
              </ModeToggleContainer>
            )}

            {isStaff && creationMode === 'select' && (
              <FieldGroup style={{ marginBottom: '20px' }}>
                <FieldLabel>Seleccionar Paciente *</FieldLabel>
                {loadingPacientes ? (
                  <InfoText>Cargando pacientes...</InfoText>
                ) : (
                  <FieldSelect value={selectedPacienteId} onChange={(e) => elegirPaciente(e.target.value)}>
                    <option value="">-- Seleccionar paciente --</option>
                    {pacientes.map(p => (
                      <option key={p.id_paciente} value={p.id_paciente}>
                        {p.name_paciente} ({p.telf_paciente || 'Sin teléfono'})
                      </option>
                    ))}
                  </FieldSelect>
                )}
              </FieldGroup>
            )}

            {(!isStaff || creationMode === 'create' || selectedPacienteId) && (
              // Con un paciente existente elegido, sus datos se muestran pero no se editan
              <CamposPaciente form={form} setForm={setForm} disabled={isStaff && creationMode === 'select'} />
            )}
          </>
        );

      case 'turno':
        return (
          <PasoTurno
            titulo={station.title}
            descripcion={station.desc}
            form={form}
            setForm={setForm}
            turno={turno}
            cargando={disponibilidad.cargando}
          />
        );

      case 'consulta':
        return (
          <>
            <StepTitle>{station.title}</StepTitle>
            <StepDescription>{station.desc}</StepDescription>
            <FieldGroup>
              <FieldLabel>Descripción del motivo *</FieldLabel>
              <FieldTextarea
                placeholder="Contanos brevemente el motivo de tu consulta..."
                value={form.desc_cita}
                onChange={set('desc_cita')}
              />
            </FieldGroup>

            <StepTitle style={{ fontSize: '0.95rem', marginTop: '24px' }}>Resumen de tu turno</StepTitle>
            <ReviewBox>
              <ReviewRow><ReviewLabel>Paciente</ReviewLabel><ReviewValue>{form.name_paciente}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Sexo</ReviewLabel><ReviewValue>{textoSexo(form.genre_paciente)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Fecha</ReviewLabel><ReviewValue>{fechaLarga(form.date_cita_1)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Horario</ReviewLabel><ReviewValue>{form.date_cita_2 || '—'} hs</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Duración</ReviewLabel><ReviewValue>{textoDuracion(form.time_cita)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Usuario</ReviewLabel><ReviewValue>{user?.name_user || form.name_paciente}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Email</ReviewLabel><ReviewValue>{user?.email_user || '—'}</ReviewValue></ReviewRow>
            </ReviewBox>
          </>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === totalSteps - 1;

  return (
    <WizardCard>
      <WizardHeader>
        <WizardTitle>Agendá tu turno</WizardTitle>
        <WizardSubtitle>{isPatient ? 'Elegí tu turno en solo 2 pasos' : 'Completá los datos paso a paso'}</WizardSubtitle>
      </WizardHeader>

      <ProgresoPasos pasos={activeStations} paso={step} />

      <FormBody>
        {renderStep()}

        {error && <ErrorText><FiAlertCircle /> {error}</ErrorText>}

        <NavButtons $single={step === 0}>
          {step > 0 && (
            <BtnSecondary onClick={handleBack}>
              <FiChevronLeft /> Anterior
            </BtnSecondary>
          )}
          {isLastStep ? (
            <BtnPrimary onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Agendando...' : 'Agendar turno'} <FiChevronRight />
            </BtnPrimary>
          ) : (
            <BtnPrimary onClick={handleNext} disabled={station.key === 'turno' && !!turno.timeError}>
              Siguiente <FiChevronRight />
            </BtnPrimary>
          )}
        </NavButtons>
      </FormBody>
    </WizardCard>
  );
}
