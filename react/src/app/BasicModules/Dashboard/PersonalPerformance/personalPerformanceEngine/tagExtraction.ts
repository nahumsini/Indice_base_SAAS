import { getHumanTagCatalog } from './tagCatalog';
import type {
  AggregatedHumanTag,
  HumanSectionEngineScore,
  HumanTagId,
} from './types';

const getPriorityScore = (severityTotal: number, maxSeverity: number, occurrences: number) => (
  Math.round((severityTotal * 1.55) + (maxSeverity * 2.4) + (occurrences * 0.9))
);

export const aggregateHumanPerformanceTags = (
  sections: HumanSectionEngineScore[],
  locale: string,
): AggregatedHumanTag[] => {
  const tagMap = new Map<HumanTagId, AggregatedHumanTag>();
  const tagCatalog = getHumanTagCatalog(locale);

  sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (!question.selectedOptionLabel) {
        return;
      }

      question.tags.forEach((tagSignal) => {
        const catalogEntry = tagCatalog[tagSignal.tag];
        const current = tagMap.get(tagSignal.tag) ?? {
          id: tagSignal.tag,
          label: catalogEntry.label,
          category: catalogEntry.category,
          dimension: catalogEntry.dimension,
          severityTotal: 0,
          maxSeverity: 0,
          occurrences: 0,
          priorityScore: 0,
          sections: [],
          operationalRisk: catalogEntry.operationalRisk,
          recommendedAction: catalogEntry.recommendedAction,
          evidence: [],
        };
        const weightedSeverity = tagSignal.severity * (tagSignal.confidence ?? 1) * question.severityWeight;

        current.severityTotal += weightedSeverity;
        current.maxSeverity = Math.max(current.maxSeverity, tagSignal.severity);
        current.occurrences += 1;
        current.priorityScore = getPriorityScore(current.severityTotal, current.maxSeverity, current.occurrences);

        if (!current.sections.includes(section.key)) {
          current.sections.push(section.key);
        }

        current.evidence.push({
          section: section.key,
          questionId: question.id,
          question: question.question,
          answer: question.selectedOptionLabel,
          severity: tagSignal.severity,
        });

        tagMap.set(tagSignal.tag, current);
      });
    });
  });

  return Array.from(tagMap.values()).sort((left, right) => {
    if (left.priorityScore === right.priorityScore) {
      return right.maxSeverity - left.maxSeverity;
    }

    return right.priorityScore - left.priorityScore;
  });
};
