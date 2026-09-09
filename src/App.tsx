import { useEffect, useMemo, useState } from 'react';
import { KeyboardView } from './components/KeyboardView';
import { TuningSelector } from './components/TuningSelector';
import { InstrumentSelector } from './components/InstrumentSelector';
import { VolumeControl } from './components/VolumeControl';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useSoundfonts } from './hooks/useSoundfonts';
import { usePreloadedInstruments, type SoundfontKit } from './hooks/usePreloadedInstruments';
import { makeRoot } from './tuning/notes';
import type { RootConfig } from './tuning/types';
import { DEFAULT_TUNING_CHOICE, buildTuningSystem, type TuningChoice } from './tuning/tuningChoice';
import { DEFAULT_ROW_LAYOUT, compileKeyMap, type RowLayout } from './tuning/keyMap';
import { BUILTIN_INSTRUMENTS, type Instrument, type SoundfontInstrument } from './audio/instruments';
import { listPresets, savePreset, deletePreset, type StoredPreset } from './audio/PresetStore';
import { listSounds, saveSound, deleteSound, type StoredSound } from './audio/SampleStore';

export default function App() {
  const engine = useAudioEngine();

  const [tuningChoice, setTuningChoice] = useState<TuningChoice>(DEFAULT_TUNING_CHOICE);
  const [root, setRoot] = useState<RootConfig>(() => makeRoot('C', 4));
  const [rowLayout, setRowLayout] = useState<RowLayout>(DEFAULT_ROW_LAYOUT);
  const [volume, setVolume] = useState(0.6);

  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [sounds, setSounds] = useState<StoredSound[]>([]);
  const [sampleInstruments, setSampleInstruments] = useState<Instrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(BUILTIN_INSTRUMENTS[0].id);
  const [activeSoundfontInstrument, setActiveSoundfontInstrument] = useState<SoundfontInstrument | null>(null);
  const [activePreloadedName, setActivePreloadedName] = useState<string | null>(null);
  const [soundfontKit, setSoundfontKit] = useState<SoundfontKit>('MusyngKite');

  const soundfonts = useSoundfonts(engine);
  const preloaded = usePreloadedInstruments(engine);

  useEffect(() => {
    listPresets().then(setPresets).catch(() => setPresets([]));
    listSounds().then(setSounds).catch(() => setSounds([]));
  }, []);

  // Decode stored sound blobs into playable AudioBuffers once loaded.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const decoded: Instrument[] = [];
      for (const sound of sounds) {
        try {
          const arrayBuffer = await sound.blob.arrayBuffer();
          const buffer = await engine.decodeSample(arrayBuffer);
          decoded.push({ kind: 'sample', id: sound.id, name: sound.name, buffer, rootFrequency: sound.rootFrequency });
        } catch {
          // skip sounds that fail to decode
        }
      }
      if (!cancelled) setSampleInstruments(decoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [sounds, engine]);

  const allInstruments = useMemo(() => [...BUILTIN_INSTRUMENTS, ...sampleInstruments], [sampleInstruments]);
  const flatInstrument = useMemo(
    () => allInstruments.find((i) => i.id === selectedInstrumentId) ?? BUILTIN_INSTRUMENTS[0],
    [allInstruments, selectedInstrumentId],
  );
  const selectedInstrument = activeSoundfontInstrument ?? flatInstrument;

  const tuning = useMemo(() => buildTuningSystem(tuningChoice, presets), [tuningChoice, presets]);
  const keyMap = useMemo(() => compileKeyMap(rowLayout, tuning), [rowLayout, tuning]);

  const pressed = useKeyboardInput(engine, tuning, root, selectedInstrument, keyMap);

  useEffect(() => {
    engine.setVolume(volume);
  }, [engine, volume]);

  async function handleSavePreset(name: string, cents: number[]) {
    const preset: StoredPreset = { id: `preset-${Date.now()}`, name, cents };
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
    setTuningChoice({ category: 'custom', presetId: preset.id });
  }

  async function handleDeletePreset(id: string) {
    await deletePreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (tuningChoice.category === 'custom' && tuningChoice.presetId === id) {
      setTuningChoice({ category: 'custom', presetId: null });
    }
  }

  async function handleUploadSound(file: File, name: string, rootPitchClass: string, rootOctave: number) {
    const arrayBuffer = await file.arrayBuffer();
    await engine.decodeSample(arrayBuffer); // validate it decodes before storing
    const rootFrequency = makeRoot(rootPitchClass, rootOctave).frequency;
    const stored: StoredSound = { id: `sound-${Date.now()}`, name, blob: file, rootFrequency };
    await saveSound(stored);
    setSounds((prev) => [...prev, stored]);
    setSelectedInstrumentId(stored.id);
  }

  async function handleDeleteSound(id: string) {
    await deleteSound(id);
    setSounds((prev) => prev.filter((s) => s.id !== id));
    if (selectedInstrumentId === id) setSelectedInstrumentId(BUILTIN_INSTRUMENTS[0].id);
  }

  function handleSelectInstrument(id: string) {
    setSelectedInstrumentId(id);
    setActiveSoundfontInstrument(null);
    setActivePreloadedName(null);
  }

  function handleBrowseSoundfont(fileId: string) {
    soundfonts.ensureLoaded(fileId).catch((err) => console.error('Failed to read SoundFont', err));
  }

  async function handleSelectSoundfontProgram(fileId: string, programName: string) {
    try {
      const instrument = await soundfonts.selectProgram(fileId, programName);
      setActiveSoundfontInstrument(instrument);
      setActivePreloadedName(null);
    } catch (err) {
      console.error('Failed to load SoundFont instrument', err);
    }
  }

  async function handleUploadSoundfont(file: File, name: string) {
    await soundfonts.upload(file, name);
  }

  async function handleDeleteSoundfont(fileId: string) {
    await soundfonts.remove(fileId);
    if (activeSoundfontInstrument?.id.startsWith(`${fileId}::`)) {
      setActiveSoundfontInstrument(null);
    }
  }

  async function handleSelectPreloadedInstrument(name: string) {
    try {
      const instrument = await preloaded.selectInstrument(name, soundfontKit);
      setActiveSoundfontInstrument(instrument);
      setActivePreloadedName(name);
    } catch (err) {
      console.error('Failed to load preloaded instrument', err);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Keyboard Instrument</h1>
        <p>Play your computer keyboard like an instrument. Click anywhere once to enable audio, then start typing.</p>
      </header>

      <div className="app__controls">
        <TuningSelector
          choice={tuningChoice}
          onChange={setTuningChoice}
          root={root}
          onRootChange={setRoot}
          presets={presets}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
          description={tuning.description}
          rowLayout={rowLayout}
          onRowLayoutChange={setRowLayout}
          pianoUnavailable={keyMap.pianoUnavailable}
        />
        <InstrumentSelector
          instruments={allInstruments}
          selectedId={selectedInstrumentId}
          onSelect={handleSelectInstrument}
          onUpload={handleUploadSound}
          onDelete={handleDeleteSound}
          soundfontFiles={soundfonts.files}
          soundfontPrograms={soundfonts.programsByFile}
          loadingSoundfontId={soundfonts.loadingFileId}
          activeSoundfont={
            activeSoundfontInstrument
              ? { fileId: activeSoundfontInstrument.id.split('::')[0], programName: activeSoundfontInstrument.name }
              : null
          }
          onBrowseSoundfont={handleBrowseSoundfont}
          onSelectSoundfontProgram={handleSelectSoundfontProgram}
          onUploadSoundfont={handleUploadSoundfont}
          onDeleteSoundfont={handleDeleteSoundfont}
          preloadedInstrumentNames={preloaded.instrumentNames}
          loadingPreloadedName={preloaded.loadingName}
          activePreloadedName={activePreloadedName}
          soundfontKit={soundfontKit}
          onSoundfontKitChange={setSoundfontKit}
          onSelectPreloadedInstrument={handleSelectPreloadedInstrument}
        />
        <section className="panel">
          <h2>Output</h2>
          <VolumeControl volume={volume} onChange={setVolume} />
        </section>
      </div>

      <KeyboardView tuning={tuning} root={root} pressed={pressed} keyMap={keyMap} />
    </div>
  );
}
