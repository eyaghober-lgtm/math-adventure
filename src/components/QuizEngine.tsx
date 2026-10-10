import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { confetti } from '../lib/confetti';
import { allPool, choicesFor, pickFacts, poolForTables, shuffle, type Fact } from '../lib/practice';
import { factKey, recordFact } from '../lib/progress';
import { factHint } from '../i18n/explain';
import { parseNum } from '../i18n/strings';
import { Rich, useApp } from '../store';

interface Item extends Fact { retry: boolean; flip: boolean }

interface EngineProps {
  pool: Fact[];
  size: number;
  choice: boolean;
  onExit: () => void;
  /** show the facts-needing-practice list at the end (default true) */
  title?: string;
}

/**
 * Spaced repetition inside one session:
 *  - facts are drawn by weight, so weak and unseen facts come first;
 *  - a missed fact is put back 2 questions later and again ~6 questions later;
 *  - it only counts as learned once it is answered right again.
 */
export function QuizEngine({ pool, size, choice, onExit, title }: EngineProps) {
  const { t, lang, state, update } = useApp();
  const [queue, setQueue] = useState<Item[]>(() =>
    pickFacts(state, pool, size).map((f) => ({ ...f, retry: false, flip: Math.random() < 0.5 })),
  );
  const [val, setVal] = useState('');
  const [feedback, setFeedback] = useState<null | { right: boolean; item: Item }>(null);
  const [firstRight, setFirstRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState<Fact[]>([]);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cur = queue[0];

  const options = useMemo(() => (cur && choice ? choicesFor(cur.a * cur.b) : []), [cur, choice]);

  useEffect(() => { if (!feedback) inputRef.current?.focus({ preventScroll: true }); }, [feedback, cur]);

  const submit = (v: number) => {
    if (!cur || feedback) return;
    const right = v === cur.a * cur.b;
    update((s) => recordFact(s, cur.a, cur.b, right, !cur.retry));
    setFeedback({ right, item: cur });
    if (right) {
      setStreak((x) => x + 1);
      if (!cur.retry) setFirstRight((x) => x + 1);
    } else {
      setStreak(0);
      if (!missed.some((m) => factKey(m.a, m.b) === factKey(cur.a, cur.b))) setMissed((m) => [...m, { a: cur.a, b: cur.b }]);
    }
  };

  const next = () => {
    if (!feedback) return;
    const rest = queue.slice(1);
    if (!feedback.right) {
      const again = { a: cur.a, b: cur.b, retry: true, flip: !cur.flip };
      rest.splice(Math.min(2, rest.length), 0, again);
      if (!cur.retry) rest.splice(Math.min(6, rest.length), 0, { ...again, flip: cur.flip });
    }
    setFeedback(null);
    setVal('');
    setQueue(rest);
    if (rest.length === 0) {
      setFinished(true);
      if (firstRight / size >= 0.8) confetti();
    }
  };

  useEffect(() => {
    if (!feedback?.right) return;
    const id = window.setTimeout(next, 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  if (finished) {
    const acc = Math.round((firstRight / size) * 100);
    return (
      <div className="card quiz-done">
        <h3>{t('sessionDone')}</h3>
        <p className="big-num math">{firstRight} / {size}</p>
        <p>{t('accuracy')}: <b className="math">{acc}%</b> · {t('firstTry')}</p>
        {missed.length > 0 && (
          <>
            <h4>{t('reviewThese')}</h4>
            <div className="fact-chips">
              {missed.map((m) => <span key={factKey(m.a, m.b)} className="chip warn math">{m.a} × {m.b} = {m.a * m.b}</span>)}
            </div>
          </>
        )}
        <div className="btn-row">
          <button className="btn primary" type="button" onClick={() => {
            setQueue(pickFacts(state, pool, size).map((f) => ({ ...f, retry: false, flip: Math.random() < 0.5 })));
            setFinished(false); setFirstRight(0); setMissed([]); setStreak(0);
          }}>{t('again')}</button>
          <button className="btn ghost" type="button" onClick={onExit}>{t('back')}</button>
        </div>
      </div>
    );
  }

  const [x, y] = cur.flip ? [cur.b, cur.a] : [cur.a, cur.b];
  const answered = size - queue.filter((q) => !q.retry).length;

  return (
    <div className="card quiz">
      {title && <h3>{title}</h3>}
      <div className="quiz-top">
        <span>{t('question')} <b className="math">{Math.min(size, answered + 1)} / {size}</b></span>
        <span>🔥 <b className="math">{streak}</b> {t('inARow')}</span>
        <button type="button" className="btn ghost small" onClick={onExit}>✕</button>
      </div>
      <div className="mini-progress"><span style={{ width: `${(answered / size) * 100}%` }} /></div>
      {cur.retry && <p className="retry-tag">↻ {t('retryLater')}</p>}
      <motion.div key={`${queue.length}-${x}-${y}`} className="quiz-q math" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="mul">{x}</span> × <span className="mul">{y}</span> = <span className="q">?</span>
      </motion.div>

      {!feedback && !choice && (
        <form className="pq-form" onSubmit={(e) => { e.preventDefault(); const v = parseNum(val); if (v !== null) submit(v); }}>
          <input ref={inputRef} className="num-in big" inputMode="numeric" autoComplete="off" dir="ltr" value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('typeNumber')} aria-label={t('yourAnswer')} />
          <button className="btn primary" type="submit" disabled={val.trim() === ''}>{t('check')}</button>
        </form>
      )}
      {!feedback && choice && (
        <div className="choices">
          {options.map((o) => <button key={o} type="button" className="choice math" onClick={() => submit(o)}>{o}</button>)}
        </div>
      )}
      {feedback && (
        <div className={`feedback ${feedback.right ? 'good' : 'bad'}`} aria-live="polite">
          {feedback.right ? <b>✓ {t('correct')}</b> : (
            <>
              <b>{t('rightAnswerIs')} <span className="math">{feedback.item.a} × {feedback.item.b} = {feedback.item.a * feedback.item.b}</span></b>
              <p><Rich text={factHint(feedback.item.a, feedback.item.b, lang)} /></p>
              <p className="muted">{t('comeBack')}</p>
              <button className="btn primary" type="button" onClick={next} autoFocus>{t('next')}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PracticeSetup({ onStart }: { onStart: (c: { pool: Fact[]; size: number; choice: boolean }) => void }) {
  const { t, state } = useApp();
  const [smart, setSmart] = useState(true);
  const [tables, setTables] = useState<number[]>([6, 7, 8, 9]);
  const [size, setSize] = useState(10);
  const [choice, setChoice] = useState(false);
  const [msg, setMsg] = useState(false);
  const weak = Object.keys(state.facts).length;

  const start = () => {
    if (!smart && tables.length === 0) { setMsg(true); return; }
    onStart({ pool: smart ? allPool() : poolForTables(tables), size, choice });
  };
  return (
    <div className="card setup">
      <fieldset>
        <legend>{t('scope')}</legend>
        <div className="level-row">
          <button type="button" className={`chip-btn ${smart ? 'on' : ''}`} onClick={() => setSmart(true)}>{t('scopeSmart')}</button>
          <button type="button" className={`chip-btn ${!smart ? 'on' : ''}`} onClick={() => setSmart(false)}>{t('scopeTables')}</button>
        </div>
        {!smart && (
          <div className="num-chips">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-pressed={tables.includes(n)} className={`num-chip math ${tables.includes(n) ? 'on' : ''}`} onClick={() => setTables((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]))}>{n}</button>
            ))}
          </div>
        )}
        {msg && !smart && tables.length === 0 && <p className="err">{t('pickAtLeast')}</p>}
        {smart && weak > 0 && <p className="muted">★ {t('weakFirst')}</p>}
      </fieldset>
      <fieldset>
        <legend>{t('howMany')}</legend>
        <div className="level-row">
          {[10, 20].map((n) => <button key={n} type="button" className={`chip-btn math ${size === n ? 'on' : ''}`} onClick={() => setSize(n)}>{n}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t('answerMode')}</legend>
        <div className="level-row">
          <button type="button" className={`chip-btn ${!choice ? 'on' : ''}`} onClick={() => setChoice(false)}>{t('modeType')}</button>
          <button type="button" className={`chip-btn ${choice ? 'on' : ''}`} onClick={() => setChoice(true)}>{t('modeChoice')}</button>
        </div>
      </fieldset>
      <button className="btn primary big" type="button" onClick={start}>{t('startPractice')}</button>
    </div>
  );
}

export { shuffle };
