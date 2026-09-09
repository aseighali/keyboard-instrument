export type WaveformType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export interface WaveformInstrument {
  kind: 'waveform';
  id: string;
  name: string;
  waveform: WaveformType;
}

/** Synthesized instrument models - no audio assets, everything generated at play time. */
export type SynthModel = 'piano' | 'epiano' | 'santoor' | 'guitar' | 'organ' | 'pad' | 'bass';

export interface SynthInstrument {
  kind: 'synth';
  id: string;
  name: string;
  model: SynthModel;
}

export interface SampleInstrument {
  kind: 'sample';
  id: string;
  name: string;
  buffer: AudioBuffer;
  /** Frequency (Hz) the uploaded sample was recorded at; playback is pitch-shifted relative to this. */
  rootFrequency: number;
}

/**
 * A single instrument program loaded from an uploaded .sf2 SoundFont file, played back through
 * `smplr`'s Soundfont2 sampler. `sampler` is a shared, stateful instance per uploaded file - it
 * must already have this program active (via `loadInstrument`) before being wrapped here.
 */
export interface SoundfontInstrument {
  kind: 'soundfont';
  id: string;
  name: string;
  sampler: { start(event: { note: number; detune: number; velocity: number; stopId: string }): (time?: number) => void };
}

export type Instrument = WaveformInstrument | SynthInstrument | SampleInstrument | SoundfontInstrument;

export const BUILTIN_INSTRUMENTS: (WaveformInstrument | SynthInstrument)[] = [
  { kind: 'synth', id: 'synth-piano', name: 'Piano', model: 'piano' },
  { kind: 'synth', id: 'synth-epiano', name: 'Electric Piano', model: 'epiano' },
  { kind: 'synth', id: 'synth-santoor', name: 'Santoor', model: 'santoor' },
  { kind: 'synth', id: 'synth-guitar', name: 'Guitar (plucked)', model: 'guitar' },
  { kind: 'synth', id: 'synth-organ', name: 'Organ', model: 'organ' },
  { kind: 'synth', id: 'synth-pad', name: 'Strings Pad', model: 'pad' },
  { kind: 'synth', id: 'synth-bass', name: 'Bass', model: 'bass' },
  { kind: 'waveform', id: 'wave-sine', name: 'Sine (pure tone)', waveform: 'sine' },
  { kind: 'waveform', id: 'wave-triangle', name: 'Triangle', waveform: 'triangle' },
  { kind: 'waveform', id: 'wave-sawtooth', name: 'Sawtooth', waveform: 'sawtooth' },
  { kind: 'waveform', id: 'wave-square', name: 'Square', waveform: 'square' },
];
