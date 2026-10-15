import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { wakeUpApi, keepApiAwake } from './apiWarmUp';

const mockCalls = [];
vi.mock('./api', () => ({ apiFetch: async (route) => { mockCalls.push(route); return { ok: true }; } }));

let visibility = 'visible';
beforeEach(() => {
  mockCalls.length = 0;
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
});
afterEach(() => vi.useRealTimers());

function setVisibility(state) {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

test('waking up the API is a ping to /salud', () => {
  wakeUpApi();
  expect(mockCalls).toEqual(['/salud']);
});

test('coming back to the tab after a while wakes the API again; a quick look away does not', () => {
  const stop = keepApiAwake();

  setVisibility('hidden');
  vi.advanceTimersByTime(60 * 1000);
  setVisibility('visible');
  expect(mockCalls).toEqual([]);

  setVisibility('hidden');
  vi.advanceTimersByTime(5 * 60 * 1000);
  setVisibility('visible');
  expect(mockCalls).toEqual(['/salud']);

  stop();
  setVisibility('hidden');
  vi.advanceTimersByTime(10 * 60 * 1000);
  setVisibility('visible');
  expect(mockCalls).toEqual(['/salud']);
});
