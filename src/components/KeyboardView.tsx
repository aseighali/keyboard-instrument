import { KEYBOARD_LAYOUT } from './physicalLayout';
import { KeyCap } from './KeyCap';
import { resolveNote, type CompiledKeyMap } from '../tuning/keyMap';
import type { RootConfig, TuningSystem } from '../tuning/types';

interface KeyboardViewProps {
  tuning: TuningSystem;
  root: RootConfig;
  pressed: Set<string>;
  keyMap: CompiledKeyMap;
}

export function KeyboardView({ tuning, root, pressed, keyMap }: KeyboardViewProps) {
  return (
    <div className="keyboard-view">
      {KEYBOARD_LAYOUT.map((row, i) => (
        <div className="keyboard-view__row" key={i}>
          {row.map((key) => {
            const note = resolveNote(key.code, tuning, root, keyMap);
            return (
              <KeyCap
                key={key.code}
                physicalLabel={key.label}
                width={key.width}
                noteLabel={note?.label ?? null}
                pressed={pressed.has(key.code)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
