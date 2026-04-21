import type { BusinessProfileSectionKey } from '../../../api/HomePanel/BusinessProfile/businessProfile';

export type DiagnosisQuestionDefinition = {
  question: string;
  options: string[];
};

export type DiagnosisSectionState = {
  answers: Record<number, number>;
};

export type DiagnosisQuestionsMap = Record<BusinessProfileSectionKey, DiagnosisQuestionDefinition[]>;
export type DiagnosisSectionsMap = Record<BusinessProfileSectionKey, DiagnosisSectionState>;

export type DiagnosisMaturity = {
  level: number;
  name: string;
};

export type DiagnosisQuestionScore = {
  index: number;
  question: string;
  selectedOptionIndex: number | null;
  selectedOptionValue: number | null;
  selectedOptionLabel: string | null;
  points: number;
  maxPoints: number;
};

export type DiagnosisPillarScore = {
  key: BusinessProfileSectionKey;
  title: string;
  totalQuestions: number;
  answeredCount: number;
  completionPercent: number;
  totalPoints: number;
  averageScore: number;
  maturity: DiagnosisMaturity;
  questions: DiagnosisQuestionScore[];
};

export type BusinessDiagnosisScoreReport = {
  pillars: DiagnosisPillarScore[];
  overall: {
    totalQuestions: number;
    answeredCount: number;
    completionPercent: number;
    totalPoints: number;
    averageScore: number;
    maturity: DiagnosisMaturity;
  };
};

const POINTS_BY_OPTION_VALUE: Record<number, number> = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

const PILLAR_ORDER: BusinessProfileSectionKey[] = ['people', 'processes', 'products', 'finance'];

const MATURITY_LEVELS: Array<{ max: number; level: number; name: string }> = [
  { max: 40, level: 1, name: 'Chaos' },
  { max: 60, level: 2, name: 'Survival' },
  { max: 75, level: 3, name: 'Organized' },
  { max: 90, level: 4, name: 'Scalable' },
  { max: 100, level: 5, name: 'Pro Company' },
];

const getOptionValueFromAnswerIndex = (answerIndex: number | null) => (
  answerIndex === null ? null : answerIndex + 1
);

const getPointsFromOptionValue = (optionValue: number | null) => (
  optionValue === null ? 0 : (POINTS_BY_OPTION_VALUE[optionValue] ?? 0)
);

export const getBusinessDiagnosisMaturity = (score: number): DiagnosisMaturity => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const match = MATURITY_LEVELS.find((level) => normalizedScore <= level.max) ?? MATURITY_LEVELS[MATURITY_LEVELS.length - 1];

  return {
    level: match.level,
    name: match.name,
  };
};

export const buildBusinessDiagnosisScoreReport = ({
  questions,
  sections,
  pillarTitles,
}: {
  questions: DiagnosisQuestionsMap;
  sections: DiagnosisSectionsMap;
  pillarTitles?: Partial<Record<BusinessProfileSectionKey, string>>;
}): BusinessDiagnosisScoreReport => {
  const pillars = PILLAR_ORDER.map((pillarKey) => {
    const pillarQuestions = questions[pillarKey] ?? [];
    const pillarAnswers = sections[pillarKey]?.answers ?? {};

    const questionScores = pillarQuestions.map((question, questionIndex) => {
      const selectedOptionIndex = typeof pillarAnswers[questionIndex] === 'number'
        ? pillarAnswers[questionIndex]
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
    const totalQuestions = pillarQuestions.length;
    const totalPoints = questionScores.reduce((sum, question) => sum + question.points, 0);
    const averageScore = answeredCount > 0 ? Math.round(totalPoints / answeredCount) : 0;
    const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    return {
      key: pillarKey,
      title: pillarTitles?.[pillarKey] ?? pillarKey,
      totalQuestions,
      answeredCount,
      completionPercent,
      totalPoints,
      averageScore,
      maturity: getBusinessDiagnosisMaturity(averageScore),
      questions: questionScores,
    };
  });

  const overallAnsweredCount = pillars.reduce((sum, pillar) => sum + pillar.answeredCount, 0);
  const overallTotalQuestions = pillars.reduce((sum, pillar) => sum + pillar.totalQuestions, 0);
  const overallTotalPoints = pillars.reduce((sum, pillar) => sum + pillar.totalPoints, 0);
  const overallAverageScore = overallAnsweredCount > 0 ? Math.round(overallTotalPoints / overallAnsweredCount) : 0;
  const overallCompletionPercent = overallTotalQuestions > 0
    ? Math.round((overallAnsweredCount / overallTotalQuestions) * 100)
    : 0;

  return {
    pillars,
    overall: {
      totalQuestions: overallTotalQuestions,
      answeredCount: overallAnsweredCount,
      completionPercent: overallCompletionPercent,
      totalPoints: overallTotalPoints,
      averageScore: overallAverageScore,
      maturity: getBusinessDiagnosisMaturity(overallAverageScore),
    },
  };
};
