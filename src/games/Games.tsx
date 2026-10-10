import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { confetti } from '../lib/confetti';
import { BANK, choicesFor, randomProblem, rnd, shuffle } from '../lib/practice';
import { buildPrompts, solve } from '../lib/longDivision';
import { factHint } from '../i18n/explain';
import { M, parseNum, type Key } from '../i18n/strings';
import { Rich, useApp } from '../store';
import { recordFact } from '../lib/progress';
import { GuidedSolver } from '../components/GuidedSolver';
import { DivisionPicture } from '../components/DivisionPicture';
import { PracticeQuestion, type Status } from '../components/PracticeQuestion';

type GameId = 'memory' | 'missing' | 'speed' | 'puzzle' | 'detective' | 'complete' | 'adventure';

const GAMES: Array<{ id: GameId; icon: string; title: Key; desc: Key; tone: string }> = [
  { id: 'memory', icon: '🃏', title: 'gMemory', desc: 'gMemoryD', tone: 'blue' },
  { id: 'missing', icon: '❓', title: 'gMissing', desc: 'gMissingD', tone: 'pink' },
  { id: 'speed', icon: '⚡', title: 'gSpeed', desc: 'gSpeedD', tone: 'orange' },
  { id: 'puzzle', icon: '🧩', title: 'gPuzzle', desc: 'gPuzzleD', tone: 'purple' },
  { id: 'detective', icon: '🔍', title: 'gDetective', desc: 'gDetectiveD', tone: 'orange' },
  { id: 'complete', icon: '✍️', title: 'gComplete', desc: 'gCompleteD', tone: 'purple' },
  { id: 'adventure', icon: '🗺️', title: 'gAdventure', desc: 'gAdventureD', tone: 'green' },
];

function useRecord(id: string) {
  const { update, state } = useApp();
  const prev = state.games[id];
  const record = useCallback((score: number) => {
    update((s) => {
      const g = s.games[id] ?? { plays: 0, best: 0, last: 0 };
      return { ...s, games: { ...s.games, [id]: { plays: g.plays + 1, best: Math.max(g.best, score), last: score } } };
    });
  }, [id, update]);
  return { record, last: prev?.last ?? null, plays: prev?.plays ?? 0 };
}

function Improvement({ score, last }: { score: number; last: number | null }) {
  const { t } = useApp();
  const msg = last === null ? t('firstRun') : score > last ? t('moreThanLast') : score === last ? t('sameAsLast') : t('lessThanLast');
  return <p className="improve">{last !== null && <>{t('lastTime')}: <b className="math">{last}</b> → <b className="math">{score}</b><br /></>}{msg}</p>;
}

export function Games() {
  const { t } = useApp();
  const [game, setGame] = useState<GameId | null>(null);
  if (game) {
    const g = GAMES.find((x) => x.id === game)!;
    return (
      <section className="page">
        <header className="page-head row">
          <button type="button" className="btn ghost small" onClick={() => setGame(null)}>← {t('back2')}</button>
          <h2>{g.icon} {t(g.title)}</h2>
        </header>
        {game === 'memory' && <MemoryMatch />}
        {game === 'missing' && <Rounds id="missing" mode="choice" rounds={10} gen={genMissing} />}
        {game === 'speed' && <Speed />}
        {game === 'puzzle' && <DivisionPuzzle />}
        {game === 'detective' && <Detective />}
        {game === 'complete' && <CompleteLD />}
        {game === 'adventure' && <Adventure />}
      </section>
    );
  }
  return (
    <section className="page">
      <header className="page-head"><h2>{t('gamesTitle')}</h2><p>{t('gamesIntro')}</p></header>
      <div className="game-grid">
        {GAMES.map((g) => (
          <button key={g.id} type="button" className={`game-card ${g.tone}`} onClick={() => setGame(g.id)}>
            <span className="game-icon" aria-hidden="true">{g.icon}</span>
            <b>{t(g.title)}</b>
            <span>{t(g.desc)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- question generators ---------------- */
interface Q { ask: string; answer: number; hint: string; fact?: [number, number] }

function genMissing(lang: 'en' | 'ar'): Q {
  const a = rnd(2, 12), b = rnd(2, 12), p = a * b;
  const k = rnd(0, 3);
  const ask = (s: string) => (lang === 'ar' ? `ما العدد المفقود؟  ${M(s)}` : `Find the missing number:  ${M(s)}`);
  const hint = factHint(a, b, lang);
  if (k === 0) return { ask: ask(`${a} × ? = ${p}`), answer: b, hint, fact: [a, b] };
  if (k === 1) return { ask: ask(`? × ${b} = ${p}`), answer: a, hint, fact: [a, b] };
  if (k === 2) return { ask: ask(`${p} ÷ ? = ${b}`), answer: a, hint: lang === 'ar' ? `فكّر بالضرب: ${M(`? × ${b} = ${p}`)}` : `Think multiplication: ${M(`? × ${b} = ${p}`)}`, fact: [a, b] };
  return { ask: ask(`${p} ÷ ${a} = ?`), answer: b, hint: lang === 'ar' ? `فكّر بالضرب: ${M(`${a} × ? = ${p}`)}` : `Think multiplication: ${M(`${a} × ? = ${p}`)}`, fact: [a, b] };
}

function genMult(lang: 'en' | 'ar'): Q {
  const a = rnd(2, 12), b = rnd(2, 12);
  return { ask: `${M(`${a} × ${b} = ?`)}`, answer: a * b, hint: factHint(a, b, lang), fact: [a, b] };
}

/* ---------------- generic rounds (choices or typed) ---------------- */
function Rounds({ id, mode, rounds, gen, seconds }: { id: string; mode: 'choice' | 'type'; rounds: number | null; gen: (l: 'en' | 'ar') => Q; seconds?: number | null }) {
  const { t, lang, update } = useApp();
  const { record, last } = useRecord(id);
  const [q, setQ] = useState<Q>(() => gen(lang));
  const [n, setN] = useState(1);
  const [firstTry, setFirstTry] = useState(0);
  const [tries, setTries] = useState(0);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [bad, setBad] = useState<number[]>([]);
  const [over, setOver] = useState(false);
  const [left, setLeft] = useState(seconds ?? 0);
  const [val, setVal] = useState('');
  const options = useMemo(() => (mode === 'choice' ? choicesFor(q.answer) : []), [q, mode]);

  const finish = useCallback(() => { setOver(true); }, []);
  useEffect(() => {
    if (over) { record(firstTry); if (firstTry >= (rounds ?? 8) * 0.7 || firstTry >= 8) confetti(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);
  useEffect(() => {
    if (!seconds || over) return;
    if (left <= 0) { finish(); return; }
    const idt = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => window.clearTimeout(idt);
  }, [seconds, left, over, finish]);

  const advance = () => {
    if (rounds && n >= rounds) { finish(); return; }
    setN(n + 1); setQ(gen(lang)); setTries(0); setStatus('idle'); setBad([]); setVal('');
  };
  const submit = (v: number) => {
    if (status === 'right') return;
    if (v === q.answer) {
      if (q.fact) update((s) => recordFact(s, q.fact![0], q.fact![1], tries === 0, tries === 0));
      if (tries === 0) { setFirstTry((x) => x + 1); setStreak((x) => x + 1); }
      setStatus('right');
      window.setTimeout(advance, 650);
    } else {
      if (q.fact && tries === 0) update((s) => recordFact(s, q.fact![0], q.fact![1], false));
      setTries((x) => x + 1); setStreak(0); setStatus('wrong'); setBad((b) => [...b, v]);
    }
  };

  if (over) {
    return (
      <div className="card quiz-done">
        <h3>{t('sessionDone')}</h3>
        <p className="big-num math">⭐ {firstTry}{rounds ? ` / ${rounds}` : ''}</p>
        <Improvement score={firstTry} last={last} />
        <div className="btn-row"><button className="btn primary" type="button" onClick={() => { setOver(false); setN(1); setFirstTry(0); setStreak(0); setTries(0); setStatus('idle'); setBad([]); setQ(gen(lang)); setLeft(seconds ?? 0); }}>{t('again')}</button></div>
      </div>
    );
  }
  return (
    <div className="card quiz">
      <div className="quiz-top">
        <span>{rounds ? <>{t('question')} <b className="math">{n} / {rounds}</b></> : <>{t('score')} <b className="math">{firstTry}</b></>}</span>
        <span>🔥 <b className="math">{streak}</b></span>
        {seconds ? <span>⏱ <b className="math">{left}</b></span> : !rounds && <button className="btn ghost small" type="button" onClick={finish}>{t('finish')}</button>}
      </div>
      {rounds && <div className="mini-progress"><span style={{ width: `${((n - 1) / rounds) * 100}%` }} /></div>}
      {mode === 'choice' ? (
        <>
          <p className="quiz-prompt"><Rich text={q.ask} /></p>
          <div className="choices">
            {options.map((o) => <button key={o} type="button" disabled={bad.includes(o) || status === 'right'} className={`choice math ${status === 'right' && o === q.answer ? 'ok' : ''} ${bad.includes(o) ? 'no' : ''}`} onClick={() => submit(o)}>{o}</button>)}
          </div>
          {status === 'wrong' && <p className="hintbox">💡 <Rich text={q.hint} /></p>}
          {status === 'right' && <p className="good"><b>✓ {t('correct')}</b></p>}
        </>
      ) : (
        <PracticeQuestion ask={q.ask} kind="number" status={status} hint={status === 'wrong' ? q.hint : null} attempts={tries} qid={n} onSubmit={submit} onShow={() => { setStatus('idle'); advance(); }}>
          <span hidden>{val}</span>
        </PracticeQuestion>
      )}
      {mode === 'type' && <button type="button" className="btn ghost small" onClick={advance}>{t('next')} →</button>}
    </div>
  );
}

function Speed() {
  const { t } = useApp();
  const [cfg, setCfg] = useState<null | { timer: boolean }>(null);
  const [timer, setTimer] = useState(false);
  if (!cfg) {
    return (
      <div className="card setup">
        <label className="switch"><input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} /> {t('useTimer')}</label>
        {!timer && <p className="muted">{t('noTimer')}</p>}
        <button className="btn primary big" type="button" onClick={() => setCfg({ timer })}>{t('start')}</button>
      </div>
    );
  }
  return <Rounds id={cfg.timer ? 'speed-timed' : 'speed'} mode="type" rounds={cfg.timer ? null : null} seconds={cfg.timer ? 60 : null} gen={genMult} />;
}

/* ---------------- memory match ---------------- */
interface MCard { id: number; pair: number; label: string; kind: 'q' | 'a' }
function buildCards(upTo: number): MCard[] {
  const seen = new Set<number>();
  const facts: Array<[number, number]> = [];
  let guard = 0;
  while (facts.length < 6 && guard++ < 200) {
    const a = rnd(2, upTo), b = rnd(2, upTo);
    if (!seen.has(a * b)) { seen.add(a * b); facts.push([a, b]); }
  }
  const cards: MCard[] = [];
  facts.forEach(([a, b], i) => {
    cards.push({ id: i * 2, pair: i, label: `${a} × ${b}`, kind: 'q' });
    cards.push({ id: i * 2 + 1, pair: i, label: String(a * b), kind: 'a' });
  });
  return shuffle(cards);
}

function MemoryMatch() {
  const { t } = useApp();
  const { record, last } = useRecord('memory');
  const [upTo, setUpTo] = useState(9);
  const [cards, setCards] = useState(() => buildCards(9));
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const finished = done.length === cards.length / 2;
  const fired = useRef(false);

  const reset = (u = upTo) => { setCards(buildCards(u)); setOpen([]); setDone([]); setMoves(0); fired.current = false; };
  useEffect(() => {
    if (finished && !fired.current) { fired.current = true; confetti(); record(Math.max(1, 30 - moves)); }
  }, [finished, moves, record]);

  const flip = (c: MCard) => {
    if (open.length === 2 || open.includes(c.id) || done.includes(c.pair)) return;
    const next = [...open, c.id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [x, y] = next.map((id) => cards.find((k) => k.id === id)!);
      if (x.pair === y.pair) { window.setTimeout(() => { setDone((d) => [...d, x.pair]); setOpen([]); }, 450); }
      else window.setTimeout(() => setOpen([]), 950);
    }
  };

  return (
    <div className="card">
      <div className="quiz-top">
        <span>{t('moves')}: <b className="math">{moves}</b></span>
        <label>{t('upTo')} <select value={upTo} onChange={(e) => { const u = Number(e.target.value); setUpTo(u); reset(u); }}>{[5, 9, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <button type="button" className="btn ghost small" onClick={() => reset()}>↻ {t('replay')}</button>
      </div>
      <div className="mem-grid" dir="ltr">
        {cards.map((c) => {
          const up = open.includes(c.id) || done.includes(c.pair);
          return (
            <motion.button key={c.id} type="button" className={`mem-card ${up ? 'up' : ''} ${done.includes(c.pair) ? 'ok' : ''} ${c.kind}`} onClick={() => flip(c)} animate={{ rotateY: up ? 0 : 180 }} transition={{ duration: 0.3 }} aria-label={up ? c.label : '?'}>
              <span className="mem-face math" style={{ transform: up ? 'none' : 'scaleX(-1)' }}>{up ? c.label : '?'}</span>
            </motion.button>
          );
        })}
      </div>
      {finished && <div className="card k-ok done-card"><b>🎉 {t('allSolved')}</b><Improvement score={Math.max(1, 30 - moves)} last={last} /></div>}
    </div>
  );
}

/* ---------------- division puzzle ---------------- */
function DivisionPuzzle() {
  const { t } = useApp();
  const { record, last } = useRecord('puzzle');
  const make = () => { let a = rnd(2, 9), b = rnd(2, 9); return { a, b, p: a * b, tiles: shuffle([a * b, a, b]) }; };
  const [round, setRound] = useState(1);
  const [pz, setPz] = useState(make);
  const [slots, setSlots] = useState<Array<number | null>>([null, null, null]);
  const [msg, setMsg] = useState<'' | 'ok' | 'bad'>('');
  const [firstTry, setFirstTry] = useState(0);
  const [mistake, setMistake] = useState(false);
  const [over, setOver] = useState(false);

  const used = slots.filter((s) => s !== null) as number[];
  const tileUsed = (idx: number) => slots.includes(idx);

  const place = (idx: number) => {
    if (msg === 'ok' || tileUsed(idx)) return;
    const k = slots.indexOf(null);
    if (k < 0) return;
    const s = slots.slice(); s[k] = idx; setSlots(s);
    if (s.every((x) => x !== null)) {
      const [x, y, z] = s.map((i) => pz.tiles[i as number]);
      if (y !== 0 && x / y === z && Number.isInteger(x / y)) {
        setMsg('ok');
        if (!mistake) setFirstTry((f) => f + 1);
        window.setTimeout(() => {
          if (round >= 5) { setOver(true); confetti(); }
          else { setRound(round + 1); setPz(make()); setSlots([null, null, null]); setMsg(''); setMistake(false); }
        }, 1100);
      } else {
        setMsg('bad'); setMistake(true);
        window.setTimeout(() => { setSlots([null, null, null]); setMsg(''); }, 1300);
      }
    }
  };
  useEffect(() => { if (over) record(firstTry); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  if (over) return <div className="card quiz-done"><h3>{t('sessionDone')}</h3><p className="big-num math">⭐ {firstTry} / 5</p><Improvement score={firstTry} last={last} /><button className="btn primary" type="button" onClick={() => { setOver(false); setRound(1); setFirstTry(0); setPz(make()); setSlots([null, null, null]); setMistake(false); }}>{t('again')}</button></div>;

  return (
    <div className="card quiz">
      <div className="quiz-top"><span>{t('question')} <b className="math">{round} / 5</b></span></div>
      <p className="muted">{t('buildSentence')}</p>
      <p className="math puzzle-clue" dir="ltr"><span className="mul">{pz.a} × {pz.b} = {pz.p}</span></p>
      <div className="puzzle-eq math" dir="ltr">
        {[0, 1, 2].map((i) => (
          <span key={i} className="puzzle-pair">
            <button type="button" className={`slot ${slots[i] !== null ? 'full' : ''}`} onClick={() => { if (slots[i] !== null && msg !== 'ok') { const s = slots.slice(); s[i] = null; setSlots(s); setMsg(''); } }} aria-label={`slot ${i + 1}`}>{slots[i] !== null ? pz.tiles[slots[i] as number] : ''}</button>
            <span className="op-div">{i === 0 ? '÷' : i === 1 ? '=' : ''}</span>
          </span>
        ))}
      </div>
      <div className="choices" dir="ltr">
        {pz.tiles.map((v, i) => <button key={i} type="button" disabled={tileUsed(i)} className="choice math" onClick={() => place(i)}>{v}</button>)}
      </div>
      <div className="btn-row"><button type="button" className="btn ghost small" onClick={() => { setSlots([null, null, null]); setMsg(''); }}>{t('clear')}</button></div>
      {msg === 'ok' && <p className="good"><b>✓ {t('mathOk')}</b></p>}
      {msg === 'bad' && <p className="bad">{t('mathBad')}</p>}
      <span hidden>{used.length}</span>
    </div>
  );
}

/* ---------------- remainder detective ---------------- */
const STORIES: Array<{ item: [string, string]; group: [string, string]; icon: string }> = [
  { item: ['pencils', 'قلماً'], group: ['packs of', 'علبة تتسع'], icon: '✏️' },
  { item: ['students', 'طالباً'], group: ['cars that hold', 'سيارة تتسع'], icon: '🧑‍🎓' },
  { item: ['apples', 'تفاحة'], group: ['boxes that hold', 'صندوقاً يتسع'], icon: '🍎' },
];

function Detective() {
  const { t, lang } = useApp();
  const { record, last } = useRecord('detective');
  const make = () => { const d = rnd(3, 9), q = rnd(2, 6), r = rnd(1, d - 1); return { d, q, r, n: d * q + r, s: STORIES[rnd(0, 2)] }; };
  const [round, setRound] = useState(1);
  const [c, setC] = useState(make);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [mistake, setMistake] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [over, setOver] = useState(false);

  const story = lang === 'ar'
    ? `لدينا ${M(c.n)} ${c.s.item[1]}. نضعها في ${c.s.group[1]} ${M(c.d)} لكل واحدة. كم مجموعة كاملة نحصل؟ وكم يتبقى؟`
    : `There are ${M(c.n)} ${c.s.item[0]}. We put them into ${c.s.group[0]} ${M(c.d)}. How many full groups do we get, and how many are left over?`;

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'right') return;
    if (parseNum(a1) === c.q && parseNum(a2) === c.r) {
      setState('right');
      if (!mistake) setFirstTry((x) => x + 1);
    } else { setState('wrong'); setMistake(true); }
  };
  const nextCase = () => {
    if (round >= 5) { setOver(true); confetti(); return; }
    setRound(round + 1); setC(make()); setA1(''); setA2(''); setState('idle'); setMistake(false);
  };
  useEffect(() => { if (over) record(firstTry); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  if (over) return <div className="card quiz-done"><h3>{t('sessionDone')}</h3><p className="big-num math">🔍 {firstTry} / 5</p><Improvement score={firstTry} last={last} /><button className="btn primary" type="button" onClick={() => { setOver(false); setRound(1); setFirstTry(0); setC(make()); setA1(''); setA2(''); setState('idle'); }}>{t('again')}</button></div>;

  return (
    <div className="card quiz">
      <div className="quiz-top"><span>🔍 {t('caseNo')} <b className="math">{round} / 5</b></span></div>
      <p className="quiz-prompt"><Rich text={story} /></p>
      <form className="det-form" onSubmit={check}>
        <label>{t('fullGroupsQ')}<input className="num-in" inputMode="numeric" dir="ltr" value={a1} onChange={(e) => setA1(e.target.value)} disabled={state === 'right'} /></label>
        <label>{t('leftoverQ')}<input className="num-in" inputMode="numeric" dir="ltr" value={a2} onChange={(e) => setA2(e.target.value)} disabled={state === 'right'} /></label>
        <button className="btn primary" type="submit" disabled={state === 'right'}>{t('check')}</button>
      </form>
      {state === 'wrong' && (
        <p className="hintbox">💡 <Rich text={lang === 'ar' ? `عدّ بقفزات ${M(c.d)}: ${M(Array.from({ length: c.q + 1 }, (_, i) => c.d * (i + 1)).join(', '))}. توقف قبل أن تتجاوز ${M(c.n)}، ثم احسب ما تبقى.` : `Count by ${M(c.d)}s: ${M(Array.from({ length: c.q + 1 }, (_, i) => c.d * (i + 1)).join(', '))}. Stop before passing ${M(c.n)}, then see what is left.`} /></p>
      )}
      {state === 'right' && (
        <>
          <p className="good"><b>✓ {t('caseSolved')}</b> <span className="math">{c.n} ÷ {c.d} = {c.q} R {c.r}</span></p>
          <DivisionPicture n={c.n} d={c.d} highlightLeft />
          <button className="btn primary" type="button" onClick={nextCase}>{t('next')} →</button>
        </>
      )}
    </div>
  );
}

/* ---------------- complete the long division ---------------- */
function CompleteLD() {
  const { t, update } = useApp();
  const { record } = useRecord('complete');
  const [prob, setProb] = useState<[number, number]>(() => randomProblem(Math.random() < 0.5 ? 'medium' : 'hard'));
  const sol = useMemo(() => solve(prob[0], prob[1]), [prob]);
  const prompts = useMemo(() => buildPrompts(sol), [sol]);
  const start = useMemo(() => {
    const idx = prompts.map((p, i) => (p.kind === 'divide' ? i : -1)).filter((i) => i >= 0);
    return idx.length > 1 ? idx[Math.floor(idx.length / 2)] : idx[0];
  }, [prompts]);
  return (
    <div>
      <GuidedSolver key={`${prob[0]}/${prob[1]}`} n={prob[0]} d={prob[1]} startPrompt={start} onSolved={(info) => { record(info.clean ? 3 : info.attempts < 3 ? 2 : 1); update((s) => s); }} />
      <div className="center-row"><button className="btn primary" type="button" onClick={() => setProb(randomProblem(Math.random() < 0.5 ? 'medium' : 'hard'))}>{t('newProblem')}</button></div>
    </div>
  );
}

/* ---------------- adventure ---------------- */
function SimpleAsk({ q, onDone }: { q: Q; onDone: (clean: boolean) => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  return (
    <PracticeQuestion
      ask={q.ask} kind="number" status={status} hint={hint} attempts={tries} qid={q.ask}
      onSubmit={(v) => {
        if (v === q.answer) { setStatus('right'); window.setTimeout(() => onDone(tries === 0), 600); }
        else { setStatus('wrong'); setTries((x) => x + 1); setHint(q.hint); }
      }}
      onHint={() => setHint(q.hint)}
      onShow={() => onDone(false)}
    />
  );
}

function Adventure() {
  const { t, lang } = useApp();
  const { record } = useRecord('adventure');
  const [stage, setStage] = useState(0);
  const [stars, setStars] = useState(0);
  const [qs, setQs] = useState<Q[]>(() => makeStages('en'));
  const [prob] = useState<[number, number]>(() => BANK.medium[rnd(0, 2)]);
  useEffect(() => { setQs(makeStages(lang)); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const won = stage >= 6;
  const fired = useRef(false);
  useEffect(() => { if (won && !fired.current) { fired.current = true; confetti(); record(stars); } }, [won, stars, record]);

  const adv = (clean: boolean) => { if (clean) setStars((s) => s + 1); setStage((s) => s + 1); };
  return (
    <div className="card">
      <div className="map" dir="ltr">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`node ${i < stage ? 'done' : i === stage ? 'now' : ''}`}>{i < stage ? '✓' : i + 1}</span>
        ))}
        <span className={`node flag ${won ? 'done' : ''}`}>🏁</span>
      </div>
      {won ? (
        <div className="card k-ok done-card">
          <b>🏆 {t('adventureWin')}</b>
          <p className="big-num math">⭐ {stars} / 6</p>
          <button className="btn primary" type="button" onClick={() => { setStage(0); setStars(0); setQs(makeStages(lang)); fired.current = false; }}>{t('again')}</button>
        </div>
      ) : (
        <>
          <h3>{t('stage')} {stage + 1}</h3>
          {stage < 5 ? <SimpleAsk key={`${stage}-${qs[stage].ask}`} q={qs[stage]} onDone={adv} /> : <GuidedSolver key="boss" n={prob[0]} d={prob[1]} onSolved={(i) => window.setTimeout(() => adv(i.clean), 1200)} />}
        </>
      )}
    </div>
  );
}

function makeStages(lang: 'en' | 'ar'): Q[] {
  const a = rnd(6, 9), b = rnd(6, 9);
  const m = genMissing(lang);
  const dA = rnd(3, 9), dB = rnd(3, 9);
  const d = rnd(3, 8), qq = rnd(3, 9), r = rnd(1, d - 1), n = d * qq + r;
  const cur = d * rnd(3, 8) + rnd(0, d - 1);
  return [
    { ask: lang === 'ar' ? `احسب: ${M(`${a} × ${b}`)}` : `Multiply: ${M(`${a} × ${b}`)}`, answer: a * b, hint: factHint(a, b, lang) },
    m,
    { ask: lang === 'ar' ? `اقسم: ${M(`${dA * dB} ÷ ${dA}`)}` : `Divide: ${M(`${dA * dB} ÷ ${dA}`)}`, answer: dB, hint: lang === 'ar' ? `فكّر: ${M(`${dA} × ? = ${dA * dB}`)}` : `Think: ${M(`${dA} × ? = ${dA * dB}`)}` },
    { ask: lang === 'ar' ? `ما الباقي عند قسمة ${M(`${n} ÷ ${d}`)}؟` : `What is the remainder of ${M(`${n} ÷ ${d}`)}?`, answer: r, hint: lang === 'ar' ? `${M(`${d} × ${qq} = ${d * qq}`)}. ثم ${M(`${n} − ${d * qq}`)}.` : `${M(`${d} × ${qq} = ${d * qq}`)}. Then ${M(`${n} − ${d * qq}`)}.` },
    { ask: lang === 'ar' ? `في القسمة الطويلة: كم مرة يتسع ${M(d)} في ${M(cur)}؟` : `In a long division: how many times does ${M(d)} fit into ${M(cur)}?`, answer: Math.floor(cur / d), hint: lang === 'ar' ? `عدّ بقفزات ${M(d)} حتى تقترب من ${M(cur)}.` : `Count by ${M(d)}s until you get close to ${M(cur)}.` },
  ].concat([{ ask: '', answer: 0, hint: '' }]) as Q[];
}
