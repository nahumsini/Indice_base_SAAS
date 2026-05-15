import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildBusinessDiagnosisEngineReport } from '../src/app/BasicModules/Dashboard/BusinessProfile/diagnosisEngine';
import type { DiagnosisQuestionsMap, DiagnosisSectionsMap } from '../src/app/BasicModules/Dashboard/BusinessProfile/businessDiagnosisScoring';

type AnswerSet = Partial<Record<keyof DiagnosisQuestionsMap, Array<number | null>>>;

type CalibrationCase = {
  id: string;
  title: string;
  hypothesis: string;
  answers: AnswerSet;
  expected: {
    maxScore?: number;
    minScore?: number;
    maxConfidence?: number;
    minConfidence?: number;
    tags?: string[];
    patterns?: string[];
  };
};

const questions: DiagnosisQuestionsMap = {
  people: [
    { question: '¿Cuál es tu rol principal?', options: ['Fundador/CEO', 'Operaciones', 'Finanzas', 'Comercial/Otro'] },
    { question: '¿Cuántas personas trabajan?', options: ['Solo yo', '2 a 5', '6 a 20', '21 o más'] },
    { question: '¿Cómo está organizado tu equipo?', options: ['Sin estructura', 'Roles básicos', 'Áreas definidas', 'Organigrama formal'] },
    { question: '¿Cómo asignan tareas?', options: ['Improvisado', 'Listas', 'Asignación estructurada', 'Sistema de gestión'] },
    { question: '¿Revisión de desempeño?', options: ['Nunca', 'Por problemas', 'Semanal', 'Con KPIs'] },
    { question: '¿Delegación?', options: ['Hago todo', 'Delego y superviso', 'Delego con control', 'Equipo autónomo'] },
    { question: '¿Comunicación interna?', options: ['Informal', 'Chat', 'Reuniones', 'Herramientas formales'] },
    { question: '¿Frecuencia de reuniones?', options: ['Nunca', 'Esporádico', 'Semanal', 'Frecuente'] },
    { question: '¿Claridad de responsabilidades?', options: ['Nada clara', 'Algo clara', 'Bastante clara', 'Totalmente clara'] },
    { question: '¿Facilidad de integración?', options: ['Muy difícil', 'Difícil', 'Moderado', 'Fácil'] },
  ],
  processes: [
    { question: '¿Procesos documentados?', options: ['Nada', 'Algunos', 'Mayoría', 'Totalmente'] },
    { question: '¿Gestión de tareas?', options: ['Improvisado', 'Listas', 'Herramientas', 'Sistema formal'] },
    { question: '¿Monitoreo de avance?', options: ['No se monitorea', 'Ocasional', 'Reportes', 'KPIs'] },
    { question: '¿Automatización?', options: ['Manual', 'Herramientas aisladas', 'Automatización parcial', 'Alta automatización'] },
    { question: '¿Replicabilidad?', options: ['Muy difícil', 'Con esfuerzo', 'Posible', 'Fácil'] },
    { question: '¿Dónde se pierde tiempo?', options: ['Manual', 'Coordinación', 'Información', 'Seguimiento'] },
    { question: '¿Dependencia de personas?', options: ['Total', 'Bastante', 'Algo', 'Poco'] },
    { question: '¿Claridad de procesos?', options: ['Nada claros', 'Algo claros', 'Bastante claros', 'Totalmente claros'] },
    { question: '¿Gestión de errores?', options: ['Reacción', 'Informal', 'Revisión', 'Mejora continua'] },
    { question: '¿Escalabilidad?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
  ],
  products: [
    { question: '¿Qué vendes?', options: ['Servicios', 'Productos', 'Digital', 'Mixto'] },
    { question: '¿Tipo de cliente?', options: ['B2C', 'B2B', 'Gobierno', 'Mixto'] },
    { question: '¿Ingresos principales?', options: ['Venta directa', 'Servicios', 'Suscripción', 'Contratos'] },
    { question: '¿Diversificación?', options: ['Uno', 'Algunos', 'Varias líneas', 'Amplio'] },
    { question: '¿Definición de precios?', options: ['Intuición', 'Competencia', 'Costos', 'Estrategia'] },
    { question: '¿Seguimiento desempeño?', options: ['No se mide', 'Solo ventas', 'Ventas+rentabilidad', 'Indicadores'] },
    { question: '¿Propuesta de valor?', options: ['No clara', 'Algo clara', 'Bastante clara', 'Muy clara'] },
    { question: '¿Feedback cliente?', options: ['No hay', 'Informal', 'Encuestas', 'Análisis'] },
    { question: '¿Evolución producto?', options: ['Sobre la marcha', 'Cambios ocasionales', 'Planes', 'Roadmap'] },
    { question: '¿Prioridad comercial?', options: ['Clientes', 'Ventas actuales', 'Rentabilidad', 'Escalar'] },
  ],
  finance: [
    { question: '¿Control financiero?', options: ['No estructurado', 'Excel', 'Software', 'Sistema integrado'] },
    { question: '¿Revisión de números?', options: ['Nunca', 'Mensual', 'Semanal', 'Diario'] },
    { question: '¿Flujo de efectivo?', options: ['No controlado', 'Reacción', 'Revisión', 'Proyección'] },
    { question: '¿Costos claros?', options: ['No claros', 'Aproximados', 'Bastante claros', 'Control total'] },
    { question: '¿Margen?', options: ['No sé', 'Estimado', 'Claro', 'Totalmente medido'] },
    { question: '¿Decisiones financieras?', options: ['Intuición', 'Experiencia', 'Datos', 'Modelos'] },
    { question: '¿Ingresos predecibles?', options: ['Muy variables', 'Variables', 'Estables', 'Muy estables'] },
    { question: '¿Gestión de deuda?', options: ['Sin control', 'Básico', 'Estrategia', 'Optimizado'] },
    { question: '¿Preparación ante crisis?', options: ['Nula', 'Baja', 'Media', 'Alta'] },
    { question: '¿Cumplimiento fiscal?', options: ['Sin control', 'Retrasos', 'Al día', 'Estrategia fiscal'] },
  ],
};

const pillarTitles = {
  people: 'Personas',
  processes: 'Procesos',
  products: 'Productos',
  finance: 'Finanzas',
};

const cases: CalibrationCase[] = [
  {
    id: 'informal-founder-led',
    title: 'Operacion informal con fundador saturado',
    hypothesis: 'Debe detectar dependencia del fundador, coordinacion informal y techo operativo.',
    answers: {
      people: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
      processes: [0, 1, 1, 0, 0, 3, 0, 0, 0, 0],
      products: [0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
      finance: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    expected: {
      maxScore: 55,
      minConfidence: 95,
      tags: ['dependencia_fundador', 'seguimiento_manual', 'responsabilidades_poco_claras'],
      patterns: ['informal_coordination_dependency', 'founder_operating_ceiling'],
    },
  },
  {
    id: 'sales-good-finance-weak',
    title: 'Buena venta con finanzas debiles',
    hypothesis: 'Debe priorizar baja precision financiera y riesgo de crecer sin margen.',
    answers: {
      people: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      processes: [1, 2, 2, 1, 2, 1, 2, 2, 1, 2],
      products: [3, 1, 3, 2, 0, 1, 2, 2, 2, 2],
      finance: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    expected: {
      maxScore: 75,
      minConfidence: 95,
      tags: ['precios_por_intuicion', 'costos_aproximados', 'margen_estimado', 'decisiones_por_intuicion'],
      patterns: ['low_financial_precision', 'commercial_growth_without_margin'],
    },
  },
  {
    id: 'strong-team-weak-process',
    title: 'Equipo capaz con procesos flojos',
    hypothesis: 'Debe detectar baja visibilidad, operacion no replicable y escalamiento riesgoso.',
    answers: {
      people: [1, 2, 2, 2, 2, 2, 3, 2, 2, 2],
      processes: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      products: [1, 1, 1, 1, 2, 2, 2, 1, 1, 3],
      finance: [2, 2, 2, 2, 2, 2, 1, 1, 1, 2],
    },
    expected: {
      maxScore: 75,
      minConfidence: 95,
      tags: ['baja_documentacion', 'procesos_informales', 'operacion_no_replicable', 'baja_escalabilidad'],
      patterns: ['scale_before_standardization', 'blind_operation'],
    },
  },
  {
    id: 'mature-business',
    title: 'Empresa madura y disciplinada',
    hypothesis: 'Debe mantener score alto, pocos patrones criticos y recomendaciones de mantenimiento.',
    answers: {
      people: [2, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      processes: [3, 3, 3, 3, 3, 2, 3, 3, 3, 3],
      products: [3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
      finance: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    },
    expected: {
      minScore: 90,
      minConfidence: 95,
    },
  },
  {
    id: 'incomplete-diagnosis',
    title: 'Diagnostico incompleto',
    hypothesis: 'Debe bajar la confianza y evitar conclusiones sobredimensionadas.',
    answers: {
      people: [0, 1, null, null, null, null, null, null, null, null],
      processes: [null, 1, null, null, null, null, null, null, null, null],
      products: [0, 1, null, null, null, null, null, null, null, null],
      finance: [null, null, null, null, null, null, null, null, null, null],
    },
    expected: {
      maxConfidence: 25,
      tags: ['dependencia_fundador', 'seguimiento_manual'],
    },
  },
];

const buildSections = (answers: AnswerSet): DiagnosisSectionsMap => {
  const buildSection = (pillar: keyof DiagnosisQuestionsMap) => ({
    answers: (answers[pillar] ?? []).reduce<Record<number, number>>((result, answer, index) => {
      if (typeof answer === 'number') {
        result[index] = answer;
      }

      return result;
    }, {}),
  });

  return {
    people: buildSection('people'),
    processes: buildSection('processes'),
    products: buildSection('products'),
    finance: buildSection('finance'),
  };
};

const assertIncludes = (actual: string[], expected: string[], label: string, caseTitle: string) => {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length > 0) {
    throw new Error(`${caseTitle}: faltan ${label}: ${missing.join(', ')}`);
  }
};

const validateCase = (calibrationCase: CalibrationCase, report: ReturnType<typeof buildBusinessDiagnosisEngineReport>) => {
  const { expected } = calibrationCase;
  const score = report.scoreReport.overall.averageScore;

  if (expected.maxScore !== undefined && score > expected.maxScore) {
    throw new Error(`${calibrationCase.title}: score ${score} supera maximo esperado ${expected.maxScore}`);
  }

  if (expected.minScore !== undefined && score < expected.minScore) {
    throw new Error(`${calibrationCase.title}: score ${score} esta debajo del minimo esperado ${expected.minScore}`);
  }

  if (expected.maxConfidence !== undefined && report.confidenceScore > expected.maxConfidence) {
    throw new Error(`${calibrationCase.title}: confianza ${report.confidenceScore} supera maximo esperado ${expected.maxConfidence}`);
  }

  if (expected.minConfidence !== undefined && report.confidenceScore < expected.minConfidence) {
    throw new Error(`${calibrationCase.title}: confianza ${report.confidenceScore} esta debajo del minimo esperado ${expected.minConfidence}`);
  }

  if (expected.tags) {
    assertIncludes(report.tags.map((tag) => tag.id), expected.tags, 'tags', calibrationCase.title);
  }

  if (expected.patterns) {
    assertIncludes(report.patterns.map((pattern) => pattern.id), expected.patterns, 'patrones', calibrationCase.title);
  }
};

const formatList = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const buildMarkdownCase = (calibrationCase: CalibrationCase, report: ReturnType<typeof buildBusinessDiagnosisEngineReport>) => {
  const pillarScores = report.pillars.map((pillar) => `${pillar.title}: ${pillar.averageScore}/100`).join(' · ');
  const topTags = report.tags.slice(0, 6).map((tag) => `${tag.label} (${tag.priorityScore})`);
  const patterns = report.patterns.map((pattern) => `${pattern.title}: ${pattern.message}`);
  const insights = report.insights.slice(0, 7).map((insight) => (
    `${insight.title}: ${insight.message} Acción: ${insight.recommendedAction}`
  ));
  const roadmap = report.roadmap.map((item) => `${item.label} - ${item.title}: ${item.body}`);

  return [
    `## ${calibrationCase.title}`,
    '',
    `Hipotesis: ${calibrationCase.hypothesis}`,
    '',
    `Score: ${report.scoreReport.overall.averageScore}/100`,
    `Confianza: ${report.confidenceScore}%`,
    `Pilares: ${pillarScores}`,
    `Contexto: ${JSON.stringify(report.context)}`,
    '',
    '### Tags principales',
    topTags.length ? formatList(topTags) : '- Sin tags relevantes',
    '',
    '### Patrones detectados',
    patterns.length ? formatList(patterns) : '- Sin patrones criticos detectados',
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
    const report = buildBusinessDiagnosisEngineReport({
      questions,
      sections: buildSections(calibrationCase.answers),
      pillarTitles,
      locale: 'es-MX',
    });

    validateCase(calibrationCase, report);

    return {
      calibrationCase,
      report,
    };
  });

  const markdown = [
    '# Calibracion del motor de diagnostico empresarial',
    '',
    'Este reporte se genera con `npm run calibrate:business-diagnosis` y usa el motor real `diagnosisEngine`.',
    '',
    ...reports.map(({ calibrationCase, report }) => buildMarkdownCase(calibrationCase, report)),
  ].join('\n');

  const reportPath = resolve(process.cwd(), 'reports/business-diagnosis-calibration.md');
  await mkdir(resolve(process.cwd(), 'reports'), { recursive: true });
  await writeFile(reportPath, `${markdown}\n`, 'utf8');

  console.table(reports.map(({ calibrationCase, report }) => ({
    case: calibrationCase.id,
    score: report.scoreReport.overall.averageScore,
    confidence: report.confidenceScore,
    tags: report.tags.slice(0, 3).map((tag) => tag.id).join(', '),
    patterns: report.patterns.map((pattern) => pattern.id).join(', ') || 'none',
  })));

  console.log(`\nCalibracion generada en ${reportPath}`);
};

await main();
