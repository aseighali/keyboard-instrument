/**
 * Hand-picked VCSL (Versilian Community Sample Library) paths - same underlying library the
 * bundled `Mallet` percussion set draws from, just for instruments `smplr` doesn't expose a
 * curated list for. Paths are relative to VCSL's SFZ root and are loaded via `Versilian`.
 */

export const CHURCH_ORGAN_PATHS: Record<string, string> = {
  Quiet: "Aerophones/Edge-blown Aerophones/Pipe Organ - Quiet",
  Loud: "Aerophones/Edge-blown Aerophones/Pipe Organ - Loud",
  'Quiet (pedal)': "Aerophones/Edge-blown Aerophones/Pipe Organ - Quiet Pedal",
  'Loud (pedal)': "Aerophones/Edge-blown Aerophones/Pipe Organ - Loud Pedal",
};

export const HARPSICHORD_PATHS: Record<string, string> = {
  Italian: "Chordophones/Zithers/Harpsichord, Italian",
  French: "Chordophones/Zithers/Harpsichord, French",
  "Flemish (4')": "Chordophones/Zithers/Harpsichord, Flemish - 4'",
  "Flemish (8')": "Chordophones/Zithers/Harpsichord, Flemish - 8'",
  'Flemish (full)': "Chordophones/Zithers/Harpsichord, Flemish - Full",
  English: "Chordophones/Zithers/Harpsichord, English - Normal",
  'English (lute stop)': "Chordophones/Zithers/Harpsichord, English - Lute",
  'Unknown maker': "Chordophones/Zithers/Harpsichord, Unk",
};
