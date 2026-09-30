import { test, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

test('la landing no usa emojis: los íconos son SVG de react-icons', () => {
  const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);

  // Emoji_Presentation: los que se dibujan como emoji (🎯📍📞…); FE0F los fuerza (❤️)
  expect(container.textContent).not.toMatch(/\p{Emoji_Presentation}|️/u);

  // Misión, visión y las cinco tarjetas de contacto llevan su ícono
  const iconos = [...container.querySelectorAll('#nosotros svg, #contacto svg')];
  expect(iconos.length).toBeGreaterThanOrEqual(7);
});
