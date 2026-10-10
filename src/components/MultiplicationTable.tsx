import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { trickFor } from '../i18n/explain';
import { MASTERED_BOX, factKey } from '../lib/progress';
import { poolForTables } from '../lib/practice';
import { useApp } from '../store';
import { QuizEngine } from './QuizEngine';

const TRICKY = new Set(['6x7', '6x8', '6x9', '7x7', '7x8', '7x9', '8x8', '8x9']);
const N = Array.from({ length: 12 }, (_, i) => i + 1);

export function MultiplicationTable() {
  const { t, state } = useApp();
  const [fact, setFact] = useState<{ a: number; b: number } | null>(null);
  const [tbl, setTbl] = useState<number>(7);
  const [hard, setHard] = useState(false);

  return (
    <section className="page">
      <header className="page-head">
        <h2>{t('tablesTitle')}</h2>
        <p>{t('tablesIntro')}</p>
      </header>

      <div className="card table-card">
        <div className="btn-row left">
          <button type="button" className={`chip-btn ${hard ? 'on' : ''}`} aria-pressed={hard} onClick={() => setHard(!hard)}>⚡ {t('hardFacts')}</button>
        </div>
        <div className="mt-scroll">
          <div className="mt" dir="ltr" role="grid" aria-label={t('tablesTitle')}>
            <span className="mt-corner math">×</span>
            {N.map((c) => (
              <button key={`h${c}`} type="button" className={`mt-head ${tbl === c ? 'on' : ''}`} onClick={() => setTbl(c)} aria-label={`${t('tableOf')} ${c}`}>{c}</button>
            ))}
            {N.map((r) => (
              <Row key={r} r={r} tbl={tbl} fact={fact} hard={hard} onPick={(a, b) => { setFact({ a, b }); setTbl(a); }} onHead={() => setTbl(r)} state={state.facts} />
            ))}
          </div>
        </div>
        {fact && (
          <motion.div key={`${fact.a}-${fact.b}`} className="fact-pop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <b>{t('factFamily')}</b>
            <div className="eqs math" dir="ltr">
              <span className="mul">{fact.a} × {fact.b} = {fact.a * fact.b}</span>
              {fact.a !== fact.b && <span className="mul">{fact.b} × {fact.a} = {fact.a * fact.b}</span>}
              <span className="div">{fact.a * fact.b} ÷ {fact.a} = {fact.b}</span>
              {fact.a !== fact.b && <span className="div">{fact.a * fact.b} ÷ {fact.b} = {fact.a}</span>}
            </div>
          </motion.div>
        )}
      </div>

      <TableLesson n={tbl} key={tbl} />
    </section>
  );
}

function Row({ r, tbl, fact, hard, onPick, onHead, state }: { r: number; tbl: number; fact: { a: number; b: number } | null; hard: boolean; onPick: (a: number, b: number) => void; onHead: () => void; state: Record<string, { box: number }> }) {
  return (
    <>
      <button type="button" className={`mt-head ${tbl === r ? 'on' : ''}`} onClick={onHead} aria-label={`${r}`}>{r}</button>
      {N.map((c) => {
        const k = factKey(r, c);
        const mastered = (state[k]?.box ?? 0) >= MASTERED_BOX;
        const cls = ['mt-cell', `hue${(r - 1) % 6}`, r === tbl || c === tbl ? 'in-table' : '', hard && TRICKY.has(k) ? 'tricky' : '', hard && !TRICKY.has(k) ? 'muted-cell' : '', fact && fact.a === r && fact.b === c ? 'sel' : '', mastered ? 'got' : ''].join(' ');
        return <button key={c} type="button" className={cls} onClick={() => onPick(r, c)} aria-label={`${r} × ${c} = ${r * c}`}>{r * c}</button>;
      })}
    </>
  );
}

export function TableLesson({ n }: { n: number }) {
  const { t, lang } = useApp();
  const [hop, setHop] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [k, setK] = useState(7);
  const [quiz, setQuiz] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (hop >= 12) { setPlaying(false); return; }
    const id = window.setTimeout(() => setHop((h) => h + 1), 650);
    return () => window.clearTimeout(id);
  }, [playing, hop]);

  const split = Math.min(5, k);
  return (
    <div className="card lesson">
      <h3>{t('tableOf')} <span className="math op-mul">{n}</span></h3>

      <div className="trick card k-note"><b>💡 {t('trick')}</b><p>{trickFor(n, lang)}</p></div>

      <h4>{t('skipCount')}</h4>
      <p className="muted">{t('skipCountText')} <b className="math">{n}</b></p>
      <div className="skip" dir="ltr">
        {N.map((i) => (
          <div key={i} className={`skip-cell ${hop >= i ? 'on' : ''}`}>
            {hop === i && <motion.span layoutId="hopper" className="hopper" transition={{ type: 'spring', stiffness: 300, damping: 22 }} />}
            <span className="math skip-n">{n * i}</span>
            <span className="skip-i math">{i}×</span>
          </div>
        ))}
      </div>
      <div className="btn-row left">
        <button type="button" className="btn primary small" onClick={() => { if (hop >= 12) setHop(0); setPlaying(!playing); }}>{playing ? `⏸ ${t('pause')}` : hop >= 12 ? `↻ ${t('replay')}` : `▶ ${t('play')}`}</button>
        {hop > 0 && <span className="math big-line" dir="ltr">{hop} × {n} = {hop * n}</span>}
      </div>

      <h4>{t('patternTitle')}</h4>
      <p className="muted">{t('patternText')}</p>
      <div className="pattern" dir="ltr">
        {N.map((i) => {
          const p = n * i;
          const s = String(p);
          const tens = s.length > 1 ? s.slice(0, -1) : '';
          const ones = s.slice(-1);
          return (
            <span key={i} className="pat math">
              <span className="pat-eq">{n}×{i}</span>
              <span className="pat-val"><span className="mul">{tens}</span><span className="pink">{ones}</span></span>
            </span>
          );
        })}
      </div>

      <h4>{t('seeGroups')}</h4>
      <div className="split-ctl" dir="ltr">
        <span className="math">{n} × </span>
        <input type="range" min={1} max={12} value={k} onChange={(e) => setK(Number(e.target.value))} aria-label={t('perGroup')} />
        <b className="math">{k}</b>
      </div>
      <div className="split-array" dir="ltr" style={{ ['--cols' as string]: k }} aria-hidden="true">
        {Array.from({ length: n * k }, (_, i) => (
          <span key={i} className={`sdot ${i % k < split ? 'a' : 'b'}`} />
        ))}
      </div>
      <p className="math center-line" dir="ltr">
        {k > 5 ? (<><span className="mul">{n} × 5 = {n * 5}</span> + <span className="pink">{n} × {k - 5} = {n * (k - 5)}</span> = <b>{n * k}</b></>) : <b>{n} × {k} = {n * k}</b>}
      </p>
      <p className="muted">{t('splitTip')}</p>

      <h4>{t('quickQuiz')}</h4>
      {!quiz ? (
        <button type="button" className="btn primary" onClick={() => setQuiz(true)}>{t('start')}</button>
      ) : (
        <QuizEngine pool={poolForTables([n])} size={6} choice={false} onExit={() => setQuiz(false)} />
      )}
    </div>
  );
}
