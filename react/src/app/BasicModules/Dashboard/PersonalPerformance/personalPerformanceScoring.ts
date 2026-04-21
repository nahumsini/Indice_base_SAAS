import type { PersonalPerformanceSectionKey } from '../../../api/HomePanel/PersonalPerformance/personalPerformance';

export type PerformanceQuestionDefinition = {
  question: string;
  options: string[];
};

export type PerformanceSectionState = {
  answers: Record<number, number>;
};

export type PerformanceQuestionsMap = Record<PersonalPerformanceSectionKey, PerformanceQuestionDefinition[]>;
export type PerformanceSectionsMap = Record<PersonalPerformanceSectionKey, PerformanceSectionState>;

export type PerformanceLevel = {
  level: number;
  name: string;
};

export type PerformanceQuestionScore = {
  index: number;
  question: string;
  selectedOptionIndex: number | null;
  selectedOptionValue: number | null;
  selectedOptionLabel: string | null;
  points: number;
  maxPoints: number;
};

export type PerformanceSectionScore = {
  key: PersonalPerformanceSectionKey;
  title: string;
  totalQuestions: number;
  answeredCount: number;
  completionPercent: number;
  totalPoints: number;
  averageScore: number;
  level: PerformanceLevel;
  questions: PerformanceQuestionScore[];
};

export type PersonalPerformanceScoreReport = {
  sections: PerformanceSectionScore[];
  overall: {
    totalQuestions: number;
    answeredCount: number;
    completionPercent: number;
    totalPoints: number;
    averageScore: number;
    level: PerformanceLevel;
  };
};

const POINTS_BY_OPTION_VALUE: Record<number, number> = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

const SECTION_ORDER: PersonalPerformanceSectionKey[] = [
  'sleep_recovery',
  'nutrition_energy',
  'stress_clarity',
  'balance_sustainability',
];

const LEVELS: Array<{ max: number; level: number; name: string }> = [
  { max: 40, level: 1, name: 'Critical' },
  { max: 60, level: 2, name: 'Unstable' },
  { max: 75, level: 3, name: 'Functional' },
  { max: 90, level: 4, name: 'Healthy' },
  { max: 100, level: 5, name: 'High Performance' },
];

const getOptionValueFromAnswerIndex = (answerIndex: number | null) => (
  answerIndex === null ? null : answerIndex + 1
);

const getPointsFromOptionValue = (optionValue: number | null) => (
  optionValue === null ? 0 : (POINTS_BY_OPTION_VALUE[optionValue] ?? 0)
);

export const getPersonalPerformanceLevel = (score: number): PerformanceLevel => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const match = LEVELS.find((level) => normalizedScore <= level.max) ?? LEVELS[LEVELS.length - 1];

  return {
    level: match.level,
    name: match.name,
  };
};

export const buildPersonalPerformanceScoreReport = ({
  questions,
  sections,
  sectionTitles,
}: {
  questions: PerformanceQuestionsMap;
  sections: PerformanceSectionsMap;
  sectionTitles?: Partial<Record<PersonalPerformanceSectionKey, string>>;
}): PersonalPerformanceScoreReport => {
  const scoredSections = SECTION_ORDER.map((sectionKey) => {
    const sectionQuestions = questions[sectionKey] ?? [];
    const sectionAnswers = sections[sectionKey]?.answers ?? {};

    const questionScores = sectionQuestions.map((question, questionIndex) => {
      const selectedOptionIndex = typeof sectionAnswers[questionIndex] === 'number'
        ? sectionAnswers[questionIndex]
        : null;
      const selectedOptionValue = getOptionValueFromAnswerIndex(selectedOptionIndex);
      const points = getPointsFromOptionValue(selectedOptionValue);

      return {
        index: questionIndex + 1,
        question: question.question,
        selectedOptionIndex,
        selectedOptionValue,
        selectedOptionLabel: selectedOptionIndex === null ? null : (question.options[selectedOptionIndex] ?? null),
        points,
        maxPoints: 100,
      };
    });

    const answeredCount = questionScores.filter((question) => question.selectedOptionValue !== null).length;
    const totalQuestions = sectionQuestions.length;
    const totalPoints = questionScores.reduce((sum, question) => sum + question.points, 0);
    const averageScore = answeredCount > 0 ? Math.round(totalPoints / answeredCount) : 0;
    const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    return {
      key: sectionKey,
      title: sectionTitles?.[sectionKey] ?? sectionKey,
      totalQuestions,
      answeredCount,
      completionPercent,
      totalPoints,
      averageScore,
      level: getPersonalPerformanceLevel(averageScore),
      questions: questionScores,
    };
  });

  const overallAnsweredCount = scoredSections.reduce((sum, section) => sum + section.answeredCount, 0);
  const overallTotalQuestions = scoredSections.reduce((sum, section) => sum + section.totalQuestions, 0);
  const overallTotalPoints = scoredSections.reduce((sum, section) => sum + section.totalPoints, 0);
  const overallAverageScore = overallAnsweredCount > 0 ? Math.round(overallTotalPoints / overallAnsweredCount) : 0;
  const overallCompletionPercent = overallTotalQuestions > 0
    ? Math.round((overallAnsweredCount / overallTotalQuestions) * 100)
    : 0;

  return {
    sections: scoredSections,
    overall: {
      totalQuestions: overallTotalQuestions,
      answeredCount: overallAnsweredCount,
      completionPercent: overallCompletionPercent,
      totalPoints: overallTotalPoints,
      averageScore: overallAverageScore,
      level: getPersonalPerformanceLevel(overallAverageScore),
    },
  };
};

