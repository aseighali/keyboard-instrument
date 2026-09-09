import type { Smplr } from 'smplr';

export interface SampleInstrument {
  kind: 'sample';
  id: string;
  name: string;
  buffer: AudioBuffer;
  /** Frequency (Hz) the uploaded sample was recorded at; playback is pitch-shifted relative to this. */
  rootFrequency: number;
}

/**
 * A single instrument program played back through a `smplr` sampler instance - a GM soundfont
 * program, an instrument from an uploaded .sf2 file, or one of the dedicated sample libraries
 * (SplendidGrandPiano, ElectricPiano, Smolken, Mallet, Mellotron). `sampler` is a shared,
 * stateful instance that must already be loaded/ready before being wrapped here.
 */
export interface SoundfontInstrument {
  kind: 'soundfont';
  id: string;
  name: string;
  sampler: Pick<Smplr, 'start'>;
}

export type Instrument = SampleInstrument | SoundfontInstrument;
