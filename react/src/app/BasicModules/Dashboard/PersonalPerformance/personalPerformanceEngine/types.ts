import type { PersonalPerformanceSectionKey } from '../../../../api/HomePanel/PersonalPerformance/personalPerformance';
import type {
  PerformanceLevel,
  PersonalPerformanceScoreReport,
} from '../personalPerformanceScoring';

export type HumanPerformanceSection = PersonalPerformanceSectionKey;

export type HumanQuestionFunction =
  | 'physical_recovery'
  | 'energy_stability'
  | 'cognitive_load'
  | 'executive_clarity'
  | 'operational_sustainability'
  | 'work_boundaries'
  | 'wear_symptom'
  | 'functional_resilience'
  | 'presence_dependency'
  | 'mental_recovery';

export type HumanOperationalDimension =
  | 'recovery'
  | 'energy'
  | 'cognitive'
  | 'executive'
  | 'sustainability';

export type HumanQuestionRole =
  | 'cause'
  | 'symptom'
  | 'constraint'
  | 'capacity'
  | 'dependency'
  | 'risk_indicator';

export type HumanTagCategory =
  | 'risk'
  | 'symptom'
  | 'constraint'
  | 'dependency'
  | 'capacity';

export type HumanTagId =
  | 'fatiga_acumulada'
  | 'claridad_degradada'
  | 'productividad_por_presion'
  | 'sobrecarga_constante'
  | 'dificultad_desconexion'
  | 'rutina_no_sostenible'
  | 'energia_inestable'
  | 'baja_recuperacion'
  | 'tension_cognitiva'
  | 'dependencia_voluntad'
  | 'sedentarismo_operativo'
  | 'limites_debiles'
  | 'recuperacion_fragmentada'
  | 'trabajo_nocturno'
  | 'ansiedad_responsabilidades'
  | 'degradacion_ejecutiva'
  | 'riesgo_burnout'
  | 'dependencia_presencia'
  | 'pausas_insuficientes'
  | 'trabajo_extendido'
  | 'carga_sin_recuperacion'
  | 'combustible_fisico_bajo'
  | 'pantallas_nocturnas'
  | 'culpa_descanso'
  | 'recuperacion_mental_baja'
  | 'energia_estable'
  | 'recuperacion_estable'
  | 'claridad_operativa'
  | 'limites_saludables'
  | 'resiliencia_funcional';

export type HumanAnswerSeverity = 1 | 2 | 3 | 4;

export type HumanTagSignal = {
  tag: HumanTagId;
  severity: HumanAnswerSeverity;
  confidence?: number;
};

export type HumanQuestionOption = {
  id: string;
  label: string;
  score: number;
  tags: HumanTagSignal[];
};

export type HumanQuestionDefinition = {
  id: string;
  section: HumanPerformanceSection;
  index: number;
  label: string;
  function: HumanQuestionFunction;
  role: HumanQuestionRole;
  dimension: HumanOperationalDimension;
  weight: number;
  severityWeight: number;
  options: HumanQuestionOption[];
};

export type HumanQuestionResult = {
  id: string;
  section: HumanPerformanceSection;
  index: number;
  question: string;
  selectedOptionIndex: number | null;
  selectedOptionId: string | null;
  selectedOptionLabel: string | null;
  score: number | null;
  function: HumanQuestionFunction;
  role: HumanQuestionRole;
  dimension: HumanOperationalDimension;
  weight: number;
  severityWeight: number;
  tags: HumanTagSignal[];
};

export type HumanSectionEngineScore = {
  key: HumanPerformanceSection;
  title: string;
  totalQuestions: number;
  answeredCount: number;
  completionPercent: number;
  averageScore: number;
  level: PerformanceLevel;
  questions: HumanQuestionResult[];
};

export type AggregatedHumanTag = {
  id: HumanTagId;
  label: string;
  category: HumanTagCategory;
  dimension: HumanOperationalDimension;
  severityTotal: number;
  maxSeverity: number;
  occurrences: number;
  priorityScore: number;
  sections: HumanPerformanceSection[];
  operationalRisk: string;
  recommendedAction: string;
  evidence: Array<{
    section: HumanPerformanceSection;
    questionId: string;
    question: string;
    answer: string;
    severity: HumanAnswerSeverity;
  }>;
};

export type HumanInsightType =
  | 'main_personal_operational_risk'
  | 'dominant_pattern'
  | 'wear_source'
  | 'detected_dependency'
  | 'sustainability_risk'
  | 'burnout_risk'
  | 'highest_roi_habit'
  | 'first_boundary'
  | 'immediate_action';

export type HumanPatternRuleCondition = {
  allTags?: HumanTagId[];
  anyTags?: HumanTagId[];
  minTagSeverity?: Partial<Record<HumanTagId, number>>;
  maxSectionScore?: Partial<Record<HumanPerformanceSection, number>>;
  minSectionScore?: Partial<Record<HumanPerformanceSection, number>>;
  maxOverallScore?: number;
  minOverallScore?: number;
};

export type HumanPatternRule = {
  id: string;
  title: string;
  when: HumanPatternRuleCondition;
  produces: {
    type: HumanInsightType;
    severity: HumanAnswerSeverity;
    title: string;
    message: string;
    risk: string;
    action: string;
  };
};

export type HumanPatternMatch = {
  id: string;
  title: string;
  type: HumanInsightType;
  severity: HumanAnswerSeverity;
  message: string;
  risk: string;
  action: string;
  evidence: string[];
};

export type HumanOperationalProfileId =
  | 'operador_reactivo'
  | 'alto_rendimiento_fatigado'
  | 'funcional_vulnerable'
  | 'saturado_compensatorio'
  | 'presion_constante'
  | 'recuperacion_insuficiente'
  | 'disciplinado_sostenible'
  | 'dependencia_voluntad';

export type HumanOperationalProfile = {
  id: HumanOperationalProfileId;
  title: string;
  explanation: string;
  mainRisk: string;
  dominantPattern: string;
  continuationRisk: string;
  quickWin: string;
};

export type HumanPerformanceInsight = {
  type: HumanInsightType;
  title: string;
  severity: HumanAnswerSeverity;
  section?: HumanPerformanceSection;
  message: string;
  evidence: string[];
  operationalImpact: string;
  recommendedAction: string;
};

export type HumanPerformanceRoadmapItem = {
  label: string;
  title: string;
  body: string;
  expectedResult: string;
};

export type HumanPerformanceEngineLabels = {
  action: string;
  burnoutRisk: string;
  confidence: string;
  dependency: string;
  evidence: string;
  firstBoundary: string;
  habitRoi: string;
  mainRisk: string;
  pattern: string;
  sustainability: string;
  wearSource: string;
  whyItMatters: string;
};

export type PersonalPerformanceEngineReport = {
  scoreReport: PersonalPerformanceScoreReport;
  sections: HumanSectionEngineScore[];
  tags: AggregatedHumanTag[];
  patterns: HumanPatternMatch[];
  profile: HumanOperationalProfile;
  insights: HumanPerformanceInsight[];
  roadmap: HumanPerformanceRoadmapItem[];
  executiveSummary: string;
  crossRead: string;
  completenessNote: string;
  confidenceScore: number;
  labels: HumanPerformanceEngineLabels;
};
