import { openDb, runTransaction } from './idb';

export interface StoredPreset {
  id: string;
  name: string;
  /** Cent offsets from the root that define the custom scale. */
  cents: number[];
}

export async function savePreset(preset: StoredPreset): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'presets', 'readwrite', (store) => store.put(preset));
}

export async function listPresets(): Promise<StoredPreset[]> {
  const db = await openDb();
  return runTransaction<StoredPreset[]>(db, 'presets', 'readonly', (store) => store.getAll());
}

export async function deletePreset(id: string): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'presets', 'readwrite', (store) => store.delete(id));
}
