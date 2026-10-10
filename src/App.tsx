import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { StoreProvider, useApp } from './store';
import type { Key } from './i18n/strings';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Home } from './components/Home';
import { MultiplicationVisualizer } from './components/MultiplicationVisualizer';
import { MultiplicationTable } from './components/MultiplicationTable';
import { DivisionVisualizer } from './components/DivisionVisualizer';
import { LongDivisionLesson } from './components/LongDivisionLesson';
import { GuidedPractice } from './components/GuidedPractice';
import { Games } from './games/Games';
import { LevelBadge, ProgressDashboard, type Page } from './components/ProgressDashboard';

const NAV: Array<{ page: Page; key: Key; sym: string }> = [
  { page: 'home', key: 'navHome', sym: '⌂' },
  { page: 'mult', key: 'navMult', sym: '×' },
  { page: 'tables', key: 'navTables', sym: '⊞' },
  { page: 'div', key: 'navDiv', sym: '÷' },
  { page: 'long', key: 'navLong', sym: '⌐' },
  { page: 'practice', key: 'navPractice', sym: '✎' },
  { page: 'games', key: 'navGames', sym: '★' },
  { page: 'progress', key: 'navProgress', sym: '◔' },
];

function Shell() {
  const { t } = useApp();
  const [page, setPage] = useState<Page>(() => {
    const h = window.location.hash.replace('#', '') as Page;
    return NAV.some((n) => n.page === h) ? h : 'home';
  });
  const go = (p: Page) => {
    setPage(p);
    try { window.history.replaceState(null, '', `#${p}`); } catch { /* sandboxed frame */ }
    window.scrollTo({ top: 0 });
  };
  useEffect(() => { document.title = `${t('appName')} — ${t('tagline')}`; }, [t]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => go('home')}>
          <span className="brand-mark" aria-hidden="true"><i>×</i><i>÷</i></span>
          <span className="brand-text"><b>{t('appName')}</b><small>{t('tagline')}</small></span>
        </button>
        <div className="top-right"><LevelBadge /><LanguageSwitcher /></div>
      </header>
      <nav className="nav" aria-label="Main">
        {NAV.map((n) => (
          <button key={n.page} type="button" className={`nav-btn ${page === n.page ? 'on' : ''}`} aria-current={page === n.page ? 'page' : undefined} onClick={() => go(n.page)}>
            <span className="nav-sym math" aria-hidden="true">{n.sym}</span>{t(n.key)}
          </button>
        ))}
      </nav>
      <main id="main" tabIndex={-1}>
        {page === 'home' && <Home go={go} />}
        {page === 'mult' && (
          <section className="page">
            <header className="page-head"><h2>{t('multTitle')}</h2><p>{t('multIntro')}</p></header>
            <MultiplicationVisualizer />
          </section>
        )}
        {page === 'tables' && <MultiplicationTable />}
        {page === 'div' && (
          <section className="page">
            <header className="page-head"><h2>{t('divTitle')}</h2><p>{t('divIntro')}</p></header>
            <DivisionVisualizer />
          </section>
        )}
        {page === 'long' && <LongDivisionLesson />}
        {page === 'practice' && <GuidedPractice />}
        {page === 'games' && <Games />}
        {page === 'progress' && <ProgressDashboard go={go} />}
      </main>
      <footer className="foot">
        <b>{t('appName')}</b> · {t('preparedBy')}
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </StoreProvider>
  );
}
