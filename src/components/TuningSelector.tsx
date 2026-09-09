import { useState } from 'react';
import type { RootConfig } from '../tuning/types';
import { PITCH_CLASSES, makeRoot } from '../tuning/notes';
import { MODES, DASTGAHS, defaultDastgahChoice, type TuningChoice } from '../tuning/tuningChoice';
import type { StoredPreset } from '../audio/PresetStore';
import type { RowLayout } from '../tuning/keyMap';

interface TuningSelectorProps {
  choice: TuningChoice;
  onChange: (choice: TuningChoice) => void;
  root: RootConfig;
  onRootChange: (root: RootConfig) => void;
  presets: StoredPreset[];
  onSavePreset: (name: string, cents: number[]) => void;
  onDeletePreset: (id: string) => void;
  description?: string;
  rowLayout: RowLayout;
  onRowLayoutChange: (layout: RowLayout) => void;
  pianoUnavailable: boolean;
}

const OCTAVES = [2, 3, 4, 5, 6];

/** One flat, browser-native `<select>`: plain top-level `<option>`s for dastgahs with no avaz,
 *  and an `<optgroup>` for Shur (the one dastgah with named avaz) so "Shur itself" plus its 5
 *  avaz are visibly grouped as its sub-options rather than looking like sibling dastgahs. */
type DastgahOption = { value: string; name: string };
type DastgahOptionEntry = DastgahOption | { groupLabel: string; options: DastgahOption[] };

const DASTGAH_OPTION_ENTRIES: DastgahOptionEntry[] = DASTGAHS.map((d) => {
  if (!d.avazes) return { value: `${d.id}|`, name: d.name };
  return {
    groupLabel: d.name,
    options: [
      { value: `${d.id}|`, name: `${d.name} itself` },
      ...d.avazes.map((a) => ({ value: `${d.id}|${a.id}`, name: a.name })),
    ],
  };
});

export function TuningSelector({
  choice,
  onChange,
  root,
  onRootChange,
  presets,
  onSavePreset,
  onDeletePreset,
  description,
  rowLayout,
  onRowLayoutChange,
  pianoUnavailable,
}: TuningSelectorProps) {
  const [customName, setCustomName] = useState('');
  const [customCents, setCustomCents] = useState('0, 150, 350, 500, 700, 850, 1050');

  const dastgahChoice = choice.category === 'dastgah' ? choice : null;

  return (
    <section className="panel">
      <h2>Tuning system</h2>

      <label className="field">
        <span>System</span>
        <select
          value={choice.category}
          onChange={(e) => {
            const category = e.target.value as TuningChoice['category'];
            if (category === 'chromatic') onChange({ category });
            else if (category === 'scale') onChange({ category, modeId: MODES[0].id });
            else if (category === 'microtonal') onChange({ category, edo: 24 });
            else if (category === 'dastgah') onChange(defaultDastgahChoice(DASTGAHS[0].id));
            else onChange({ category: 'custom', presetId: presets[0]?.id ?? null });
          }}
        >
          <option value="chromatic">Chromatic (12-TET)</option>
          <option value="scale">Scale / Mode</option>
          <option value="microtonal">Microtonal (N-EDO)</option>
          <option value="dastgah">Iranian Dastgah</option>
          <option value="custom">Custom scale</option>
        </select>
      </label>

      {choice.category === 'scale' && (
        <label className="field">
          <span>Mode</span>
          <select value={choice.modeId} onChange={(e) => onChange({ category: 'scale', modeId: e.target.value })}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {choice.category === 'microtonal' && (
        <label className="field">
          <span>Divisions of the octave</span>
          <input
            type="number"
            min={2}
            max={96}
            value={choice.edo}
            onChange={(e) => onChange({ category: 'microtonal', edo: Number(e.target.value) || 12 })}
          />
        </label>
      )}

      {dastgahChoice && (
        <label className="field">
          <span>Dastgah / Avaz</span>
          <select
            value={`${dastgahChoice.dastgahId}|${dastgahChoice.avazId ?? ''}`}
            onChange={(e) => {
              const [dastgahId, avazIdRaw] = e.target.value.split('|');
              onChange({ category: 'dastgah', dastgahId, avazId: avazIdRaw || null });
            }}
          >
            {DASTGAH_OPTION_ENTRIES.map((entry) =>
              'groupLabel' in entry ? (
                <optgroup key={entry.groupLabel} label={entry.groupLabel}>
                  {entry.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={entry.value} value={entry.value}>
                  {entry.name}
                </option>
              ),
            )}
          </select>
        </label>
      )}

      {choice.category === 'custom' && (
        <div className="custom-scale">
          <label className="field">
            <span>Saved scale</span>
            <select
              value={choice.presetId ?? ''}
              onChange={(e) => onChange({ category: 'custom', presetId: e.target.value || null })}
            >
              <option value="">— none saved yet —</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {choice.presetId && (
            <button type="button" className="btn-link" onClick={() => onDeletePreset(choice.presetId!)}>
              Delete selected scale
            </button>
          )}

          <details>
            <summary>Create custom scale</summary>
            <label className="field">
              <span>Name</span>
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="My scale" />
            </label>
            <label className="field">
              <span>Cents from root (comma separated)</span>
              <input value={customCents} onChange={(e) => setCustomCents(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => {
                const cents = customCents
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n));
                if (!customName.trim() || cents.length === 0) return;
                onSavePreset(customName.trim(), cents);
                setCustomName('');
              }}
            >
              Save scale
            </button>
          </details>
        </div>
      )}

      {description && <p className="tuning-description">{description}</p>}

      <div className="root-controls">
        <label className="field">
          <span>Root note</span>
          <select
            value={root.pitchClass}
            onChange={(e) => onRootChange(makeRoot(e.target.value, root.octave))}
          >
            {PITCH_CLASSES.map((pc) => (
              <option key={pc} value={pc}>
                {pc}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Octave</span>
          <select
            value={root.octave}
            onChange={(e) => onRootChange(makeRoot(root.pitchClass, Number(e.target.value)))}
          >
            {OCTAVES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr />

      <label className="field">
        <span>Row layout</span>
        <select
          value={rowLayout.mode}
          onChange={(e) => {
            const mode = e.target.value as RowLayout['mode'];
            onRowLayoutChange({ mode, steps: rowLayout.steps || 3 });
          }}
        >
          <option value="fixed">Fixed interval per row (guitar-style, isomorphic)</option>
          <option value="piano">Black &amp; white keys (real piano shape)</option>
          <option value="continuous">Continuous run (full range)</option>
        </select>
      </label>

      {rowLayout.mode === 'fixed' && (
        <label className="field">
          <span>Steps between rows</span>
          <input
            type="number"
            min={1}
            max={24}
            value={rowLayout.steps}
            onChange={(e) =>
              onRowLayoutChange({ mode: 'fixed', steps: Math.max(1, Math.round(Number(e.target.value)) || 1) })
            }
          />
        </label>
      )}

      <p className="hint">
        {rowLayout.mode === 'fixed' &&
          `Each row starts ${rowLayout.steps} step${rowLayout.steps === 1 ? '' : 's'} higher than the row below it — same shape everywhere, like moving to an adjacent guitar string. Notes repeat across rows on purpose. This is the isomorphic layout.`}
        {rowLayout.mode === 'piano' &&
          (pianoUnavailable
            ? 'Real black/white piano shape only applies to Chromatic tuning — this scale doesn\'t split cleanly into "white" and "black" keys, so it\'s using the continuous layout instead for now.'
            : 'Home row is the white keys (natural notes) in order; the row above is the black keys, offset to sit between two whites — same shape as a real piano, including the two gaps where a real piano has no black key (E–F, B–C). A few upper-row keys are intentionally silent.')}
        {rowLayout.mode === 'continuous' &&
          'Each row continues exactly where the row below left off — one long ascending run, no repeated or skipped notes, but the shape is different in every row. Not isomorphic.'}
      </p>
    </section>
  );
}
