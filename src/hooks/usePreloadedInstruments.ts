import { useCallback, useRef, useState } from 'react';
import { Soundfont, getSoundfontNames, type SoundfontOptions } from 'smplr';
import type { AudioEngine } from '../audio/AudioEngine';
import type { SoundfontInstrument } from '../audio/instruments';

/** All 128 General MIDI instrument names, e.g. "acoustic_grand_piano". Static, no network needed. */
const INSTRUMENT_NAMES = getSoundfontNames();

export type SoundfontKit = 'MusyngKite' | 'FluidR3_GM';

export function displayInstrumentName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Streams real sampled GM instruments from a public, freely-licensed sample library (via
 * `smplr`'s `Soundfont` class) - no upload needed, works the moment you pick a name. Requires
 * network access the first time each instrument is used; the browser caches the samples after.
 */
export function usePreloadedInstruments(engine: AudioEngine) {
  const cacheRef = useRef<Map<string, ReturnType<typeof Soundfont>>>(new Map());
  const [loadingName, setLoadingName] = useState<string | null>(null);

  const selectInstrument = useCallback(
    async (name: string, kit: SoundfontKit): Promise<SoundfontInstrument> => {
      const cacheKey = `${kit}:${name}`;
      let sampler = cacheRef.current.get(cacheKey);
      if (!sampler) {
        setLoadingName(name);
        try {
          const { ctx, destination } = engine.getAudioTarget();
          const options: Partial<SoundfontOptions> = { instrument: name, kit, destination };
          sampler = Soundfont(ctx, options);
          cacheRef.current.set(cacheKey, sampler);
          await sampler.ready;
        } finally {
          setLoadingName((current) => (current === name ? null : current));
        }
      }
      return {
        kind: 'soundfont',
        id: `preload::${cacheKey}`,
        name: displayInstrumentName(name),
        sampler,
      };
    },
    [engine],
  );

  return { instrumentNames: INSTRUMENT_NAMES, loadingName, selectInstrument };
}
