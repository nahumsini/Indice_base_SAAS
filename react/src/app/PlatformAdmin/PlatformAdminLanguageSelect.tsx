import { Globe2 } from 'lucide-react';
import { languages } from '../context/LanguageContext';
import { useLanguage } from '../shared/context';
import { usePlatformAdminTranslations } from './translations/usePlatformAdminTranslations';

export function PlatformAdminLanguageSelect() {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const { t } = usePlatformAdminTranslations();
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('Language')}</span>
      <select
        aria-label={t('Language')}
        className="max-w-28 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] sm:max-w-44"
        value={currentLanguage.code}
        onChange={(event) => {
          const selected = languages.find((language) => language.code === event.target.value);
          if (selected) setCurrentLanguage(selected);
        }}
      >
        {languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
      </select>
    </label>
  );
}
