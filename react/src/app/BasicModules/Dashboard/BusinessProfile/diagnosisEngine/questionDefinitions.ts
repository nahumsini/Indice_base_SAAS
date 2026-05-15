import type { DiagnosisQuestionsMap } from '../businessDiagnosisScoring';
import type {
  DiagnosisContext,
  DiagnosisPillar,
  DiagnosisQuestionDefinition,
  DiagnosisQuestionKind,
  DiagnosisQuestionOption,
  DiagnosisTagSignal,
} from './types';

type OptionBlueprint = {
  id: string;
  score?: number;
  context?: DiagnosisContext;
  tags?: DiagnosisTagSignal[];
};

type QuestionBlueprint = {
  id: string;
  kind: DiagnosisQuestionKind;
  weight?: number;
  options: OptionBlueprint[];
};

const risk = (tag: DiagnosisTagSignal['tag'], severity: DiagnosisTagSignal['severity']): DiagnosisTagSignal => ({
  tag,
  severity,
});

const hint = (tag: DiagnosisTagSignal['tag']): DiagnosisTagSignal => ({
  tag,
  severity: 1,
  confidence: 0.45,
});

const contextualOption = (id: string, context: DiagnosisContext, tags?: DiagnosisTagSignal[]): OptionBlueprint => ({
  id,
  context,
  tags,
});

const scoreOption = (id: string, score: number, tags?: DiagnosisTagSignal[]): OptionBlueprint => ({
  id,
  score,
  tags,
});

const PILLAR_ORDER: DiagnosisPillar[] = ['people', 'processes', 'products', 'finance'];

const QUESTION_BLUEPRINTS: Record<DiagnosisPillar, QuestionBlueprint[]> = {
  people: [
    {
      id: 'people.leadership_role',
      kind: 'contextual',
      options: [
        contextualOption('founder_ceo', { leadershipRole: 'founder_ceo' }, [risk('dependencia_fundador', 2)]),
        contextualOption('operations', { leadershipRole: 'operations' }),
        contextualOption('finance', { leadershipRole: 'finance' }),
        contextualOption('commercial_other', { leadershipRole: 'commercial_other' }),
      ],
    },
    {
      id: 'people.team_size',
      kind: 'contextual',
      options: [
        contextualOption('solo', { teamSize: 'solo' }, [risk('dependencia_fundador', 3)]),
        contextualOption('two_to_five', { teamSize: 'micro' }),
        contextualOption('six_to_twenty', { teamSize: 'small' }),
        contextualOption('twenty_one_plus', { teamSize: 'growing' }),
      ],
    },
    {
      id: 'people.team_structure',
      kind: 'evaluative',
      weight: 1.1,
      options: [
        scoreOption('no_structure', 20, [risk('roles_poco_claros', 4), risk('dependencia_fundador', 3)]),
        scoreOption('basic_roles', 55, [risk('roles_poco_claros', 2)]),
        scoreOption('defined_areas', 80),
        scoreOption('formal_org_chart', 100),
      ],
    },
    {
      id: 'people.task_assignment',
      kind: 'evaluative',
      weight: 1.1,
      options: [
        scoreOption('improvised', 20, [risk('seguimiento_manual', 4), risk('responsabilidades_poco_claras', 3)]),
        scoreOption('lists', 55, [risk('seguimiento_manual', 2)]),
        scoreOption('structured_assignment', 80),
        scoreOption('management_system', 100),
      ],
    },
    {
      id: 'people.performance_review',
      kind: 'evaluative',
      options: [
        scoreOption('never', 20, [risk('baja_delegacion', 3), risk('baja_visibilidad_operativa', 2)]),
        scoreOption('by_problems', 50, [risk('baja_visibilidad_operativa', 2)]),
        scoreOption('weekly', 80),
        scoreOption('with_kpis', 100),
      ],
    },
    {
      id: 'people.delegation',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('founder_does_all', 20, [risk('dependencia_fundador', 4), risk('baja_delegacion', 4)]),
        scoreOption('delegates_supervises', 55, [risk('baja_delegacion', 2)]),
        scoreOption('controlled_delegation', 80),
        scoreOption('autonomous_team', 100),
      ],
    },
    {
      id: 'people.internal_communication',
      kind: 'evaluative',
      options: [
        scoreOption('informal', 25, [risk('comunicacion_por_chat', 3), risk('seguimiento_manual', 2)]),
        scoreOption('chat', 55, [risk('comunicacion_por_chat', 3)]),
        scoreOption('meetings', 75, [risk('reuniones_sin_cierre', 1)]),
        scoreOption('formal_tools', 100),
      ],
    },
    {
      id: 'people.meeting_frequency',
      kind: 'evaluative',
      options: [
        scoreOption('never', 25, [risk('baja_visibilidad_operativa', 3)]),
        scoreOption('sporadic', 50, [risk('reuniones_sin_cierre', 2)]),
        scoreOption('weekly', 80),
        scoreOption('frequent', 90),
      ],
    },
    {
      id: 'people.responsibility_clarity',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('not_clear', 20, [risk('responsabilidades_poco_claras', 4), risk('seguimiento_manual', 3)]),
        scoreOption('somewhat_clear', 55, [risk('responsabilidades_poco_claras', 2)]),
        scoreOption('mostly_clear', 80),
        scoreOption('fully_clear', 100),
      ],
    },
    {
      id: 'people.onboarding',
      kind: 'evaluative',
      options: [
        scoreOption('very_hard', 20, [risk('onboarding_manual', 4), risk('baja_documentacion', 2)]),
        scoreOption('hard', 50, [risk('onboarding_manual', 3)]),
        scoreOption('moderate', 75, [risk('onboarding_manual', 1)]),
        scoreOption('easy', 100),
      ],
    },
  ],
  processes: [
    {
      id: 'processes.documentation',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('none', 20, [risk('baja_documentacion', 4), risk('procesos_informales', 3)]),
        scoreOption('some', 55, [risk('baja_documentacion', 2)]),
        scoreOption('most', 85),
        scoreOption('complete', 100),
      ],
    },
    {
      id: 'processes.task_management',
      kind: 'evaluative',
      weight: 1.15,
      options: [
        scoreOption('improvised', 20, [risk('procesos_informales', 4), risk('seguimiento_manual', 3)]),
        scoreOption('lists', 55, [risk('seguimiento_manual', 3), risk('baja_visibilidad_operativa', 2)]),
        scoreOption('tools', 80),
        scoreOption('formal_system', 100),
      ],
    },
    {
      id: 'processes.progress_monitoring',
      kind: 'evaluative',
      options: [
        scoreOption('not_monitored', 20, [risk('baja_visibilidad_operativa', 4)]),
        scoreOption('occasional', 55, [risk('baja_visibilidad_operativa', 2)]),
        scoreOption('reports', 80),
        scoreOption('kpis', 100),
      ],
    },
    {
      id: 'processes.automation',
      kind: 'evaluative',
      options: [
        scoreOption('manual', 25, [risk('baja_automatizacion', 4), risk('perdida_tiempo_manual', 2)]),
        scoreOption('isolated_tools', 55, [risk('baja_automatizacion', 2)]),
        scoreOption('partial_automation', 80),
        scoreOption('high_automation', 100),
      ],
    },
    {
      id: 'processes.replicability',
      kind: 'evaluative',
      weight: 1.15,
      options: [
        scoreOption('very_hard', 20, [risk('operacion_no_replicable', 4), risk('baja_escalabilidad', 3)]),
        scoreOption('with_effort', 55, [risk('operacion_no_replicable', 2)]),
        scoreOption('possible', 80),
        scoreOption('easy', 100),
      ],
    },
    {
      id: 'processes.time_loss_source',
      kind: 'contextual',
      options: [
        contextualOption('manual_work', { timeLossSource: 'manual_work' }, [hint('perdida_tiempo_manual')]),
        contextualOption('coordination', { timeLossSource: 'coordination' }, [hint('perdida_tiempo_coordinacion')]),
        contextualOption('information', { timeLossSource: 'information' }, [hint('perdida_tiempo_informacion')]),
        contextualOption('follow_up', { timeLossSource: 'follow_up' }, [hint('perdida_tiempo_seguimiento')]),
      ],
    },
    {
      id: 'processes.key_person_dependency',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('total', 20, [risk('dependencia_personas_clave', 4), risk('operacion_no_replicable', 2)]),
        scoreOption('high', 50, [risk('dependencia_personas_clave', 3)]),
        scoreOption('some', 75, [risk('dependencia_personas_clave', 1)]),
        scoreOption('low', 100),
      ],
    },
    {
      id: 'processes.process_clarity',
      kind: 'evaluative',
      options: [
        scoreOption('not_clear', 20, [risk('procesos_informales', 4), risk('responsabilidades_poco_claras', 2)]),
        scoreOption('somewhat_clear', 55, [risk('procesos_informales', 2)]),
        scoreOption('mostly_clear', 80),
        scoreOption('fully_clear', 100),
      ],
    },
    {
      id: 'processes.error_management',
      kind: 'evaluative',
      options: [
        scoreOption('reactive', 25, [risk('errores_reactivos', 4)]),
        scoreOption('informal', 55, [risk('errores_reactivos', 2)]),
        scoreOption('review', 80),
        scoreOption('continuous_improvement', 100),
      ],
    },
    {
      id: 'processes.scalability',
      kind: 'evaluative',
      weight: 1.15,
      options: [
        scoreOption('none', 20, [risk('baja_escalabilidad', 4), risk('operacion_no_replicable', 3)]),
        scoreOption('low', 50, [risk('baja_escalabilidad', 3)]),
        scoreOption('medium', 75, [risk('baja_escalabilidad', 1)]),
        scoreOption('high', 100),
      ],
    },
  ],
  products: [
    {
      id: 'products.offer_type',
      kind: 'contextual',
      options: [
        contextualOption('services', { offerType: 'services' }),
        contextualOption('physical_products', { offerType: 'physical_products' }),
        contextualOption('digital', { offerType: 'digital' }),
        contextualOption('mixed', { offerType: 'mixed' }),
      ],
    },
    {
      id: 'products.customer_type',
      kind: 'contextual',
      options: [
        contextualOption('b2c', { customerType: 'b2c' }),
        contextualOption('b2b', { customerType: 'b2b' }),
        contextualOption('government', { customerType: 'government' }),
        contextualOption('mixed', { customerType: 'mixed' }),
      ],
    },
    {
      id: 'products.revenue_model',
      kind: 'contextual',
      options: [
        contextualOption('direct_sale', { revenueModel: 'direct_sale' }),
        contextualOption('services', { revenueModel: 'services' }),
        contextualOption('subscription', { revenueModel: 'subscription' }),
        contextualOption('contracts', { revenueModel: 'contracts' }),
      ],
    },
    {
      id: 'products.diversification',
      kind: 'evaluative',
      options: [
        scoreOption('one_line', 35, [risk('baja_diversificacion', 3)]),
        scoreOption('some_lines', 65, [risk('baja_diversificacion', 1)]),
        scoreOption('several_lines', 85),
        scoreOption('broad', 95),
      ],
    },
    {
      id: 'products.pricing',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('intuition', 20, [risk('precios_por_intuicion', 4), risk('margen_estimado', 2)]),
        scoreOption('competition', 50, [risk('precios_por_intuicion', 2), risk('costos_aproximados', 1)]),
        scoreOption('costs', 80),
        scoreOption('strategy', 100),
      ],
    },
    {
      id: 'products.performance_tracking',
      kind: 'evaluative',
      weight: 1.1,
      options: [
        scoreOption('not_measured', 20, [risk('baja_medicion_comercial', 4)]),
        scoreOption('sales_only', 55, [risk('baja_medicion_comercial', 2), risk('margen_estimado', 1)]),
        scoreOption('sales_profitability', 85),
        scoreOption('indicators', 100),
      ],
    },
    {
      id: 'products.value_proposition',
      kind: 'evaluative',
      options: [
        scoreOption('not_clear', 20, [risk('propuesta_valor_debil', 4), risk('oferta_poco_clara', 3)]),
        scoreOption('somewhat_clear', 55, [risk('propuesta_valor_debil', 2)]),
        scoreOption('mostly_clear', 80),
        scoreOption('very_clear', 100),
      ],
    },
    {
      id: 'products.customer_feedback',
      kind: 'evaluative',
      options: [
        scoreOption('none', 25, [risk('feedback_cliente_informal', 4)]),
        scoreOption('informal', 55, [risk('feedback_cliente_informal', 2)]),
        scoreOption('surveys', 80),
        scoreOption('analysis', 100),
      ],
    },
    {
      id: 'products.product_evolution',
      kind: 'evaluative',
      options: [
        scoreOption('on_the_fly', 25, [risk('producto_reactivo', 4)]),
        scoreOption('occasional_changes', 55, [risk('producto_reactivo', 2)]),
        scoreOption('plans', 80),
        scoreOption('roadmap', 100),
      ],
    },
    {
      id: 'products.commercial_priority',
      kind: 'contextual',
      options: [
        contextualOption('customers', { commercialPriority: 'customers' }, [hint('cliente_objetivo_difuso')]),
        contextualOption('current_sales', { commercialPriority: 'current_sales' }, [hint('foco_comercial_disperso')]),
        contextualOption('profitability', { commercialPriority: 'profitability' }),
        contextualOption('scale', { commercialPriority: 'scale' }, [hint('baja_escalabilidad')]),
      ],
    },
  ],
  finance: [
    {
      id: 'finance.financial_control',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('unstructured', 20, [risk('baja_visibilidad_financiera', 4)]),
        scoreOption('spreadsheet', 55, [risk('baja_visibilidad_financiera', 2)]),
        scoreOption('software', 85),
        scoreOption('integrated_system', 100),
      ],
    },
    {
      id: 'finance.number_review',
      kind: 'evaluative',
      options: [
        scoreOption('never', 20, [risk('revision_financiera_esporadica', 4), risk('baja_visibilidad_financiera', 2)]),
        scoreOption('monthly', 60, [risk('revision_financiera_esporadica', 2)]),
        scoreOption('weekly', 90),
        scoreOption('daily', 100),
      ],
    },
    {
      id: 'finance.cash_flow',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('not_controlled', 20, [risk('flujo_no_proyectado', 4), risk('baja_visibilidad_financiera', 2)]),
        scoreOption('reactive', 50, [risk('flujo_no_proyectado', 3)]),
        scoreOption('review', 80),
        scoreOption('projection', 100),
      ],
    },
    {
      id: 'finance.cost_clarity',
      kind: 'evaluative',
      weight: 1.15,
      options: [
        scoreOption('not_clear', 20, [risk('costos_aproximados', 4), risk('margen_estimado', 2)]),
        scoreOption('approximate', 55, [risk('costos_aproximados', 3)]),
        scoreOption('mostly_clear', 85),
        scoreOption('full_control', 100),
      ],
    },
    {
      id: 'finance.margin',
      kind: 'evaluative',
      weight: 1.2,
      options: [
        scoreOption('unknown', 20, [risk('margen_estimado', 4), risk('decisiones_por_intuicion', 2)]),
        scoreOption('estimated', 55, [risk('margen_estimado', 3)]),
        scoreOption('clear', 85),
        scoreOption('fully_measured', 100),
      ],
    },
    {
      id: 'finance.financial_decisions',
      kind: 'evaluative',
      options: [
        scoreOption('intuition', 20, [risk('decisiones_por_intuicion', 4)]),
        scoreOption('experience', 55, [risk('decisiones_por_intuicion', 2)]),
        scoreOption('data', 85),
        scoreOption('models', 100),
      ],
    },
    {
      id: 'finance.revenue_predictability',
      kind: 'evaluative',
      options: [
        scoreOption('very_variable', 25, [risk('ventas_no_predecibles', 4)]),
        scoreOption('variable', 55, [risk('ventas_no_predecibles', 2)]),
        scoreOption('stable', 85),
        scoreOption('very_stable', 100),
      ],
    },
    {
      id: 'finance.debt_management',
      kind: 'evaluative',
      options: [
        scoreOption('no_control', 25, [risk('deuda_poco_visible', 4)]),
        scoreOption('basic', 60, [risk('deuda_poco_visible', 2)]),
        scoreOption('strategy', 85),
        scoreOption('optimized', 100),
      ],
    },
    {
      id: 'finance.crisis_preparedness',
      kind: 'evaluative',
      options: [
        scoreOption('none', 20, [risk('sin_colchon_crisis', 4)]),
        scoreOption('low', 50, [risk('sin_colchon_crisis', 3)]),
        scoreOption('medium', 80),
        scoreOption('high', 100),
      ],
    },
    {
      id: 'finance.tax_compliance',
      kind: 'evaluative',
      options: [
        scoreOption('no_control', 25, [risk('cumplimiento_fiscal_reactivo', 4)]),
        scoreOption('delays', 50, [risk('cumplimiento_fiscal_reactivo', 3)]),
        scoreOption('up_to_date', 85),
        scoreOption('tax_strategy', 100),
      ],
    },
  ],
};

const buildOptions = (
  questionOptions: string[],
  optionBlueprints: OptionBlueprint[],
): DiagnosisQuestionOption[] => (
  optionBlueprints.map((option, optionIndex) => ({
    ...option,
    label: questionOptions[optionIndex] ?? option.id,
  }))
);

export const buildBusinessDiagnosisQuestionDefinitions = (
  questions: DiagnosisQuestionsMap,
): Record<DiagnosisPillar, DiagnosisQuestionDefinition[]> => (
  PILLAR_ORDER.reduce<Record<DiagnosisPillar, DiagnosisQuestionDefinition[]>>((result, pillar) => {
    result[pillar] = QUESTION_BLUEPRINTS[pillar].map((blueprint, questionIndex) => {
      const sourceQuestion = questions[pillar]?.[questionIndex];

      return {
        id: blueprint.id,
        pillar,
        index: questionIndex + 1,
        kind: blueprint.kind,
        label: sourceQuestion?.question ?? blueprint.id,
        weight: blueprint.weight ?? 1,
        options: buildOptions(sourceQuestion?.options ?? [], blueprint.options),
      };
    });

    return result;
  }, {} as Record<DiagnosisPillar, DiagnosisQuestionDefinition[]>)
);
