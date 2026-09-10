import { useEffect, useMemo, useState } from 'react';
import { KeyboardView } from './components/KeyboardView';
import { TuningSelector } from './components/TuningSelector';
import { InstrumentSelector } from './components/InstrumentSelector';
import { VolumeControl } from './components/VolumeControl';
import { ReverbControl } from './components/ReverbControl';
import { InfoTooltip } from './components/InfoTooltip';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useSoundfonts } from './hooks/useSoundfonts';
import { usePreloadedInstruments, type SoundfontKit } from './hooks/usePreloadedInstruments';
import { usePremiumInstruments, type PremiumLibraryId } from './hooks/usePremiumInstruments';
import { makeRoot } from './tuning/notes';
import type { RootConfig } from './tuning/types';
import { DEFAULT_TUNING_CHOICE, buildTuningSystem, type TuningChoice } from './tuning/tuningChoice';
import { DEFAULT_ROW_LAYOUT, compileKeyMap, type RowLayout } from './tuning/keyMap';
import type { Instrument, SoundfontInstrument } from './audio/instruments';
import { listPresets, savePreset, deletePreset, type StoredPreset } from './audio/PresetStore';
import { listSounds, saveSound, deleteSound, type StoredSound } from './audio/SampleStore';
import { REVERB_PRESETS, DEFAULT_REVERB_PRESET_ID, type ReverbParams, type ReverbPresetId } from './audio/reverbPresets';
import { DEFAULT_DYNAMICS_INTENSITY } from './audio/dynamics';

const DEFAULT_REVERB_PRESET = REVERB_PRESETS.find((p) => p.id === DEFAULT_REVERB_PRESET_ID)!;

export default function App() {
  const engine = useAudioEngine();

  const [tuningChoice, setTuningChoice] = useState<TuningChoice>(DEFAULT_TUNING_CHOICE);
  const [root, setRoot] = useState<RootConfig>(() => makeRoot('C', 4));
  const [rowLayout, setRowLayout] = useState<RowLayout>(DEFAULT_ROW_LAYOUT);
  const [volume, setVolume] = useState(0.6);

  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [sounds, setSounds] = useState<StoredSound[]>([]);
  const [sampleInstruments, setSampleInstruments] = useState<Instrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [activeSoundfontInstrument, setActiveSoundfontInstrument] = useState<SoundfontInstrument | null>(null);
  const [activePreloadedName, setActivePreloadedName] = useState<string | null>(null);
  const [activePremium, setActivePremium] = useState<{ libraryId: PremiumLibraryId; name: string | null } | null>(
    null,
  );
  const [soundfontKit, setSoundfontKit] = useState<SoundfontKit>('MusyngKite');

  const [reverbPresetId, setReverbPresetId] = useState<ReverbPresetId>(DEFAULT_REVERB_PRESET_ID);
  const [reverbAmount, setReverbAmount] = useState<number>(DEFAULT_REVERB_PRESET.amount);
  const [reverbCustomParams, setReverbCustomParams] = useState<ReverbParams>(DEFAULT_REVERB_PRESET.params);
  const [dynamicsEnabled, setDynamicsEnabled] = useState(true);
  const [dynamicsIntensity, setDynamicsIntensity] = useState(DEFAULT_DYNAMICS_INTENSITY);
  const [pullOffEnabled, setPullOffEnabled] = useState(false);

  const soundfonts = useSoundfonts(engine);
  const preloaded = usePreloadedInstruments(engine);
  const premium = usePremiumInstruments(engine);

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

  const flatInstrument = useMemo(
    () => sampleInstruments.find((i) => i.id === selectedInstrumentId) ?? null,
    [sampleInstruments, selectedInstrumentId],
  );
  const selectedInstrument = activeSoundfontInstrument ?? flatInstrument;

  const tuning = useMemo(() => buildTuningSystem(tuningChoice, presets), [tuningChoice, presets]);
  const keyMap = useMemo(() => compileKeyMap(rowLayout, tuning), [rowLayout, tuning]);

  const pressed = useKeyboardInput(
    engine,
    tuning,
    root,
    selectedInstrument,
    keyMap,
    dynamicsEnabled,
    dynamicsIntensity,
    pullOffEnabled,
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      const delta = e.code === 'ArrowUp' ? 1 : -1;
      setRoot((prev) => {
        const nextOctave = Math.min(6, Math.max(2, prev.octave + delta));
        return nextOctave === prev.octave ? prev : makeRoot(prev.pitchClass, nextOctave);
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    engine.setVolume(volume);
  }, [engine, volume]);

  useEffect(() => {
    engine.setReverbAmount(reverbAmount);
  }, [engine, reverbAmount]);

  useEffect(() => {
    const params = reverbPresetId === 'custom' ? reverbCustomParams : REVERB_PRESETS.find((p) => p.id === reverbPresetId)!.params;
    engine.setReverbParams(params).catch((err) => console.error('Failed to apply reverb params', err));
  }, [engine, reverbPresetId, reverbCustomParams]);

  function handleReverbPresetChange(id: ReverbPresetId) {
    const previous = REVERB_PRESETS.find((p) => p.id === reverbPresetId);
    setReverbPresetId(id);
    if (id === 'custom') {
      if (previous) setReverbCustomParams(previous.params);
    } else {
      const preset = REVERB_PRESETS.find((p) => p.id === id)!;
      setReverbAmount(preset.amount);
    }
  }

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
    if (selectedInstrumentId === id) setSelectedInstrumentId('');
  }

  function handleSelectInstrument(id: string) {
    setSelectedInstrumentId(id);
    setActiveSoundfontInstrument(null);
    setActivePreloadedName(null);
    setActivePremium(null);
  }

  function handleBrowseSoundfont(fileId: string) {
    soundfonts.ensureLoaded(fileId).catch((err) => console.error('Failed to read SoundFont', err));
  }

  async function handleSelectSoundfontProgram(fileId: string, programName: string) {
    try {
      const instrument = await soundfonts.selectProgram(fileId, programName);
      setActiveSoundfontInstrument(instrument);
      setActivePreloadedName(null);
      setActivePremium(null);
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
      setActivePremium(null);
    } catch (err) {
      console.error('Failed to load preloaded instrument', err);
    }
  }

  async function handleSelectPremiumInstrument(libraryId: PremiumLibraryId, name: string | null) {
    try {
      const instrument = await premium.selectInstrument(libraryId, name);
      setActiveSoundfontInstrument(instrument);
      setActivePreloadedName(null);
      setSelectedInstrumentId('');
      setActivePremium({ libraryId, name });
    } catch (err) {
      console.error('Failed to load premium instrument', err);
    }
  }

  // Default to the best-quality option (sampled grand piano) on first load.
  useEffect(() => {
    handleSelectPremiumInstrument('splendid-piano', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          instruments={sampleInstruments}
          selectedId={selectedInstrumentId}
          onSelect={handleSelectInstrument}
          onUpload={handleUploadSound}
          onDelete={handleDeleteSound}
          premiumLibraries={premium.libraries}
          loadingPremiumKey={premium.loadingKey}
          activePremium={activePremium}
          onSelectPremiumInstrument={handleSelectPremiumInstrument}
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
        <details className="panel" open>
          <summary>
            <h2>Settings</h2>
          </summary>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={dynamicsEnabled}
              onChange={(e) => setDynamicsEnabled(e.target.checked)}
            />
            <span className="field-label">
              Dynamics from typing speed
              <InfoTooltip>
                No computer keyboard reports how hard a key was pressed, so this approximates it
                from how fast you're typing: faster passages play louder/brighter, like a real
                instrument responding to how hard you play. Turn off for flat, constant-velocity
                playback instead.
              </InfoTooltip>
            </span>
          </label>
          {dynamicsEnabled && (
            <label className="field">
              <span>Dynamics intensity ({Math.round(dynamicsIntensity * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={dynamicsIntensity}
                onChange={(e) => setDynamicsIntensity(Number(e.target.value))}
              />
            </label>
          )}
          <hr />
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={pullOffEnabled}
              onChange={(e) => setPullOffEnabled(e.target.checked)}
            />
            <span className="field-label">
              Pull-off (guitar-style)
              <InfoTooltip>
                While holding a note, press and release another note without releasing the first:
                on release, the held note sounds again on its own, like lifting a fretting finger
                off a guitar string to reveal the note underneath.
              </InfoTooltip>
            </span>
          </label>
          <hr />
          <VolumeControl volume={volume} onChange={setVolume} />
          <hr />
          <ReverbControl
            presetId={reverbPresetId}
            onPresetChange={handleReverbPresetChange}
            amount={reverbAmount}
            onAmountChange={setReverbAmount}
            customParams={reverbCustomParams}
            onCustomParamsChange={setReverbCustomParams}
          />
        </details>
      </div>

      <KeyboardView tuning={tuning} root={root} pressed={pressed} keyMap={keyMap} />
    </div>
  );
}
