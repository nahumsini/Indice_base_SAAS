import type { BusinessProfileSectionKey } from '../../../../api/HomePanel/BusinessProfile/businessProfile';
import type { BusinessDiagnosisScoreReport, DiagnosisMaturity } from '../businessDiagnosisScoring';

export type DiagnosisPillar = BusinessProfileSectionKey;

export type DiagnosisQuestionKind = 'contextual' | 'evaluative';

export type DiagnosisInsightType =
  | 'main_risk'
  | 'operational_bottleneck'
  | 'critical_dependency'
  | 'quick_win'
  | 'growth_risk'
  | 'single_priority'
  | 'highest_roi_area';

export type DiagnosticTagId =
  | 'dependencia_fundador'
  | 'baja_delegacion'
  | 'roles_poco_claros'
  | 'responsabilidades_poco_claras'
  | 'seguimiento_manual'
  | 'comunicacion_por_chat'
  | 'reuniones_sin_cierre'
  | 'onboarding_manual'
  | 'baja_documentacion'
  | 'procesos_informales'
  | 'baja_visibilidad_operativa'
  | 'baja_automatizacion'
  | 'operacion_no_replicable'
  | 'perdida_tiempo_manual'
  | 'perdida_tiempo_coordinacion'
  | 'perdida_tiempo_informacion'
  | 'perdida_tiempo_seguimiento'
  | 'dependencia_personas_clave'
  | 'errores_reactivos'
  | 'baja_escalabilidad'
  | 'oferta_poco_clara'
  | 'cliente_objetivo_difuso'
  | 'ingresos_no_priorizados'
  | 'baja_diversificacion'
  | 'precios_por_intuicion'
  | 'baja_medicion_comercial'
  | 'propuesta_valor_debil'
  | 'feedback_cliente_informal'
  | 'producto_reactivo'
  | 'foco_comercial_disperso'
  | 'baja_visibilidad_financiera'
  | 'revision_financiera_esporadica'
  | 'flujo_no_proyectado'
  | 'costos_aproximados'
  | 'margen_estimado'
  | 'decisiones_por_intuicion'
  | 'ventas_no_predecibles'
  | 'deuda_poco_visible'
  | 'sin_colchon_crisis'
  | 'cumplimiento_fiscal_reactivo';

export type DiagnosisContextKey =
  | 'leadershipRole'
  | 'teamSize'
  | 'offerType'
  | 'customerType'
  | 'revenueModel'
  | 'commercialPriority'
  | 'timeLossSource';

export type DiagnosisContext = Partial<Record<DiagnosisContextKey, string>>;

export type DiagnosisAnswerSeverity = 1 | 2 | 3 | 4;

export type DiagnosisTagSignal = {
  tag: DiagnosticTagId;
  severity: DiagnosisAnswerSeverity;
  confidence?: number;
};

export type DiagnosisQuestionOption = {
  id: string;
  label: string;
  score?: number;
  context?: DiagnosisContext;
  tags?: DiagnosisTagSignal[];
};

export type DiagnosisQuestionDefinition = {
  id: string;
  pillar: DiagnosisPillar;
  index: number;
  kind: DiagnosisQuestionKind;
  label: string;
  weight: number;
  options: DiagnosisQuestionOption[];
};

export type DiagnosisQuestionResult = {
  id: string;
  pillar: DiagnosisPillar;
  index: number;
  kind: DiagnosisQuestionKind;
  question: string;
  selectedOptionIndex: number | null;
  selectedOptionId: string | null;
  selectedOptionLabel: string | null;
  score: number | null;
  weight: number;
  tags: DiagnosisTagSignal[];
  context: DiagnosisContext;
};

export type DiagnosisPillarEngineScore = {
  key: DiagnosisPillar;
  title: string;
  totalQuestions: number;
  answeredCount: number;
  evaluativeQuestions: number;
  evaluativeAnsweredCount: number;
  contextualQuestions: number;
  contextualAnsweredCount: number;
  completionPercent: number;
  evaluativeCompletionPercent: number;
  averageScore: number;
  maturity: DiagnosisMaturity;
  questions: DiagnosisQuestionResult[];
};

export type AggregatedDiagnosisTag = {
  id: DiagnosticTagId;
  label: string;
  severityTotal: number;
  maxSeverity: number;
  occurrences: number;
  priorityScore: number;
  pillars: DiagnosisPillar[];
  evidence: Array<{
    pillar: DiagnosisPillar;
    questionId: string;
    question: string;
    answer: string;
    severity: DiagnosisAnswerSeverity;
  }>;
};

export type PatternRuleCondition = {
  allTags?: DiagnosticTagId[];
  anyTags?: DiagnosticTagId[];
  minTagSeverity?: Partial<Record<DiagnosticTagId, number>>;
  maxPillarScore?: Partial<Record<DiagnosisPillar, number>>;
  minPillarScore?: Partial<Record<DiagnosisPillar, number>>;
  context?: DiagnosisContext;
};

export type DiagnosisPatternRule = {
  id: string;
  title: string;
  when: PatternRuleCondition;
  produces: {
    type: DiagnosisInsightType;
    severity: DiagnosisAnswerSeverity;
    title: string;
    message: string;
    risk: string;
    action: string;
    suggestedModule?: string;
  };
};

export type DiagnosisPatternMatch = {
  id: string;
  title: string;
  type: DiagnosisInsightType;
  severity: DiagnosisAnswerSeverity;
  message: string;
  risk: string;
  action: string;
  suggestedModule?: string;
  evidence: string[];
};

export type DiagnosisInsight = {
  type: DiagnosisInsightType;
  title: string;
  severity: DiagnosisAnswerSeverity;
  pillar?: DiagnosisPillar;
  message: string;
  evidence: string[];
  businessImpact: string;
  recommendedAction: string;
  suggestedModule?: string;
};

export type DiagnosisRoadmapItem = {
  label: string;
  title: string;
  body: string;
  suggestedModule?: string;
};

export type DiagnosisEngineLabels = {
  confidence: string;
  contextual: string;
  evaluative: string;
  evidence: string;
  mainRisk: string;
  priority: string;
  quickWin: string;
  whyItMatters: string;
};

export type BusinessDiagnosisEngineReport = {
  context: DiagnosisContext;
  scoreReport: BusinessDiagnosisScoreReport;
  pillars: DiagnosisPillarEngineScore[];
  tags: AggregatedDiagnosisTag[];
  patterns: DiagnosisPatternMatch[];
  insights: DiagnosisInsight[];
  roadmap: DiagnosisRoadmapItem[];
  executiveSummary: string;
  crossRead: string;
  completenessNote: string;
  confidenceScore: number;
  labels: DiagnosisEngineLabels;
};
