import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { platformAdminApi } from '../../api/platformAdmin';
import { useHeaderTranslations } from '../../components/header/hooks/useHeaderTranslations';
import { getTrainingWorkspaceCopy } from '../../Training/translations/workspace';
import { getSystemToolVisibility } from '../systemToolAccess';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { ModuleCard } from '../../components/ModuleCard';
import { ModuleCarousel } from '../../components/ModuleCarousel';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import { filesCopy } from '../../SystemTools/Files/filesCopy';
import type { PageId } from '../../config/navigation';
import type { MainDashboardTranslations } from '../translations';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface SystemToolsSectionProps {
  copy: MainDashboardTranslations['systemTools'];
  onNavigate: (page: PageId, tab?: string) => void;
}

/** Relocates existing shortcuts; existing session/tab rules remain authoritative. */
export function SystemToolsSection({ copy, onNavigate }: SystemToolsSectionProps) {
  const revision = useAuthorizationRevision();
  const session = getCachedAuthSession();
  const navigate = useNavigate();
  const { copy: headerCopy, locale } = useHeaderTranslations();
  const [platformAccess, setPlatformAccess] = useState({ revision: -1, role: '' });

  useEffect(() => {
    let active = true;
    if (!session || session.demoMode) return;
    platformAdminApi.getContext()
      .then((context) => { if (active) setPlatformAccess({ revision, role: context.role }); })
      .catch(() => { if (active) setPlatformAccess({ revision, role: '' }); });
    return () => { active = false; };
  }, [revision]);

  // Never carry a platform role across a company, session or authorization change.
  const platformRole = platformAccess.revision === revision ? platformAccess.role : '';
  const visible = getSystemToolVisibility(session, platformRole);
  const count = Object.values(visible).filter(Boolean).length;
  if (count === 0) return null;

  return (
    <section>
      <DashboardSectionHeading
        icon={<IndiceEmoji name="layout" className="size-8" />}
        title={copy.title}
        description={copy.description}
        count={count}
      />
      <ModuleCarousel singleRow dashboardSpacing>
        {visible.files && <ModuleCard title={filesCopy(locale).title} color="blue" artwork={<IndiceEmoji name="folder" className="size-14" />} size="small" onClick={()=>onNavigate('files')} />}
        {visible.connectAi && (
          <ModuleCard
            title={copy.connectAi}
            color="blue"
            artwork={<IndiceEmoji name="robot" className="size-14" />}
            size="small"
            onClick={() => onNavigate('home-panel', 'integrations')}
          />
        )}
        {visible.kioskCenter && (
          <ModuleCard
            title={copy.kioskCenter}
            color="gray"
            artwork={<IndiceEmoji name="kiosk" className="size-14" />}
            size="small"
            onClick={() => onNavigate('kiosk-center')}
          />
        )}
        {visible.subscription && (
          <ModuleCard
            title={headerCopy.actions.subscription}
            color="green"
            artwork={<IndiceEmoji name="card" className="size-14" />}
            size="small"
            onClick={() => navigate('/billing')}
          />
        )}
        {visible.platformAdmin && (
          <ModuleCard
            title={headerCopy.actions.platformAdmin}
            color="blue"
            artwork={<IndiceEmoji name="shield" className="size-14" />}
            size="small"
            onClick={() => navigate('/platform-admin')}
          />
        )}
        {visible.training && (
          <ModuleCard
            title={getTrainingWorkspaceCopy(locale).title}
            color="blue"
            artwork={<IndiceEmoji name="learning" className="size-14" />}
            size="small"
            onClick={() => navigate('/training')}
          />
        )}
      </ModuleCarousel>
    </section>
  );
}
