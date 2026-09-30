// Se carga antes de cada archivo de test (vite.config.js → test.setupFiles)
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sin globals de Vitest, Testing Library no limpia solo el DOM entre tests
afterEach(() => cleanup());

// Módulo virtual de vite-plugin-pwa: en los tests no hay service worker ni versiones nuevas
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: () => {},
  }),
}));
