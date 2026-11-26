// localStorage persistence for the career. A corrupt or missing save starts
// a fresh Stormwalker rather than crashing the hangar.

import { newCareer } from './career.js';

const KEY = 'ventus-career-v1';
export function loadCareer() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newCareer();
    const data = JSON.parse(raw);
    const base = newCareer();
    return { ...base, ...data, stats: { ...base.stats, ...(data.stats ?? {}), byType: { ...base.stats.byType, ...(data.stats?.byType ?? {}) } } };
  } catch { return newCareer(); }
}
export function saveCareer(career) {
  try { localStorage.setItem(KEY, JSON.stringify(career)); } catch { /* private mode: fly unsaved */ }
}
export function wipeCareer() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
