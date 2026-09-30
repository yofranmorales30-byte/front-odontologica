import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { ProgressBar, StepCircle, StepConnector, StepLabels, StepLabel } from './estilos';

const estadoDelPaso = (indice, paso) => (indice < paso ? 'completed' : indice === paso ? 'active' : 'pending');

// Barra de pasos del formulario: círculos con ícono (o tilde si ya se completó) y etiquetas
export default function ProgresoPasos({ pasos, paso }) {
  return (
    <>
      <ProgressBar>
        {pasos.map((p, i) => (
          <React.Fragment key={p.key}>
            <StepCircle $status={estadoDelPaso(i, paso)}>
              {i < paso ? <FiCheck /> : <p.icon />}
            </StepCircle>
            {i < pasos.length - 1 && <StepConnector $completed={i < paso} />}
          </React.Fragment>
        ))}
      </ProgressBar>

      <StepLabels>
        {pasos.map((p, i) => (
          <StepLabel key={p.key} $active={i === paso} $status={estadoDelPaso(i, paso)}>
            {p.label}
          </StepLabel>
        ))}
      </StepLabels>
    </>
  );
}
