import { DIAGNOSTIC_TAG_CATALOG } from './tagCatalog';
import type {
  AggregatedDiagnosisTag,
  DiagnosticTagId,
  DiagnosisPillarEngineScore,
} from './types';

const getPriorityScore = (severityTotal: number, maxSeverity: number, occurrences: number) => (
  Math.round((severityTotal * 1.4) + (maxSeverity * 2.2) + occurrences)
);

export const aggregateDiagnosisTags = (
  pillars: DiagnosisPillarEngineScore[],
): AggregatedDiagnosisTag[] => {
  const tagMap = new Map<DiagnosticTagId, AggregatedDiagnosisTag>();

  pillars.forEach((pillar) => {
    pillar.questions.forEach((question) => {
      if (!question.selectedOptionLabel) {
        return;
      }

      question.tags.forEach((tagSignal) => {
        const catalogEntry = DIAGNOSTIC_TAG_CATALOG[tagSignal.tag];
        const current = tagMap.get(tagSignal.tag) ?? {
          id: tagSignal.tag,
          label: catalogEntry.label,
          severityTotal: 0,
          maxSeverity: 0,
          occurrences: 0,
          priorityScore: 0,
          pillars: [],
          evidence: [],
        };

        const weightedSeverity = tagSignal.severity * (tagSignal.confidence ?? 1);

        current.severityTotal += weightedSeverity;
        current.maxSeverity = Math.max(current.maxSeverity, tagSignal.severity);
        current.occurrences += 1;
        current.priorityScore = getPriorityScore(current.severityTotal, current.maxSeverity, current.occurrences);

        if (!current.pillars.includes(pillar.key)) {
          current.pillars.push(pillar.key);
        }

        current.evidence.push({
          pillar: pillar.key,
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
