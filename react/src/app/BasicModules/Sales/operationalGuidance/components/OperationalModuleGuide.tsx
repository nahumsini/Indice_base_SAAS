import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  learningModeGuideThemes,
  ModuleLearningGuide,
  type LearningModeControl,
} from '../../../../learningMode';
import { salesLearningControls } from '../salesLearningControls';
import type { SalesGuidanceTabId } from '../types';
import type { SalesGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  copy: SalesGuidanceTranslations;
  activeTabId: SalesGuidanceTabId;
  onPrimaryAction?: () => void;
}

const tabEmojiMap: Record<SalesGuidanceTabId, string> = {
  leads: '🎯',
  contacts: '👥',
  quotes: '💬',
  sales: '💼',
  products: '📦',
  providers: '🏢',
  inventory: '🏬',
  contracts: '📝',
  'after-sales': '🤝',
  commissions: '🧮',
  'payment-accounts': '💳',
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
    const detailedControls = salesLearningControls[activeTabId];

    if (isSpanish && detailedControls) {
      return detailedControls;
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
        emily: isSpanish
          ? 'Convierte esta función en un estándar comercial repetible para cada sucursal.'
          : activeGuide.value,
        juanito: isSpanish
          ? 'Relaciona esta función con un responsable, una fecha y un dato que puedas verificar.'
          : activeGuide.value,
        camila: isSpanish
          ? 'Deja visible el acuerdo aunque la relación comercial funcione hoy de manera cercana e informal.'
          : activeGuide.value,
      },
      storyByCharacter: isSpanish
        ? {
            emily: `Emily aplica esta función para sostener la misma experiencia comercial mientras crecen sus cafeterías: ${step.description}`,
            juanito: `Juanito la utiliza para conectar seguimiento y resultados con información verificable: ${step.description}`,
            camila: `Camila la utiliza para transformar acuerdos de palabra en un flujo comercial que su equipo puede continuar: ${step.description}`,
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
      guideId="sales-guidance"
      onPrimaryAction={onPrimaryAction}
      scopeId={`sales-${activeTabId}`}
      stepIndicatorLabel={copy.stepIndicatorLabel}
      theme={learningModeGuideThemes.commercial}
      title={copy.title}
    />
  );
}
