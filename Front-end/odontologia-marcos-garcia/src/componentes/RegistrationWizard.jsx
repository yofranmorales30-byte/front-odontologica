import React, { useState } from 'react';
import styled from 'styled-components';
import { FiUser, FiCalendar, FiFileText, FiCheck, FiChevronRight, FiChevronLeft, FiAlertCircle } from 'react-icons/fi';
import { apiFetch } from '../api';
import { fechaCita, errorHorario } from '../utils/agenda';
import { textoSexo, fechaLarga, textoDuracion } from '../utils/formato';
import {
  WizardCard, WizardHeader, WizardTitle, WizardSubtitle, FormBody, FieldGrid, FieldGroup, FieldLabel,
  FieldInput, FieldTextarea, StepTitle, StepDescription, NavButtons, BtnPrimary, BtnSecondary, ErrorText,
  ReviewBox, ReviewRow, ReviewLabel, ReviewValue,
} from './wizard/estilos';
import { useDisponibilidad, useTurno, ERROR_OCUPADO } from './wizard/useTurno';
import PasoTurno from './wizard/PasoTurno';
import ProgresoPasos from './wizard/ProgresoPasos';
import CamposPaciente from './wizard/CamposPaciente';

const SuccessBody = styled.div`
  padding: 48px 36px;
  text-align: center;
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  color: #16a34a;
  margin-bottom: 16px;
`;

const SuccessTitle = styled.h2`
  font-family: 'Poppins', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 8px;
`;

const SuccessText = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 24px;
`;

// ─── 3 estaciones ───
const stations = [
  { key: 'paciente', icon: FiUser,     label: 'Paciente',  title: 'Datos del paciente',   desc: 'Contanos quién va a atenderse' },
  { key: 'turno',    icon: FiCalendar,  label: 'Turno',     title: 'Seleccioná tu turno',  desc: 'Elegí fecha y hora disponible' },
  { key: 'consulta', icon: FiFileText,  label: 'Consulta',  title: 'Motivo de la consulta', desc: 'Revisá tus datos y confirmá' },
];

export default function RegistrationWizard({ onRegister, onBackToLogin, embedded = false }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [form, setForm] = useState({
    name_paciente: '',
    genre_paciente: '',
    birth_paciente: '',
    dir_paciente: '',
    telf_paciente: '',
    date_cita_1: '',
    date_cita_2: '',
    time_cita: '',
    email_user: '',
    key_user: '',
    confirm_key_user: '',
    desc_cita: '',
  });

  const totalSteps = stations.length;
  const disponibilidad = useDisponibilidad();
  const turno = useTurno(form, disponibilidad.citas);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const canGoNext = () => {
    switch (step) {
      case 0: return form.name_paciente && form.genre_paciente && form.birth_paciente && form.email_user && form.key_user && form.key_user === form.confirm_key_user;
      case 1: return turno.isDateValid && form.date_cita_2 && form.time_cita && !turno.timeError;
      default: return true;
    }
  };

  const handleNext = () => {
    setError('');
    if (!canGoNext()) {
      if (step === 0 && form.key_user !== form.confirm_key_user) {
        setError('Las contraseñas no coinciden');
      } else {
        setError('Completá todos los campos requeridos');
      }
      return;
    }
    if (step < totalSteps - 1) setStep(prev => prev + 1);
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
      // El servidor fija el rol (Paciente) y el estado de la cita, y devuelve la sesión iniciada
      const response = await apiFetch('/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_user: form.email_user,
          key_user: form.key_user,
          name_paciente: form.name_paciente,
          genre_paciente: form.genre_paciente,
          birth_paciente: form.birth_paciente,
          dir_paciente: form.dir_paciente,
          telf_paciente: form.telf_paciente,
          // Hora local de la clínica, sin zona horaria (ver utils/agenda.js)
          date_cita: fechaCita(form.date_cita_1, form.date_cita_2),
          time_cita: form.time_cita,
          desc_cita: form.desc_cita,
        }),
      });

      const session = await response.json();
      if (!response.ok) throw new Error(session.error || 'Error al registrar');

      setRegistered(true);
      // Darle tiempo al usuario para ver el mensaje de éxito
      setTimeout(() => onRegister(session), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Embebido va dentro de la tarjeta de SignUp; si no, trae su propia tarjeta con encabezado
  const envolver = (contenido, encabezado) => (embedded ? contenido : (
    <WizardCard>
      {encabezado}
      {contenido}
    </WizardCard>
  ));

  if (registered) {
    return envolver(
      <SuccessBody style={embedded ? { paddingTop: 24 } : undefined}>
        <SuccessIcon><FiCheck /></SuccessIcon>
        <SuccessTitle>Bienvenido, {form.name_paciente}</SuccessTitle>
        <SuccessText>
          Tu cuenta fue creada y tu turno está pendiente de confirmación.<br />
          Te redirigimos a tu panel...
        </SuccessText>
      </SuccessBody>,
      <WizardHeader style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
        <WizardTitle>¡Registro exitoso!</WizardTitle>
      </WizardHeader>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <StepTitle>{stations[0].title}</StepTitle>
            <StepDescription>{stations[0].desc}</StepDescription>
            <CamposPaciente form={form} setForm={setForm} propio />
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <StepTitle style={{ fontSize: '0.95rem' }}>Datos de acceso</StepTitle>
            <FieldGrid $twoCol>
              <FieldGroup>
                <FieldLabel>Correo electrónico *</FieldLabel>
                <FieldInput type="email" placeholder="tu@correo.com" value={form.email_user} onChange={set('email_user')} />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Contraseña *</FieldLabel>
                <FieldInput type="password" placeholder="Tu contraseña" value={form.key_user} onChange={set('key_user')} />
              </FieldGroup>
            </FieldGrid>
            <FieldGroup>
              <FieldLabel>Confirmar contraseña *</FieldLabel>
              <FieldInput type="password" placeholder="Repetí tu contraseña" value={form.confirm_key_user} onChange={set('confirm_key_user')} />
              {form.confirm_key_user && form.key_user !== form.confirm_key_user && (
                <ErrorText><FiAlertCircle /> Las contraseñas no coinciden</ErrorText>
              )}
            </FieldGroup>
          </>
        );

      case 1:
        return (
          <PasoTurno
            titulo={stations[1].title}
            descripcion={stations[1].desc}
            form={form}
            setForm={setForm}
            turno={turno}
            cargando={disponibilidad.cargando}
          />
        );

      case 2:
        return (
          <>
            <StepTitle>{stations[2].title}</StepTitle>
            <StepDescription>{stations[2].desc}</StepDescription>
            <FieldGroup>
              <FieldLabel>Descripción del motivo *</FieldLabel>
              <FieldTextarea placeholder="Contanos brevemente el motivo de tu consulta..." value={form.desc_cita} onChange={set('desc_cita')} />
            </FieldGroup>

            <StepTitle style={{ fontSize: '0.95rem', marginTop: '24px' }}>Resumen</StepTitle>
            <ReviewBox>
              <ReviewRow><ReviewLabel>Paciente</ReviewLabel><ReviewValue>{form.name_paciente}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Sexo</ReviewLabel><ReviewValue>{textoSexo(form.genre_paciente)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Fecha</ReviewLabel><ReviewValue>{fechaLarga(form.date_cita_1)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Horario</ReviewLabel><ReviewValue>{form.date_cita_2 || '—'} hs</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Duración</ReviewLabel><ReviewValue>{textoDuracion(form.time_cita)}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Email</ReviewLabel><ReviewValue>{form.email_user}</ReviewValue></ReviewRow>
              <ReviewRow style={{ border: 'none' }}><ReviewLabel>Estado</ReviewLabel><ReviewValue style={{ color: '#d97706' }}>Pendiente</ReviewValue></ReviewRow>
            </ReviewBox>
          </>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === totalSteps - 1;

  return envolver(
    <>
      <ProgresoPasos pasos={stations} paso={step} />

      <FormBody>
        {renderStep()}
        {error && <ErrorText><FiAlertCircle /> {error}</ErrorText>}

        <NavButtons $single={step === 0}>
          {step > 0 && (
            <BtnSecondary onClick={handleBack}><FiChevronLeft /> Anterior</BtnSecondary>
          )}
          {isLastStep ? (
            <BtnPrimary onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creando cuenta...' : 'Crear cuenta y agendar'} <FiChevronRight />
            </BtnPrimary>
          ) : (
            <BtnPrimary onClick={handleNext} disabled={step === 1 && !!turno.timeError}>
              Siguiente <FiChevronRight />
            </BtnPrimary>
          )}
        </NavButtons>

        {step === 0 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <BtnSecondary onClick={onBackToLogin}>
              ← Ya tengo cuenta, quiero iniciar sesión
            </BtnSecondary>
          </div>
        )}
      </FormBody>
    </>,
    <WizardHeader>
      <WizardTitle>Creá tu cuenta y agendá tu turno</WizardTitle>
      <WizardSubtitle>Todo en un solo paso</WizardSubtitle>
    </WizardHeader>
  );
}
