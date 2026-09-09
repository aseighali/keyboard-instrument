import type { TuningSystem } from './types';
import { buildChromatic } from './chromatic';
import { buildScale, MODES } from './scalesModes';
import { buildEDO, buildCustomCents } from './microtonal';
import { buildDastgah, defaultDastgahSelection, DASTGAHS } from './dastgah';
import type { StoredPreset } from '../audio/PresetStore';

export type TuningChoice =
  | { category: 'chromatic' }
  | { category: 'scale'; modeId: string }
  | { category: 'microtonal'; edo: number }
  | { category: 'dastgah'; dastgahId: string; avazId: string | null }
  | { category: 'custom'; presetId: string | null };

export const DEFAULT_TUNING_CHOICE: TuningChoice = { category: 'chromatic' };

export function defaultDastgahChoice(dastgahId: string): TuningChoice {
  return { category: 'dastgah', ...defaultDastgahSelection(dastgahId) };
}

export function buildTuningSystem(choice: TuningChoice, customPresets: StoredPreset[]): TuningSystem {
  switch (choice.category) {
    case 'chromatic':
      return buildChromatic();
    case 'scale':
      return buildScale(choice.modeId);
    case 'microtonal':
      return buildEDO(choice.edo);
    case 'dastgah':
      return buildDastgah(choice.dastgahId, choice.avazId);
    case 'custom': {
      const preset = customPresets.find((p) => p.id === choice.presetId);
      if (!preset) return buildChromatic();
      return buildCustomCents(preset.cents, preset.name);
    }
    default:
      return buildChromatic();
  }
}

export { MODES, DASTGAHS };
