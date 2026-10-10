import { useState } from 'react';
import { LD_EXAMPLE_IDS, LEVELS, MASTERED_BOX, TOTAL_FACTS, factKey, initialState, levelOf, lessonsDone, masteredCount, practiceDone, weakFacts, xpOf, type AppState } from '../lib/progress';
import type { Key } from '../i18n/strings';
import { useApp } from '../store';

export type Page = 'home' | 'mult' | 'tables' | 'div' | 'long' | 'practice' | 'games' | 'progress';

export function suggestNext(s: AppState): { text: Key; page: Page } {
  if (!s.lessons.mult) return { text: 'nextMult', page: 'mult' };
  if (masteredCount(s) < 20) return { text: 'nextTables', page: 'practice' };
  if (!s.lessons.div) return { text: 'nextDiv', page: 'div' };
  if (LD_EXAMPLE_IDS.some((id) => !s.lessons[`ld-${id}`])) return { text: 'nextLong', page: 'long' };
  if (practiceDone(s) < 6) return { text: 'nextGuided', page: 'practice' };
  return { text: 'nextGames', page: 'games' };
}

const LEVEL_KEYS: Key[] = ['lvl1', 'lvl2', 'lvl3', 'lvl4', 'lvl5'];

export function LevelBadge() {
  const { t, state } = useApp();
  const { level } = levelOf(xpOf(state));
  return <span className="level-badge" title={t('level')}>★ {t(LEVEL_KEYS[level])}</span>;
}

export function ProgressDashboard({ go }: { go: (p: Page) => void }) {
  const { t, state, update } = useApp();
  const [sure, setSure] = useState(false);
  const mastered = masteredCount(state);
  const weak = weakFacts(state);
  const xp = xpOf(state);
  const { level, next } = levelOf(xp);
  const divLessons = LD_EXAMPLE_IDS.filter((id) => state.lessons[`ld-${id}`]).length + (state.lessons.div ? 1 : 0);
  const acc = state.quiz.asked ? Math.round((state.quiz.right / state.quiz.asked) * 100) : 0;
  const nx = suggestNext(state);
  const prevTh = LEVELS[level];
  const pct = next ? Math.round(((xp - prevTh) / (next - prevTh)) * 100) : 100;

  return (
    <section className="page">
      <header className="page-head"><h2>{t('progTitle')}</h2><p>{t('progIntro')}</p></header>

      <div className="stat-grid">
        <div className="stat blue"><b className="math">{mastered}</b><span>{t('factsMastered')}</span><small className="math">{mastered} / {TOTAL_FACTS}</small></div>
        <div className="stat orange"><b className="math">{weak.length}</b><span>{t('needPractice')}</span></div>
        <div className="stat purple"><b className="math">{divLessons} / 7</b><span>{t('lessonsDone')}</span></div>
        <div className="stat green"><b className="math">{state.quiz.asked ? `${acc}%` : '—'}</b><span>{t('quizAccuracy')}</span><small className="math">{state.quiz.right} / {state.quiz.asked}</small></div>
      </div>

      <div className="card level-card">
        <div>
          <p className="muted">{t('level')} <b className="math">{level + 1}</b></p>
          <h3>★ {t(LEVEL_KEYS[level])}</h3>
          <p className="muted"><b className="math">{xp}</b> {t('xp')}{next ? <> · <b className="math">{next - xp}</b> {t('toNext')}</> : null}</p>
        </div>
        <div className="mini-progress big" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="card k-note next-card">
        <b>{t('nextLesson')}</b>
        <p>{t(nx.text)}</p>
        <button className="btn primary" type="button" onClick={() => go(nx.page)}>{t('toLesson')} →</button>
      </div>

      <div className="card">
        <h3>{t('heatmap')}</h3>
        <div className="heat" dir="ltr" role="img" aria-label={t('heatmap')}>
          {Array.from({ length: 12 }, (_, r) => Array.from({ length: 12 }, (_, c) => {
            const f = state.facts[factKey(r + 1, c + 1)];
            const cls = !f ? 'h0' : f.box >= MASTERED_BOX ? 'h3' : f.box >= 1 ? 'h2' : 'h1';
            return <span key={`${r}-${c}`} className={`heat-cell ${cls}`} title={`${r + 1} × ${c + 1}`}>{(r + 1) * (c + 1)}</span>;
          }))}
        </div>
        <p className="muted legend">{t('heatLegend')}</p>
        <h4>{t('needPractice')}</h4>
        {weak.length === 0 ? <p className="muted">{t('noWeak')}</p> : (
          <div className="fact-chips">
            {weak.slice(0, 16).map((k) => { const [a, b] = k.split('x').map(Number); return <span key={k} className="chip warn math">{a} × {b} = {a * b}</span>; })}
          </div>
        )}
      </div>

      <div className="center-row">
        <button type="button" className="btn ghost small" onClick={() => { if (sure) { update(() => ({ ...initialState(), lang: state.lang })); setSure(false); } else setSure(true); }}>
          {sure ? t('resetSure') : t('resetAll')}
        </button>
      </div>
      <span hidden>{lessonsDone(state)}</span>
    </section>
  );
}
