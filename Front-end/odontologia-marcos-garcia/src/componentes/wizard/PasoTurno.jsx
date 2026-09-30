import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { hoyStr, horaActualStr, ultimoInicio } from '../../utils/agenda';
import {
  StepTitle, StepDescription, InfoText, FieldGrid, FieldGroup, FieldLabel, FieldInput, FieldSelect,
  ErrorText, WarningBox,
} from './estilos';

// Paso "turno": fecha, hora y duración, con los avisos de disponibilidad y horario de atención.
// `turno` es lo que devuelve useTurno(form, citas).
export default function PasoTurno({ titulo, descripcion, form, setForm, turno, cargando }) {
  const { bookedRanges, horarioDia, isDateClosed, isDatePast, isDateValid, timeError } = turno;
  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  return (
    <>
      <StepTitle>{titulo}</StepTitle>
      <StepDescription>{descripcion}</StepDescription>

      {cargando && <InfoText style={{ marginBottom: 12 }}>Verificando disponibilidad...</InfoText>}

      <FieldGrid $twoCol>
        <FieldGroup>
          <FieldLabel>Fecha *</FieldLabel>
          <FieldInput
            type="date"
            min={hoyStr()}
            value={form.date_cita_1}
            // Al cambiar el día se borra la hora: la disponibilidad es otra
            onChange={(e) => setForm((prev) => ({ ...prev, date_cita_1: e.target.value, date_cita_2: '' }))}
          />
          {isDatePast && <ErrorText><FiAlertCircle /> No podés seleccionar una fecha pasada</ErrorText>}
          {isDateClosed && <ErrorText><FiAlertCircle /> Los domingos la clínica está cerrada</ErrorText>}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>Hora *</FieldLabel>
          <FieldInput
            type="time"
            min={form.date_cita_1 === hoyStr() ? horaActualStr() : (horarioDia?.[0] || '08:00')}
            max={ultimoInicio(form.date_cita_1, form.time_cita) || '18:00'}
            value={form.date_cita_2}
            onChange={set('date_cita_2')}
            disabled={!isDateValid}
          />
          {horarioDia && <InfoText>Atención ese día: {horarioDia[0]} a {horarioDia[1]}</InfoText>}
        </FieldGroup>
      </FieldGrid>

      {timeError && <ErrorText><FiAlertCircle /> {timeError}</ErrorText>}

      {form.date_cita_1 && bookedRanges.length > 0 && (
        <WarningBox>
          <FiAlertCircle size={18} />
          <span>
            Horarios ya ocupados para esta fecha: <strong>{bookedRanges.map((r) => r.texto).join(', ')}</strong>
          </span>
        </WarningBox>
      )}

      {isDateValid && bookedRanges.length === 0 && !cargando && (
        <InfoText style={{ marginTop: 8 }}>✅ Todos los horarios están disponibles para esta fecha.</InfoText>
      )}

      <FieldGroup style={{ marginTop: 8 }}>
        <FieldLabel>Duración *</FieldLabel>
        <FieldSelect value={form.time_cita} onChange={set('time_cita')}>
          <option value="">Seleccionar...</option>
          <option value="1">1 hora</option>
          <option value="2">2 horas</option>
        </FieldSelect>
      </FieldGroup>
    </>
  );
}
