import { useRef, useState } from 'react';
import type { Instrument } from '../audio/instruments';
import { PITCH_CLASSES } from '../tuning/notes';
import type { SoundfontFile } from '../hooks/useSoundfonts';
import { displayInstrumentName, type SoundfontKit } from '../hooks/usePreloadedInstruments';
import type { PremiumLibraryDef, PremiumLibraryId } from '../hooks/usePremiumInstruments';

interface InstrumentSelectorProps {
  instruments: Instrument[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpload: (file: File, name: string, rootPitchClass: string, rootOctave: number) => Promise<void>;
  onDelete: (id: string) => void;

  premiumLibraries: PremiumLibraryDef[];
  loadingPremiumKey: string | null;
  activePremium: { libraryId: PremiumLibraryId; name: string | null } | null;
  onSelectPremiumInstrument: (libraryId: PremiumLibraryId, name: string | null) => void;

  soundfontFiles: SoundfontFile[];
  soundfontPrograms: Record<string, string[]>;
  loadingSoundfontId: string | null;
  activeSoundfont: { fileId: string; programName: string } | null;
  onBrowseSoundfont: (fileId: string) => void;
  onSelectSoundfontProgram: (fileId: string, programName: string) => void;
  onUploadSoundfont: (file: File, name: string) => Promise<void>;
  onDeleteSoundfont: (fileId: string) => void;

  preloadedInstrumentNames: string[];
  loadingPreloadedName: string | null;
  activePreloadedName: string | null;
  soundfontKit: SoundfontKit;
  onSoundfontKitChange: (kit: SoundfontKit) => void;
  onSelectPreloadedInstrument: (name: string) => void;
}

export function InstrumentSelector({
  instruments,
  selectedId,
  onSelect,
  onUpload,
  onDelete,
  premiumLibraries,
  loadingPremiumKey,
  activePremium,
  onSelectPremiumInstrument,
  soundfontFiles,
  soundfontPrograms,
  loadingSoundfontId,
  activeSoundfont,
  onBrowseSoundfont,
  onSelectSoundfontProgram,
  onUploadSoundfont,
  onDeleteSoundfont,
  preloadedInstrumentNames,
  loadingPreloadedName,
  activePreloadedName,
  soundfontKit,
  onSoundfontKitChange,
  onSelectPreloadedInstrument,
}: InstrumentSelectorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [pitchClass, setPitchClass] = useState('A');
  const [octave, setOctave] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sfFileRef = useRef<HTMLInputElement>(null);
  const [sfName, setSfName] = useState('');
  const [sfBusy, setSfBusy] = useState(false);
  const [sfError, setSfError] = useState<string | null>(null);
  const [browsingFileId, setBrowsingFileId] = useState<string | null>(activeSoundfont?.fileId ?? null);

  const [premiumLibraryChoice, setPremiumLibraryChoice] = useState<PremiumLibraryId | ''>(
    activePremium?.libraryId ?? '',
  );

  const sampleInstruments = instruments.filter((i) => i.kind === 'sample');
  const chosenLibrary = premiumLibraries.find((l) => l.id === premiumLibraryChoice) ?? null;

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose an audio file first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, name.trim() || file.name, pitchClass, octave);
      setName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that audio file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadSoundfont() {
    const file = sfFileRef.current?.files?.[0];
    if (!file) {
      setSfError('Choose a .sf2 file first.');
      return;
    }
    setSfBusy(true);
    setSfError(null);
    try {
      await onUploadSoundfont(file, sfName.trim() || file.name);
      setSfName('');
      if (sfFileRef.current) sfFileRef.current.value = '';
    } catch (err) {
      setSfError(err instanceof Error ? err.message : 'Could not read that SoundFont file.');
    } finally {
      setSfBusy(false);
    }
  }

  function handlePremiumLibraryChange(id: PremiumLibraryId | '') {
    setPremiumLibraryChoice(id);
    if (!id) return;
    const lib = premiumLibraries.find((l) => l.id === id);
    if (lib && lib.names === null) onSelectPremiumInstrument(id, null);
  }

  const browsingPrograms = browsingFileId ? soundfontPrograms[browsingFileId] : undefined;

  return (
    <section className="panel">
      <h2>Sound</h2>

      <p className="hint">
        Real sampled instruments from dedicated, purpose-built libraries (not a generic MIDI set) &mdash; the
        best quality this app offers, no upload needed.
      </p>
      <label className="field">
        <span>Library</span>
        <select
          value={premiumLibraryChoice}
          onChange={(e) => handlePremiumLibraryChange(e.target.value as PremiumLibraryId | '')}
        >
          <option value="">— pick a library —</option>
          {premiumLibraries.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      {chosenLibrary && chosenLibrary.names && (
        <label className="field">
          <span>Sound</span>
          <select
            value={activePremium?.libraryId === chosenLibrary.id ? (activePremium.name ?? '') : ''}
            onChange={(e) => e.target.value && onSelectPremiumInstrument(chosenLibrary.id, e.target.value)}
          >
            <option value="">— pick one ({chosenLibrary.names.length} available) —</option>
            {chosenLibrary.names.map((n) => (
              <option key={n} value={n}>
                {displayInstrumentName(n)}
              </option>
            ))}
          </select>
        </label>
      )}
      {loadingPremiumKey && <p className="hint">Loading…</p>}

      <hr />

      {sampleInstruments.length > 0 && (
        <>
          <label className="field">
            <span>Uploaded sound</span>
            <select value={selectedId} onChange={(e) => onSelect(e.target.value)}>
              <option value="">— none —</option>
              {sampleInstruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          {selectedId && sampleInstruments.some((i) => i.id === selectedId) && (
            <button type="button" className="btn-link" onClick={() => onDelete(selectedId)}>
              Delete this sound
            </button>
          )}
        </>
      )}

      <details>
        <summary>Upload a sound</summary>
        <p className="hint">
          Upload a single-note sample (wav/mp3/ogg) and tell it what pitch the sample was recorded at &mdash; it
          will be pitch-shifted across the keyboard from there.
        </p>
        <label className="field">
          <span>Audio file</span>
          <input ref={fileRef} type="file" accept="audio/*" />
        </label>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My synth patch" />
        </label>
        <div className="root-controls">
          <label className="field">
            <span>Sample's root pitch</span>
            <select value={pitchClass} onChange={(e) => setPitchClass(e.target.value)}>
              {PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {pc}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Octave</span>
            <select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={handleUpload} disabled={busy}>
          {busy ? 'Loading…' : 'Add sound'}
        </button>
        {error && <p className="error">{error}</p>}
      </details>

      <hr />

      <p className="hint">
        General MIDI instruments, streamed on first use from a free public sample library &mdash; wider
        selection (guitars, organs, world instruments, ...) but lower quality than the libraries above.
      </p>
      <label className="field">
        <span>Quality</span>
        <select value={soundfontKit} onChange={(e) => onSoundfontKitChange(e.target.value as SoundfontKit)}>
          <option value="MusyngKite">High quality (larger download)</option>
          <option value="FluidR3_GM">Fast (smaller download)</option>
        </select>
      </label>
      <label className="field">
        <span>Preloaded instrument</span>
        <select
          value={activePreloadedName ?? ''}
          onChange={(e) => e.target.value && onSelectPreloadedInstrument(e.target.value)}
        >
          <option value="">— pick one ({preloadedInstrumentNames.length} available) —</option>
          {preloadedInstrumentNames.map((n) => (
            <option key={n} value={n}>
              {displayInstrumentName(n)}
            </option>
          ))}
        </select>
      </label>
      {loadingPreloadedName && <p className="hint">Loading {displayInstrumentName(loadingPreloadedName)}…</p>}

      <hr />

      <label className="field">
        <span>SoundFont file</span>
        <select
          value={browsingFileId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setBrowsingFileId(id);
            if (id) onBrowseSoundfont(id);
          }}
        >
          <option value="">— none —</option>
          {soundfontFiles.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      {browsingFileId && loadingSoundfontId === browsingFileId && <p className="hint">Reading SoundFont…</p>}

      {browsingFileId && browsingPrograms && (
        <>
          <label className="field">
            <span>Instrument in this SoundFont</span>
            <select
              value={activeSoundfont?.fileId === browsingFileId ? activeSoundfont.programName : ''}
              onChange={(e) => e.target.value && onSelectSoundfontProgram(browsingFileId, e.target.value)}
            >
              <option value="">— pick one ({browsingPrograms.length} available) —</option>
              {browsingPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-link" onClick={() => onDeleteSoundfont(browsingFileId)}>
            Delete this SoundFont file
          </button>
        </>
      )}

      <details>
        <summary>Upload your own SoundFont (.sf2)</summary>
        <p className="hint">
          For a specific file you already have, or one not in the preloaded list above. Free official downloads:{' '}
          <strong>FluidR3_GM.sf2</strong> from the{' '}
          <a href="https://musescore.org/en/handbook/2/soundfonts-and-sfz-files" target="_blank" rel="noreferrer">
            MuseScore handbook
          </a>{' '}
          or{' '}
          <a href="https://www.polyphone.io/en/soundfonts/instrument-sets/250-fluidr3-gm" target="_blank" rel="noreferrer">
            Polyphone
          </a>
          , and <strong>MuseScore_General.sf2</strong> (bundled with MuseScore, MIT licensed). Upload once; it's
          stored in this browser and every instrument inside it shows up above from then on.
        </p>
        <label className="field">
          <span>SoundFont file (.sf2)</span>
          <input ref={sfFileRef} type="file" accept=".sf2" />
        </label>
        <label className="field">
          <span>Name</span>
          <input value={sfName} onChange={(e) => setSfName(e.target.value)} placeholder="FluidR3 GM" />
        </label>
        <button type="button" onClick={handleUploadSoundfont} disabled={sfBusy}>
          {sfBusy ? 'Reading…' : 'Add SoundFont'}
        </button>
        {sfError && <p className="error">{sfError}</p>}
      </details>
    </section>
  );
}
