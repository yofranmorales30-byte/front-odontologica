import React, { useState } from 'react';
import styled from 'styled-components';
import { FiMapPin, FiMap, FiNavigation } from 'react-icons/fi';

const EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.552235038035!2d-72.25380222581435!3d8.045011991982193!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e6661448c4b9ae3%3A0xc7e373437952adaf!2sArmonia..%20Odontologia%20y%20Estetica%20Facial!5e0!3m2!1ses!2sve!4v1784422611532!5m2!1ses!2sve';
const DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=8.045012%2C-72.253802';

const Frame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 380px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
`;

// A drawn street pattern stands in for the map: it costs nothing to load
const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 42%, rgba(157, 224, 62, 0.28) 0, transparent 32%),
    repeating-linear-gradient(28deg, transparent 0 46px, rgba(92, 14, 109, 0.07) 46px 51px),
    repeating-linear-gradient(-62deg, transparent 0 72px, rgba(92, 14, 109, 0.06) 72px 79px),
    linear-gradient(160deg, #f6f0fa, #eef7e4);
`;

const Content = styled.div`
  position: relative;
  height: 100%;
  min-height: 380px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  font-family: 'Poppins', sans-serif;
`;

const Pin = styled.div`
  width: 64px;
  height: 64px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% 50% 50% 8px;
  transform: rotate(-45deg);
  background: linear-gradient(135deg, #5c0e6d, #7b1fa2);
  box-shadow: 0 10px 24px rgba(92, 14, 109, 0.35);

  svg {
    transform: rotate(45deg);
    color: #ffffff;
    font-size: 1.6rem;
  }
`;

const Place = styled.p`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a2e;
`;

const Address = styled.p`
  margin: 0 0 10px;
  font-size: 0.88rem;
  color: #4b5563;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
`;

const action = `
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const ShowMap = styled.button`
  ${action}
  border: none;
  background: #5c0e6d;
  color: #ffffff;

  &:hover {
    background: #4a0b5a;
  }
`;

const Directions = styled.a`
  ${action}
  border: 1.5px solid #5c0e6d;
  background: rgba(255, 255, 255, 0.85);
  color: #5c0e6d;
`;

// The Google Maps embed downloads about 430 KB of scripts, so it only loads when the person asks for it
export default function ClinicMap() {
  const [interactive, setInteractive] = useState(false);

  return (
    <Frame>
      {interactive ? (
        <iframe
          src={EMBED_URL}
          title="Ubicación de Armonía Odontología"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', minHeight: '380px' }}
          allowFullScreen
        />
      ) : (
        <>
          <Backdrop aria-hidden />
          <Content>
            <Pin aria-hidden><FiMapPin /></Pin>
            <Place>Armonía · Odontología y Estética Facial</Place>
            <Address>San Juan de Colón, Estado Táchira, Venezuela</Address>
            <Actions>
              <ShowMap type="button" onClick={() => setInteractive(true)}>
                <FiMap aria-hidden /> Ver el mapa
              </ShowMap>
              <Directions href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
                <FiNavigation aria-hidden /> Cómo llegar
              </Directions>
            </Actions>
          </Content>
        </>
      )}
    </Frame>
  );
}
