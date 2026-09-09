import type { TuningSystem } from './types';

export interface ModeDef {
  id: string;
  name: string;
  /** Semitone offsets from the root, 12-TET. */
  intervals: number[];
}

export const MODES: ModeDef[] = [
  { id: 'major', name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'minor', name: 'Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'locrian', name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'harmonic-minor', name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic-minor', name: 'Melodic Minor (asc.)', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'major-pentatonic', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
];

export function buildScale(modeId: string): TuningSystem {
  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];
  return {
    id: `scale-${mode.id}`,
    name: mode.name,
    category: 'scale',
    pitchClassBased: true,
    slots: mode.intervals.map((semitones, i) => ({ cents: semitones * 100, label: `${i + 1}` })),
    description: `${mode.name} scale (12-TET).`,
  };
}
