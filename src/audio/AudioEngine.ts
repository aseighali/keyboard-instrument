import { Reverb } from 'smplr';
import type { Instrument, SoundfontInstrument } from './instruments';
import type { ReverbParams } from './reverbPresets';

const ATTACK_SECONDS = 0.012;
const RELEASE_SECONDS = 0.09;

type ReverbNode = ReturnType<typeof Reverb>;
type ReverbParamName = Parameters<ReverbNode['getParam']>[0];

interface Voice {
  stop(): void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<string, Voice>();

  /** Reverb runs as a parallel send off `master` - the direct master->destination path is
   *  always present at full level, so `reverbSend`'s gain is effectively a "how much bleeds
   *  into the reverb" mix knob rather than a dry/wet crossfade. */
  private reverb: ReverbNode | null = null;
  private reverbSend: GainNode | null = null;

  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx || !this.master) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);

      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0;
      const reverb = Reverb(ctx);
      master.connect(reverbSend);
      reverbSend.connect(reverb.input);

      this.ctx = ctx;
      this.master = master;
      this.reverb = reverb;
      this.reverbSend = reverbSend;
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

  /** How much signal bleeds into the reverb send, 0-1. Independent of the reverb's own character params. */
  setReverbAmount(amount: number) {
    this.ensureContext();
    this.reverbSend!.gain.setTargetAtTime(Math.max(0, Math.min(1, amount)), this.ctx!.currentTime, 0.05);
  }

  private setReverbParam(name: ReverbParamName, value: number) {
    const param = this.reverb?.getParam(name);
    if (param) param.value = value;
  }

  /** The reverb's character (space size, darkness, pre-delay, ...). Waits for the AudioWorklet to load. */
  async setReverbParams(params: ReverbParams) {
    this.ensureContext();
    await this.reverb!.ready();
    this.setReverbParam('decay', params.decay);
    this.setReverbParam('damping', params.damping);
    this.setReverbParam('bandwidth', params.bandwidth);
    this.setReverbParam('decayDiffusion1', params.decayDiffusion1);
    this.setReverbParam('decayDiffusion2', params.decayDiffusion2);
    this.setReverbParam('inputDiffusion1', params.inputDiffusion1);
    this.setReverbParam('inputDiffusion2', params.inputDiffusion2);
    this.setReverbParam('excursionRate', params.excursionRate);
    this.setReverbParam('excursionDepth', params.excursionDepth);
    this.setReverbParam('preDelay', Math.round(params.preDelaySeconds * this.ctx!.sampleRate));
    // The reverb's own internal blend stays fully wet; `master`'s direct connection to
    // `destination` is what supplies the dry signal, so mixing here would double it up.
    this.setReverbParam('wet', 1);
    this.setReverbParam('dry', 0);
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

  /** `velocity` is 1-127, MIDI-style; 100 is a neutral/full-strength default. */
  noteOn(keyId: string, frequency: number, instrument: Instrument, velocity = 100) {
    const { ctx, master } = this.ensureContext();
    this.stopVoice(keyId);

    if (instrument.kind === 'sample') {
      this.voices.set(
        keyId,
        this.sampleVoice(ctx, master, frequency, instrument.buffer, instrument.rootFrequency, velocity),
      );
    } else {
      this.voices.set(keyId, this.soundfontVoice(frequency, instrument.sampler, keyId, velocity));
    }
  }

  /**
   * "Dorrab" - a Persian ornament: three fast strikes on one pitch, compressed into roughly
   * the space of a single note. The first two are quick and soft, the third stronger. Each
   * strike is its own short one-shot voice (not tied to note-off); holding the key longer than
   * the ornament itself takes has no further effect, same as a plucked/struck note decaying.
   */
  playDorrab(keyId: string, frequency: number, instrument: Instrument, velocity = 100) {
    const { ctx, master } = this.ensureContext();
    this.stopVoice(keyId);

    const strikeGapMs = 55;
    const strikeHoldMs = 70;
    const strikeVelocities = [Math.round(velocity * 0.55), Math.round(velocity * 0.65), velocity];

    const activeStrikes: Voice[] = [];
    const timeoutIds = strikeVelocities.map((strikeVelocity, i) =>
      window.setTimeout(() => {
        const strikeKeyId = `${keyId}-dorrab-${i}`;
        const voice =
          instrument.kind === 'sample'
            ? this.sampleVoice(ctx, master, frequency, instrument.buffer, instrument.rootFrequency, strikeVelocity)
            : this.soundfontVoice(frequency, instrument.sampler, strikeKeyId, strikeVelocity);
        activeStrikes.push(voice);
        window.setTimeout(() => voice.stop(), strikeHoldMs);
      }, i * strikeGapMs),
    );

    this.voices.set(keyId, {
      stop: () => {
        timeoutIds.forEach((id) => window.clearTimeout(id));
        activeStrikes.forEach((voice) => voice.stop());
      },
    });
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

  // --- sustained voices (envelope holds at `peak` until note-off) -------------------------

  private sustainedEnvelope(ctx: AudioContext, master: GainNode, peak = 1): GainNode {
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(peak, ctx.currentTime + ATTACK_SECONDS);
    envelope.connect(master);
    return envelope;
  }

  private releaseSustained(ctx: AudioContext, envelope: GainNode, seconds = RELEASE_SECONDS) {
    const t = ctx.currentTime;
    envelope.gain.cancelScheduledValues(t);
    envelope.gain.setValueAtTime(envelope.gain.value, t);
    envelope.gain.linearRampToValueAtTime(0, t + seconds);
  }

  /**
   * Uploaded samples only ever have one recorded velocity layer, so there's no real timbral
   * change to switch between. To still read as "harder hit = louder and brighter", velocity
   * scales output level (never above the velocity-100 baseline, to avoid clipping) and opens
   * up a lowpass filter - the same trick physical-modeling synths use without real samples.
   */
  private sampleVoice(
    ctx: AudioContext,
    master: GainNode,
    frequency: number,
    buffer: AudioBuffer,
    rootFrequency: number,
    velocity: number,
  ): Voice {
    const levelGain = Math.min(1, velocity / 100);
    const brightness = Math.min(1, Math.max(0, velocity / 127));
    const cutoff = Math.min(1500 + brightness * 18500, ctx.sampleRate / 2 - 100);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const envelope = this.sustainedEnvelope(ctx, master, levelGain);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = frequency / rootFrequency;
    source.connect(filter);
    filter.connect(envelope);
    source.start();
    return {
      stop: () => {
        this.releaseSustained(ctx, envelope);
        source.stop(ctx.currentTime + RELEASE_SECONDS + 0.02);
        source.onended = () => {
          envelope.disconnect();
          filter.disconnect();
        };
      },
    };
  }

  /** Play through an already-loaded smplr sampler, hitting the exact frequency via cents detune. */
  private soundfontVoice(
    frequency: number,
    sampler: SoundfontInstrument['sampler'],
    keyId: string,
    velocity: number,
  ): Voice {
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const nearestMidi = Math.round(midi);
    const detuneCents = (midi - nearestMidi) * 100;
    const stop = sampler.start({ note: nearestMidi, detune: detuneCents, velocity, stopId: keyId });
    return { stop: () => stop() };
  }
}
