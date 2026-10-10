/**
 * Long-division engine.
 * Generates every intermediate step AND the exact grid position of every digit,
 * so the player never hard-codes an example. Works for any positive whole numbers.
 *
 * Grid convention (columns are dividend digit indexes, row -1 is the quotient row):
 *   row -1 : quotient digits (above the LAST digit of the chunk being divided)
 *   row  0 : dividend digits, divisor sits left of the bracket (negative columns)
 *   row  1 : product (with a minus sign), then a line
 *   row  2 : remainder (+ brought-down digit on the same row), and so on.
 */

export type StepKind = 'intro' | 'take' | 'divide' | 'multiply' | 'subtract' | 'bringdown' | 'remainder' | 'done';
export type CellRole = 'dividend' | 'divisor' | 'quotient' | 'product' | 'minus' | 'remainder' | 'bring' | 'rlabel';

export interface Cell {
  id: string;
  text: string;
  col: number;
  row: number;
  role: CellRole;
  group: string;
  /** index inside its group, used to stagger the animation */
  i: number;
  /** step at which the cell appears */
  step: number;
  /** a brought-down digit flies in from here */
  from?: { row: number; col: number };
  /** step from which the cell is shown faded (a leading 0 after bringing down) */
  dimStep?: number;
  /** dividend digits: step at which the digit is first used */
  usedStep?: number;
  meta?: Record<string, number>;
}

export interface Line { id: string; row: number; fromCol: number; toCol: number; step: number }
export interface Selection { row: number; from: number; to: number }

export interface StepParams {
  n: number;
  d: number;
  cur?: number;
  q?: number;
  prod?: number;
  rem?: number;
  over?: number;
  col?: number;
  place?: number;
  chunkDigits?: number;
  fits?: boolean;
  first?: boolean;
  noMore?: boolean;
  zero?: boolean;
  digit?: number;
  newCur?: number;
  cycle?: number;
  quotient?: number;
  remainder?: number;
}

export interface Step {
  index: number;
  kind: StepKind;
  params: StepParams;
  selection?: Selection;
  cells: string[];
}

export interface Cycle {
  col: number;
  cur: number;
  q: number;
  prod: number;
  rem: number;
  /** row of the product */
  row: number;
}

export interface Solution {
  n: number;
  d: number;
  quotient: number;
  remainder: number;
  digits: string[];
  cells: Cell[];
  lines: Line[];
  steps: Step[];
  cycles: Cycle[];
  /** column where the first chunk ends */
  startCol: number;
  minCol: number;
  maxCol: number;
  maxRow: number;
}

export function solve(n: number, d: number): Solution {
  if (!Number.isInteger(n) || !Number.isInteger(d) || n < 1 || d < 1) {
    throw new RangeError('solve() needs positive whole numbers');
  }
  const digits = String(n).split('');
  const len = digits.length;
  const dLen = String(d).length;
  const cells: Cell[] = [];
  const lines: Line[] = [];
  const steps: Step[] = [];
  const cycles: Cycle[] = [];

  const push = (kind: StepKind, params: StepParams, selection?: Selection): Step => {
    const s: Step = { index: steps.length, kind, params, selection, cells: [] };
    steps.push(s);
    return s;
  };
  const add = (s: Step, c: Omit<Cell, 'step'>): Cell => {
    const cell: Cell = { ...c, step: s.index };
    cells.push(cell);
    s.cells.push(c.id);
    return cell;
  };

  // intro: dividend and divisor
  const intro = push('intro', { n, d });
  const dCells = digits.map((ch, c) =>
    add(intro, { id: `d${c}`, text: ch, col: c, row: 0, role: 'dividend', group: 'dividend', i: c }),
  );
  String(d).split('').forEach((ch, k) =>
    add(intro, { id: `v${k}`, text: ch, col: k - dLen, row: 0, role: 'divisor', group: 'divisor', i: k }),
  );

  // take digits until the chunk is at least the divisor
  let end = 0;
  let cur = 0;
  for (;;) {
    cur = Number(digits.slice(0, end + 1).join(''));
    const fits = cur >= d;
    const last = end === len - 1;
    const s = push(
      'take',
      { n, d, cur, chunkDigits: end + 1, fits, first: end === 0, noMore: !fits && last, col: end },
      { row: 0, from: 0, to: end },
    );
    dCells[end].usedStep = s.index;
    if (fits || last) break;
    end++;
  }
  const startCol = end;

  let col = end;
  let workRow = 0;
  let workFrom = 0;
  let cycle = 0;
  let lastRem = 0;
  let lastRemCells: Cell[] = [];

  for (;;) {
    const q = Math.floor(cur / d);
    const prod = q * d;
    const rem = cur - prod;
    const sel: Selection = { row: workRow, from: workFrom, to: col };

    const sDiv = push(
      'divide',
      { n, d, cur, q, over: (q + 1) * d, col, place: len - 1 - col, zero: q === 0 && cycle > 0, cycle, first: cycle === 0 },
      sel,
    );
    add(sDiv, { id: `q${col}`, text: String(q), col, row: -1, role: 'quotient', group: `q${col}`, i: 0, meta: { cur, q, d, col } });

    const pRow = workRow + 1;
    const pText = String(prod);
    const pLen = pText.length;
    const sMul = push('multiply', { n, d, cur, q, prod, col, cycle });
    pText.split('').forEach((ch, k) =>
      add(sMul, { id: `p${cycle}-${k}`, text: ch, col: col - pLen + 1 + k, row: pRow, role: 'product', group: `p${cycle}`, i: k, meta: { q, d, prod, cur } }),
    );
    add(sMul, { id: `m${cycle}`, text: '−', col: col - pLen, row: pRow, role: 'minus', group: `p${cycle}`, i: 0 });

    const sSub = push('subtract', { n, d, cur, prod, rem, col, cycle });
    lines.push({ id: `l${cycle}`, row: pRow, fromCol: col - pLen, toCol: col, step: sSub.index });
    const rText = String(rem);
    const rLen = rText.length;
    const remRow = pRow + 1;
    lastRemCells = rText.split('').map((ch, k) =>
      add(sSub, { id: `r${cycle}-${k}`, text: ch, col: col - rLen + 1 + k, row: remRow, role: 'remainder', group: `r${cycle}`, i: k, meta: { cur, prod, rem, d } }),
    );
    cycles.push({ col, cur, q, prod, rem, row: pRow });
    lastRem = rem;

    if (col === len - 1) break;

    const digit = Number(digits[col + 1]);
    const newCur = rem * 10 + digit;
    const selFrom = rem === 0 ? col + 1 : col - rLen + 1;
    const sBring = push(
      'bringdown',
      { n, d, rem, digit, newCur, col: col + 1, cycle },
      { row: remRow, from: selFrom, to: col + 1 },
    );
    add(sBring, { id: `b${col + 1}`, text: String(digit), col: col + 1, row: remRow, role: 'bring', group: `b${col + 1}`, i: 0, from: { row: 0, col: col + 1 }, meta: { digit, newCur } });
    dCells[col + 1].usedStep = sBring.index;
    if (rem === 0) lastRemCells.forEach((c) => { c.dimStep = sBring.index; });

    cur = newCur;
    workRow = remRow;
    workFrom = selFrom;
    col++;
    cycle++;
  }

  const quotient = Math.floor(n / d);
  const remainder = lastRem;

  if (remainder > 0) {
    const rs = push('remainder', { n, d, rem: remainder, cur, prod: cur - remainder }, {
      row: lastRemCells[0].row, from: lastRemCells[0].col, to: lastRemCells[lastRemCells.length - 1].col,
    });
    add(rs, { id: 'R', text: 'R', col: len, row: -1, role: 'rlabel', group: 'rlabel', i: 0, meta: { rem: remainder } });
    String(remainder).split('').forEach((ch, k) =>
      add(rs, { id: `R${k}`, text: ch, col: len + 1 + k, row: -1, role: 'rlabel', group: 'rlabel', i: k + 1, meta: { rem: remainder } }),
    );
  }
  push('done', { n, d, quotient, remainder });

  const minCol = -Math.max(dLen, 1);
  let maxCol = len - 1;
  let maxRow = 0;
  for (const c of cells) {
    if (c.col > maxCol) maxCol = c.col;
    if (c.row > maxRow) maxRow = c.row;
  }

  return { n, d, quotient, remainder, digits, cells, lines, steps, cycles, startCol, minCol, maxCol, maxRow };
}

/** Independent checks used by the tests (and handy for a dev panel). Returns problems found. */
export function verifySolution(sol: Solution): string[] {
  const bad: string[] = [];
  const { n, d } = sol;
  if (sol.quotient * d + sol.remainder !== n) bad.push('q*d+r != n');
  if (sol.remainder >= d) bad.push('remainder not smaller than divisor');
  if (sol.quotient !== Math.floor(n / d)) bad.push('wrong quotient');

  const qCells = sol.cells.filter((c) => c.role === 'quotient').sort((a, b) => a.col - b.col);
  const qText = qCells.map((c) => c.text).join('');
  if (qText.replace(/^0+(?=\d)/, '') !== String(sol.quotient)) bad.push(`quotient digits ${qText} != ${sol.quotient}`);
  if (qCells.length !== sol.digits.length - sol.startCol) bad.push('a quotient digit was skipped');
  qCells.forEach((c, k) => { if (c.col !== sol.startCol + k) bad.push('quotient digit in wrong column'); });

  sol.cycles.forEach((cy, k) => {
    const prodCells = sol.cells.filter((c) => c.group === `p${k}` && c.role === 'product').sort((a, b) => a.col - b.col);
    if (prodCells.map((c) => c.text).join('') !== String(cy.prod)) bad.push('product text mismatch');
    if (prodCells[prodCells.length - 1].col !== cy.col) bad.push('product not right-aligned to its column');
    if (cy.cur - cy.prod !== cy.rem || cy.rem < 0) bad.push('bad subtraction');
    if (cy.rem >= d) bad.push('cycle remainder >= divisor');
    const remCells = sol.cells.filter((c) => c.group === `r${k}`).sort((a, b) => a.col - b.col);
    if (remCells[remCells.length - 1].col !== cy.col) bad.push('remainder not right-aligned');
    if (remCells.map((c) => c.text).join('') !== String(cy.rem)) bad.push('remainder text mismatch');
    if (k > 0) {
      const prev = sol.cycles[k - 1];
      const bring = sol.cells.find((c) => c.id === `b${cy.col}`);
      if (!bring || bring.text !== sol.digits[cy.col]) bad.push('wrong brought-down digit');
      if (prev.rem * 10 + Number(sol.digits[cy.col]) !== cy.cur) bad.push('bring-down number mismatch');
    }
  });
  return bad;
}

/** Place-value index (0 = ones) of a column. */
export const placeOf = (sol: Solution, col: number) => sol.digits.length - 1 - col;

/** What each digit/number of a prompt list means: used by the guided solver. */
export type PromptKind = 'take' | 'divide' | 'place' | 'multiply' | 'subtract' | 'bring' | 'remainder' | 'final';
export interface Prompt {
  kind: PromptKind;
  /** engine step to reveal once the student answers correctly */
  reveal: number;
  answer: number;
  params: StepParams & { first?: boolean };
}

export function buildPrompts(sol: Solution): Prompt[] {
  const out: Prompt[] = [];
  const takes = sol.steps.filter((s) => s.kind === 'take');
  const lastTake = takes[takes.length - 1];
  out.push({ kind: 'take', reveal: lastTake.index, answer: lastTake.params.cur!, params: { ...lastTake.params, first: true } });
  for (const s of sol.steps) {
    const p = s.params;
    if (s.kind === 'divide') {
      out.push({ kind: 'divide', reveal: s.index - 1, answer: p.q!, params: p });
      out.push({ kind: 'place', reveal: s.index, answer: p.col!, params: p });
    } else if (s.kind === 'multiply') out.push({ kind: 'multiply', reveal: s.index, answer: p.prod!, params: p });
    else if (s.kind === 'subtract') out.push({ kind: 'subtract', reveal: s.index, answer: p.rem!, params: p });
    else if (s.kind === 'bringdown') out.push({ kind: 'bring', reveal: s.index, answer: p.col!, params: p });
    else if (s.kind === 'remainder') out.push({ kind: 'remainder', reveal: s.index, answer: p.rem!, params: p });
    else if (s.kind === 'done') out.push({ kind: 'final', reveal: s.index, answer: p.quotient!, params: p });
  }
  return out;
}
