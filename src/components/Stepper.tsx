export function Stepper({ label, value, min, max, onChange, tone = 'blue' }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; tone?: 'blue' | 'purple' }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div className={`stepper ${tone}`}>
      <span className="stepper-label">{label}</span>
      <div className="stepper-row" dir="ltr">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`${label} −`}>−</button>
        <output className="math" aria-live="polite">{value}</output>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`${label} +`}>+</button>
      </div>
    </div>
  );
}

export function Obj({ kind, color = 0 }: { kind: string; color?: number }) {
  if (kind === 'blocks') return <span className={`block c${color % 6}`} aria-hidden="true" />;
  if (kind === 'array') return <span className={`adot c${color % 6}`} aria-hidden="true" />;
  const em: Record<string, string> = { stars: '⭐', apples: '🍎', balloons: '🎈', candy: '🍬' };
  return <span className="emoji" aria-hidden="true">{em[kind] ?? '⭐'}</span>;
}
