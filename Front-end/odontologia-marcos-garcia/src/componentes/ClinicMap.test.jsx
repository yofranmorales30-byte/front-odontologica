import { test, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicMap from './ClinicMap';

test('the Google map is not loaded until the person asks for it', () => {
  const { container } = render(<ClinicMap />);
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByText('San Juan de Colón, Estado Táchira, Venezuela')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Ver el mapa' }));
  const map = screen.getByTitle('Ubicación de Armonía Odontología');
  expect(map.tagName).toBe('IFRAME');
  expect(map.getAttribute('src')).toMatch(/^https:\/\/www\.google\.com\/maps\/embed\?/);
});

test('"Cómo llegar" opens Google Maps directions in a new tab', () => {
  render(<ClinicMap />);
  const link = screen.getByRole('link', { name: 'Cómo llegar' });
  expect(link.getAttribute('href')).toBe('https://www.google.com/maps/dir/?api=1&destination=8.045012%2C-72.253802');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
});
