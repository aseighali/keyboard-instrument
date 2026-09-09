import type { RootConfig, TuningSystem } from './types';
import { PITCH_CLASSES, midiNumberOf } from './notes';

/**
 * Isomorphic playing grid: within a row, moving right always steps to the next scale degree.
 * How rows relate to each other is configurable via {@link RowLayout}:
 *
 * - `fixed`: every row starts a fixed number of steps above the row below it - same shape
 *   everywhere, like frets on an adjacent guitar string (e.g. steps=3 means the key directly
 *   above column N plays the same degree as column N+3 on the row below - "ASDF is 1234, Q is 4").
 *   Notes repeat across rows, which is the point: multiple ways to reach the same note. This is
 *   the isomorphic layout - the shape is constant everywhere, unlike the other two modes.
 * - `continuous`: the four rows concatenate into one long ascending run with no repeats and no
 *   gaps, anchored so the home row starts on the root note. Full range, but the shape differs
 *   row to row - not isomorphic.
 * - `piano`: the actual black/white piano key shape (same convention as Ableton's "Musical
 *   Typing"). Home row is white keys (natural notes) in order; the row above is black keys
 *   (sharps), offset half a key to sit between two whites, with the two gaps a real piano has
 *   (no black key between E-F or B-C) - so a few upper-row keys are intentionally unmapped. Only
 *   well-defined for standard 12-tone chromatic tuning; other tuning systems fall back to
 *   `continuous` since "black and white keys" doesn't have a natural meaning for a 7-note scale
 *   or a microtonal division.
 */
export interface KeyRow {
  /** KeyboardEvent.code values, left to right. */
  codes: string[];
}

const BOTTOM_ROW: KeyRow = {
  codes: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
};
const HOME_ROW: KeyRow = {
  codes: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
};
const UPPER_ROW: KeyRow = {
  codes: [
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',
    'BracketLeft', 'BracketRight',
  ],
};
const NUMBER_ROW: KeyRow = {
  codes: [
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
    'Digit0', 'Minus', 'Equal',
  ],
};

/** Rows in ascending pitch order (physically bottom to top). */
export const KEY_ROWS: KeyRow[] = [BOTTOM_ROW, HOME_ROW, UPPER_ROW, NUMBER_ROW];
const HOME_ROW_INDEX = KEY_ROWS.indexOf(HOME_ROW);
/** Each row's position relative to the home row (bottom = -1, home = 0, upper = +1, number = +2). */
const ROW_POSITION = KEY_ROWS.map((_, r) => r - HOME_ROW_INDEX);

const ALL_MUSICAL_CODES: Set<string> = new Set(KEY_ROWS.flatMap((row) => row.codes));

export type RowLayoutMode = 'fixed' | 'continuous' | 'piano';

export interface RowLayout {
  mode: RowLayoutMode;
  /** Steps between adjacent rows. Only used when mode is 'fixed'. */
  steps: number;
}

export const DEFAULT_ROW_LAYOUT: RowLayout = { mode: 'fixed', steps: 3 };

/** A row layout compiled against a specific tuning, ready for repeated lookups. */
export interface CompiledKeyMap {
  degreeIndex: Map<string, number>;
  /** True when `piano` mode was requested but the tuning didn't support it (fell back to continuous). */
  pianoUnavailable: boolean;
}

/** The 7 natural-note semitone offsets within an octave (C D E F G A B). */
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
/** The sharp above each white key, indexed the same way; null where a real piano has no black key (E-F, B-C). */
const BLACK_ABOVE_WHITE: (number | null)[] = [1, 3, null, 6, 8, 10, null];

function compileContinuous(): Map<string, number> {
  const degreeIndex = new Map<string, number>();
  const rowStart = new Array<number>(KEY_ROWS.length);
  rowStart[HOME_ROW_INDEX] = 0;
  let running = 0;
  for (let r = HOME_ROW_INDEX; r < KEY_ROWS.length; r++) {
    rowStart[r] = running;
    running += KEY_ROWS[r].codes.length;
  }
  running = 0;
  for (let r = HOME_ROW_INDEX - 1; r >= 0; r--) {
    running -= KEY_ROWS[r].codes.length;
    rowStart[r] = running;
  }
  KEY_ROWS.forEach((row, r) => {
    row.codes.forEach((code, i) => degreeIndex.set(code, rowStart[r] + i));
  });
  return degreeIndex;
}

function compilePiano(): Map<string, number> {
  const degreeIndex = new Map<string, number>();

  const whiteRow = (row: KeyRow, octaveShift: number) => {
    row.codes.forEach((code, i) => {
      const octave = Math.floor(i / 7) + octaveShift;
      degreeIndex.set(code, octave * 12 + WHITE_SEMITONES[i % 7]);
    });
  };
  whiteRow(BOTTOM_ROW, -1);
  whiteRow(HOME_ROW, 0);
  whiteRow(NUMBER_ROW, 1);

  // Black keys sit offset by one column: upper-row column c is the black key between white
  // columns (c-1) and c (so Q, which has no white key to its left, is unmapped).
  UPPER_ROW.codes.forEach((code, c) => {
    if (c === 0) return;
    const w = c - 1;
    const blackSemitone = BLACK_ABOVE_WHITE[w % 7];
    if (blackSemitone === null) return;
    const octave = Math.floor(w / 7);
    degreeIndex.set(code, octave * 12 + blackSemitone);
  });

  return degreeIndex;
}

export function compileKeyMap(layout: RowLayout, tuning: TuningSystem): CompiledKeyMap {
  if (layout.mode === 'fixed') {
    const degreeIndex = new Map<string, number>();
    const steps = Math.max(1, Math.round(layout.steps));
    KEY_ROWS.forEach((row, r) => {
      const start = ROW_POSITION[r] * steps;
      row.codes.forEach((code, i) => degreeIndex.set(code, start + i));
    });
    return { degreeIndex, pianoUnavailable: false };
  }

  if (layout.mode === 'piano') {
    const supported = tuning.pitchClassBased && tuning.slots.length === 12;
    if (supported) return { degreeIndex: compilePiano(), pianoUnavailable: false };
    return { degreeIndex: compileContinuous(), pianoUnavailable: true };
  }

  return { degreeIndex: compileContinuous(), pianoUnavailable: false };
}

export function isMusicalKey(code: string): boolean {
  return ALL_MUSICAL_CODES.has(code);
}

export interface ResolvedNote {
  frequency: number;
  /** Short label to render on the key cap, e.g. "D#4", "n2 +1". */
  label: string;
}

export function resolveNote(
  code: string,
  tuning: TuningSystem,
  root: RootConfig,
  keyMap: CompiledKeyMap,
): ResolvedNote | null {
  const degreeIndex = keyMap.degreeIndex.get(code);
  if (degreeIndex === undefined) return null;

  const degreeCount = tuning.slots.length;
  const octaveWrap = Math.floor(degreeIndex / degreeCount);
  const degreeInOctave = degreeIndex - octaveWrap * degreeCount;
  const scaleSlot = tuning.slots[degreeInOctave];

  const frequency = root.frequency * Math.pow(2, octaveWrap + scaleSlot.cents / 1200);

  let label: string;
  if (tuning.pitchClassBased) {
    const rootMidi = midiNumberOf(root.pitchClass, root.octave);
    const noteMidi = Math.round(rootMidi + octaveWrap * 12 + scaleSlot.cents / 100);
    const pitchIndex = ((noteMidi % 12) + 12) % 12;
    const octave = Math.floor(noteMidi / 12) - 1;
    label = `${PITCH_CLASSES[pitchIndex]}${octave}`;
  } else {
    label = octaveWrap === 0 ? scaleSlot.label : `${scaleSlot.label} ${octaveWrap > 0 ? '+' : ''}${octaveWrap}`;
  }

  return { frequency, label };
}
