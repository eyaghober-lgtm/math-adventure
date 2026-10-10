import type { Lang } from '../i18n/strings';

export interface FactStat { box: number; seen: number; right: number; wrong: number; last: number }
export interface PracticeRec { done: boolean; attempts: number; clean: boolean }
export interface GameRec { plays: number; best: number; last: number }

export interface AppState {
  lang: Lang;
  layout: 'school' | 'classic';
  facts: Record<string, FactStat>;
  lessons: Record<string, number>;
  practice: Record<string, PracticeRec>;
  quiz: { asked: number; right: number };
  games: Record<string, GameRec>;
}

export const KEY = 'math-adventure-v1';
export const MASTERED_BOX = 3;
export const MAX_BOX = 4;

export const initialState = (): AppState => ({
  lang: 'en',
  layout: 'school',
  facts: {},
  lessons: {},
  practice: {},
  quiz: { asked: 0, right: 0 },
  games: {},
});

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    return { ...initialState(), ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    return initialState();
  }
}

export function save(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: progress lasts for this visit */ }
}

export const factKey = (a: number, b: number) => `${Math.min(a, b)}x${Math.max(a, b)}`;
export const allFactKeys = (): string[] => {
  const out: string[] = [];
  for (let a = 1; a <= 12; a++) for (let b = a; b <= 12; b++) out.push(`${a}x${b}`);
  return out;
};
export const TOTAL_FACTS = 78;

export function recordFact(s: AppState, a: number, b: number, right: boolean, promote = true): AppState {
  const k = factKey(a, b);
  const old = s.facts[k] ?? { box: 0, seen: 0, right: 0, wrong: 0, last: 0 };
  const box = right ? (promote ? Math.min(MAX_BOX, old.box + 1) : old.box) : 0;
  return {
    ...s,
    facts: { ...s.facts, [k]: { box, seen: old.seen + 1, right: old.right + (right ? 1 : 0), wrong: old.wrong + (right ? 0 : 1), last: Date.now() } },
    quiz: promote ? { asked: s.quiz.asked + 1, right: s.quiz.right + (right ? 1 : 0) } : s.quiz,
  };
}

export const masteredCount = (s: AppState) => Object.values(s.facts).filter((f) => f.box >= MASTERED_BOX).length;
export const weakFacts = (s: AppState): string[] =>
  Object.entries(s.facts).filter(([, f]) => f.wrong > 0 && f.box < MASTERED_BOX).sort((a, b) => b[1].wrong - a[1].wrong).map(([k]) => k);

export const lessonsDone = (s: AppState) => Object.keys(s.lessons).length;
export const practiceDone = (s: AppState) => Object.values(s.practice).filter((p) => p.done).length;
export const gamePlays = (s: AppState) => Object.values(s.games).reduce((n, g) => n + g.plays, 0);

export function xpOf(s: AppState): number {
  return masteredCount(s) * 3 + lessonsDone(s) * 15 + practiceDone(s) * 10 + gamePlays(s) * 5;
}
export const LEVELS = [0, 60, 150, 300, 500];
export function levelOf(xp: number): { level: number; next: number | null } {
  let level = 0;
  LEVELS.forEach((t, i) => { if (xp >= t) level = i; });
  return { level, next: level < LEVELS.length - 1 ? LEVELS[level + 1] : null };
}

export const LD_EXAMPLE_IDS = ['A', 'B', 'C', 'D', 'E', 'F'];
