import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { multNarration } from '../i18n/explain';
import type { Key } from '../i18n/strings';
import { useApp } from '../store';
import { Obj, Stepper } from './Stepper';

const KINDS: Array<[string, Key]> = [
  ['stars', 'objStars'], ['apples', 'objApples'], ['balloons', 'objBalloons'], ['candy', 'objCandy'], ['blocks', 'objBlocks'], ['array', 'objArray'],
];
const PRESETS: Array<[number, number, string]> = [[3, 4, 'stars'], [2, 6, 'apples'], [4, 5, 'balloons'], [5, 3, 'candy'], [6, 4, 'blocks'], [3, 7, 'array']];

interface Props { a?: number; b?: number; kind?: string; compact?: boolean }

/** Builds a × b from groups, one group at a time, then turns repeated addition into multiplication. */
export function MultiplicationVisualizer({ a: a0 = 3, b: b0 = 4, kind: k0 = 'stars', compact = false }: Props) {
  const { t, lang, update } = useApp();
  const [a, setA] = useState(a0);
  const [b, setB] = useState(b0);
  const [kind, setKind] = useState(k0);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);

  const total = a * b;
  const end = a + 2;

  useEffect(() => { setPhase(0); setPlaying(true); }, [a, b, kind]);
  useEffect(() => {
    if (!playing) return;
    if (phase >= end) { setPlaying(false); return; }
    const id = window.setTimeout(() => setPhase((p) => p + 1), phase === 0 ? 400 : 850);
    return () => window.clearTimeout(id);
  }, [playing, phase, end]);
  useEffect(() => {
    if (phase >= end) update((s) => (s.lessons.mult ? s : { ...s, lessons: { ...s.lessons, mult: Date.now() } }));
  }, [phase, end, update]);

  const shown = Math.min(phase, a);
  const addLine = a === 1 ? `${b}` : Array(a).fill(b).join(' + ');
  const groupLabel = lang === 'ar' ? `المجموعة ${shown}` : `Group ${shown}`;

  return (
    <div className={`mv ${compact ? 'compact' : ''}`}>
      <div className="mv-controls">
        <Stepper label={t('groups')} value={a} min={1} max={12} onChange={setA} />
        <span className="math op-mul big-op" aria-hidden="true">×</span>
        <Stepper label={t('perGroup')} value={b} min={1} max={12} onChange={setB} />
        <button type="button" className="btn ghost small" onClick={() => { setA(b); setB(a); }} title={t('swapTip')}>⇄ {t('swap')}</button>
      </div>

      {!compact && (
        <div className="tabs kinds" role="radiogroup" aria-label={t('objects')}>
          {KINDS.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`chip-btn ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              <Obj kind={k} color={2} /> {t(label)}
            </button>
          ))}
        </div>
      )}

      <div className="mv-stage card" aria-live="polite">
        <div className={`groups ${kind === 'array' ? 'is-array' : ''}`} style={kind === 'array' ? { ['--cols' as string]: b } : undefined}>
          <AnimatePresence>
            {Array.from({ length: shown }, (_, g) => (
              <motion.div
                key={g}
                className={`group c${g % 6}`}
                initial={{ opacity: 0, scale: 0.7, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {Array.from({ length: b }, (_, i) => (
                  <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 15 }}>
                    <Obj kind={kind} color={g} />
                  </motion.span>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {shown > 0 && phase <= a && <p className="muted group-label">{groupLabel}</p>}

        <div className="equations math" dir="ltr">
          <AnimatePresence mode="popLayout">
            {phase >= a + 1 && (
              <motion.div key="add" className={`eq-add ${phase >= end ? 'faded' : ''}`} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: phase >= end ? 0.55 : 1, y: 0 }}>
                {addLine} = <b>{total}</b>
              </motion.div>
            )}
            {phase >= end && (
              <motion.div key="mul" className="eq-mul" layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
                <span className="mul">{a}</span> × <span className="mul">{b}</span> = <b className="ok">{total}</b>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {phase >= a + 1 && <p className="narration">{multNarration(a, b, lang)}</p>}
      </div>

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={() => { setPlaying(false); setPhase((p) => Math.max(0, p - 1)); }} disabled={phase === 0}>{t('back')}</button>
        <button type="button" className="btn primary" onClick={() => { if (phase >= end) setPhase(0); setPlaying((p) => !p || phase >= end); }}>{playing ? `⏸ ${t('pause')}` : phase >= end ? `↻ ${t('replay')}` : `▶ ${t('play')}`}</button>
        <button type="button" className="btn ghost" onClick={() => { setPlaying(false); setPhase((p) => Math.min(end, p + 1)); }} disabled={phase >= end}>{t('next')}</button>
      </div>

      {!compact && (
        <div className="presets">
          <span className="muted">{t('tryThese')}:</span>
          {PRESETS.map(([x, y, k]) => (
            <button key={`${x}${y}${k}`} type="button" className="chip-btn math" onClick={() => { setA(x); setB(y); setKind(k); }}>{x} × {y}</button>
          ))}
        </div>
      )}
      {!compact && phase >= end && <p className="tip card k-note">{t('swapTip')}</p>}
    </div>
  );
}
