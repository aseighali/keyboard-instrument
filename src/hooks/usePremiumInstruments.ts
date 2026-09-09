import { useCallback, useRef, useState } from 'react';
import {
  SplendidGrandPiano,
  ElectricPiano,
  Smolken,
  Mallet,
  Mellotron,
  getElectricPianoNames,
  getSmolkenNames,
  getMalletNames,
  getMellotronNames,
  type Smplr,
} from 'smplr';
import type { AudioEngine } from '../audio/AudioEngine';
import type { SoundfontInstrument } from '../audio/instruments';
import { displayInstrumentName } from './usePreloadedInstruments';

export type PremiumLibraryId = 'splendid-piano' | 'electric-piano' | 'smolken-bass' | 'mallet' | 'mellotron';

export interface PremiumLibraryDef {
  id: PremiumLibraryId;
  label: string;
  /** null = a single sound, no sub-instrument picker needed. */
  names: string[] | null;
}

/**
 * Curated, dedicated sample libraries bundled with `smplr` - real recordings from a specific
 * instrument, not a generic 128-instrument General MIDI set. `SplendidGrandPiano` in particular
 * is the Salamander Grand Piano (Steinway, 4 velocity layers) repackaged for the web.
 */
export const PREMIUM_LIBRARIES: PremiumLibraryDef[] = [
  { id: 'splendid-piano', label: 'Grand Piano - Salamander/SplendidGrandPiano (sampled Steinway)', names: null },
  { id: 'electric-piano', label: 'Electric Piano - CP80 / Pianet T / Wurlitzer / TX81Z', names: getElectricPianoNames() },
  { id: 'smolken-bass', label: 'Double Bass - Smolken (arco/pizzicato)', names: getSmolkenNames() },
  { id: 'mallet', label: 'Mallet percussion - VCSL (marimba, vibraphone, ...)', names: getMalletNames() },
  { id: 'mellotron', label: 'Mellotron (vintage tape samples)', names: getMellotronNames() },
];

export function usePremiumInstruments(engine: AudioEngine) {
  const cacheRef = useRef<Map<string, Smplr>>(new Map());
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const selectInstrument = useCallback(
    async (libraryId: PremiumLibraryId, name: string | null): Promise<SoundfontInstrument> => {
      const cacheKey = `${libraryId}:${name ?? ''}`;
      let sampler = cacheRef.current.get(cacheKey);
      if (!sampler) {
        setLoadingKey(cacheKey);
        try {
          const { ctx, destination } = engine.getAudioTarget();
          switch (libraryId) {
            case 'splendid-piano':
              sampler = SplendidGrandPiano(ctx, { destination });
              break;
            case 'electric-piano':
              sampler = ElectricPiano(ctx, { instrument: name!, destination });
              break;
            case 'smolken-bass':
              sampler = Smolken(ctx, { instrument: name!, destination });
              break;
            case 'mallet':
              sampler = Mallet(ctx, { instrument: name!, destination });
              break;
            case 'mellotron':
              sampler = Mellotron(ctx, { instrument: name!, destination });
              break;
          }
          cacheRef.current.set(cacheKey, sampler);
          await sampler.ready;
        } finally {
          setLoadingKey((current) => (current === cacheKey ? null : current));
        }
      }
      return {
        kind: 'soundfont',
        id: `premium::${cacheKey}`,
        name: name ? displayInstrumentName(name) : 'Grand Piano',
        sampler,
      };
    },
    [engine],
  );

  return { libraries: PREMIUM_LIBRARIES, loadingKey, selectInstrument };
}
