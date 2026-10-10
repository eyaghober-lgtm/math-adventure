import { useCallback, useState } from 'react';
import { parseNum, type Key } from '../i18n/strings';
import { useApp } from '../store';
import { LongDivisionEngine } from './LongDivisionEngine';

export const LD_EXAMPLES: Array<{ id: string; n: number; d: number; title: Key }> = [
  { id: 'A', n: 84, d: 4, title: 'ex1' },
  { id: 'B', n: 156, d: 3, title: 'ex2' },
  { id: 'C', n: 17, d: 5, title: 'ex3' },
  { id: 'D', n: 125, d: 4, title: 'ex4' },
  { id: 'E', n: 408, d: 4, title: 'ex5' },
  { id: 'F', n: 144, d: 12, title: 'ex6' },
];

export function LongDivisionLesson({ initial }: { initial?: string }) {
  const { t, state, update } = useApp();
  const [sel, setSel] = useState<string>(initial ?? 'A');
  const [custom, setCustom] = useState<{ n: number; d: number }>({ n: 987, d: 7 });
  const [nIn, setNIn] = useState('987');
  const [dIn, setDIn] = useState('7');
  const [err, setErr] = useState(false);

  const ex = LD_EXAMPLES.find((e) => e.id === sel);
  const n = ex ? ex.n : custom.n;
  const d = ex ? ex.d : custom.d;

  const onComplete = useCallback(() => {
    if (ex) update((s) => (s.lessons[`ld-${ex.id}`] ? s : { ...s, lessons: { ...s.lessons, [`ld-${ex.id}`]: Date.now() } }));
  }, [ex, update]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseNum(nIn);
    const b = parseNum(dIn);
    if (a === null || b === null || a < 1 || a > 99999 || b < 1 || b > 99) { setErr(true); return; }
    setErr(false);
    setCustom({ n: a, d: b });
    setSel('custom');
  };

  return (
    <section className="page">
      <header className="page-head">
        <h2>{t('longTitle')}</h2>
        <p>{t('longIntro')}</p>
      </header>

      <div className="tabs" role="tablist" aria-label={t('example')}>
        {LD_EXAMPLES.map((e) => (
          <button key={e.id} role="tab" aria-selected={sel === e.id} className={`tab ${sel === e.id ? 'on' : ''}`} onClick={() => setSel(e.id)} type="button">
            <span className="tab-top">{state.lessons[`ld-${e.id}`] ? '✓ ' : ''}{t('example')} {e.id}</span>
            <span className="math tab-math">{e.n} ÷ {e.d}</span>
          </button>
        ))}
        <button role="tab" aria-selected={sel === 'custom'} className={`tab pink ${sel === 'custom' ? 'on' : ''}`} onClick={() => setSel('custom')} type="button">
          <span className="tab-top">{t('tryYourOwn')}</span>
          <span className="math tab-math">? ÷ ?</span>
        </button>
      </div>

      {ex && <p className="ex-title"><b>{t('example')} {ex.id}:</b> {t(ex.title)}</p>}

      {sel === 'custom' && (
        <form className="card own-form" onSubmit={submit}>
          <label>{t('dividend')}<input className="num-in" inputMode="numeric" value={nIn} onChange={(e) => setNIn(e.target.value)} dir="ltr" /></label>
          <span className="math op-div">÷</span>
          <label>{t('divisor')}<input className="num-in" inputMode="numeric" value={dIn} onChange={(e) => setDIn(e.target.value)} dir="ltr" /></label>
          <button className="btn primary" type="submit">{t('go')}</button>
          {err && <p className="err" role="alert">{t('invalidInput')}</p>}
        </form>
      )}

      <LongDivisionEngine n={n} d={d} onComplete={onComplete} />
    </section>
  );
}
