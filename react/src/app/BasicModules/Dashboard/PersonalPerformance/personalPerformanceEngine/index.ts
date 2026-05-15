import type {
  PerformanceQuestionsMap,
  PerformanceSectionsMap,
} from '../personalPerformanceScoring';
import { buildPersonalPerformanceQuestionDefinitions } from './questionDefinitions';
import {
  applySectionTitles,
  buildHumanQuestionResults,
  buildScoreReportFromHumanSections,
} from './scoring';
import { aggregateHumanPerformanceTags } from './tagExtraction';
import { matchHumanPerformancePatterns } from './patternRules';
import { detectHumanOperationalProfile } from './profileRules';
import {
  buildHumanCompletenessNote,
  buildHumanCrossRead,
  buildHumanExecutiveSummary,
  buildHumanPerformanceInsights,
  buildHumanPerformanceRoadmap,
} from './insightBuilder';
import type {
  HumanPerformanceSection,
  PersonalPerformanceEngineReport,
} from './types';

export type {
  AggregatedHumanTag,
  HumanInsightType,
  HumanOperationalProfile,
  HumanPerformanceInsight,
  HumanPerformanceRoadmapItem,
  PersonalPerformanceEngineReport,
} from './types';

const getConfidenceScore = (
  sections: PersonalPerformanceEngineReport['sections'],
) => {
  const totalQuestions = sections.reduce((sum, section) => sum + section.totalQuestions, 0);
  const answeredCount = sections.reduce((sum, section) => sum + section.answeredCount, 0);

  if (totalQuestions <= 0) {
    return 0;
  }

  return Math.round((answeredCount / totalQuestions) * 100);
};

export const buildPersonalPerformanceEngineReport = ({
  questions,
  sections,
  sectionTitles,
  locale,
}: {
  questions: PerformanceQuestionsMap;
  sections: PerformanceSectionsMap;
  sectionTitles?: Partial<Record<HumanPerformanceSection, string>>;
  locale: string;
}): PersonalPerformanceEngineReport => {
  const definitions = buildPersonalPerformanceQuestionDefinitions(questions);
  const rawSections = buildHumanQuestionResults(definitions, sections);
  const scoredSections = applySectionTitles(rawSections, sectionTitles);
  const scoreReport = buildScoreReportFromHumanSections(scoredSections, questions);
  const tags = aggregateHumanPerformanceTags(scoredSections, locale);
  const patterns = matchHumanPerformancePatterns({
    tags,
    sections: scoredSections,
    overallScore: scoreReport.overall.averageScore,
    locale,
  });
  const confidenceScore = getConfidenceScore(scoredSections);
  const profile = detectHumanOperationalProfile({
    tags,
    patterns,
    sections: scoredSections,
    overallScore: scoreReport.overall.averageScore,
    locale,
  });
  const { insights, labels } = buildHumanPerformanceInsights({
    patterns,
    tags,
    profile,
    confidenceScore,
    locale,
  });
  const roadmap = buildHumanPerformanceRoadmap({
    insights,
    profile,
    locale,
  });
  const executiveSummary = buildHumanExecutiveSummary({
    profile,
    insights,
    confidenceScore,
    locale,
  });
  const crossRead = buildHumanCrossRead({
    profile,
    patterns,
    locale,
  });
  const completenessNote = buildHumanCompletenessNote({
    answeredCount: scoreReport.overall.answeredCount,
    totalQuestions: scoreReport.overall.totalQuestions,
    confidenceScore,
    locale,
  });

  return {
    scoreReport,
    sections: scoredSections,
    tags,
    patterns,
    profile,
    insights,
    roadmap,
    executiveSummary,
    crossRead,
    completenessNote,
    confidenceScore,
    labels,
  };
};
