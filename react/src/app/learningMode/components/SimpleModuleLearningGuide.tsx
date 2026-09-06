import type {
  LearningModeControl,
  LearningModeGuideTheme,
  LearningModeJourneyStep,
} from '../types';
import { ModuleLearningGuide } from './ModuleLearningGuide';

interface SimpleModuleLearningGuideProps {
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
  return (
    <ModuleLearningGuide
      activeContextLabel={activeContextLabel}
      activeJourneyId={activeJourneyId}
      appliedJourneyIds={appliedJourneyIds}
      contextSignal={contextSignal}
      controls={controls}
      ctaLabel="Ir a las funciones"
      eyebrow="Modo aprendiz"
      guideId={guideId}
      journey={journey}
      onJourneyChange={onJourneyChange}
      onPrimaryAction={onPrimaryAction}
      scopeId={scopeId}
      stepIndicatorLabel="Función"
      theme={theme}
      title={moduleTitle}
    />
  );
}
