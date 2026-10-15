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

test('the home page loads nothing heavy up front: lazy photos with their size, no Google map', () => {
  const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);

  const photos = [...container.querySelectorAll('#servicios img')];
  expect(photos.length).toBe(18); // 9 services, twice for the looping carousel
  for (const photo of photos) {
    expect(photo.getAttribute('loading')).toBe('lazy');
    expect(photo.getAttribute('width')).toBe('600');
    expect(photo.getAttribute('src')).toMatch(/\.webp$/);
  }
  expect(container.querySelector('iframe')).toBeNull();
});
