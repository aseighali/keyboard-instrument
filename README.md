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

## Ornaments

- **Dorrab** — hold **Ctrl** while pressing a musical key to play a **dorrab** (دراب) instead of
  a plain note: a Persian ornament, three fast strikes on the same pitch (the first two quick
  and soft, the third stronger), compressed into roughly the space of a single note. Always
  fires at a fixed neutral velocity, ignoring the "Dynamics from typing speed" setting.
  Implemented in `AudioEngine.playDorrab` (`src/audio/AudioEngine.ts`).
- **Pull-off** — an opt-in checkbox (Output panel). While holding a note, pressing and releasing
  another note without releasing the first re-sounds the held note on release, guitar-style:
  lifting a fretting finger off a string reveals the note still fretted underneath. Chains
  correctly through more than two held notes. Implemented in `useKeyboardInput.ts`.

## Tuning systems

- **Chromatic** — standard 12-tone equal temperament.
- **Scale / Mode** — major, natural/harmonic/melodic minor, the modes, pentatonics, blues.
- **Microtonal (N-EDO)** — any equal division of the octave (24 for quarter tones, etc).
- **Iranian Dastgah** — one dropdown covering its 7 **dastgah** (Shur, Mahur, Rast-Panjgah,
  Homayun, Chahargah, Segah, Nava); Shur, the one dastgah with traditionally-named sibling
  modes, groups into an `<optgroup>` offering "Shur itself" plus its 5 named **avaz** (Abu-Ata,
  Bayat-e Tork, Afshari, Dashti, Bayat-e Esfahan) as clearly-nested sub-options, since the other
  6 dastgahs have no traditionally-named avaz. Each entry is a fixed 7-degree equal-tempered
  *approximation* (`src/tuning/dastgah.ts`) — real dastgah/avaz performance uses melodic
  movement (gushe) with intonation that shifts contextually, which a fixed scale can't capture.
- **Custom** — enter your own list of cent offsets from the root; saved scales persist in
  IndexedDB.

## Sounds

Every instrument is a real sampled recording played back client-side (Web Audio API) — nothing
is synthesized from scratch, so quality is bounded by the sample library, not by any DSP model.

### Premium sample libraries (default, best quality)

Dedicated, purpose-built libraries streamed from `smplr`'s hosted sample sets — no upload
needed, works the moment you pick one:

- **Grand Piano** — `SplendidGrandPiano`, i.e. the Salamander Grand Piano (a real Steinway,
  4 velocity layers) repackaged for the web. This is the default instrument on load.
- **Electric Piano** — sampled CP80, Pianet T, Wurlitzer EP200, and TX81Z FM-piano patch.
- **Double Bass** — Smolken, arco/pizzicato/switched.
- **Mallet percussion** — VCSL mallets (marimba, vibraphone, xylophone, ...).
- **Mellotron** — vintage tape samples.

### General MIDI (wider selection, lower quality)

The "Preloaded instrument" picker streams from all 128 General MIDI instruments (Benjamin
Gleitzman's `midi-js-soundfonts`, via `smplr`'s `Soundfont` player) — covers everything the
libraries above don't (guitars, organs, world instruments like dulcimer as a santoor
substitute, ...) but is an older, single-velocity-layer, mp3-compressed sample set, so it
sounds noticeably less real than the libraries above. A "Quality" toggle picks between
`MusyngKite` (better sound, bigger download) and `FluidR3_GM` (smaller, faster).

### Your own sounds

You can upload your own single-note sample (wav/mp3/ogg/etc). Tell it what pitch the sample
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
