import React from 'react';
import { FieldGrid, FieldGroup, FieldLabel, FieldInput, FieldSelect, InfoText } from './estilos';

// Datos del paciente: nombre, sexo, nacimiento, teléfono y dirección.
// `propio`: lo completa el mismo paciente (textos en segunda persona).
export default function CamposPaciente({ form, setForm, propio = false, disabled = false }) {
  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  // El teléfono se guarda solo con dígitos
  const setTelefono = (e) => setForm((prev) => ({ ...prev, telf_paciente: e.target.value.replace(/\D/g, '') }));

  return (
    <>
      <FieldGrid $twoCol>
        <FieldGroup>
          <FieldLabel>Nombre completo *</FieldLabel>
          <FieldInput
            type="text"
            placeholder={propio ? 'Tu nombre completo' : 'Nombre del paciente'}
            value={form.name_paciente}
            onChange={set('name_paciente')}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Sexo *</FieldLabel>
          <FieldSelect value={form.genre_paciente} onChange={set('genre_paciente')} disabled={disabled}>
            <option value="">Seleccionar...</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </FieldSelect>
        </FieldGroup>
      </FieldGrid>
      <FieldGrid $twoCol>
        <FieldGroup>
          <FieldLabel>Fecha de nacimiento *</FieldLabel>
          <FieldInput type="date" value={form.birth_paciente} onChange={set('birth_paciente')} disabled={disabled} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Teléfono</FieldLabel>
          <FieldInput
            type="tel"
            placeholder="04121234567"
            value={form.telf_paciente}
            onChange={setTelefono}
            maxLength={15}
            disabled={disabled}
          />
          <InfoText>Solo números, sin guiones ni espacios</InfoText>
        </FieldGroup>
      </FieldGrid>
      <FieldGroup>
        <FieldLabel>Dirección</FieldLabel>
        <FieldInput
          type="text"
          placeholder={propio ? 'Dirección de tu hogar' : 'Dirección del hogar'}
          value={form.dir_paciente}
          onChange={set('dir_paciente')}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}
