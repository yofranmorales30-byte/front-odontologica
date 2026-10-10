import React from 'react';
import styled from 'styled-components';
import { FiSearch, FiX } from 'react-icons/fi';
import { movil, sinZoomAlEscribir } from '../estilos/medidas';

const Caja = styled.div`
  position: relative;
  flex: 1 1 280px;
  max-width: 440px;

  ${movil} {
    flex-basis: 100%;
    max-width: none;
  }
`;

const Lupa = styled(FiSearch)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.05rem;
  color: #9ca3af;
  pointer-events: none;
`;

const Campo = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 42px;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  color: #1a1a2e;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  ${sinZoomAlEscribir}

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    border-color: #5c0e6d;
    box-shadow: 0 0 0 4px rgba(92, 14, 109, 0.1);
  }

  /* La X para borrar es la nuestra, igual en todos los navegadores */
  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const Borrar = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #1a1a2e;
  }
`;

// Buscador de una tabla. Filtra mientras se escribe; la X o Escape borran lo escrito.
// `etiqueta`: qué se busca, para quien usa lector de pantalla ("Buscar pacientes").
export default function Buscador({ valor, alCambiar, etiqueta, placeholder }) {
  return (
    <Caja role="search">
      <Lupa aria-hidden />
      <Campo
        type="search"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && valor) alCambiar(''); }}
        aria-label={etiqueta}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {valor && (
        <Borrar type="button" aria-label="Limpiar el buscador" onClick={() => alCambiar('')}>
          <FiX aria-hidden />
        </Borrar>
      )}
    </Caja>
  );
}
