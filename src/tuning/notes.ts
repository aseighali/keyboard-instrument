import type { RootConfig } from './types';

export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Standard equal-temperament frequency for a given pitch class + scientific octave (A4 = 440Hz). */
export function frequencyOf(pitchClass: string, octave: number): number {
  const pitchIndex = PITCH_CLASSES.indexOf(pitchClass);
  const midiNote = (octave + 1) * 12 + pitchIndex;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function midiNumberOf(pitchClass: string, octave: number): number {
  return (octave + 1) * 12 + PITCH_CLASSES.indexOf(pitchClass);
}

export function makeRoot(pitchClass: string, octave: number): RootConfig {
  return { pitchClass, octave, frequency: frequencyOf(pitchClass, octave) };
}

/** Convert an absolute MIDI-style note number back into a "C4" style display name. */
export function midiToName(midiNote: number): string {
  const pitchIndex = ((Math.round(midiNote) % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return `${PITCH_CLASSES[pitchIndex]}${octave}`;
}
