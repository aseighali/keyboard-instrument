import type { TuningSystem } from './types';

/** N equal divisions of the octave. N=12 reproduces standard chromatic; N=24 gives quarter tones. */
export function buildEDO(n: number): TuningSystem {
  const divisions = Math.max(2, Math.min(96, Math.round(n)));
  const step = 1200 / divisions;
  return {
    id: `edo-${divisions}`,
    name: `${divisions}-EDO`,
    category: 'microtonal',
    pitchClassBased: divisions === 12,
    slots: Array.from({ length: divisions }, (_, i) => ({
      cents: i * step,
      label: i === 0 ? '0' : (i * step).toFixed(0) + '¢',
    })),
    description: `${divisions} equal divisions of the octave (${step.toFixed(1)}¢ steps).`,
  };
}

/** A user-supplied list of cent offsets (0 is implied/added automatically if missing). */
export function buildCustomCents(centsList: number[], name = 'Custom scale'): TuningSystem {
  const cleaned = centsList.filter((c) => Number.isFinite(c) && c >= 0 && c < 1200);
  const sorted = Array.from(new Set(cleaned)).sort((a, b) => a - b);
  if (sorted[0] !== 0) sorted.unshift(0);
  return {
    id: `custom-${Date.now()}`,
    name,
    category: 'custom',
    pitchClassBased: false,
    slots: sorted.map((cents, i) => ({ cents, label: i === 0 ? 'root' : `${cents.toFixed(0)}¢` })),
    description: 'Custom cents-based scale.',
  };
}
