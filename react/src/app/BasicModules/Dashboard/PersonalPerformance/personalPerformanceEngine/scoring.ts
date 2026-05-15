import type {
  PerformanceQuestionsMap,
  PerformanceSectionsMap,
  PersonalPerformanceScoreReport,
} from '../personalPerformanceScoring';
import { getPersonalPerformanceLevel } from '../personalPerformanceScoring';
import type {
  HumanPerformanceSection,
  HumanQuestionDefinition,
  HumanQuestionResult,
  HumanSectionEngineScore,
} from './types';

const SECTION_ORDER: HumanPerformanceSection[] = [
  'sleep_recovery',
  'nutrition_energy',
  'stress_clarity',
  'balance_sustainability',
];

const getSelectedOptionIndex = (
  answers: Record<number, number>,
  questionIndex: number,
) => (
  typeof answers[questionIndex] === 'number' ? answers[questionIndex] : null
);

const getWeightedAverage = (questions: HumanQuestionResult[]) => {
  const answeredQuestions = questions.filter((question) => question.score !== null);
  const totalWeight = answeredQuestions.reduce((sum, question) => sum + question.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  const weightedScore = answeredQuestions.reduce((sum, question) => (
    sum + ((question.score ?? 0) * question.weight)
  ), 0);

  return Math.round(weightedScore / totalWeight);
};

export const buildHumanQuestionResults = (
  definitions: Record<HumanPerformanceSection, HumanQuestionDefinition[]>,
  sections: PerformanceSectionsMap,
): HumanSectionEngineScore[] => (
  SECTION_ORDER.map((sectionKey) => {
    const sectionAnswers = sections[sectionKey]?.answers ?? {};
    const questionResults = definitions[sectionKey].map<HumanQuestionResult>((question, questionIndex) => {
      const selectedOptionIndex = getSelectedOptionIndex(sectionAnswers, questionIndex);
      const selectedOption = selectedOptionIndex === null ? undefined : question.options[selectedOptionIndex];

      return {
        id: question.id,
        section: sectionKey,
        index: question.index,
        question: question.label,
        selectedOptionIndex,
        selectedOptionId: selectedOption?.id ?? null,
        selectedOptionLabel: selectedOption?.label ?? null,
        score: selectedOption?.score ?? null,
        function: question.function,
        role: question.role,
        dimension: question.dimension,
        weight: question.weight,
        severityWeight: question.severityWeight,
        tags: selectedOption?.tags ?? [],
      };
    });

    const totalQuestions = questionResults.length;
    const answeredCount = questionResults.filter((question) => question.selectedOptionIndex !== null).length;
    const averageScore = getWeightedAverage(questionResults);

    return {
      key: sectionKey,
      title: sectionKey,
      totalQuestions,
      answeredCount,
      completionPercent: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      averageScore,
      level: getPersonalPerformanceLevel(averageScore),
      questions: questionResults,
    };
  })
);

export const applySectionTitles = (
  sections: HumanSectionEngineScore[],
  sectionTitles?: Partial<Record<HumanPerformanceSection, string>>,
): HumanSectionEngineScore[] => (
  sections.map((section) => ({
    ...section,
    title: sectionTitles?.[section.key] ?? section.title,
  }))
);

export const buildScoreReportFromHumanSections = (
  sections: HumanSectionEngineScore[],
  sourceQuestions: PerformanceQuestionsMap,
): PersonalPerformanceScoreReport => {
  const reportSections = sections.map((section) => {
    const questionScores = section.questions.map((question) => ({
      index: question.index,
      question: question.question,
      selectedOptionIndex: question.selectedOptionIndex,
      selectedOptionValue: question.selectedOptionIndex === null ? null : question.selectedOptionIndex + 1,
      selectedOptionLabel: question.selectedOptionLabel,
      points: question.score ?? 0,
      maxPoints: 100,
    }));
    const totalPoints = questionScores.reduce((sum, question) => sum + question.points, 0);

    return {
      key: section.key,
      title: section.title,
      totalQuestions: sourceQuestions[section.key]?.length ?? section.totalQuestions,
      answeredCount: section.answeredCount,
      completionPercent: section.completionPercent,
      totalPoints,
      averageScore: section.averageScore,
      level: section.level,
      questions: questionScores,
    };
  });

  const answeredQuestions = sections.flatMap((section) => (
    section.questions.filter((question) => question.score !== null)
  ));
  const overallWeight = answeredQuestions.reduce((sum, question) => sum + question.weight, 0);
  const overallAverageScore = overallWeight > 0
    ? Math.round(answeredQuestions.reduce((sum, question) => (
      sum + ((question.score ?? 0) * question.weight)
    ), 0) / overallWeight)
    : 0;
  const overallTotalQuestions = reportSections.reduce((sum, section) => sum + section.totalQuestions, 0);
  const overallAnsweredCount = reportSections.reduce((sum, section) => sum + section.answeredCount, 0);
  const overallTotalPoints = answeredQuestions.reduce((sum, question) => sum + (question.score ?? 0), 0);

  return {
    sections: reportSections,
    overall: {
      totalQuestions: overallTotalQuestions,
      answeredCount: overallAnsweredCount,
      completionPercent: overallTotalQuestions > 0
        ? Math.round((overallAnsweredCount / overallTotalQuestions) * 100)
        : 0,
      totalPoints: overallTotalPoints,
      averageScore: overallAverageScore,
      level: getPersonalPerformanceLevel(overallAverageScore),
    },
  };
};
