import type { DiagnosisQuestionsMap, DiagnosisSectionsMap } from '../businessDiagnosisScoring';
import { buildBusinessDiagnosisQuestionDefinitions } from './questionDefinitions';
import {
  applyPillarTitles,
  buildDiagnosisQuestionResults,
  buildScoreReportFromEnginePillars,
} from './scoring';
import { aggregateDiagnosisTags } from './tagExtraction';
import { matchDiagnosisPatterns } from './patternRules';
import {
  buildCompletenessNote,
  buildCrossRead,
  buildDiagnosisInsights,
  buildDiagnosisRoadmap,
  buildExecutiveSummary,
} from './insightBuilder';
import type { BusinessDiagnosisEngineReport, DiagnosisPillar } from './types';

export type { BusinessDiagnosisEngineReport, DiagnosisInsight, DiagnosisInsightType } from './types';

const getConfidenceScore = (
  pillars: BusinessDiagnosisEngineReport['pillars'],
) => {
  const evaluativeQuestions = pillars.reduce((sum, pillar) => sum + pillar.evaluativeQuestions, 0);
  const evaluativeAnswered = pillars.reduce((sum, pillar) => sum + pillar.evaluativeAnsweredCount, 0);
  const contextualQuestions = pillars.reduce((sum, pillar) => sum + pillar.contextualQuestions, 0);
  const contextualAnswered = pillars.reduce((sum, pillar) => sum + pillar.contextualAnsweredCount, 0);

  if (evaluativeQuestions <= 0 && contextualQuestions <= 0) {
    return 0;
  }

  const evaluativeCompletion = evaluativeQuestions > 0 ? evaluativeAnswered / evaluativeQuestions : 0;
  const contextualCompletion = contextualQuestions > 0 ? contextualAnswered / contextualQuestions : evaluativeCompletion;

  return Math.round(((evaluativeCompletion * 0.82) + (contextualCompletion * 0.18)) * 100);
};

export const buildBusinessDiagnosisEngineReport = ({
  questions,
  sections,
  pillarTitles,
  locale,
}: {
  questions: DiagnosisQuestionsMap;
  sections: DiagnosisSectionsMap;
  pillarTitles?: Partial<Record<DiagnosisPillar, string>>;
  locale: string;
}): BusinessDiagnosisEngineReport => {
  const definitions = buildBusinessDiagnosisQuestionDefinitions(questions);
  const { context, pillars: rawPillars } = buildDiagnosisQuestionResults(definitions, sections);
  const pillars = applyPillarTitles(rawPillars, pillarTitles);
  const scoreReport = buildScoreReportFromEnginePillars(pillars, questions);
  const tags = aggregateDiagnosisTags(pillars);
  const patterns = matchDiagnosisPatterns({ tags, pillars, context });
  const confidenceScore = getConfidenceScore(pillars);
  const { insights, labels } = buildDiagnosisInsights({
    patterns,
    tags,
    pillars,
    locale,
    confidenceScore,
  });
  const roadmap = buildDiagnosisRoadmap({ insights, locale });
  const executiveSummary = buildExecutiveSummary({
    score: scoreReport.overall.averageScore,
    confidenceScore,
    insights,
    locale,
  });
  const crossRead = buildCrossRead({
    pillars,
    tags,
    patterns,
    locale,
  });
  const completenessNote = buildCompletenessNote({
    answeredCount: scoreReport.overall.answeredCount,
    totalQuestions: scoreReport.overall.totalQuestions,
    confidenceScore,
    locale,
  });

  return {
    context,
    scoreReport,
    pillars,
    tags,
    patterns,
    insights,
    roadmap,
    executiveSummary,
    crossRead,
    completenessNote,
    confidenceScore,
    labels,
  };
};
