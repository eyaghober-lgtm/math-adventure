import { useCallback, useState } from 'react';
import { BANK, randomProblem, type Level } from '../lib/practice';
import { useApp } from '../store';
import { GuidedSolver } from './GuidedSolver';
import { QuizEngine, PracticeSetup } from './QuizEngine';

const LEVELS: Level[] = ['easy', 'medium', 'hard'];
const LEVEL_KEY = { easy: 'levelEasy', medium: 'levelMedium', hard: 'levelHard' } as const;

export function GuidedPractice() {
  const { t, state, update } = useApp();
  const [tab, setTab] = useState<'long' | 'tables'>('long');
  const [level, setLevel] = useState<Level>('easy');
  const [idx, setIdx] = useState(0);
  const [custom, setCustom] = useState<[number, number] | null>(null);

  const [n, d] = custom ?? BANK[level][idx];
  const key = `${n}/${d}`;

  const solved = useCallback((info: { attempts: number; clean: boolean }) => {
    update((s) => {
      const old = s.practice[key];
      return { ...s, practice: { ...s.practice, [key]: { done: true, attempts: (old?.attempts ?? 0) + info.attempts, clean: (old?.clean ?? true) && info.clean } } };
    });
  }, [key, update]);

  return (
    <section className="page">
      <header className="page-head">
        <h2>{t('practiceTitle')}</h2>
        <p>{tab === 'long' ? t('guidedIntro') : t('practiceIntro')}</p>
      </header>
      <div className="tabs two" role="tablist">
        <button role="tab" aria-selected={tab === 'long'} className={`tab ${tab === 'long' ? 'on' : ''}`} onClick={() => setTab('long')} type="button"><span className="tab-top">{t('practiceTabLong')}</span></button>
        <button role="tab" aria-selected={tab === 'tables'} className={`tab blue ${tab === 'tables' ? 'on' : ''}`} onClick={() => setTab('tables')} type="button"><span className="tab-top">{t('practiceTabTables')}</span></button>
      </div>

      {tab === 'tables' && <TablePractice />}

      {tab === 'long' && (
        <>
          <div className="level-row">
            {LEVELS.map((l) => (
              <button key={l} type="button" className={`chip-btn ${level === l && !custom ? 'on' : ''}`} onClick={() => { setLevel(l); setIdx(0); setCustom(null); }}>{t(LEVEL_KEY[l])}</button>
            ))}
          </div>
          <div className="prob-row">
            {BANK[level].map(([a, b], i) => (
              <button key={i} type="button" className={`prob ${!custom && idx === i ? 'on' : ''}`} onClick={() => { setIdx(i); setCustom(null); }}>
                {state.practice[`${a}/${b}`]?.done ? '✓ ' : ''}<span className="math">{a} ÷ {b}</span>
              </button>
            ))}
            <button type="button" className="btn ghost small" onClick={() => setCustom(randomProblem(level))}>🎲 {t('newProblem')}</button>
          </div>
          <GuidedSolver key={key} n={n} d={d} onSolved={solved} />
          <div className="center-row">
            <button className="btn primary" type="button" onClick={() => {
              if (custom) setCustom(randomProblem(level));
              else if (idx < BANK[level].length - 1) setIdx(idx + 1);
              else setCustom(randomProblem(level));
            }}>{t('nextProblem')} →</button>
          </div>
        </>
      )}
    </section>
  );
}

function TablePractice() {
  const [cfg, setCfg] = useState<null | { pool: Array<{ a: number; b: number }>; size: number; choice: boolean }>(null);
  if (!cfg) return <PracticeSetup onStart={setCfg} />;
  return <QuizEngine pool={cfg.pool} size={cfg.size} choice={cfg.choice} onExit={() => setCfg(null)} />;
}
