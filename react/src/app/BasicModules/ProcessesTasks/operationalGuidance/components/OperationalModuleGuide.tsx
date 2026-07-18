import { useMemo } from 'react';
import {
  learningModeGuideThemes,
  ModuleLearningGuide,
  type LearningModeControl,
} from '../../../../learningMode';
import { useLanguage } from '../../../../shared/context';
import { processesTasksCharacterExamples } from '../processesTasksCharacterExamples';
import type { ProcessesTasksGuidanceTabId } from '../types';
import type { ProcessesTasksGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  copy: ProcessesTasksGuidanceTranslations;
  activeTabId: ProcessesTasksGuidanceTabId;
  onPrimaryAction?: () => void;
}

const stepEmojis: Record<ProcessesTasksGuidanceTabId, readonly string[]> = {
  calendar: ['📝', '🗂️', '✅'],
  projects: ['🎯', '📋', '🔄'],
  processes: ['🔁', '🗓️', '⏸️'],
  kpis: ['📊', '🎯', '📈'],
};

export function OperationalModuleGuide({
  copy,
  activeTabId,
  onPrimaryAction,
}: OperationalModuleGuideProps) {
  const { currentLanguage } = useLanguage();
  const activeGuide = copy.tabs[activeTabId];
  const isSpanish = currentLanguage.code.toLowerCase().startsWith('es');
  const controls = useMemo<readonly LearningModeControl[]>(() => (
    activeGuide.steps.map((step, index) => ({
      id: `${activeTabId}-${index + 1}`,
      emoji: stepEmojis[activeTabId][index] ?? '✅',
      kind: activeGuide.label,
      title: step.title,
      purpose: step.description,
      behavior: activeGuide.summary,
      whenToUse: activeGuide.value,
      tipByCharacter: {
        emily: isSpanish
          ? 'Convierte esta función en un estándar que pueda repetirse de la misma manera en cada sucursal.'
          : activeGuide.value,
        juanito: isSpanish
          ? 'Relaciona esta función con un responsable y una medida; así tus números también explican quién debe actuar.'
          : activeGuide.value,
        camila: isSpanish
          ? 'Asigna la responsabilidad de forma visible, aunque el acuerdo ya exista de palabra dentro de la familia.'
          : activeGuide.value,
      },
      storyByCharacter: isSpanish
        ? {
            emily: processesTasksCharacterExamples.emily[activeTabId],
            juanito: processesTasksCharacterExamples.juanito[activeTabId],
            camila: processesTasksCharacterExamples.camila[activeTabId],
          }
        : {
            emily: `Emily applies this function to make execution repeatable: ${step.description}`,
            juanito: `Juanito applies this function to connect operational work with control: ${step.description}`,
            camila: `Camila applies this function to make responsibilities visible: ${step.description}`,
          },
    }))
  ), [activeGuide, activeTabId, isSpanish]);

  return (
    <ModuleLearningGuide
      activeContextLabel={activeGuide.label}
      controls={controls}
      ctaLabel={activeGuide.ctaLabel}
      eyebrow={copy.eyebrow}
      guideId="processes-tasks-guidance"
      onPrimaryAction={onPrimaryAction}
      scopeId={`processes-tasks-${activeTabId}`}
      stepIndicatorLabel={copy.stepIndicatorLabel}
      theme={learningModeGuideThemes.processesTasks}
      title={copy.title}
    />
  );
}
