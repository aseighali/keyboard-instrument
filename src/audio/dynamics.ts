const FAST_MS = 60;
const SLOW_MS = 450;
const MIN_VELOCITY = 55;
const MAX_VELOCITY = 118;
const JITTER = 5;
const NEUTRAL_VELOCITY = 100;

export const DEFAULT_DYNAMICS_INTENSITY = 0.6;

/**
 * Approximates playing dynamics from typing speed, since a computer keyboard has no pressure
 * sensor to report how hard a key was actually pressed: fast typing reads as harder/louder,
 * slow deliberate presses as softer, with a little random jitter so repeated notes at a steady
 * pace don't all sound identical.
 *
 * `intensity` (0-1) dials how far that swing is allowed to go, scaled around the neutral
 * velocity (100): 0 always returns 100 (flat), 1 uses the full range untouched.
 */
export function computeVelocityFromInterval(intervalMs: number | null, intensity: number): number {
  if (intervalMs === null) return NEUTRAL_VELOCITY; // first note of a session/phrase - no tempo signal yet
  const clampedIntensity = Math.min(1, Math.max(0, intensity));
  const t = Math.min(1, Math.max(0, (SLOW_MS - intervalMs) / (SLOW_MS - FAST_MS)));
  const fullSwing = MIN_VELOCITY + t * (MAX_VELOCITY - MIN_VELOCITY);
  const jitter = (Math.random() * 2 - 1) * JITTER * clampedIntensity;
  const velocity = NEUTRAL_VELOCITY + (fullSwing - NEUTRAL_VELOCITY) * clampedIntensity + jitter;
  return Math.round(Math.min(127, Math.max(1, velocity)));
}
