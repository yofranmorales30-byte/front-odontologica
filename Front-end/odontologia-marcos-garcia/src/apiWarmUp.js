import { apiFetch } from './api';

// The API runs on Vercel functions that go to sleep when nobody uses them; waking one adds about a second to
// the first request. A cheap ping while the person is still reading or typing hides that delay.
const AWAY_MS = 4 * 60 * 1000;

export function wakeUpApi() {
  apiFetch('/salud').catch(() => {});
}

// Pings again when the person comes back to the tab after being away for a while
export function keepApiAwake() {
  let hiddenAt = null;
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (hiddenAt !== null && Date.now() - hiddenAt > AWAY_MS) {
      hiddenAt = null;
      wakeUpApi();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => document.removeEventListener('visibilitychange', onVisibilityChange);
}
