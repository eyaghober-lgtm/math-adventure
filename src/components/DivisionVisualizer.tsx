import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { M } from '../i18n/strings';
import { Rich, useApp } from '../store';
import { Obj, Stepper } from './Stepper';

const PRESETS: Array<[number, number, string]> = [[12, 3, 'candy'], [15, 5, 'apples'], [20, 4, 'balloons'], [17, 5, 'apples'], [18, 6, 'blocks']];

/** Items move one by one into the baskets. Items that cannot make another equal share stay behind as the remainder. */
export function DivisionVisualizer() {
  const { t, update } = useApp();
  const [total, setTotal] = useState(12);
  const [baskets, setBaskets] = useState(3);
  const [kind, setKind] = useState('candy');
  const [placed, setPlaced] = useState(0);
  const [running, setRunning] = useState(false);

  const per = Math.floor(total / baskets);
  const rem = total % baskets;
  const target = per * baskets;
  const finished = placed >= target && target > 0;

  useEffect(() => { setPlaced(0); setRunning(false); }, [total, baskets, kind]);
  useEffect(() => {
    if (!running) return;
    if (placed >= target) { setRunning(false); return; }
    const id = window.setTimeout(() => setPlaced((p) => p + 1), 380);
    return () => window.clearTimeout(id);
  }, [running, placed, target]);
  useEffect(() => {
    if (finished) update((s) => (s.lessons.div ? s : { ...s, lessons: { ...s.lessons, div: Date.now() } }));
  }, [finished, update]);

  const items = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);
  const inBasket = (b: number) => items.filter((i) => i < placed && i % baskets === b);
  const pool = items.filter((i) => i >= placed);

  const item = (i: number, cls = '') => (
    <motion.span key={i} layoutId={`it-${i}`} layout className={`it ${cls}`} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
      <Obj kind={kind} color={i % baskets} />
    </motion.span>
  );

  return (
    <div className="dv">
      <div className="mv-controls">
        <Stepper label={t('total')} value={total} min={1} max={24} onChange={setTotal} tone="purple" />
        <span className="math op-div big-op" aria-hidden="true">÷</span>
        <Stepper label={t('baskets')} value={baskets} min={1} max={8} onChange={setBaskets} tone="purple" />
        <button type="button" className="btn primary" onClick={() => { if (finished) setPlaced(0); setRunning(true); }} disabled={target === 0}>
          {finished ? `↻ ${t('replay')}` : `🧺 ${t('share')}`}
        </button>
      </div>
      <div className="presets">
        <span className="muted">{t('tryThese')}:</span>
        {PRESETS.map(([x, y, k]) => (
          <button key={`${x}${y}${k}`} type="button" className="chip-btn math" onClick={() => { setTotal(x); setBaskets(y); setKind(k); }}>{x} ÷ {y}</button>
        ))}
      </div>

      <div className="card dv-stage">
        <div className={`pool ${finished && rem > 0 ? 'has-left' : ''}`} aria-label={t('total')}>
          {pool.map((i) => item(i, finished && rem > 0 ? 'left' : ''))}
        </div>
        <div className="baskets">
          {Array.from({ length: baskets }, (_, b) => (
            <div key={b} className={`basket c${b % 6}`}>
              <div className="basket-items">{inBasket(b).map((i) => item(i))}</div>
              <div className="basket-body" aria-hidden="true" />
              <span className="basket-n math">{inBasket(b).length}</span>
            </div>
          ))}
        </div>
        <p className="narration">
          {finished
            ? <Rich text={rem === 0 ? `${M(`${total} ÷ ${baskets} = ${per}`)} ${t('eachBasket')}` : `${M(per)} ${t('eachBasket')}, ${M(rem)} ${t('leftover')}`} />
            : t('divIntro')}
        </p>
      </div>

      {finished && (
        <div className="card k-note linkbox">
          <h3>{t('divLinkTitle')}</h3>
          {rem === 0 ? (
            <div className="eqs math" dir="ltr">
              <span className="mul">{baskets} × {per} = {total}</span>
              <span className="mul">{per} × {baskets} = {total}</span>
              <span className="div">{total} ÷ {baskets} = {per}</span>
              <span className="div">{total} ÷ {per} = {baskets}</span>
            </div>
          ) : (
            <div className="eqs math" dir="ltr">
              <span className="div">{total} ÷ {baskets} = {per} R {rem}</span>
              <span className="mul">{baskets} × {per} + {rem} = {total}</span>
            </div>
          )}
          {rem > 0 && <p>{t('divRemTip')}</p>}
        </div>
      )}
    </div>
  );
}
