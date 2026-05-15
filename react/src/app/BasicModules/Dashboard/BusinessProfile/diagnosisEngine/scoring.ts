import type {
  BusinessDiagnosisScoreReport,
  DiagnosisQuestionsMap,
  DiagnosisSectionsMap,
} from '../businessDiagnosisScoring';
import { getBusinessDiagnosisMaturity } from '../businessDiagnosisScoring';
import type {
  DiagnosisContext,
  DiagnosisPillar,
  DiagnosisPillarEngineScore,
  DiagnosisQuestionDefinition,
  DiagnosisQuestionResult,
} from './types';

const PILLAR_ORDER: DiagnosisPillar[] = ['people', 'processes', 'products', 'finance'];

const mergeContext = (left: DiagnosisContext, right: DiagnosisContext): DiagnosisContext => ({
  ...left,
  ...right,
});

const getSelectedOptionIndex = (
  answers: Record<number, number>,
  questionIndex: number,
) => (
  typeof answers[questionIndex] === 'number' ? answers[questionIndex] : null
);

const getWeightedAverage = (questions: DiagnosisQuestionResult[]) => {
  const evaluativeQuestions = questions.filter((question) => (
    question.kind === 'evaluative' && question.score !== null
  ));

  const totalWeight = evaluativeQuestions.reduce((sum, question) => sum + question.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const weightedScore = evaluativeQuestions.reduce((sum, question) => (
    sum + ((question.score ?? 0) * question.weight)
  ), 0);

  return Math.round(weightedScore / totalWeight);
};

export const buildDiagnosisQuestionResults = (
  definitions: Record<DiagnosisPillar, DiagnosisQuestionDefinition[]>,
  sections: DiagnosisSectionsMap,
): { context: DiagnosisContext; pillars: DiagnosisPillarEngineScore[] } => {
  let collectedContext: DiagnosisContext = {};

  const pillars = PILLAR_ORDER.map((pillar) => {
    const sectionAnswers = sections[pillar]?.answers ?? {};
    const questionResults = definitions[pillar].map<DiagnosisQuestionResult>((question, questionIndex) => {
      const selectedOptionIndex = getSelectedOptionIndex(sectionAnswers, questionIndex);
      const selectedOption = selectedOptionIndex === null ? undefined : question.options[selectedOptionIndex];
      const questionContext = selectedOption?.context ?? {};

      if (selectedOption) {
        collectedContext = mergeContext(collectedContext, questionContext);
      }

      return {
        id: question.id,
        pillar,
        index: question.index,
        kind: question.kind,
        question: question.label,
        selectedOptionIndex,
        selectedOptionId: selectedOption?.id ?? null,
        selectedOptionLabel: selectedOption?.label ?? null,
        score: question.kind === 'evaluative' && selectedOption?.score !== undefined
          ? selectedOption.score
          : null,
        weight: question.weight,
        tags: selectedOption?.tags ?? [],
        context: questionContext,
      };
    });

    const totalQuestions = questionResults.length;
    const answeredCount = questionResults.filter((question) => question.selectedOptionIndex !== null).length;
    const evaluativeQuestions = questionResults.filter((question) => question.kind === 'evaluative');
    const evaluativeAnsweredCount = evaluativeQuestions.filter((question) => question.selectedOptionIndex !== null).length;
    const contextualQuestions = questionResults.filter((question) => question.kind === 'contextual');
    const contextualAnsweredCount = contextualQuestions.filter((question) => question.selectedOptionIndex !== null).length;
    const averageScore = getWeightedAverage(questionResults);

    return {
      key: pillar,
      title: pillar,
      totalQuestions,
      answeredCount,
      evaluativeQuestions: evaluativeQuestions.length,
      evaluativeAnsweredCount,
      contextualQuestions: contextualQuestions.length,
      contextualAnsweredCount,
      completionPercent: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      evaluativeCompletionPercent: evaluativeQuestions.length > 0
        ? Math.round((evaluativeAnsweredCount / evaluativeQuestions.length) * 100)
        : 0,
      averageScore,
      maturity: getBusinessDiagnosisMaturity(averageScore),
      questions: questionResults,
    };
  });

  return {
    context: collectedContext,
    pillars,
  };
};

export const applyPillarTitles = (
  pillars: DiagnosisPillarEngineScore[],
  pillarTitles?: Partial<Record<DiagnosisPillar, string>>,
): DiagnosisPillarEngineScore[] => (
  pillars.map((pillar) => ({
    ...pillar,
    title: pillarTitles?.[pillar.key] ?? pillar.title,
  }))
);

export const buildScoreReportFromEnginePillars = (
  pillars: DiagnosisPillarEngineScore[],
  sourceQuestions: DiagnosisQuestionsMap,
): BusinessDiagnosisScoreReport => {
  const scorePillars = pillars.map((pillar) => {
    const questionScores = pillar.questions.map((question) => ({
      index: question.index,
      question: question.question,
      selectedOptionIndex: question.selectedOptionIndex,
      selectedOptionValue: question.selectedOptionIndex === null ? null : question.selectedOptionIndex + 1,
      selectedOptionLabel: question.selectedOptionLabel,
      points: question.score ?? 0,
      maxPoints: question.kind === 'evaluative' ? 100 : 0,
    }));

    const totalPoints = questionScores.reduce((sum, question) => (
      sum + (question.maxPoints > 0 ? question.points : 0)
    ), 0);

    return {
      key: pillar.key,
      title: pillar.title,
      totalQuestions: sourceQuestions[pillar.key]?.length ?? pillar.totalQuestions,
      answeredCount: pillar.answeredCount,
      completionPercent: pillar.completionPercent,
      totalPoints,
      averageScore: pillar.averageScore,
      maturity: pillar.maturity,
      questions: questionScores,
    };
  });

  const overallTotalQuestions = scorePillars.reduce((sum, pillar) => sum + pillar.totalQuestions, 0);
  const overallAnsweredCount = scorePillars.reduce((sum, pillar) => sum + pillar.answeredCount, 0);
  const overallEvaluativePillars = pillars.flatMap((pillar) => (
    pillar.questions.filter((question) => question.kind === 'evaluative' && question.score !== null)
  ));
  const overallWeight = overallEvaluativePillars.reduce((sum, question) => sum + question.weight, 0);
  const overallAverageScore = overallWeight > 0
    ? Math.round(overallEvaluativePillars.reduce((sum, question) => (
      sum + ((question.score ?? 0) * question.weight)
    ), 0) / overallWeight)
    : 0;
  const overallTotalPoints = overallEvaluativePillars.reduce((sum, question) => sum + (question.score ?? 0), 0);

  return {
    pillars: scorePillars,
    overall: {
      totalQuestions: overallTotalQuestions,
      answeredCount: overallAnsweredCount,
      completionPercent: overallTotalQuestions > 0
        ? Math.round((overallAnsweredCount / overallTotalQuestions) * 100)
        : 0,
      totalPoints: overallTotalPoints,
      averageScore: overallAverageScore,
      maturity: getBusinessDiagnosisMaturity(overallAverageScore),
    },
  };
};
