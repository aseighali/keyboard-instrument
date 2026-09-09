import type { TuningSystem } from './types';

/**
 * Iranian dastgah / avaz scales, approximated as fixed 7-degree octave-repeating scales.
 *
 * This is a simplification made for a playable instrument: real dastgah performance uses
 * melodic movement (gushe) with intonation that shifts contextually, which a fixed scale
 * cannot capture. The interval sizes below follow the general tetrachord-based construction
 * described in Persian music theory (neutral seconds ~150c "koron/sori" alterations, whole
 * tones ~200c, and augmented seconds ~300c where a dastgah is known for that characteristic
 * color) rather than an exact 24-TET quarter-tone grid, but they should be read as an
 * equal-tempered *approximation*, not a musicological transcription.
 *
 * Only Shur has named avaz in the conventional classification (Abu Ata, Bayat-e Tork, Afshari,
 * Dashti, Bayat-e Esfahan) - the other 6 dastgahs have no `avazes`. Note: several sources (e.g.
 * Encyclopaedia Iranica) classify Bayat-e Esfahan as related to Homayun rather than Shur; it's
 * kept under Shur here to match this app's pre-existing framing, but that classification is
 * genuinely disputed in the literature.
 */
export interface AvazDef {
  id: string;
  name: string;
  /** Cumulative cents for degrees 2-7 (degree 1 / the tonic is always 0 and implicit). */
  degrees: number[];
  description: string;
}

export interface DastgahDef {
  id: string;
  name: string;
  /** Cumulative cents for degrees 2-7 (degree 1 / the tonic is always 0 and implicit). */
  degrees: number[];
  description: string;
  /** Only Shur has these in the conventional classification. */
  avazes?: AvazDef[];
}

export const DASTGAHS: DastgahDef[] = [
  {
    id: 'shur',
    name: 'Shur',
    degrees: [150, 350, 500, 700, 850, 1050],
    description: 'Soft, ambiguous neutral seconds throughout; the root of the Shur family.',
    avazes: [
      {
        id: 'abu-ata',
        name: 'Abu-Ata',
        degrees: [150, 350, 500, 650, 850, 1050],
        description: 'Simple, folk-adjacent Shur-family avaz.',
      },
      {
        id: 'bayat-e-tork',
        name: 'Bayat-e Tork',
        degrees: [200, 350, 500, 700, 850, 1050],
        description: 'Shur-family avaz with a firmer, more assertive 2nd degree.',
      },
      {
        id: 'afshari',
        name: 'Afshari',
        degrees: [150, 300, 500, 700, 850, 1050],
        description: 'Delicate Shur-family avaz, closely related to Bayat-e Tork.',
      },
      {
        id: 'dashti',
        name: 'Dashti',
        degrees: [150, 350, 500, 700, 850, 1050],
        description: 'Lyrical Shur-family avaz, very close to Shur itself.',
      },
      {
        id: 'bayat-e-esfahan',
        name: 'Bayat-e Esfahan',
        degrees: [150, 350, 550, 650, 850, 1050],
        description:
          'Distinguished from the rest of the Shur family by a natural (non-neutral) 6th. Grouped here with Shur ' +
          "to match this app's existing framing, though several sources instead classify it as related to Homayun.",
      },
    ],
  },
  {
    id: 'mahur',
    name: 'Mahur',
    degrees: [200, 400, 500, 700, 900, 1000],
    description: 'Bright, closest of the dastgahs to the Western major scale.',
  },
  {
    id: 'rast-panjgah',
    name: 'Rast-Panjgah',
    degrees: [200, 400, 500, 700, 850, 1000],
    description: 'Major-like relative of Mahur with a slightly softened 6th and 7th.',
  },
  {
    id: 'homayun',
    name: 'Homayun',
    degrees: [100, 400, 500, 700, 800, 1000],
    description: 'Contains a characteristic augmented 2nd; emotive, harmonic-minor-like color.',
  },
  {
    id: 'chahargah',
    name: 'Chahargah',
    degrees: [100, 400, 500, 600, 900, 1000],
    description: 'Bright and dramatic, with augmented 2nds in both tetrachords.',
  },
  {
    id: 'segah',
    name: 'Segah',
    degrees: [150, 300, 500, 650, 800, 1000],
    description: 'Neutral 3rd degree gives it a soft, microtonal character throughout.',
  },
  {
    id: 'nava',
    name: 'Nava',
    degrees: [150, 350, 500, 650, 850, 1000],
    description: 'Cousin of Shur with a distinct pentachord shape in the upper degrees.',
  },
];

/** A fully-specified default selection for a newly-picked dastgah: itself, no avaz. */
export function defaultDastgahSelection(dastgahId: string): { dastgahId: string; avazId: string | null } {
  const dastgah = DASTGAHS.find((d) => d.id === dastgahId) ?? DASTGAHS[0];
  return { dastgahId: dastgah.id, avazId: null };
}

export function buildDastgah(dastgahId: string, avazId: string | null): TuningSystem {
  const dastgah = DASTGAHS.find((d) => d.id === dastgahId) ?? DASTGAHS[0];
  const avaz = avazId ? dastgah.avazes?.find((a) => a.id === avazId) : undefined;
  const group = avaz ?? dastgah;

  const cents = [0, ...group.degrees];
  const name = avaz ? `${dastgah.name} / ${avaz.name} (avaz)` : dastgah.name;

  return {
    id: `dastgah-${dastgah.id}${avaz ? `-${avaz.id}` : ''}`,
    name,
    category: 'dastgah',
    pitchClassBased: false,
    slots: cents.map((c, i) => ({ cents: c, label: `${i + 1}` })),
    description: group.description,
  };
}
