// Puntos de corte del diseño responsive (usar dentro de styled-components: `${movil} { ... }`)
export const ANCHO_MOVIL = 640;
export const ANCHO_TABLET = 900;

export const movil = `@media (max-width: ${ANCHO_MOVIL}px)`;
export const tablet = `@media (max-width: ${ANCHO_TABLET}px)`;

// iOS hace zoom al enfocar un campo con letra de menos de 16px: en pantallas táctiles se sube a 16px
export const sinZoomAlEscribir = `
  @media (max-width: ${ANCHO_TABLET}px) {
    font-size: 16px;
  }
`;
