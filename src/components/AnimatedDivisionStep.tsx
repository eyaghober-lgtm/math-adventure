import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Cell, Solution } from '../lib/longDivision';
import { useApp } from '../store';

interface Props {
  sol: Solution;
  step: number;
  onCell?: (c: Cell) => void;
  /** guided mode: dividend digits become tappable answers */
  pick?: ((col: number) => void) | null;
  selectedId?: string | null;
  /** a wrong column the student tapped, shown briefly */
  wrongCol?: number | null;
}

/**
 * Draws the long-division board for a given step. Every digit is absolutely positioned
 * on a column/row grid, so products and remainders are always aligned.
 *
 * Two layouts share the same engine output:
 *  - school:  dividend | divisor on the right, quotient written under the divisor,
 *             subtraction rows under the dividend (the form used in many schools);
 *  - classic: bracket with the quotient above the dividend.
 */
export function AnimatedDivisionStep({ sol, step, onCell, pick, selectedId, wrongCol }: Props) {
  const { layout } = useApp();
  const school = layout === 'school';
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const len = sol.digits.length;
  const dLen = String(sol.d).length;
  const qCount = len - sol.startCol;
  const rightCols = Math.max(dLen, qCount, 2) + 1;

  // column offset (so negative columns are on screen) and total columns
  const off = school ? 1 : -sol.minCol;
  const totalCols = school ? 1 + len + rightCols : sol.maxCol - sol.minCol + 1;
  const cw = Math.max(30, Math.min(66, Math.floor(width / (totalCols + 0.4))));
  const ch = Math.round(cw * 1.12);
  const rowTop = school ? 0 : 1;
  const x = (col: number) => (col + off) * cw;
  const y = (row: number) => (row + rowTop) * ch;
  const bottomRow = school ? sol.maxRow : sol.maxRow + 1;
  const boardW = totalCols * cw;
  const boardH = (school ? Math.max(sol.maxRow, 1) + 1 : sol.maxRow + 2) * ch + 8;

  /** where each cell is drawn in the chosen layout */
  const place = (c: Cell): { col: number; row: number } | null => {
    if (!school) return { col: c.col, row: c.row };
    if (c.role === 'divisor') return { col: len + 1 + c.i, row: 0 };
    if (c.role === 'quotient') return { col: len + 1 + (c.col - sol.startCol), row: 1 };
    if (c.role === 'rlabel') return null;
    return { col: c.col, row: c.row };
  };

  const cur = sol.steps[step];
  const lastSel = useRef(cur.selection ?? null);
  if (cur.selection) lastSel.current = cur.selection;
  const sel = cur.selection ?? lastSel.current;
  const showSel = !!cur.selection && (cur.kind === 'take' || cur.kind === 'divide' || cur.kind === 'bringdown' || cur.kind === 'remainder');

  const visible = sol.cells.filter((c) => c.step <= step);
  const lines = sol.lines.filter((l) => l.step <= step);

  return (
    <div className="ld-wrap" ref={wrap}>
      <div className="ld-board" dir="ltr" style={{ width: boardW, height: boardH, fontSize: cw * 0.7 }} role="img" aria-label={`${sol.n} ÷ ${sol.d}`}>
        {school ? (
          <>
            <div className="ld-vbar" style={{ left: x(len) - 3, top: 0, height: Math.max(bottomRow, 1) * ch + ch }} />
            <div className="ld-hbar" style={{ left: x(len) - 3, top: ch - 3, width: rightCols * cw + 3 }} />
          </>
        ) : (
          <div className="ld-bracket" style={{ left: x(0) - 2, top: y(0), width: len * cw + 6, height: ch }} />
        )}
        {sel && (
          <motion.div
            className="ld-select"
            initial={false}
            animate={{ left: x(sel.from) + 2, top: y(sel.row) + 3, width: (sel.to - sel.from + 1) * cw - 4, height: ch - 6, opacity: showSel ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          />
        )}
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              key={l.id}
              className="ld-line"
              style={{ left: x(l.fromCol) + 4, top: y(l.row) + ch - 5, width: (l.toCol - l.fromCol + 1) * cw - 8, transformOrigin: 'left center' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.35 }}
            />
          ))}
          {visible.map((c) => {
            const pos = place(c);
            if (!pos) return null;
            const dim = c.dimStep !== undefined && step >= c.dimStep;
            const unused = c.role === 'dividend' && (c.usedStep === undefined || step < c.usedStep);
            const fresh = c.step === step && step > 0;
            const tappable = !!onCell || (!!pick && c.role === 'dividend');
            const cls = ['ld-cell', `r-${c.role}`, fresh ? 'fresh' : '', dim ? 'dim' : '', unused ? 'unused' : '', pick && c.role === 'dividend' ? 'pickable' : '', selectedId === c.id ? 'chosen' : '', wrongCol === c.col && c.role === 'dividend' ? 'wrong' : ''].join(' ');
            const initial = c.from
              ? { y: (c.from.row - pos.row) * ch, scale: 1.2, opacity: 1 }
              : c.step === 0 ? false : { scale: 0.3, opacity: 0 };
            return (
              <motion.button
                key={c.id}
                type="button"
                className={cls}
                style={{ left: x(pos.col), top: y(pos.row), width: cw, height: ch }}
                initial={initial}
                animate={{ y: 0, scale: 1, opacity: dim ? 0.3 : 1 }}
                exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.15 } }}
                transition={c.from ? { type: 'spring', stiffness: 140, damping: 16 } : { type: 'spring', stiffness: 300, damping: 20, delay: c.i * 0.09 }}
                onClick={() => {
                  if (pick && c.role === 'dividend') pick(c.col);
                  else onCell?.(c);
                }}
                disabled={!tappable}
                aria-label={c.text}
              >
                {c.text}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function LayoutSwitch() {
  const { layout, setLayout, t } = useApp();
  return (
    <div className="layout-switch" role="group" aria-label={t('layoutLabel')}>
      <span className="muted">{t('layoutLabel')}</span>
      <button type="button" className={layout === 'school' ? 'on' : ''} aria-pressed={layout === 'school'} onClick={() => setLayout('school')}>{t('layoutSchool')}</button>
      <button type="button" className={layout === 'classic' ? 'on' : ''} aria-pressed={layout === 'classic'} onClick={() => setLayout('classic')}>{t('layoutClassic')}</button>
    </div>
  );
}
