import { factKey, type AppState, MASTERED_BOX } from './progress';

export const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
export function shuffle<T>(a: T[]): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

export interface Fact { a: number; b: number }

/** Higher weight = shown sooner. Weak and unseen facts first, mastered facts rarely. */
export function weight(s: AppState, a: number, b: number): number {
  const f = s.facts[factKey(a, b)];
  if (!f) return 3;
  const miss = f.wrong / Math.max(1, f.seen);
  return Math.max(0.2, (5 - f.box) ** 2 / 4 + miss * 6);
}

export function pickFacts(s: AppState, pool: Fact[], n: number): Fact[] {
  const left = pool.slice();
  const out: Fact[] = [];
  while (out.length < n && left.length) {
    const ws = left.map((f) => weight(s, f.a, f.b));
    let r = Math.random() * ws.reduce((x, y) => x + y, 0);
    let idx = 0;
    for (; idx < left.length - 1; idx++) { r -= ws[idx]; if (r <= 0) break; }
    out.push(left.splice(idx, 1)[0]);
  }
  // if the pool is smaller than n, cycle through it again
  while (out.length < n && pool.length) out.push(pool[rnd(0, pool.length - 1)]);
  return out;
}

export const poolForTables = (tables: number[]): Fact[] => {
  const out: Fact[] = [];
  const seen = new Set<string>();
  for (const t of tables) for (let k = 1; k <= 12; k++) {
    const key = factKey(t, k);
    if (!seen.has(key)) { seen.add(key); out.push({ a: t, b: k }); }
  }
  return out;
};

export const allPool = (): Fact[] => poolForTables(Array.from({ length: 12 }, (_, i) => i + 1));

export function choicesFor(answer: number, count = 4): number[] {
  const set = new Set<number>([answer]);
  const near = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + 6, answer - 6];
  for (const c of shuffle(near)) { if (c > 0 && set.size < count) set.add(c); }
  while (set.size < count) set.add(rnd(Math.max(1, answer - 15), answer + 15));
  return shuffle([...set]);
}

export const isMastered = (s: AppState, a: number, b: number) => (s.facts[factKey(a, b)]?.box ?? 0) >= MASTERED_BOX;

/* ---------- long-division problem banks ---------- */
export type Level = 'easy' | 'medium' | 'hard';
export const BANK: Record<Level, Array<[number, number]>> = {
  easy: [[24, 2], [48, 4], [63, 3]],
  medium: [[96, 4], [156, 3], [248, 4]],
  hard: [[125, 4], [408, 4], [735, 5], [144, 12]],
};

export function randomProblem(level: Level): [number, number] {
  if (level === 'easy') { const d = rnd(2, 5); return [d * rnd(10, Math.floor(99 / d)), d]; }
  if (level === 'medium') { const d = rnd(2, 6); return [d * rnd(Math.ceil(100 / d), Math.floor(399 / d)), d]; }
  const kind = rnd(0, 2);
  if (kind === 0) { const d = rnd(3, 9); let n = rnd(100, 999); if (n % d === 0) n++; return [n, d]; }
  if (kind === 1) { const d = rnd(2, 8); return [d * (rnd(1, 9) * 100 + rnd(1, 9)), d]; }
  const d = rnd(11, 15); return [d * rnd(11, 30), d];
}
