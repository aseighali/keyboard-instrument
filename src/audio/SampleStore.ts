import { openDb, runTransaction } from './idb';

export interface StoredSound {
  id: string;
  name: string;
  blob: Blob;
  rootFrequency: number;
}

export async function saveSound(sound: StoredSound): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'sounds', 'readwrite', (store) => store.put(sound));
}

export async function listSounds(): Promise<StoredSound[]> {
  const db = await openDb();
  return runTransaction<StoredSound[]>(db, 'sounds', 'readonly', (store) => store.getAll());
}

export async function deleteSound(id: string): Promise<void> {
  const db = await openDb();
  await runTransaction(db, 'sounds', 'readwrite', (store) => store.delete(id));
}
