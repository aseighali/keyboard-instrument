import type { Instrument, SoundfontInstrument, SynthModel } from './instruments';

const ATTACK_SECONDS = 0.012;
const RELEASE_SECONDS = 0.09;

interface Voice {
  stop(): void;
}

/** Karplus-Strong-style plucked/struck string, built from native nodes (delay + damped feedback loop). */
interface StringOptions {
  /** Feedback gain per loop iteration (per period of the note). Closer to 1 = longer ring-out. */
  damping: number;
  /** Lowpass cutoff as a multiple of the fundamental; lower = darker/duller tone. */
  brightness: number;
  /** How long the excitation noise burst is, in seconds - shorter = more percussive attack. */
  pluckSeconds: number;
  /** Fade time applied on note-off (a light damper), in seconds. */
  releaseSeconds: number;
  /** Detune the excitation slightly and sum a second string for a chorused/shimmering unison. */
  unison?: boolean;
}

const STRING_PRESETS: Record<'piano' | 'santoor' | 'guitar', StringOptions> = {
  piano: { damping: 0.9965, brightness: 5, pluckSeconds: 0.004, releaseSeconds: 0.25 },
  santoor: { damping: 0.998, brightness: 9, pluckSeconds: 0.002, releaseSeconds: 0.6, unison: true },
  guitar: { damping: 0.994, brightness: 7, pluckSeconds: 0.003, releaseSeconds: 0.35 },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<string, Voice>();

  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx || !this.master) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return { ctx: this.ctx, master: this.master };
  }

  setVolume(v: number) {
    const { master } = this.ensureContext();
    master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx!.currentTime, 0.01);
  }

  async decodeSample(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const { ctx } = this.ensureContext();
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  /** The shared AudioContext + master output, for building things (like an sf2 sampler) that must share them. */
  getAudioTarget(): { ctx: AudioContext; destination: AudioNode } {
    const { ctx, master } = this.ensureContext();
    return { ctx, destination: master };
  }

  noteOn(keyId: string, frequency: number, instrument: Instrument) {
    const { ctx, master } = this.ensureContext();
    this.stopVoice(keyId);

    if (instrument.kind === 'waveform') {
      this.voices.set(keyId, this.waveformVoice(ctx, master, frequency, instrument.waveform));
    } else if (instrument.kind === 'sample') {
      this.voices.set(keyId, this.sampleVoice(ctx, master, frequency, instrument.buffer, instrument.rootFrequency));
    } else if (instrument.kind === 'soundfont') {
      this.voices.set(keyId, this.soundfontVoice(frequency, instrument.sampler, keyId));
    } else {
      this.voices.set(keyId, this.synthVoice(ctx, master, frequency, instrument.model));
    }
  }

  noteOff(keyId: string) {
    this.stopVoice(keyId);
  }

  private stopVoice(keyId: string) {
    const voice = this.voices.get(keyId);
    if (voice) {
      voice.stop();
      this.voices.delete(keyId);
    }
  }

  allNotesOff() {
    for (const keyId of Array.from(this.voices.keys())) this.stopVoice(keyId);
  }

  // --- sustained voices (envelope holds at 1 until note-off) -------------------------------

  private sustainedEnvelope(ctx: AudioContext, master: GainNode): GainNode {
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(1, ctx.currentTime + ATTACK_SECONDS);
    envelope.connect(master);
    return envelope;
  }

  private releaseSustained(ctx: AudioContext, envelope: GainNode, seconds = RELEASE_SECONDS) {
    const t = ctx.currentTime;
    envelope.gain.cancelScheduledValues(t);
    envelope.gain.setValueAtTime(envelope.gain.value, t);
    envelope.gain.linearRampToValueAtTime(0, t + seconds);
  }

  private waveformVoice(ctx: AudioContext, master: GainNode, frequency: number, waveform: OscillatorType): Voice {
    const envelope = this.sustainedEnvelope(ctx, master);
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = frequency;
    osc.connect(envelope);
    osc.start();
    return {
      stop: () => {
        this.releaseSustained(ctx, envelope);
        osc.stop(ctx.currentTime + RELEASE_SECONDS + 0.02);
        osc.onended = () => envelope.disconnect();
      },
    };
  }

  private sampleVoice(
    ctx: AudioContext,
    master: GainNode,
    frequency: number,
    buffer: AudioBuffer,
    rootFrequency: number,
  ): Voice {
    const envelope = this.sustainedEnvelope(ctx, master);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = frequency / rootFrequency;
    source.connect(envelope);
    source.start();
    return {
      stop: () => {
        this.releaseSustained(ctx, envelope);
        source.stop(ctx.currentTime + RELEASE_SECONDS + 0.02);
        source.onended = () => envelope.disconnect();
      },
    };
  }

  private synthVoice(ctx: AudioContext, master: GainNode, frequency: number, model: SynthModel): Voice {
    switch (model) {
      case 'piano':
        return this.pluckedString(ctx, master, frequency, STRING_PRESETS.piano);
      case 'santoor':
        return this.pluckedString(ctx, master, frequency, STRING_PRESETS.santoor);
      case 'guitar':
        return this.pluckedString(ctx, master, frequency, STRING_PRESETS.guitar);
      case 'epiano':
        return this.fmElectricPiano(ctx, master, frequency);
      case 'organ':
        return this.additiveOrgan(ctx, master, frequency);
      case 'pad':
        return this.detunedPad(ctx, master, frequency);
      case 'bass':
        return this.filteredBass(ctx, master, frequency);
    }
  }

  /** Play through an already-loaded SoundFont2 sampler, hitting the exact frequency via cents detune. */
  private soundfontVoice(frequency: number, sampler: SoundfontInstrument['sampler'], keyId: string): Voice {
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const nearestMidi = Math.round(midi);
    const detuneCents = (midi - nearestMidi) * 100;
    const stop = sampler.start({ note: nearestMidi, detune: detuneCents, velocity: 100, stopId: keyId });
    return { stop: () => stop() };
  }

  /** A short noise burst excites a damped delay-line loop tuned to the note's period. */
  private pluckedString(ctx: AudioContext, master: GainNode, frequency: number, opts: StringOptions): Voice {
    const output = ctx.createGain();
    output.gain.value = 1;
    output.connect(master);

    const strings = opts.unison ? [1, 1.006] : [1];
    const cleanupFns: (() => void)[] = [];

    for (const detune of strings) {
      const stringFrequency = frequency * detune;
      const delay = ctx.createDelay(1);
      delay.delayTime.value = Math.max(0.0004, 1 / stringFrequency);

      const damper = ctx.createBiquadFilter();
      damper.type = 'lowpass';
      damper.frequency.value = Math.min(stringFrequency * opts.brightness, ctx.sampleRate / 2 - 100);

      const feedback = ctx.createGain();
      feedback.gain.value = opts.damping;

      delay.connect(damper);
      damper.connect(feedback);
      feedback.connect(delay);
      delay.connect(output);

      const burstDuration = opts.pluckSeconds;
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * burstDuration));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const burst = ctx.createBufferSource();
      burst.buffer = noiseBuffer;
      burst.connect(delay);
      burst.start();

      cleanupFns.push(() => {
        try {
          feedback.disconnect();
          delay.disconnect();
          damper.disconnect();
          burst.disconnect();
        } catch {
          /* already disconnected */
        }
      });
    }

    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        this.releaseSustained(ctx, output, opts.releaseSeconds);
        const tailMs = (opts.releaseSeconds + 0.05) * 1000;
        setTimeout(() => {
          output.disconnect();
          cleanupFns.forEach((fn) => fn());
        }, tailMs);
      },
    };
  }

  /** 2-operator FM: a sine carrier modulated by a sine at a fixed ratio, with a decaying mod index. */
  private fmElectricPiano(ctx: AudioContext, master: GainNode, frequency: number): Voice {
    const envelope = this.sustainedEnvelope(ctx, master);

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.value = frequency * 14;

    const modGain = ctx.createGain();
    const peakIndex = frequency * 1.6;
    modGain.gain.setValueAtTime(peakIndex, ctx.currentTime);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, peakIndex * 0.05), ctx.currentTime + 0.8);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);

    carrier.start();
    modulator.start();

    return {
      stop: () => {
        this.releaseSustained(ctx, envelope, 0.4);
        const stopAt = ctx.currentTime + 0.45;
        carrier.stop(stopAt);
        modulator.stop(stopAt);
        carrier.onended = () => {
          envelope.disconnect();
          modGain.disconnect();
        };
      },
    };
  }

  /** Drawbar-style additive tone: a handful of harmonics at fixed relative levels. */
  private additiveOrgan(ctx: AudioContext, master: GainNode, frequency: number): Voice {
    const envelope = this.sustainedEnvelope(ctx, master);
    const harmonics = [
      { mult: 1, gain: 0.5 },
      { mult: 2, gain: 0.35 },
      { mult: 3, gain: 0.15 },
      { mult: 4, gain: 0.22 },
      { mult: 6, gain: 0.1 },
    ];
    const oscillators = harmonics.map(({ mult, gain }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(envelope);
      osc.start();
      return osc;
    });
    return {
      stop: () => {
        this.releaseSustained(ctx, envelope, 0.05);
        const stopAt = ctx.currentTime + 0.1;
        oscillators.forEach((osc) => osc.stop(stopAt));
        oscillators[0].onended = () => envelope.disconnect();
      },
    };
  }

  /** A few detuned sawtooths for a slow, chorused strings/pad sound. */
  private detunedPad(ctx: AudioContext, master: GainNode, frequency: number): Voice {
    const attack = 0.35;
    const release = 0.6;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(1, ctx.currentTime + attack);
    envelope.connect(master);

    const detunes = [-7, 0, 7];
    const oscillators = detunes.map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = 0.33;
      osc.connect(g);
      g.connect(envelope);
      osc.start();
      return osc;
    });

    return {
      stop: () => {
        this.releaseSustained(ctx, envelope, release);
        const stopAt = ctx.currentTime + release + 0.05;
        oscillators.forEach((osc) => osc.stop(stopAt));
        oscillators[0].onended = () => envelope.disconnect();
      },
    };
  }

  /** A single low-passed oscillator for a rounder low-end tone. */
  private filteredBass(ctx: AudioContext, master: GainNode, frequency: number): Voice {
    const envelope = this.sustainedEnvelope(ctx, master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(300, frequency * 4);
    filter.Q.value = 1.2;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    osc.connect(filter);
    filter.connect(envelope);
    osc.start();

    return {
      stop: () => {
        this.releaseSustained(ctx, envelope);
        osc.stop(ctx.currentTime + RELEASE_SECONDS + 0.02);
        osc.onended = () => {
          envelope.disconnect();
          filter.disconnect();
        };
      },
    };
  }
}
