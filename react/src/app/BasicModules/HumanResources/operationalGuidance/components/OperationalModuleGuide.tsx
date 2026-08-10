import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  learningModeGuideThemes,
  ModuleLearningGuide,
  type LearningModeControl,
} from '../../../../learningMode';
import { collaboratorsLearningControls } from '../collaboratorsLearningControls';
import { humanResourcesCharacterExamples } from '../humanResourcesCharacterExamples';
import type { HumanResourcesGuidanceTranslations } from '../translations';
import type { HumanResourcesGuidanceTabId } from '../types';

interface OperationalModuleGuideProps {
  copy: HumanResourcesGuidanceTranslations;
  activeTabId: HumanResourcesGuidanceTabId;
  onPrimaryAction?: () => void;
}

const tabEmojiMap: Record<HumanResourcesGuidanceTabId, string> = {
  collaborators: '👥',
  attendance: '📅',
  control: '⏱️',
  payroll: '💰',
  announcements: '📣',
  assets: '💼',
  records: '📋',
  permissions: '✅',
  incentives: '🎁',
  kpis: '📊',
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
    if (activeTabId === 'collaborators' && isSpanish) {
      return collaboratorsLearningControls;
    }

    return activeGuide.steps.map((step, index) => ({
      id: `${activeTabId}-${index + 1}`,
      emoji: tabEmojiMap[activeTabId],
      kind: activeGuide.label,
      title: step.title,
      purpose: step.description,
      behavior: activeGuide.summary,
      whenToUse: activeGuide.value,
      tipByCharacter: {
        emily: activeGuide.value,
        juanito: activeGuide.value,
        camila: activeGuide.value,
      },
      storyByCharacter: isSpanish
        ? {
            emily: humanResourcesCharacterExamples.emily[activeTabId],
            juanito: humanResourcesCharacterExamples.juanito[activeTabId],
            camila: humanResourcesCharacterExamples.camila[activeTabId],
          }
        : {
            emily: step.description,
            juanito: step.description,
            camila: step.description,
          },
    }));
  }, [activeGuide, activeTabId, isSpanish]);

  return (
    <ModuleLearningGuide
      activeContextLabel={activeGuide.label}
      controls={controls}
      ctaLabel={activeGuide.ctaLabel}
      eyebrow={copy.eyebrow}
      guideId="human-resources-guidance"
      onPrimaryAction={onPrimaryAction}
      scopeId={`human-resources-${activeTabId}`}
      stepIndicatorLabel={copy.stepIndicatorLabel}
      theme={learningModeGuideThemes.humanResources}
      title={copy.title}
    />
  );
}
