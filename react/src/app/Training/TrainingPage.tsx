import { Globe2, GraduationCap } from 'lucide-react';
import { useLoaderData, useNavigate } from 'react-router';
import { IndiceBrandLogo } from '../Auth/components/IndiceBrandLogo';
import { IndiceAdminWorkspaceHeader } from '../components/frontend-os/IndiceAdminWorkspaceHeader';
import { languages, useLanguage } from '../shared/context';
import { TrainingWorkspace } from './TrainingWorkspace';
import type { TrainingRouteData } from './trainingAccess';
import { getTrainingWorkspaceCopy } from './translations/workspace';

/** Independent learning shell: no customer, billing, catalog or platform-management context. */
export default function TrainingPage() {
  const { portal } = useLoaderData<TrainingRouteData>();
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const copy = getTrainingWorkspaceCopy(currentLanguage.code);

  return (
    <div data-training-centre className="min-h-screen bg-[#F7F8FA] text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center">
          <IndiceBrandLogo alt="Índice" className="h-9 w-28 shrink-0" imageClassName="w-[132px]" />
          <IndiceAdminWorkspaceHeader
            className="flex-1"
            backLabel={copy.backToErp}
            onBack={() => navigate('/dashboard')}
            icon={<GraduationCap />}
            title={copy.title}
            subtitle={copy.subtitle}
            actions={(
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
                <Globe2 aria-hidden="true" className="h-4 w-4 text-[#2563EB]" />
                <select
                  aria-label={copy.language}
                  value={currentLanguage.code}
                  onChange={event => {
                    const language = languages.find(option => option.code === event.target.value);
                    if (language) setCurrentLanguage(language);
                  }}
                  className="min-h-11 max-w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900"
                >
                  {languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}
                </select>
              </label>
            )}
          />
        </div>
        <div aria-hidden="true" className="h-1 bg-[#2563EB]" />
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <TrainingWorkspace portal={portal} locale={currentLanguage.code} />
      </main>
    </div>
  );
}
