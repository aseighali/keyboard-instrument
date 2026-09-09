import { useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

export function useAudioEngine(): AudioEngine {
  const ref = useRef<AudioEngine | null>(null);
  if (!ref.current) ref.current = new AudioEngine();
  return ref.current;
}
