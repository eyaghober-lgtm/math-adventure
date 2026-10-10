import { describe, expect, it } from 'vitest';
import { buildPrompts, solve, verifySolution } from './longDivision';

const cellText = (sol: ReturnType<typeof solve>, group: string) =>
  sol.cells.filter((c) => c.group === group).sort((a, b) => a.col - b.col).map((c) => c.text).join('');

describe('long division engine: lesson examples', () => {
  const examples: Array<[number, number, number, number]> = [
    [84, 4, 21, 0],
    [156, 3, 52, 0],
    [17, 5, 3, 2],
    [125, 4, 31, 1],
    [408, 4, 102, 0],
    [144, 12, 12, 0],
    [24, 2, 12, 0], [48, 4, 12, 0], [63, 3, 21, 0],
    [96, 4, 24, 0], [248, 4, 62, 0], [735, 5, 147, 0],
  ];
  for (const [n, d, q, r] of examples) {
    it(`${n} ÷ ${d} = ${q} r ${r}`, () => {
      const sol = solve(n, d);
      expect(sol.quotient).toBe(q);
      expect(sol.remainder).toBe(r);
      expect(verifySolution(sol)).toEqual([]);
    });
  }

  it('156 ÷ 3 takes TWO digits and writes 5 above the 5 (tens position)', () => {
    const sol = solve(156, 3);
    const takes = sol.steps.filter((s) => s.kind === 'take');
    expect(takes.length).toBe(2);
    expect(takes[0].params.fits).toBe(false);
    expect(takes[1].params.cur).toBe(15);
    const q = sol.cells.filter((c) => c.role === 'quotient').sort((a, b) => a.col - b.col);
    expect(q.map((c) => [c.text, c.col])).toEqual([['5', 1], ['2', 2]]);
  });

  it('408 ÷ 4 keeps the zero in the tens position', () => {
    const sol = solve(408, 4);
    const q = sol.cells.filter((c) => c.role === 'quotient').sort((a, b) => a.col - b.col);
    expect(q.map((c) => [c.text, c.col])).toEqual([['1', 0], ['0', 1], ['2', 2]]);
    expect(sol.steps.some((s) => s.kind === 'divide' && s.params.zero)).toBe(true);
  });

  it('17 ÷ 5 shows the remainder step and R label', () => {
    const sol = solve(17, 5);
    expect(sol.steps.map((s) => s.kind)).toEqual(['intro', 'take', 'take', 'divide', 'multiply', 'subtract', 'remainder', 'done']);
    expect(cellText(sol, 'rlabel')).toBe('R2');
  });

  it('144 ÷ 12: two-digit divisor aligns product under the first two digits', () => {
    const sol = solve(144, 12);
    const p0 = sol.cells.filter((c) => c.group === 'p0' && c.role === 'product').sort((a, b) => a.col - b.col);
    expect(p0.map((c) => c.col)).toEqual([0, 1]);
    expect(sol.quotient).toBe(12);
  });

  it('n smaller than d gives quotient 0 and remainder n', () => {
    const sol = solve(7, 12);
    expect(sol.quotient).toBe(0);
    expect(sol.remainder).toBe(7);
    expect(verifySolution(sol)).toEqual([]);
  });

  it('rejects invalid input', () => {
    expect(() => solve(0, 3)).toThrow();
    expect(() => solve(10, 0)).toThrow();
    expect(() => solve(1.5, 2)).toThrow();
  });
});

describe('long division engine: exhaustive checks', () => {
  it('is correct for many dividends and divisors', () => {
    for (let d = 1; d <= 99; d += d < 20 ? 1 : 7) {
      for (let n = 1; n <= 20000; n += n < 400 ? 1 : 137) {
        const sol = solve(n, d);
        const problems = verifySolution(sol);
        if (problems.length) throw new Error(`${n} / ${d}: ${problems.join(', ')}`);
      }
    }
  });

  it('builds a prompt list ending with the final answer', () => {
    const prompts = buildPrompts(solve(125, 4));
    expect(prompts[0].kind).toBe('take');
    expect(prompts[0].answer).toBe(12);
    expect(prompts[prompts.length - 1]).toMatchObject({ kind: 'final', answer: 31 });
    expect(prompts.some((p) => p.kind === 'remainder' && p.answer === 1)).toBe(true);
  });
});
