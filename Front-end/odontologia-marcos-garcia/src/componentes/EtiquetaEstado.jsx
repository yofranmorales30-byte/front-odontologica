import React from 'react';
import styled from 'styled-components';
import { colorEtiqueta } from '../utils/estados';

const Etiqueta = styled.span`
  padding: 4px 14px;
  border-radius: 20px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

// Estado de una cita (PENDIENTE, CONFIRMADA, ...) con su color
export default function EtiquetaEstado({ estado }) {
  return <Etiqueta $color={colorEtiqueta(estado)}>{estado}</Etiqueta>;
}
