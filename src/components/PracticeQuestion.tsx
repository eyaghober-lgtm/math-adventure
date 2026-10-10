import { useEffect, useRef, useState } from 'react';
import { parseNum } from '../i18n/strings';
import { Rich, useApp } from '../store';

export type Status = 'idle' | 'wrong' | 'right';

interface Props {
  ask: string;
  kind: 'number' | 'pick';
  status: Status;
  hint: string | null;
  attempts: number;
  /** changes whenever a new question is shown, so the input clears and refocuses */
  qid: string | number;
  onSubmit: (n: number) => void;
  onHint?: () => void;
  onShow?: () => void;
  children?: React.ReactNode;
}

/** One question with a gentle hint system: wrong answers never punish, they explain. */
export function PracticeQuestion({ ask, kind, status, hint, attempts, qid, onSubmit, onHint, onShow, children }: Props) {
  const { t } = useApp();
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setVal(''); if (kind === 'number') ref.current?.focus({ preventScroll: true }); }, [qid, kind]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseNum(val);
    if (n === null) return;
    onSubmit(n);
    if (status !== 'right') ref.current?.select();
  };

  return (
    <div className={`card pq ${status === 'right' ? 'pq-right' : ''} ${status === 'wrong' ? 'pq-wrong' : ''}`}>
      <p className="pq-ask"><Rich text={ask} /></p>
      {children}
      {kind === 'number' ? (
        <form className="pq-form" onSubmit={submit}>
          <input
            ref={ref}
            className="num-in big"
            inputMode="numeric"
            autoComplete="off"
            placeholder="?"
            aria-label={t('yourAnswer')}
            value={val}
            dir="ltr"
            onChange={(e) => setVal(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={val.trim() === ''}>{t('check')}</button>
        </form>
      ) : (
        <p className="pq-pick">👆 {t('tapColumn')}</p>
      )}
      <div className="pq-feedback" aria-live="polite">
        {status === 'wrong' && <p className="bad"><b>{t('notQuite')}</b> {t('tryAgain')}</p>}
        {status === 'right' && <p className="good"><b>✓ {t('correct')}</b></p>}
        {hint && <p className="hintbox"><span aria-hidden="true">💡</span> <Rich text={hint} /></p>}
      </div>
      <div className="pq-actions">
        {onHint && <button type="button" className="btn ghost small" onClick={onHint}>{t('hint')}</button>}
        {onShow && attempts >= 2 && <button type="button" className="btn ghost small" onClick={onShow}>{t('showMe')}</button>}
      </div>
    </div>
  );
}
