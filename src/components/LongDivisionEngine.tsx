import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { solve, type Cell, type StepKind } from '../lib/longDivision';
import { explainCell, explainStep } from '../i18n/explain';
import { M, type Key } from '../i18n/strings';
import { Rich, useApp } from '../store';
import { AnimatedDivisionStep, LayoutSwitch } from './AnimatedDivisionStep';
import { DivisionPicture } from './DivisionPicture';

const SPEEDS = [0.5, 1, 1.5, 2];
const KIND_CLASS: Record<StepKind, string> = {
  intro: 'k-note', take: 'k-note', divide: 'k-div', multiply: 'k-mul', subtract: 'k-sub', bringdown: 'k-bring', remainder: 'k-sub', done: 'k-ok',
};
const KIND_LABEL: Record<StepKind, Key> = {
  intro: 'cStart', take: 'cTake', divide: 'cDivide', multiply: 'cMultiply', subtract: 'cSubtract', bringdown: 'cBring', remainder: 'cRemainder', done: 'cDone',
};

export function DmsbrChips({ active }: { active: StepKind | null }) {
  const { t, lang } = useApp();
  const arrow = lang === 'ar' ? '←' : '→';
  const items: Array<[Key, string, boolean]> = [
    ['cDivide', 'k-div', active === 'divide'],
    ['cMultiply', 'k-mul', active === 'multiply'],
    ['cSubtract', 'k-sub', active === 'subtract' || active === 'remainder'],
    ['cBring', 'k-bring', active === 'bringdown'],
    ['cRepeat', 'k-rep', active === 'bringdown'],
  ];
  return (
    <ol className="dmsbr" aria-label="DMSBR">
      {items.map(([k, cls, on], i) => (
        <li key={k} className={`chip ${cls} ${on ? 'on' : ''}`}>
          <span className="chip-n">{['D', 'M', 'S', 'B', 'R'][i]}</span>
          {t(k)}
          {i < items.length - 1 && <span className="chip-arrow" aria-hidden="true">{arrow}</span>}
        </li>
      ))}
    </ol>
  );
}

interface Props {
  n: number;
  d: number;
  onComplete?: () => void;
  showPicture?: boolean;
}

export function LongDivisionEngine({ n, d, onComplete, showPicture = true }: Props) {
  const { t, lang, layout } = useApp();
  const school = layout === 'school';
  const sol = useMemo(() => solve(n, d), [n, d]);
  const last = sol.steps.length - 1;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [inspect, setInspect] = useState<Cell | null>(null);
  const doneFired = useRef(false);

  useEffect(() => { setStep(0); setPlaying(false); setInspect(null); doneFired.current = false; }, [n, d]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      if (step < last) setStep(step + 1);
      else setPlaying(false);
    }, 2600 / speed);
    return () => window.clearTimeout(id);
  }, [playing, step, speed, last]);

  useEffect(() => {
    if (step === last && !doneFired.current) { doneFired.current = true; onComplete?.(); }
  }, [step, last, onComplete]);

  const cur = sol.steps[step];
  const ex = explainStep(cur, sol, lang, school);
  const go = (i: number) => { setPlaying(false); setStep(Math.max(0, Math.min(last, i))); setInspect(null); };
  const togglePlay = () => {
    if (!playing && step >= last) { setStep(0); setInspect(null); }
    setPlaying(!playing);
  };
  const replay = () => { setStep(0); setInspect(null); setPlaying(true); };

  return (
    <div className="ld-player">
      <DmsbrChips active={cur.kind} />
      <LayoutSwitch />

      <div className="ld-grid">
        <div className="ld-stage card">
          <div className="ld-labels" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <span><b className="math">{n}</b> {t('dividend')}</span>
            <span><b className="math">{d}</b> {t('divisor')}</span>
          </div>
          <AnimatedDivisionStep
            sol={sol}
            step={step}
            selectedId={inspect?.id}
            onCell={(c) => { setPlaying(false); setInspect(c); }}
          />
          <p className="tap-tip">{t('tapDigit')}</p>
        </div>

        <div className="ld-side">
          <motion.div key={step} className={`teacher card ${KIND_CLASS[cur.kind]}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} aria-live="polite">
            <div className="teacher-head">
              <span className={`pill ${KIND_CLASS[cur.kind]}`}>{t(KIND_LABEL[cur.kind])}</span>
              <h3>{ex.title}</h3>
            </div>
            {ex.lines.map((l, i) => <p key={i}><Rich text={l} /></p>)}
            {ex.why && <p className="why"><Rich text={ex.why} /></p>}
          </motion.div>

          {inspect && (
            <div className="inspect card k-note">
              <b>{t('youTapped')} <span className="math">{inspect.text}</span></b>
              <p><Rich text={explainCell(inspect, step, sol, lang, school)} /></p>
            </div>
          )}
        </div>
      </div>

      <div className="controls card" role="group" aria-label="Player">
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={() => go(step - 1)} disabled={step === 0}>{lang === 'ar' ? '▶' : '◀'} {t('back')}</button>
          <button type="button" className="btn primary" onClick={togglePlay} aria-pressed={playing}>{playing ? `⏸ ${t('pause')}` : `▶ ${t('play')}`}</button>
          <button type="button" className="btn ghost" onClick={() => go(step + 1)} disabled={step === last}>{t('next')} {lang === 'ar' ? '◀' : '▶'}</button>
          <button type="button" className="btn ghost" onClick={replay}>↻ {t('replay')}</button>
        </div>
        <div className="ctl-row">
          <label className="step-count">
            {t('step')} <b className="math">{step + 1}</b> {t('of')} <b className="math">{last + 1}</b>
            <input type="range" min={0} max={last} value={step} onChange={(e) => go(Number(e.target.value))} aria-label={t('stepSlider')} />
          </label>
          <label className="speed">
            {t('speed')}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
          </label>
        </div>
      </div>

      {showPicture && n <= 60 && (
        <DivisionPicture n={n} d={d} highlightLeft={cur.kind === 'remainder' || cur.kind === 'done'} />
      )}
      {step === last && (
        <div className="card k-ok done-card">
          <b>{t('lessonDone')}</b>
          <p className="math">{M(sol.remainder ? `${sol.quotient} × ${d} + ${sol.remainder} = ${n}` : `${sol.quotient} × ${d} = ${n}`).slice(1, -1)}</p>
          <small>{t('checkAnswer')}</small>
        </div>
      )}
    </div>
  );
}
