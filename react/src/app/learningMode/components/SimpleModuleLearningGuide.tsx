import type { LearningModeControl, LearningModeGuideTheme } from '../types';
import { ModuleLearningGuide } from './ModuleLearningGuide';

interface SimpleModuleLearningGuideProps {
  activeContextLabel: string;
  controls: readonly LearningModeControl[];
  guideId: string;
  moduleTitle: string;
  onPrimaryAction?: () => void;
  scopeId: string;
  theme: LearningModeGuideTheme;
}

export function SimpleModuleLearningGuide({
  activeContextLabel,
  controls,
  guideId,
  moduleTitle,
  onPrimaryAction,
  scopeId,
  theme,
}: SimpleModuleLearningGuideProps) {
  return (
    <ModuleLearningGuide
      activeContextLabel={activeContextLabel}
      controls={controls}
      ctaLabel="Ir a las funciones"
      eyebrow="Modo aprendiz"
      guideId={guideId}
      onPrimaryAction={onPrimaryAction}
      scopeId={scopeId}
      stepIndicatorLabel="Función"
      theme={theme}
      title={moduleTitle}
    />
  );
}
