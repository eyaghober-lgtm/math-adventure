import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tr, type Key, type Lang } from './i18n/strings';
import { load, save, type AppState } from './lib/progress';

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load());
  useEffect(() => { save(state); }, [state]);
  const lang = state.lang;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const setLang = useCallback((l: Lang) => setState((s) => ({ ...s, lang: l })), []);
  const t = useCallback((k: Key) => tr(lang, k), [lang]);
  const value = useMemo(() => ({ state, update, lang, setLang, t }), [state, update, lang, setLang, t]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

/** Renders text where ⟦ ... ⟧ marks a math expression that must stay left-to-right. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/⟦|⟧/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <span key={i} className="math">{p}</span> : <span key={i}>{p}</span>,
      )}
    </>
  );
}
