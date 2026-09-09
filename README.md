# Keyboard Instrument

Play your computer keyboard as a musical instrument in the browser. Pure client-side React +
TypeScript app — no backend, no server, no database. Everything (audio synthesis, tuning math,
uploaded-sound playback, persistence) runs in the browser via the Web Audio API and IndexedDB.

## Run it

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173/` URL, click anywhere once (browsers require a user
gesture before audio can play), then start typing.

`npm run build` produces a static `dist/` folder that can be hosted anywhere (or opened locally).

## How the keyboard maps to notes

Within any row, moving right always steps to the next scale degree of whatever tuning is
selected. How the rows relate to *each other* is a "Row layout" setting (in the Tuning panel),
with three modes:

- **Fixed interval per row (guitar-style, isomorphic, default)** — every row starts a fixed
  number of steps above the row below it, so the shape is identical everywhere, like moving to
  an adjacent guitar string and playing the same fret. This is the true isomorphic layout: the
  same finger movement always produces the same interval, anywhere on the keyboard. With the
  default of 3 steps: home row `A S D F` are degrees 1 2 3 4, and `Q` (directly above `A`) is
  degree 4 — same note as `F`. Notes intentionally repeat in different places, same as a real
  guitar. The "steps" number is adjustable to whatever feels right. Works identically for every
  tuning system, 7 degrees or 24+.
- **Black & white keys (real piano shape)** — the actual piano key layout, same convention as
  Ableton's "Musical Typing": home row is the white keys (natural notes) in order, the row above
  is the black keys, offset to sit between two whites, with the two gaps a real piano has (no
  black key between E–F or B–C) — so a few upper-row keys (`Q`, `R`, `I`, ...) are intentionally
  silent, matching a real keyboard. This only has a well-defined meaning for standard 12-tone
  Chromatic tuning (black/white doesn't mean anything for a 7-note scale or a microtonal
  division), so other tuning systems automatically fall back to the continuous layout below.
- **Continuous run (full range)** — the four rows concatenate into one long ascending run with
  no repeated or skipped notes: home row (`A`...`'`) starts on the root, the row below
  (`Z`...`/`) continues downward, and each row above (`Q`...`]`, then `1`...`=`) continues
  upward from wherever the previous row left off. Maximum range, but the shape is different in
  every row — not isomorphic.

Every physical key is shown on screen with its assigned note name; keys with no scale degree
mapped to them render inert. Held keys highlight.

## Tuning systems

- **Chromatic** — standard 12-tone equal temperament.
- **Scale / Mode** — major, natural/harmonic/melodic minor, the modes, pentatonics, blues.
- **Microtonal (N-EDO)** — any equal division of the octave (24 for quarter tones, etc).
- **Iranian Dastgah** — the 7 main dastgahs plus 5 avaz of the Shur family, modeled as
  cents-based 7-degree scales (`src/tuning/dastgah.ts`). This is a simplified equal-tempered
  *approximation* for playability — real dastgah performance uses melodic movement (gushe) with
  intonation that shifts contextually, which a fixed scale can't capture.
- **Custom** — enter your own list of cent offsets from the root; saved scales persist in
  IndexedDB.

## Sounds

All built-in instruments are synthesized in real time in the browser (Web Audio API, no sample
files bundled with the app):

- **Piano, Santoor, Guitar** — a Karplus-Strong style plucked/struck string: a short noise burst
  rings around a damped feedback delay loop tuned to the note's pitch, the same technique real
  physical-modeling synths use for plucked/struck strings. Santoor sums two slightly detuned
  strings per note (mirroring its multi-string courses) for a shimmering unison, and rings
  longer than piano or guitar.
- **Electric Piano** — 2-operator FM synthesis (sine carrier, sine modulator, decaying mod index).
- **Organ** — additive synthesis, a handful of fixed-level harmonics (drawbar-style).
- **Strings Pad** — three detuned sawtooths with a slow attack/release for a chorused pad.
- **Bass** — a low-passed sawtooth.
- **Sine / Triangle / Sawtooth / Square** — plain oscillators, useful as a pure pitch reference.

You can also upload your own single-note sample (wav/mp3/ogg/etc). Tell it what pitch the sample
was recorded at and it's pitch-shifted across the keyboard from there via `playbackRate`.
Uploaded sounds are stored in IndexedDB and persist across reloads in that browser profile.

### SoundFonts (real sampled instruments)

For actual recorded-instrument quality (not synthesized), two options in the Sound panel:

- **Preloaded instrument** — no upload needed. Picks from all 128 General MIDI instruments,
  streamed on first use from a free, public sample library ([Benjamin Gleitzman's
  `midi-js-soundfonts`](https://github.com/gleitz/midi-js-soundfonts), served via `smplr`'s
  built-in `Soundfont` player). Works immediately for every visitor; the browser caches each
  instrument after its first use so it's instant from then on. A "Quality" toggle picks between
  `MusyngKite` (better sound, bigger download) and `FluidR3_GM` (smaller, faster).
- **Upload your own SoundFont (.sf2)** — for a specific file you already have, or full offline
  use with no network dependency at all. Free official downloads: **FluidR3_GM.sf2** from the
  [MuseScore handbook](https://musescore.org/en/handbook/2/soundfonts-and-sfz-files) or
  [Polyphone](https://www.polyphone.io/en/soundfonts/instrument-sets/250-fluidr3-gm), or
  **MuseScore_General.sf2** (bundled with MuseScore, MIT licensed). Once uploaded it's stored in
  IndexedDB, so you pick the file once and then choose any instrument inside it from a dropdown
  from then on — no re-uploading. Playback is entirely client-side via
  [`smplr`](https://github.com/danigb/smplr)'s `Soundfont2` sampler.

Both paths use per-note cents detuning so playback stays in tune with whatever tuning system
(including microtonal/dastgah) is active, not just standard notes.

Note: standard GM instrument sets don't include a santoor, but they do include **dulcimer**
(GM program 16 — santoor is a type of hammered dulcimer, so it's a reasonable real-sampled
substitute) and a few other world instruments (sitar, koto, banjo, ...). A dedicated santoor
sample only shows up if you upload an `.sf2` that specifically includes one — otherwise it stays
the synthesized version (see above).

## Project layout

- `src/tuning/` — tuning system data and the isomorphic key-mapping engine
- `src/audio/` — Web Audio playback engine + IndexedDB persistence (sounds, custom scales)
- `src/components/` — the on-screen keyboard and the tuning/instrument/volume controls
- `src/hooks/` — keyboard input capture, audio engine lifecycle
