import type { TuningSystem } from './types';
import { PITCH_CLASSES } from './notes';

export function buildChromatic(): TuningSystem {
  return {
    id: 'chromatic',
    name: 'Chromatic (12-TET)',
    category: 'chromatic',
    pitchClassBased: true,
    slots: PITCH_CLASSES.map((label, i) => ({ cents: i * 100, label })),
    description: 'Standard 12-tone equal temperament, every semitone.',
  };
}
