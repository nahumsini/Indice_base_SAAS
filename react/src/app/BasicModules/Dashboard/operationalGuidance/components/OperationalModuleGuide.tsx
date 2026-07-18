import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  learningModeGuideThemes,
  ModuleLearningGuide,
  type LearningModeControl,
} from '../../../../learningMode';
import { panelInicialLearningControls } from '../panelInicialLearningControls';
import type { PanelInicialGuidanceTabId } from '../types';
import type { PanelInicialGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  copy: PanelInicialGuidanceTranslations;
  activeTabId: PanelInicialGuidanceTabId;
  onPrimaryAction?: () => void;
}

const tabEmojiMap: Record<PanelInicialGuidanceTabId, string> = {
  profile: '👤',
  'business-structure': '🏢',
  'business-profile': '📊',
  'personal-performance': '📈',
  users: '👥',
};

export function OperationalModuleGuide({
  copy,
  activeTabId,
  onPrimaryAction,
}: OperationalModuleGuideProps) {
  const { currentLanguage } = useLanguage();
  const activeGuide = copy.tabs[activeTabId];
  const isSpanish = currentLanguage.code.toLowerCase().startsWith('es');
  const controls = useMemo<readonly LearningModeControl[]>(() => {
    if (isSpanish) {
      return panelInicialLearningControls[activeTabId];
    }

    return activeGuide.steps.map((step, index) => ({
      id: `${activeTabId}-${index + 1}`,
      emoji: tabEmojiMap[activeTabId],
      kind: activeGuide.label,
      title: step.title,
      purpose: step.description,
      behavior: activeGuide.summary,
      whenToUse: activeGuide.value,
      result: activeGuide.value,
      tipByCharacter: {
        emily: activeGuide.value,
        juanito: activeGuide.value,
        camila: activeGuide.value,
      },
      storyByCharacter: {
        emily: `Emily uses this function to create a repeatable business foundation: ${step.description}`,
        juanito: `Juanito uses this function to keep operational context as reliable as his numbers: ${step.description}`,
        camila: `Camila uses this function to turn informal agreements into visible business structure: ${step.description}`,
      },
    }));
  }, [activeGuide, activeTabId, isSpanish]);

  return (
    <ModuleLearningGuide
      activeContextLabel={activeGuide.label}
      controls={controls}
      ctaLabel={activeGuide.ctaLabel}
      eyebrow={copy.eyebrow}
      guideId="panel-inicial-guidance"
      onPrimaryAction={onPrimaryAction}
      scopeId={`panel-inicial-${activeTabId}`}
      stepIndicatorLabel={copy.stepIndicatorLabel}
      theme={learningModeGuideThemes.dashboard}
      title={copy.title}
    />
  );
}
