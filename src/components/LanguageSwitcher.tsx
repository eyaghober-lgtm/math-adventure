import { useApp } from '../store';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useApp();
  return (
    <div className="lang-switch" role="group" aria-label={t('language')}>
      <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} lang="en">English</button>
      <button type="button" aria-pressed={lang === 'ar'} className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')} lang="ar">العربية</button>
    </div>
  );
}
