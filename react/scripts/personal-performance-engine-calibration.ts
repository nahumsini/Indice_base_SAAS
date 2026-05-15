import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildPersonalPerformanceEngineReport } from '../src/app/BasicModules/Dashboard/PersonalPerformance/personalPerformanceEngine';
import type {
  PerformanceQuestionsMap,
  PerformanceSectionsMap,
} from '../src/app/BasicModules/Dashboard/PersonalPerformance/personalPerformanceScoring';

type AnswerSet = Partial<Record<keyof PerformanceQuestionsMap, Array<number | null>>>;

type CalibrationCase = {
  id: string;
  title: string;
  hypothesis: string;
  answers: AnswerSet;
  expected: {
    maxConfidence?: number;
    maxScore?: number;
    minConfidence?: number;
    minScore?: number;
    patterns?: string[];
    profile?: string;
    tags?: string[];
  };
};

const optionSet = ['Low', 'Mid low', 'Mid high', 'High'];

const buildQuestions = (prefix: string): Array<{ question: string; options: string[] }> => (
  Array.from({ length: 10 }, (_, index) => ({
    question: `${prefix} ${index + 1}`,
    options: optionSet,
  }))
);

const questions: PerformanceQuestionsMap = {
  sleep_recovery: buildQuestions('Sleep'),
  nutrition_energy: buildQuestions('Energy'),
  stress_clarity: buildQuestions('Clarity'),
  balance_sustainability: buildQuestions('Sustainability'),
};

const sectionTitles = {
  sleep_recovery: 'Sueño y recuperación',
  nutrition_energy: 'Nutrición y energía',
  stress_clarity: 'Estrés y claridad',
  balance_sustainability: 'Balance y sostenibilidad',
};

const strong = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const functional = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

const cases: CalibrationCase[] = [
  {
    id: 'unclosed-recovery-cycle',
    title: 'Ciclos de recuperación abiertos',
    hypothesis: 'Debe detectar baja recuperación combinada con ansiedad y desconexión difícil.',
    answers: {
      sleep_recovery: [0, 0, 1, 1, 0, 1, 0, 1, 1, 0],
      nutrition_energy: functional,
      stress_clarity: [1, 1, 1, 0, 1, 0, 0, 1, 2, 1],
      balance_sustainability: functional,
    },
    expected: {
      maxScore: 70,
      minConfidence: 95,
      patterns: ['unclosed_recovery_cycles'],
      profile: 'recuperacion_insuficiente',
      tags: ['baja_recuperacion', 'dificultad_desconexion'],
    },
  },
  {
    id: 'high-performer-fatigued',
    title: 'Alto rendimiento fatigado',
    hypothesis: 'Debe mantener score alto, pero perfilar fatiga oculta por señales críticas aisladas.',
    answers: {
      sleep_recovery: [3, 3, 3, 3, 3, 2, 3, 3, 1, 3],
      nutrition_energy: strong,
      stress_clarity: [3, 3, 3, 3, 3, 2, 2, 3, 3, 3],
      balance_sustainability: [3, 3, 3, 2, 3, 3, 3, 3, 0, 3],
    },
    expected: {
      minScore: 80,
      minConfidence: 95,
      profile: 'alto_rendimiento_fatigado',
      tags: ['riesgo_burnout'],
    },
  },
  {
    id: 'pressure-based-performance',
    title: 'Rendimiento sostenido por presión',
    hypothesis: 'Debe detectar presión y disciplina como motor cuando energía es buena pero claridad/balance son débiles.',
    answers: {
      sleep_recovery: functional,
      nutrition_energy: strong,
      stress_clarity: [1, 1, 1, 1, 1, 2, 2, 1, 2, 1],
      balance_sustainability: [2, 2, 2, 0, 0, 2, 2, 1, 1, 1],
    },
    expected: {
      maxScore: 78,
      minConfidence: 95,
      patterns: ['pressure_based_performance'],
      profile: 'saturado_compensatorio',
      tags: ['productividad_por_presion', 'dependencia_voluntad'],
    },
  },
  {
    id: 'presence-dependency',
    title: 'Dependencia de disponibilidad continua',
    hypothesis: 'Debe detectar operación personal no escalable por presencia, fines de semana y pocas pausas.',
    answers: {
      sleep_recovery: functional,
      nutrition_energy: [2, 2, 2, 2, 2, 2, 2, 0, 2, 2],
      stress_clarity: functional,
      balance_sustainability: [0, 0, 1, 2, 1, 0, 1, 0, 1, 1],
    },
    expected: {
      maxScore: 75,
      minConfidence: 95,
      patterns: ['personal_operation_not_scalable'],
      tags: ['dependencia_presencia', 'limites_debiles'],
    },
  },
  {
    id: 'sustainable-disciplined',
    title: 'Disciplinado sostenible',
    hypothesis: 'Debe detectar base sana y evitar dramatizar recomendaciones.',
    answers: {
      sleep_recovery: strong,
      nutrition_energy: strong,
      stress_clarity: strong,
      balance_sustainability: strong,
    },
    expected: {
      minScore: 95,
      minConfidence: 95,
      profile: 'disciplinado_sostenible',
    },
  },
  {
    id: 'incomplete-assessment',
    title: 'Evaluación incompleta',
    hypothesis: 'Debe bajar confianza y evitar conclusiones fuertes.',
    answers: {
      sleep_recovery: [0, 1, null, null, null, null, null, null, null, null],
      nutrition_energy: [null, null, null, null, null, null, null, null, null, null],
      stress_clarity: [1, null, null, null, null, null, null, null, null, null],
      balance_sustainability: [null, null, null, null, null, null, null, null, null, null],
    },
    expected: {
      maxConfidence: 10,
      tags: ['baja_recuperacion'],
    },
  },
];

const buildSections = (answers: AnswerSet): PerformanceSectionsMap => {
  const buildSection = (section: keyof PerformanceQuestionsMap) => ({
    answers: (answers[section] ?? []).reduce<Record<number, number>>((result, answer, index) => {
      if (typeof answer === 'number') {
        result[index] = answer;
      }

      return result;
    }, {}),
  });

  return {
    sleep_recovery: buildSection('sleep_recovery'),
    nutrition_energy: buildSection('nutrition_energy'),
    stress_clarity: buildSection('stress_clarity'),
    balance_sustainability: buildSection('balance_sustainability'),
  };
};

const assertIncludes = (actual: string[], expected: string[], label: string, caseTitle: string) => {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length > 0) {
    throw new Error(`${caseTitle}: faltan ${label}: ${missing.join(', ')}`);
  }
};

const validateCase = (calibrationCase: CalibrationCase, report: ReturnType<typeof buildPersonalPerformanceEngineReport>) => {
  const { expected } = calibrationCase;
  const score = report.scoreReport.overall.averageScore;

  if (expected.maxScore !== undefined && score > expected.maxScore) {
    throw new Error(`${calibrationCase.title}: score ${score} supera máximo esperado ${expected.maxScore}`);
  }

  if (expected.minScore !== undefined && score < expected.minScore) {
    throw new Error(`${calibrationCase.title}: score ${score} está debajo del mínimo esperado ${expected.minScore}`);
  }

  if (expected.maxConfidence !== undefined && report.confidenceScore > expected.maxConfidence) {
    throw new Error(`${calibrationCase.title}: confianza ${report.confidenceScore} supera máximo esperado ${expected.maxConfidence}`);
  }

  if (expected.minConfidence !== undefined && report.confidenceScore < expected.minConfidence) {
    throw new Error(`${calibrationCase.title}: confianza ${report.confidenceScore} está debajo del mínimo esperado ${expected.minConfidence}`);
  }

  if (expected.profile && report.profile.id !== expected.profile) {
    throw new Error(`${calibrationCase.title}: perfil ${report.profile.id} no coincide con ${expected.profile}`);
  }

  if (expected.tags) {
    assertIncludes(report.tags.map((tag) => tag.id), expected.tags, 'tags', calibrationCase.title);
  }

  if (expected.patterns) {
    assertIncludes(report.patterns.map((pattern) => pattern.id), expected.patterns, 'patrones', calibrationCase.title);
  }
};

const formatList = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const buildMarkdownCase = (calibrationCase: CalibrationCase, report: ReturnType<typeof buildPersonalPerformanceEngineReport>) => {
  const sectionScores = report.sections.map((section) => `${section.title}: ${section.averageScore}/100`).join(' · ');
  const topTags = report.tags.slice(0, 7).map((tag) => `${tag.label} (${tag.priorityScore})`);
  const patterns = report.patterns.map((pattern) => `${pattern.title}: ${pattern.message}`);
  const insights = report.insights.slice(0, 9).map((insight) => (
    `${insight.title}: ${insight.message} Acción: ${insight.recommendedAction}`
  ));
  const roadmap = report.roadmap.map((item) => `${item.label} - ${item.title}: ${item.body}`);

  return [
    `## ${calibrationCase.title}`,
    '',
    `Hipótesis: ${calibrationCase.hypothesis}`,
    '',
    `Score: ${report.scoreReport.overall.averageScore}/100`,
    `Confianza: ${report.confidenceScore}%`,
    `Perfil: ${report.profile.title} (${report.profile.id})`,
    `Áreas: ${sectionScores}`,
    '',
    '### Tags principales',
    topTags.length ? formatList(topTags) : '- Sin tags relevantes',
    '',
    '### Patrones detectados',
    patterns.length ? formatList(patterns) : '- Sin patrones críticos detectados',
    '',
    '### Insights',
    insights.length ? formatList(insights) : '- Sin insights',
    '',
    '### Roadmap',
    roadmap.length ? formatList(roadmap) : '- Sin roadmap',
    '',
  ].join('\n');
};

const main = async () => {
  const reports = cases.map((calibrationCase) => {
    const report = buildPersonalPerformanceEngineReport({
      questions,
      sections: buildSections(calibrationCase.answers),
      sectionTitles,
      locale: 'es-MX',
    });

    validateCase(calibrationCase, report);

    return buildMarkdownCase(calibrationCase, report);
  });

  const output = [
    '# Calibración del motor IRP',
    '',
    'Casos sintéticos para revisar pesos, tags, patrones y perfiles operativos humanos.',
    '',
    ...reports,
  ].join('\n');
  const reportDir = resolve(process.cwd(), 'reports');
  await mkdir(reportDir, { recursive: true });
  await writeFile(resolve(reportDir, 'personal-performance-calibration.md'), output);

  console.log(`Personal Performance calibration passed (${cases.length} cases).`);
};

void main();
