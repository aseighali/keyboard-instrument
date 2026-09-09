interface VolumeControlProps {
  volume: number;
  onChange: (v: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <label className="field volume-control">
      <span>Volume</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
