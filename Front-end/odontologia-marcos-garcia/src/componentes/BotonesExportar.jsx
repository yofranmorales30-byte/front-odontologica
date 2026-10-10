import React from 'react';
import styled from 'styled-components';
import { FaRegFileExcel, FaRegFilePdf } from 'react-icons/fa';

const Grupo = styled.div`
  display: flex;
  gap: 8px;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1.5px solid ${props => props.$color}55;
  border-radius: 10px;
  background: #ffffff;
  color: ${props => props.$color};
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    font-size: 1.05rem;
  }

  &:hover:not(:disabled) {
    background: ${props => props.$color};
    border-color: ${props => props.$color};
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

// Los dos botones para descargar un listado. `que`: lo que se descarga, para quien usa lector de
// pantalla ("pacientes" → "Descargar pacientes en Excel").
export default function BotonesExportar({ que, alExcel, alPdf, deshabilitado = false }) {
  return (
    <Grupo>
      <Boton type="button" $color="#15803d" aria-label={`Descargar ${que} en Excel`} disabled={deshabilitado} onClick={alExcel}>
        <FaRegFileExcel aria-hidden /> Excel
      </Boton>
      <Boton type="button" $color="#b91c1c" aria-label={`Descargar ${que} en PDF`} disabled={deshabilitado} onClick={alPdf}>
        <FaRegFilePdf aria-hidden /> PDF
      </Boton>
    </Grupo>
  );
}
