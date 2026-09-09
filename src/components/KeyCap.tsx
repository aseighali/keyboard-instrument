interface KeyCapProps {
  physicalLabel: string;
  width: number;
  noteLabel: string | null;
  pressed: boolean;
}

export function KeyCap({ physicalLabel, width, noteLabel, pressed }: KeyCapProps) {
  const musical = noteLabel !== null;
  const classes = ['key-cap'];
  if (musical) classes.push('key-cap--musical');
  if (pressed) classes.push('key-cap--pressed');

  return (
    <div className={classes.join(' ')} style={{ flexGrow: width, flexBasis: 0 }}>
      <span className="key-cap__physical">{physicalLabel}</span>
      {musical && <span className="key-cap__note">{noteLabel}</span>}
    </div>
  );
}
