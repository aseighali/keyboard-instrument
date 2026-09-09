/** Tunable knobs for the Dattorro-style algorithmic reverb (`smplr`'s `Reverb`). */
export interface ReverbParams {
  /** Tail length, 0-1. Kept below ~0.92 - the algorithm can run away/self-oscillate near 1. */
  decay: number;
  /** Gap before the reverb starts, in seconds - bigger space reads as more pre-delay. */
  preDelaySeconds: number;
  /** How much the tail darkens over time, 0-1. Higher = duller/more absorbent surfaces. */
  damping: number;
  /** Brightness of what feeds the reverb, 0-1. */
  bandwidth: number;
  inputDiffusion1: number;
  inputDiffusion2: number;
  /** Density of the tail, 0-1. Lower = more distinct/discrete echoes; higher = a smooth wash. */
  decayDiffusion1: number;
  decayDiffusion2: number;
  excursionRate: number;
  excursionDepth: number;
}

export type ReverbPresetId = 'off' | 'studio' | 'room' | 'hall' | 'church' | 'custom';

export interface ReverbPreset {
  id: ReverbPresetId;
  name: string;
  description: string;
  /** Suggested send level (0-1) for this preset - the Mix slider is reset to this on selection. */
  amount: number;
  params: ReverbParams;
}

/** Structural params shared by every preset - only decay/preDelay/damping/bandwidth/diffusion vary. */
const BASE: Pick<ReverbParams, 'inputDiffusion1' | 'inputDiffusion2' | 'excursionRate' | 'excursionDepth'> = {
  inputDiffusion1: 0.75,
  inputDiffusion2: 0.625,
  excursionRate: 0.5,
  excursionDepth: 0.7,
};

export const REVERB_PRESETS: ReverbPreset[] = [
  {
    id: 'off',
    name: 'Off',
    description: 'Dry - no reverb.',
    amount: 0,
    params: { ...BASE, decay: 0.35, preDelaySeconds: 0.006, damping: 0.35, bandwidth: 0.9999, decayDiffusion1: 0.7, decayDiffusion2: 0.5 },
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Tight and close, barely-there ambience - a bit of glue without drawing attention.',
    amount: 0.12,
    params: { ...BASE, decay: 0.35, preDelaySeconds: 0.006, damping: 0.35, bandwidth: 0.9999, decayDiffusion1: 0.7, decayDiffusion2: 0.5 },
  },
  {
    id: 'room',
    name: 'Echoey Room',
    description: 'A live room with hard surfaces - noticeable slap and bounce.',
    amount: 0.25,
    params: { ...BASE, decay: 0.55, preDelaySeconds: 0.018, damping: 0.15, bandwidth: 0.999, decayDiffusion1: 0.6, decayDiffusion2: 0.4 },
  },
  {
    id: 'hall',
    name: 'Concert Hall',
    description: 'A large hall - long, smooth, spacious tail.',
    amount: 0.32,
    params: { ...BASE, decay: 0.78, preDelaySeconds: 0.035, damping: 0.25, bandwidth: 0.9999, decayDiffusion1: 0.75, decayDiffusion2: 0.55 },
  },
  {
    id: 'church',
    name: 'Church',
    description: 'A cavernous stone church - very long, diffuse wash.',
    amount: 0.42,
    params: { ...BASE, decay: 0.9, preDelaySeconds: 0.055, damping: 0.2, bandwidth: 0.999, decayDiffusion1: 0.85, decayDiffusion2: 0.7 },
  },
];

export const DEFAULT_REVERB_PRESET_ID: ReverbPresetId = 'studio';

/** Slider bounds for Custom mode's simplified 3-knob view (Size/Damping/Pre-delay). */
export const CUSTOM_REVERB_RANGES = {
  decay: { min: 0.1, max: 0.92 },
  damping: { min: 0, max: 0.6 },
  preDelaySeconds: { min: 0, max: 0.15 },
};
