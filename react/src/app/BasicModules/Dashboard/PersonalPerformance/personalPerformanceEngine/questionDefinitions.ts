import type {
  PerformanceQuestionDefinition,
  PerformanceQuestionsMap,
} from '../personalPerformanceScoring';
import type {
  HumanPerformanceSection,
  HumanQuestionDefinition,
  HumanQuestionFunction,
  HumanQuestionRole,
  HumanOperationalDimension,
  HumanTagSignal,
} from './types';

type OptionValue = 1 | 2 | 3 | 4;

type QuestionBlueprint = {
  id: string;
  function: HumanQuestionFunction;
  role: HumanQuestionRole;
  dimension: HumanOperationalDimension;
  weight: number;
  severityWeight?: number;
  tags: Partial<Record<OptionValue, HumanTagSignal[]>>;
};

const scoreByOption: Record<OptionValue, number> = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

const t = (tag: HumanTagSignal['tag'], severity: HumanTagSignal['severity'], confidence = 1): HumanTagSignal => ({
  confidence,
  severity,
  tag,
});

const SECTION_BLUEPRINTS: Record<HumanPerformanceSection, QuestionBlueprint[]> = {
  sleep_recovery: [
    {
      id: 'sleep.hours',
      function: 'physical_recovery',
      role: 'cause',
      dimension: 'recovery',
      weight: 1.25,
      severityWeight: 1.2,
      tags: {
        1: [t('baja_recuperacion', 4), t('fatiga_acumulada', 4)],
        2: [t('baja_recuperacion', 3), t('fatiga_acumulada', 3)],
        3: [t('baja_recuperacion', 2, 0.7)],
        4: [t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sleep.wake_recovered',
      function: 'physical_recovery',
      role: 'symptom',
      dimension: 'recovery',
      weight: 1.2,
      severityWeight: 1.15,
      tags: {
        1: [t('baja_recuperacion', 4), t('carga_sin_recuperacion', 3)],
        2: [t('baja_recuperacion', 3), t('fatiga_acumulada', 2)],
        3: [t('recuperacion_estable', 1, 0.6)],
        4: [t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sleep.schedule_regular',
      function: 'physical_recovery',
      role: 'cause',
      dimension: 'recovery',
      weight: 0.95,
      tags: {
        1: [t('baja_recuperacion', 3), t('recuperacion_fragmentada', 3)],
        2: [t('baja_recuperacion', 2), t('recuperacion_fragmentada', 2)],
        4: [t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sleep.interruptions',
      function: 'physical_recovery',
      role: 'symptom',
      dimension: 'recovery',
      weight: 1,
      tags: {
        1: [t('recuperacion_fragmentada', 4), t('baja_recuperacion', 3)],
        2: [t('recuperacion_fragmentada', 3)],
        3: [t('recuperacion_fragmentada', 1, 0.6)],
        4: [t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sleep.screens',
      function: 'mental_recovery',
      role: 'cause',
      dimension: 'recovery',
      weight: 0.85,
      tags: {
        1: [t('pantallas_nocturnas', 4), t('dificultad_desconexion', 3)],
        2: [t('pantallas_nocturnas', 3), t('dificultad_desconexion', 2)],
        3: [t('pantallas_nocturnas', 1)],
      },
    },
    {
      id: 'sleep.day_sleepiness',
      function: 'wear_symptom',
      role: 'symptom',
      dimension: 'recovery',
      weight: 1.1,
      tags: {
        1: [t('fatiga_acumulada', 4), t('degradacion_ejecutiva', 3)],
        2: [t('fatiga_acumulada', 3), t('claridad_degradada', 2)],
        3: [t('fatiga_acumulada', 1, 0.6)],
      },
    },
    {
      id: 'sleep.days_off',
      function: 'functional_resilience',
      role: 'capacity',
      dimension: 'recovery',
      weight: 0.95,
      tags: {
        1: [t('carga_sin_recuperacion', 4), t('fatiga_acumulada', 3)],
        2: [t('carga_sin_recuperacion', 3)],
        3: [t('recuperacion_estable', 1, 0.5)],
        4: [t('recuperacion_estable', 1), t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'sleep.recovery_after_demand',
      function: 'functional_resilience',
      role: 'capacity',
      dimension: 'recovery',
      weight: 1.2,
      severityWeight: 1.15,
      tags: {
        1: [t('carga_sin_recuperacion', 4), t('fatiga_acumulada', 4)],
        2: [t('carga_sin_recuperacion', 3), t('baja_recuperacion', 2)],
        3: [t('resiliencia_funcional', 1, 0.5)],
        4: [t('resiliencia_funcional', 1), t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sleep.late_work',
      function: 'work_boundaries',
      role: 'constraint',
      dimension: 'sustainability',
      weight: 1.15,
      severityWeight: 1.2,
      tags: {
        1: [t('trabajo_nocturno', 4), t('limites_debiles', 4), t('baja_recuperacion', 3)],
        2: [t('trabajo_nocturno', 3), t('limites_debiles', 3)],
        3: [t('trabajo_nocturno', 1)],
      },
    },
    {
      id: 'sleep.quality',
      function: 'physical_recovery',
      role: 'symptom',
      dimension: 'recovery',
      weight: 1.25,
      severityWeight: 1.2,
      tags: {
        1: [t('baja_recuperacion', 4), t('fatiga_acumulada', 4)],
        2: [t('baja_recuperacion', 3), t('recuperacion_fragmentada', 2)],
        3: [t('recuperacion_estable', 1, 0.6)],
        4: [t('recuperacion_estable', 1)],
      },
    },
  ],
  nutrition_energy: [
    {
      id: 'energy.meals',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 1,
      tags: {
        1: [t('combustible_fisico_bajo', 4), t('energia_inestable', 3)],
        2: [t('combustible_fisico_bajo', 2)],
        4: [t('energia_estable', 1)],
      },
    },
    {
      id: 'energy.first_meal',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 0.85,
      tags: {
        1: [t('combustible_fisico_bajo', 3), t('energia_inestable', 2)],
        2: [t('combustible_fisico_bajo', 2)],
        4: [t('energia_estable', 1, 0.6)],
      },
    },
    {
      id: 'energy.processed_food',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 0.8,
      tags: {
        1: [t('energia_inestable', 3), t('combustible_fisico_bajo', 2)],
        2: [t('energia_inestable', 2)],
        4: [t('energia_estable', 1, 0.5)],
      },
    },
    {
      id: 'energy.hydration',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 0.95,
      tags: {
        1: [t('combustible_fisico_bajo', 3), t('claridad_degradada', 2)],
        2: [t('combustible_fisico_bajo', 2)],
        4: [t('energia_estable', 1)],
      },
    },
    {
      id: 'energy.produce',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 0.75,
      tags: {
        1: [t('combustible_fisico_bajo', 2), t('energia_inestable', 2)],
        2: [t('combustible_fisico_bajo', 1)],
        4: [t('energia_estable', 1, 0.5)],
      },
    },
    {
      id: 'energy.stability',
      function: 'energy_stability',
      role: 'symptom',
      dimension: 'energy',
      weight: 1.25,
      severityWeight: 1.15,
      tags: {
        1: [t('energia_inestable', 4), t('productividad_por_presion', 3)],
        2: [t('energia_inestable', 3)],
        3: [t('energia_estable', 1, 0.6)],
        4: [t('energia_estable', 1), t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'energy.movement',
      function: 'energy_stability',
      role: 'cause',
      dimension: 'energy',
      weight: 1,
      tags: {
        1: [t('sedentarismo_operativo', 4), t('energia_inestable', 2)],
        2: [t('sedentarismo_operativo', 3)],
        3: [t('resiliencia_funcional', 1, 0.5)],
        4: [t('resiliencia_funcional', 1), t('energia_estable', 1)],
      },
    },
    {
      id: 'energy.sitting',
      function: 'energy_stability',
      role: 'constraint',
      dimension: 'energy',
      weight: 0.95,
      tags: {
        1: [t('sedentarismo_operativo', 4), t('pausas_insuficientes', 3)],
        2: [t('sedentarismo_operativo', 3), t('pausas_insuficientes', 2)],
        3: [t('pausas_insuficientes', 1)],
      },
    },
    {
      id: 'energy.heaviness',
      function: 'wear_symptom',
      role: 'symptom',
      dimension: 'energy',
      weight: 1.05,
      tags: {
        1: [t('energia_inestable', 4), t('fatiga_acumulada', 3)],
        2: [t('energia_inestable', 3), t('combustible_fisico_bajo', 2)],
        3: [t('energia_inestable', 1, 0.5)],
      },
    },
    {
      id: 'energy.overall',
      function: 'energy_stability',
      role: 'capacity',
      dimension: 'energy',
      weight: 1.2,
      tags: {
        1: [t('energia_inestable', 4), t('productividad_por_presion', 3)],
        2: [t('energia_inestable', 3)],
        3: [t('energia_estable', 1, 0.6)],
        4: [t('energia_estable', 1), t('resiliencia_funcional', 1)],
      },
    },
  ],
  stress_clarity: [
    {
      id: 'clarity.overwhelmed',
      function: 'cognitive_load',
      role: 'symptom',
      dimension: 'cognitive',
      weight: 1.25,
      severityWeight: 1.25,
      tags: {
        1: [t('sobrecarga_constante', 4), t('tension_cognitiva', 4)],
        2: [t('sobrecarga_constante', 3), t('tension_cognitiva', 3)],
        3: [t('sobrecarga_constante', 1, 0.5)],
      },
    },
    {
      id: 'clarity.mental_saturation',
      function: 'cognitive_load',
      role: 'symptom',
      dimension: 'cognitive',
      weight: 1.2,
      severityWeight: 1.2,
      tags: {
        1: [t('sobrecarga_constante', 4), t('claridad_degradada', 3)],
        2: [t('sobrecarga_constante', 3), t('claridad_degradada', 2)],
        3: [t('tension_cognitiva', 1, 0.5)],
      },
    },
    {
      id: 'clarity.single_task_focus',
      function: 'executive_clarity',
      role: 'capacity',
      dimension: 'executive',
      weight: 1.1,
      tags: {
        1: [t('claridad_degradada', 4), t('degradacion_ejecutiva', 3)],
        2: [t('claridad_degradada', 3)],
        3: [t('claridad_operativa', 1, 0.5)],
        4: [t('claridad_operativa', 1)],
      },
    },
    {
      id: 'clarity.anxiety',
      function: 'cognitive_load',
      role: 'symptom',
      dimension: 'cognitive',
      weight: 1.1,
      tags: {
        1: [t('ansiedad_responsabilidades', 4), t('tension_cognitiva', 3)],
        2: [t('ansiedad_responsabilidades', 3), t('tension_cognitiva', 2)],
        3: [t('ansiedad_responsabilidades', 1, 0.5)],
      },
    },
    {
      id: 'clarity.decision_clarity',
      function: 'executive_clarity',
      role: 'capacity',
      dimension: 'executive',
      weight: 1.25,
      severityWeight: 1.2,
      tags: {
        1: [t('degradacion_ejecutiva', 4), t('claridad_degradada', 4)],
        2: [t('degradacion_ejecutiva', 3), t('claridad_degradada', 3)],
        3: [t('claridad_operativa', 1, 0.6)],
        4: [t('claridad_operativa', 1)],
      },
    },
    {
      id: 'clarity.work_invades_personal',
      function: 'mental_recovery',
      role: 'constraint',
      dimension: 'recovery',
      weight: 1.1,
      tags: {
        1: [t('dificultad_desconexion', 4), t('limites_debiles', 3)],
        2: [t('dificultad_desconexion', 3), t('limites_debiles', 2)],
        3: [t('dificultad_desconexion', 1, 0.5)],
      },
    },
    {
      id: 'clarity.disconnect',
      function: 'mental_recovery',
      role: 'capacity',
      dimension: 'recovery',
      weight: 1.2,
      severityWeight: 1.2,
      tags: {
        1: [t('dificultad_desconexion', 4), t('recuperacion_mental_baja', 4)],
        2: [t('dificultad_desconexion', 3), t('recuperacion_mental_baja', 3)],
        3: [t('recuperacion_mental_baja', 1, 0.5)],
        4: [t('limites_saludables', 1), t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'clarity.small_problems',
      function: 'cognitive_load',
      role: 'symptom',
      dimension: 'cognitive',
      weight: 0.95,
      tags: {
        1: [t('tension_cognitiva', 4), t('sobrecarga_constante', 3)],
        2: [t('tension_cognitiva', 3)],
        3: [t('tension_cognitiva', 1, 0.5)],
      },
    },
    {
      id: 'clarity.support',
      function: 'functional_resilience',
      role: 'capacity',
      dimension: 'sustainability',
      weight: 0.85,
      tags: {
        1: [t('sobrecarga_constante', 2), t('dependencia_voluntad', 2)],
        2: [t('dependencia_voluntad', 2)],
        4: [t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'clarity.overall',
      function: 'executive_clarity',
      role: 'capacity',
      dimension: 'executive',
      weight: 1.2,
      tags: {
        1: [t('claridad_degradada', 4), t('degradacion_ejecutiva', 4)],
        2: [t('claridad_degradada', 3), t('degradacion_ejecutiva', 2)],
        3: [t('claridad_operativa', 1, 0.6)],
        4: [t('claridad_operativa', 1)],
      },
    },
  ],
  balance_sustainability: [
    {
      id: 'sustainability.days_worked',
      function: 'operational_sustainability',
      role: 'constraint',
      dimension: 'sustainability',
      weight: 1.1,
      tags: {
        1: [t('trabajo_extendido', 4), t('limites_debiles', 3)],
        2: [t('trabajo_extendido', 3)],
        3: [t('trabajo_extendido', 1, 0.5)],
        4: [t('limites_saludables', 1)],
      },
    },
    {
      id: 'sustainability.weekend_work',
      function: 'work_boundaries',
      role: 'constraint',
      dimension: 'sustainability',
      weight: 1.15,
      tags: {
        1: [t('limites_debiles', 4), t('trabajo_extendido', 3), t('carga_sin_recuperacion', 3)],
        2: [t('limites_debiles', 3), t('trabajo_extendido', 2)],
        3: [t('limites_debiles', 1, 0.5)],
        4: [t('limites_saludables', 1)],
      },
    },
    {
      id: 'sustainability.personal_time',
      function: 'operational_sustainability',
      role: 'capacity',
      dimension: 'sustainability',
      weight: 1,
      tags: {
        1: [t('rutina_no_sostenible', 4), t('limites_debiles', 3)],
        2: [t('rutina_no_sostenible', 3)],
        3: [t('resiliencia_funcional', 1, 0.5)],
        4: [t('limites_saludables', 1), t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'sustainability.guilt_rest',
      function: 'work_boundaries',
      role: 'constraint',
      dimension: 'sustainability',
      weight: 1,
      tags: {
        1: [t('culpa_descanso', 4), t('dependencia_voluntad', 3)],
        2: [t('culpa_descanso', 3), t('productividad_por_presion', 2)],
        3: [t('culpa_descanso', 1, 0.5)],
        4: [t('limites_saludables', 1)],
      },
    },
    {
      id: 'sustainability.routine',
      function: 'operational_sustainability',
      role: 'risk_indicator',
      dimension: 'sustainability',
      weight: 1.3,
      severityWeight: 1.25,
      tags: {
        1: [t('rutina_no_sostenible', 4), t('productividad_por_presion', 4), t('riesgo_burnout', 3)],
        2: [t('rutina_no_sostenible', 3), t('dependencia_voluntad', 3)],
        3: [t('resiliencia_funcional', 1, 0.5)],
        4: [t('resiliencia_funcional', 1), t('limites_saludables', 1)],
      },
    },
    {
      id: 'sustainability.breaks',
      function: 'mental_recovery',
      role: 'constraint',
      dimension: 'recovery',
      weight: 1,
      tags: {
        1: [t('pausas_insuficientes', 4), t('carga_sin_recuperacion', 3)],
        2: [t('pausas_insuficientes', 3)],
        3: [t('pausas_insuficientes', 1, 0.5)],
        4: [t('recuperacion_estable', 1)],
      },
    },
    {
      id: 'sustainability.vacation_recovery',
      function: 'functional_resilience',
      role: 'capacity',
      dimension: 'recovery',
      weight: 0.95,
      tags: {
        1: [t('carga_sin_recuperacion', 4), t('fatiga_acumulada', 3)],
        2: [t('carga_sin_recuperacion', 3)],
        3: [t('recuperacion_estable', 1, 0.5)],
        4: [t('recuperacion_estable', 1), t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'sustainability.presence_dependency',
      function: 'presence_dependency',
      role: 'dependency',
      dimension: 'sustainability',
      weight: 1.3,
      severityWeight: 1.25,
      tags: {
        1: [t('dependencia_presencia', 4), t('rutina_no_sostenible', 3)],
        2: [t('dependencia_presencia', 3), t('dependencia_voluntad', 2)],
        3: [t('dependencia_presencia', 1, 0.5)],
        4: [t('limites_saludables', 1), t('resiliencia_funcional', 1)],
      },
    },
    {
      id: 'sustainability.burnout_proximity',
      function: 'wear_symptom',
      role: 'risk_indicator',
      dimension: 'sustainability',
      weight: 1.35,
      severityWeight: 1.35,
      tags: {
        1: [t('riesgo_burnout', 4), t('fatiga_acumulada', 4), t('rutina_no_sostenible', 3)],
        2: [t('riesgo_burnout', 3), t('fatiga_acumulada', 3)],
        3: [t('riesgo_burnout', 1, 0.5)],
      },
    },
    {
      id: 'sustainability.overall_balance',
      function: 'operational_sustainability',
      role: 'capacity',
      dimension: 'sustainability',
      weight: 1.2,
      tags: {
        1: [t('rutina_no_sostenible', 4), t('limites_debiles', 4)],
        2: [t('rutina_no_sostenible', 3), t('limites_debiles', 3)],
        3: [t('resiliencia_funcional', 1, 0.5)],
        4: [t('limites_saludables', 1), t('resiliencia_funcional', 1)],
      },
    },
  ],
};

const buildOptions = (
  question: PerformanceQuestionDefinition,
  blueprint: QuestionBlueprint,
): HumanQuestionDefinition['options'] => (
  question.options.map((label, optionIndex) => {
    const optionValue = (optionIndex + 1) as OptionValue;
    return {
      id: `${blueprint.id}.option_${optionValue}`,
      label,
      score: scoreByOption[optionValue],
      tags: blueprint.tags[optionValue] ?? [],
    };
  })
);

export const buildPersonalPerformanceQuestionDefinitions = (
  questions: PerformanceQuestionsMap,
): Record<HumanPerformanceSection, HumanQuestionDefinition[]> => {
  const sectionKeys = Object.keys(SECTION_BLUEPRINTS) as HumanPerformanceSection[];

  return sectionKeys.reduce<Record<HumanPerformanceSection, HumanQuestionDefinition[]>>((result, sectionKey) => {
    const sectionQuestions = questions[sectionKey] ?? [];
    const blueprints = SECTION_BLUEPRINTS[sectionKey];

    result[sectionKey] = blueprints.map((blueprint, index) => {
      const question = sectionQuestions[index] ?? {
        question: blueprint.id,
        options: ['1', '2', '3', '4'],
      };

      return {
        id: blueprint.id,
        section: sectionKey,
        index: index + 1,
        label: question.question,
        function: blueprint.function,
        role: blueprint.role,
        dimension: blueprint.dimension,
        weight: blueprint.weight,
        severityWeight: blueprint.severityWeight ?? 1,
        options: buildOptions(question, blueprint),
      };
    });

    return result;
  }, {} as Record<HumanPerformanceSection, HumanQuestionDefinition[]>);
};
