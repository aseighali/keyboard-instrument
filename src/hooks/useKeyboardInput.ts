import { useEffect, useRef, useState } from 'react';
import type { RootConfig, TuningSystem } from '../tuning/types';
import { resolveNote, type CompiledKeyMap } from '../tuning/keyMap';
import type { Instrument } from '../audio/instruments';
import type { AudioEngine } from '../audio/AudioEngine';

function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

/** Listens for physical key presses and drives the audio engine; returns the set of currently held key codes. */
export function useKeyboardInput(
  engine: AudioEngine,
  tuning: TuningSystem,
  root: RootConfig,
  instrument: Instrument,
  keyMap: CompiledKeyMap,
): Set<string> {
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const tuningRef = useRef(tuning);
  const rootRef = useRef(root);
  const instrumentRef = useRef(instrument);
  const keyMapRef = useRef(keyMap);
  tuningRef.current = tuning;
  rootRef.current = root;
  instrumentRef.current = instrument;
  keyMapRef.current = keyMap;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || isTypingTarget(e.target)) return;
      const note = resolveNote(e.code, tuningRef.current, rootRef.current, keyMapRef.current);
      if (!note) return;
      e.preventDefault();
      setPressed((prev) => new Set(prev).add(e.code));
      try {
        engine.noteOn(e.code, note.frequency, instrumentRef.current);
      } catch (err) {
        console.error('noteOn failed for', instrumentRef.current, err);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
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
