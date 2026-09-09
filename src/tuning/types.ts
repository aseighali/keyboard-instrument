/** One scale degree, expressed as an offset in cents from the tuning system's root pitch. */
export interface ScaleSlot {
  /** Offset from the root within one octave, 0 (inclusive) to 1200 (exclusive). */
  cents: number;
  /** Short display label shown on a key cap, e.g. "C#", "n2", "4". */
  label: string;
}

export type TuningCategory = 'chromatic' | 'scale' | 'microtonal' | 'dastgah' | 'custom';

/** A full tuning system: an ordered, octave-repeating set of scale degrees. */
export interface TuningSystem {
  id: string;
  name: string;
  category: TuningCategory;
  /** Ascending degrees within one octave. slots[0].cents is always 0. */
  slots: ScaleSlot[];
  /** When true, degree labels are derived from the 12 Western pitch classes relative to the
   *  chosen root (only valid when every slot's cents is a multiple of 100). When false, the
   *  slot's own label is used verbatim (microtonal / dastgah / custom systems). */
  pitchClassBased: boolean;
  description?: string;
}

export interface RootConfig {
  pitchClass: string; // one of PITCH_CLASSES, display purposes + pitchClassBased labeling
  octave: number; // scientific pitch notation octave, e.g. 4
  frequency: number; // Hz, derived from pitchClass+octave (or overridden for microtonal roots)
}
