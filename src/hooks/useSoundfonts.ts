import { useCallback, useEffect, useRef, useState } from 'react';
import { Soundfont2 } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import type { AudioEngine } from '../audio/AudioEngine';
import type { SoundfontInstrument } from '../audio/instruments';
import {
  deleteSoundfont as deleteSoundfontRecord,
  listSoundfonts,
  saveSoundfont,
} from '../audio/SoundfontStore';

interface LiveSoundfont {
  sampler: ReturnType<typeof Soundfont2>;
  instrumentNames: string[];
}

export interface SoundfontFile {
  id: string;
  name: string;
}

/**
 * Manages uploaded .sf2 SoundFont files: persists them in IndexedDB (so "upload once, pick a
 * sound after" works across reloads), and lazily parses/loads each one into a live `smplr`
 * sampler only once it's actually selected (large files, no point paying the cost upfront).
 */
export function useSoundfonts(engine: AudioEngine) {
  const [files, setFiles] = useState<SoundfontFile[]>([]);
  const [programsByFile, setProgramsByFile] = useState<Record<string, string[]>>({});
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const blobsRef = useRef<Map<string, Blob>>(new Map());
  const samplersRef = useRef<Map<string, LiveSoundfont>>(new Map());

  useEffect(() => {
    listSoundfonts()
      .then((stored) => {
        setFiles(stored.map((s) => ({ id: s.id, name: s.name })));
        stored.forEach((s) => blobsRef.current.set(s.id, s.blob));
      })
      .catch(() => setFiles([]));
  }, []);

  const ensureLoaded = useCallback(
    async (fileId: string): Promise<LiveSoundfont> => {
      const existing = samplersRef.current.get(fileId);
      if (existing) return existing;

      const blob = blobsRef.current.get(fileId);
      if (!blob) throw new Error('Soundfont file not found in storage.');

      setLoadingFileId(fileId);
      const objectUrl = URL.createObjectURL(blob);
      try {
        const { ctx, destination } = engine.getAudioTarget();
        const sampler = Soundfont2(ctx, {
          url: objectUrl,
          createSoundfont: (data) => new SoundFont2(data),
          destination,
        });
        await sampler.ready;
        const live: LiveSoundfont = { sampler, instrumentNames: sampler.instrumentNames };
        samplersRef.current.set(fileId, live);
        setProgramsByFile((prev) => ({ ...prev, [fileId]: live.instrumentNames }));
        return live;
      } finally {
        URL.revokeObjectURL(objectUrl);
        setLoadingFileId((current) => (current === fileId ? null : current));
      }
    },
    [engine],
  );

  const selectProgram = useCallback(
    async (fileId: string, programName: string): Promise<SoundfontInstrument> => {
      const live = await ensureLoaded(fileId);
      await live.sampler.loadInstrument(programName);
      return {
        kind: 'soundfont',
        id: `${fileId}::${programName}`,
        name: programName,
        sampler: live.sampler,
      };
    },
    [ensureLoaded],
  );

  const upload = useCallback(
    async (file: File, name: string) => {
      const id = `sf-${Date.now()}`;
      await saveSoundfont({ id, name, blob: file });
      blobsRef.current.set(id, file);
      setFiles((prev) => [...prev, { id, name }]);
      await ensureLoaded(id);
      return id;
    },
    [ensureLoaded],
  );

  const remove = useCallback(async (fileId: string) => {
    await deleteSoundfontRecord(fileId);
    samplersRef.current.get(fileId)?.sampler.dispose();
    samplersRef.current.delete(fileId);
    blobsRef.current.delete(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setProgramsByFile((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  return { files, programsByFile, loadingFileId, ensureLoaded, selectProgram, upload, remove };
}
