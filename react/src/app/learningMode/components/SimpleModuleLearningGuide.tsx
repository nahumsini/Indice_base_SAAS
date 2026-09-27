import { useLanguage } from '../../shared/context';
import { createEnglishOverviewControl, type EnglishLearningOverview } from '../englishOverview';
import type {
  LearningModeControl,
  LearningModeGuideTheme,
  LearningModeJourneyStep,
} from '../types';
import { ModuleLearningGuide } from './ModuleLearningGuide';

interface SimpleModuleLearningGuideProps {
  englishOverview?: Record<string, EnglishLearningOverview>;
  englishModuleTitle?: string;
  activeContextLabel: string;
  activeJourneyId?: string;
  appliedJourneyIds?: readonly string[];
  contextSignal?: string;
  controls: readonly LearningModeControl[];
  guideId: string;
  moduleTitle: string;
  journey?: readonly LearningModeJourneyStep[];
  onJourneyChange?: (journeyId: string) => void;
  onPrimaryAction?: () => void;
  scopeId: string;
  theme: LearningModeGuideTheme;
}

export function SimpleModuleLearningGuide({
  englishOverview, englishModuleTitle,
  activeContextLabel,
  activeJourneyId,
  appliedJourneyIds,
  contextSignal,
  controls,
  guideId,
  moduleTitle,
  journey,
  onJourneyChange,
  onPrimaryAction,
  scopeId,
  theme,
}: SimpleModuleLearningGuideProps) {
  const { currentLanguage } = useLanguage();
  const isEnglish = currentLanguage.code.toLowerCase().startsWith('en');
  const overview = isEnglish && activeJourneyId ? englishOverview?.[activeJourneyId] : undefined;
  const resolvedJourney = isEnglish && englishOverview
    ? journey?.map(step => ({ ...step, label: englishOverview[step.id]?.label ?? step.label })) : journey;
  return (
    <ModuleLearningGuide
      activeContextLabel={overview?.label ?? activeContextLabel}
      activeJourneyId={activeJourneyId}
      appliedJourneyIds={appliedJourneyIds}
      contextSignal={overview?.objective ?? contextSignal}
      controls={overview ? [createEnglishOverviewControl(activeJourneyId!, overview)] : controls}
      ctaLabel={isEnglish ? 'Go to the tools' : 'Ir a las funciones'}
      eyebrow={isEnglish ? 'Learning mode' : 'Modo aprendiz'}
      guideId={guideId}
      journey={resolvedJourney}
      onJourneyChange={onJourneyChange}
      onPrimaryAction={onPrimaryAction}
      scopeId={scopeId}
      stepIndicatorLabel={isEnglish ? 'Tool' : 'Función'}
      theme={theme}
      title={isEnglish ? englishModuleTitle ?? moduleTitle : moduleTitle}
    />
  );
}
