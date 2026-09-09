import { CUSTOM_REVERB_RANGES, REVERB_PRESETS, type ReverbParams, type ReverbPresetId } from '../audio/reverbPresets';

interface ReverbControlProps {
  presetId: ReverbPresetId;
  onPresetChange: (id: ReverbPresetId) => void;
  amount: number;
  onAmountChange: (v: number) => void;
  customParams: ReverbParams;
  onCustomParamsChange: (params: ReverbParams) => void;
}

export function ReverbControl({
  presetId,
  onPresetChange,
  amount,
  onAmountChange,
  customParams,
  onCustomParamsChange,
}: ReverbControlProps) {
  function updateCustom(patch: Partial<ReverbParams>) {
    onCustomParamsChange({ ...customParams, ...patch });
  }

  return (
    <div className="reverb-control">
      <label className="field">
        <span>Reverb / space</span>
        <select value={presetId} onChange={(e) => onPresetChange(e.target.value as ReverbPresetId)}>
          {REVERB_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>
      <p className="hint">
        {presetId === 'custom'
          ? 'Dial in your own space below.'
          : (REVERB_PRESETS.find((p) => p.id === presetId)?.description ?? '')}
      </p>

      <label className="field">
        <span>Mix ({Math.round(amount * 100)}%)</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={amount}
          onChange={(e) => onAmountChange(Number(e.target.value))}
        />
      </label>

      {presetId === 'custom' && (
        <>
          <label className="field">
            <span>Size ({Math.round(((customParams.decay - CUSTOM_REVERB_RANGES.decay.min) / (CUSTOM_REVERB_RANGES.decay.max - CUSTOM_REVERB_RANGES.decay.min)) * 100)}%)</span>
            <input
              type="range"
              min={CUSTOM_REVERB_RANGES.decay.min}
              max={CUSTOM_REVERB_RANGES.decay.max}
              step={0.01}
              value={customParams.decay}
              onChange={(e) => updateCustom({ decay: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Darkness ({Math.round(((customParams.damping - CUSTOM_REVERB_RANGES.damping.min) / (CUSTOM_REVERB_RANGES.damping.max - CUSTOM_REVERB_RANGES.damping.min)) * 100)}%)</span>
            <input
              type="range"
              min={CUSTOM_REVERB_RANGES.damping.min}
              max={CUSTOM_REVERB_RANGES.damping.max}
              step={0.01}
              value={customParams.damping}
              onChange={(e) => updateCustom({ damping: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Pre-delay ({Math.round(customParams.preDelaySeconds * 1000)} ms)</span>
            <input
              type="range"
              min={CUSTOM_REVERB_RANGES.preDelaySeconds.min}
              max={CUSTOM_REVERB_RANGES.preDelaySeconds.max}
              step={0.001}
              value={customParams.preDelaySeconds}
              onChange={(e) => updateCustom({ preDelaySeconds: Number(e.target.value) })}
            />
          </label>
        </>
      )}
    </div>
  );
}
