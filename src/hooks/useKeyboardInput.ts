import { useEffect, useRef, useState } from 'react';
import type { RootConfig, TuningSystem } from '../tuning/types';
import { resolveNote, type CompiledKeyMap } from '../tuning/keyMap';
import type { Instrument } from '../audio/instruments';
import type { AudioEngine } from '../audio/AudioEngine';
import { computeVelocityFromInterval } from '../audio/dynamics';

/** Softer than a normal attack, since a pull-off re-sounds a note without a fresh "pick". */
const PULL_OFF_VELOCITY = 70;

function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

/** Listens for physical key presses and drives the audio engine; returns the set of currently held key codes. */
export function useKeyboardInput(
  engine: AudioEngine,
  tuning: TuningSystem,
  root: RootConfig,
  instrument: Instrument | null,
  keyMap: CompiledKeyMap,
  dynamicsEnabled: boolean,
  dynamicsIntensity: number,
  pullOffEnabled: boolean,
): Set<string> {
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const tuningRef = useRef(tuning);
  const rootRef = useRef(root);
  const instrumentRef = useRef(instrument);
  const keyMapRef = useRef(keyMap);
  const dynamicsEnabledRef = useRef(dynamicsEnabled);
  const dynamicsIntensityRef = useRef(dynamicsIntensity);
  const pullOffEnabledRef = useRef(pullOffEnabled);
  const lastNoteOnAtRef = useRef<number | null>(null);
  /** Currently-held musical keys (Ctrl/dorrab presses excluded), in press order - the entry
   *  just below a released key is "the previous note" a guitar-style pull-off returns to. */
  const heldStackRef = useRef<{ code: string; frequency: number }[]>([]);
  tuningRef.current = tuning;
  rootRef.current = root;
  instrumentRef.current = instrument;
  keyMapRef.current = keyMap;
  dynamicsEnabledRef.current = dynamicsEnabled;
  dynamicsIntensityRef.current = dynamicsIntensity;
  pullOffEnabledRef.current = pullOffEnabled;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || isTypingTarget(e.target) || !instrumentRef.current) return;
      const note = resolveNote(e.code, tuningRef.current, rootRef.current, keyMapRef.current);
      if (!note) return;
      e.preventDefault();
      setPressed((prev) => new Set(prev).add(e.code));

      try {
        if (e.ctrlKey) {
          // Dorrab is a fixed ornament, not an expressive attack - it always fires at a
          // neutral velocity, ignoring the typing-speed dynamics estimate entirely.
          engine.playDorrab(e.code, note.frequency, instrumentRef.current, 100);
        } else {
          const now = performance.now();
          const sinceLastNote = lastNoteOnAtRef.current === null ? null : now - lastNoteOnAtRef.current;
          lastNoteOnAtRef.current = now;
          const velocity = dynamicsEnabledRef.current
            ? computeVelocityFromInterval(sinceLastNote, dynamicsIntensityRef.current)
            : 100;
          engine.noteOn(e.code, note.frequency, instrumentRef.current, velocity);

          heldStackRef.current = heldStackRef.current.filter((h) => h.code !== e.code);
          heldStackRef.current.push({ code: e.code, frequency: note.frequency });
        }
      } catch (err) {
        console.error('noteOn failed for', instrumentRef.current, err);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const stack = heldStackRef.current;
      const index = stack.findIndex((h) => h.code === e.code);
      if (index !== -1) {
        const pullOffTo = index > 0 ? stack[index - 1] : null;
        stack.splice(index, 1);
        if (pullOffEnabledRef.current && pullOffTo && instrumentRef.current) {
          try {
            engine.noteOn(pullOffTo.code, pullOffTo.frequency, instrumentRef.current, PULL_OFF_VELOCITY);
          } catch (err) {
            console.error('pull-off noteOn failed for', instrumentRef.current, err);
          }
        }
      }

      engine.noteOff(e.code);
      setPressed((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    }

    function onBlur() {
      engine.allNotesOff();
      heldStackRef.current = [];
      setPressed(new Set());
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      engine.allNotesOff();
    };
  }, [engine]);

  return pressed;
}
