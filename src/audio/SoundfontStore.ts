import { openDb, runTransaction } from './idb';

export interface StoredSoundfont {
  id: string;
  name: string;
  blob: Blob;
}

export async function saveSoundfont(soundfont: StoredSoundfont): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'soundfonts', 'readwrite', (store) => store.put(soundfont));
}

export async function listSoundfonts(): Promise<StoredSoundfont[]> {
  const db = await openDb();
  return runTransaction<StoredSoundfont[]>(db, 'soundfonts', 'readonly', (store) => store.getAll());
}

export async function deleteSoundfont(id: string): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'soundfonts', 'readwrite', (store) => store.delete(id));
}
