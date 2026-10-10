import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPrompts, solve } from '../lib/longDivision';
import { confetti } from '../lib/confetti';
import { promptText } from '../i18n/explain';
import { useApp } from '../store';
import { AnimatedDivisionStep, LayoutSwitch } from './AnimatedDivisionStep';
import { PracticeQuestion, type Status } from './PracticeQuestion';
import { DmsbrChips } from './LongDivisionEngine';

interface Props {
  n: number;
  d: number;
  /** begin at this prompt; earlier steps are already drawn on the board */
  startPrompt?: number;
  onSolved?: (info: { attempts: number; clean: boolean }) => void;
}

/**
 * The student answers every intermediate step. The board is drawn from the same engine
 * that powers the lessons, so what the student sees is always mathematically exact.
 */
export function GuidedSolver({ n, d, startPrompt = 0, onSolved }: Props) {
  const { t, lang, layout } = useApp();
  const sol = useMemo(() => solve(n, d), [n, d]);
  const prompts = useMemo(() => buildPrompts(sol), [sol]);
  const [pi, setPi] = useState(startPrompt);
  const [board, setBoard] = useState(startPrompt > 0 ? prompts[startPrompt - 1].reveal : 0);
  const [status, setStatus] = useState<Status>('idle');
  const [hintLevel, setHintLevel] = useState(0);
  const [tries, setTries] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [wrongCol, setWrongCol] = useState<number | null>(null);
  const solved = pi >= prompts.length;
  const fired = useRef(false);

  useEffect(() => {
    setPi(startPrompt); setBoard(startPrompt > 0 ? prompts[startPrompt - 1].reveal : 0);
    setStatus('idle'); setHintLevel(0); setTries(0); setTotalWrong(0); setWrongCol(null); fired.current = false;
  }, [sol, prompts, startPrompt]);

  useEffect(() => {
    if (solved && !fired.current) {
      fired.current = true;
      confetti();
      onSolved?.({ attempts: totalWrong, clean: totalWrong === 0 });
    }
  }, [solved, totalWrong, onSolved]);

  const prompt = prompts[Math.min(pi, prompts.length - 1)];
  const text = promptText(prompt, sol, lang, layout === 'school');
  const hint = hintLevel === 0 ? null : hintLevel === 1 ? text.hint1 : text.hint2;

  const advance = () => {
    setBoard(prompt.reveal);
    setStatus('right'); setHintLevel(0); setTries(0); setWrongCol(null);
    setPi(pi + 1);
  };
  const answer = (v: number) => {
    if (v === prompt.answer) advance();
    else {
      setStatus('wrong');
      setTries((x) => x + 1);
      setTotalWrong((x) => x + 1);
      setHintLevel((h) => Math.min(2, h + 1));
    }
  };
  const pick = (col: number) => {
    if (prompt.kind !== 'place' && prompt.kind !== 'bring') return;
    if (col === prompt.answer) advance();
    else { setWrongCol(col); setStatus('wrong'); setTries((x) => x + 1); setTotalWrong((x) => x + 1); setHintLevel((h) => Math.min(2, h + 1)); window.setTimeout(() => setWrongCol(null), 700); }
  };
  const isPick = prompt.kind === 'place' || prompt.kind === 'bring';
  const doneCount = Math.min(pi, prompts.length);

  return (
    <div className="guided">
      <DmsbrChips active={solved ? 'done' : null} />
      <LayoutSwitch />
      <div className="ld-grid">
        <div className="ld-stage card">
          <div className="ld-labels"><span><b className="math">{n} ÷ {d}</b></span></div>
          <AnimatedDivisionStep sol={sol} step={board} pick={!solved && isPick ? pick : null} wrongCol={wrongCol} />
          <div className="mini-progress" role="progressbar" aria-valuemin={0} aria-valuemax={prompts.length} aria-valuenow={doneCount}>
            <span style={{ width: `${(doneCount / prompts.length) * 100}%` }} />
          </div>
        </div>
        <div className="ld-side">
          {solved ? (
            <div className="card k-ok done-card">
              <b>🎉 {t('allSolved')}</b>
              <p className="math big-num">{n} ÷ {d} = {sol.quotient}{sol.remainder ? ` R ${sol.remainder}` : ''}</p>
              <small>{totalWrong === 0 ? '⭐⭐⭐' : totalWrong < 3 ? '⭐⭐' : '⭐'} · {totalWrong} {t('attempts')}</small>
            </div>
          ) : (
            <PracticeQuestion
              ask={text.ask}
              kind={isPick ? 'pick' : 'number'}
              status={status}
              hint={hint}
              attempts={tries}
              qid={`${pi}`}
              onSubmit={answer}
              onHint={() => setHintLevel((h) => Math.min(2, h + 1))}
              onShow={() => { if (isPick) advance(); else { setTotalWrong((x) => x + 1); advance(); } }}
            />
          )}
          {startPrompt > 0 && pi === startPrompt && !solved && <p className="muted">{t('continueFrom')}</p>}
        </div>
      </div>
    </div>
  );
}
