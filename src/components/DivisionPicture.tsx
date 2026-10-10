import { useApp } from '../store';

/** n dots arranged in groups of d, so students see full groups and the leftover that becomes the remainder. */
export function DivisionPicture({ n, d, highlightLeft }: { n: number; d: number; highlightLeft?: boolean }) {
  const { t } = useApp();
  const full = Math.floor(n / d);
  const left = n % d;
  const dot = (k: number, cls: string) => <span key={k} className={`dot ${cls}`} />;
  return (
    <div className="card picture">
      <h3>{t('pictureIt')}</h3>
      <p className="muted">{t('pictureText')}</p>
      <div className="dot-groups" aria-hidden="true">
        {Array.from({ length: full }, (_, g) => (
          <div className="dot-group" key={g}>{Array.from({ length: d }, (_, k) => dot(k, 'purple'))}</div>
        ))}
        {left > 0 && (
          <div className={`dot-group leftover ${highlightLeft ? 'glow' : ''}`}>{Array.from({ length: left }, (_, k) => dot(k, 'orange'))}</div>
        )}
      </div>
      <p className="picture-sum">
        <b className="math">{full}</b> {t('fullGroups')}
        {left > 0 && <> + <b className="math orange">{left}</b> {t('leftover')}</>}
      </p>
    </div>
  );
}
