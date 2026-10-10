import { motion } from 'framer-motion';
import { LD_EXAMPLE_IDS, masteredCount, practiceDone, gamePlays } from '../lib/progress';
import type { Key } from '../i18n/strings';
import { useApp } from '../store';
import { DmsbrChips } from './LongDivisionEngine';
import { suggestNext, type Page } from './ProgressDashboard';

export function Home({ go }: { go: (p: Page) => void }) {
  const { t, state } = useApp();
  const nx = suggestNext(state);
  const ld = LD_EXAMPLE_IDS.filter((id) => state.lessons[`ld-${id}`]).length;
  const path: Array<{ page: Page; text: Key; tone: string; sym: string; status: string }> = [
    { page: 'mult', text: 'pathMult', tone: 'blue', sym: '×', status: state.lessons.mult ? '✓' : '' },
    { page: 'tables', text: 'pathTables', tone: 'blue', sym: '12', status: masteredCount(state) ? `${masteredCount(state)}/78` : '' },
    { page: 'div', text: 'pathDiv', tone: 'purple', sym: '÷', status: state.lessons.div ? '✓' : '' },
    { page: 'long', text: 'pathLong', tone: 'purple', sym: '⌐', status: ld ? `${ld}/6` : '' },
    { page: 'practice', text: 'pathPractice', tone: 'pink', sym: '✎', status: practiceDone(state) ? `${practiceDone(state)}` : '' },
    { page: 'games', text: 'pathGames', tone: 'green', sym: '★', status: gamePlays(state) ? `${gamePlays(state)}` : '' },
  ];
  return (
    <section className="page home">
      <div className="hero">
        <div className="hero-text">
          <p className="eyebrow">{t('tagline')}</p>
          <h1>{t('appName')}</h1>
          <p className="hero-hello">{t('homeHello')}</p>
          <p className="muted">{t('homeSub')}</p>
          <p className="credit-badge">✍️ {t('preparedBy')}</p>
          <div className="btn-row left">
            <button className="btn primary big" type="button" onClick={() => go(nx.page)}>{t('homeGo')} →</button>
          </div>
          <p className="next-hint"><b>{t('homeNext')}:</b> {t(nx.text)}</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          {[['7', 'blue', -8], ['×', 'orange', 6], ['8', 'blue', 4], ['=', 'yellow', -4], ['56', 'green', 8], ['÷', 'purple', -6]].map(([s, c, r], i) => (
            <motion.div key={i} className={`tile-art ${c}`} animate={{ y: [0, -8, 0], rotate: [Number(r), Number(r) + 3, Number(r)] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}>{s}</motion.div>
          ))}
        </div>
      </div>

      <h2 className="sec">{t('homePath')}</h2>
      <div className="path-grid">
        {path.map((p) => (
          <button key={p.page} type="button" className={`path-card ${p.tone}`} onClick={() => go(p.page)}>
            <span className="path-sym math">{p.sym}</span>
            <span className="path-text">{t(p.text)}</span>
            {p.status && <span className="path-status math">{p.status}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <h3>{t('homeDmsbr')}</h3>
        <p className="muted">{t('homeDmsbrText')}</p>
        <DmsbrChips active={null} />
      </div>
    </section>
  );
}
