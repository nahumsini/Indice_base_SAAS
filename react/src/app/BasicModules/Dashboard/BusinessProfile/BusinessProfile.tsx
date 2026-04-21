import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import {
  businessProfileApi,
  type BusinessProfileResponse,
  type BusinessProfileSection,
  type BusinessProfileSectionKey,
  type BusinessProfileSectionStatus,
  type SaveBusinessProfilePayload,
} from '../../../api/HomePanel/BusinessProfile/businessProfile';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../../../components/LoadingBarOverlay';
import { SaveChangesBar } from '../../../components/SaveChangesBar';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import { useLanguage } from '../../../shared/context';
import {
  BusinessDiagnosisPrintPortal,
  type BusinessDiagnosisPdfDocumentProps,
} from './BusinessDiagnosisPdf';
import { buildBusinessDiagnosisScoreReport } from './businessDiagnosisScoring';

type PillarId = BusinessProfileSectionKey;
type PillarColor = 'blue' | 'yellow' | 'orange' | 'green';
type QuestionDefinition = {
  question: string;
  options: string[];
};

type SectionState = {
  id: number | null;
  status: BusinessProfileSectionStatus;
  completedAt: string | null;
  questionCount: number;
  uiKey: string;
  answers: Record<number, number>;
};

type DiagnosticoState = Record<PillarId, SectionState>;
type DiagnosticoQuestions = Record<PillarId, QuestionDefinition[]>;

const DEFAULT_SECTION_UI_KEYS: Record<PillarId, string> = {
  people: 'personas',
  processes: 'procesos',
  products: 'productos',
  finance: 'finanzas',
};

const ANSWER_KEY_PREFIXES: Record<PillarId, string> = {
  people: 'p',
  processes: 'pr',
  products: 'prod',
  finance: 'fin',
};

const DEFAULT_QUESTION_COUNT = 10;
const BUSINESS_PROFILE_SAVE_MINIMUM_LOADING_MS = 2500;
const BUSINESS_PROFILE_REPORT_ID_PREFIX = 'IDX-BD';

const PILLAR_METADATA: Array<{
  id: PillarId;
  emoji: string;
  titleKey: PillarId;
  color: PillarColor;
}> = [
  { id: 'people', emoji: '👥', titleKey: 'people', color: 'blue' },
  { id: 'processes', emoji: '⚙️', titleKey: 'processes', color: 'yellow' },
  { id: 'products', emoji: '📦', titleKey: 'products', color: 'orange' },
  { id: 'finance', emoji: '💰', titleKey: 'finance', color: 'green' },
];

const createEmptySectionState = (sectionKey: PillarId, questionCount = DEFAULT_QUESTION_COUNT): SectionState => ({
  id: null,
  status: 'draft',
  completedAt: null,
  questionCount,
  uiKey: DEFAULT_SECTION_UI_KEYS[sectionKey],
  answers: {},
});

const createEmptyDiagnosticoState = (): DiagnosticoState => ({
  people: createEmptySectionState('people'),
  processes: createEmptySectionState('processes'),
  products: createEmptySectionState('products'),
  finance: createEmptySectionState('finance'),
});

const extractQuestionIndex = (questionKey: string) => {
  const match = questionKey.match(/(\d+)/);
  if (!match) {
    return null;
  }

  const parsedIndex = Number.parseInt(match[1], 10);
  if (Number.isNaN(parsedIndex) || parsedIndex <= 0) {
    return null;
  }

  return parsedIndex - 1;
};

const deserializeAnswers = (rawAnswers: Record<string, number> | undefined): Record<number, number> => {
  if (!rawAnswers) {
    return {};
  }

  return Object.entries(rawAnswers).reduce<Record<number, number>>((result, [questionKey, value]) => {
    const questionIndex = extractQuestionIndex(questionKey);

    if (questionIndex === null) {
      return result;
    }

    const normalizedValue = Number(value);
    if (Number.isNaN(normalizedValue) || normalizedValue < 1 || normalizedValue > 4) {
      return result;
    }

    result[questionIndex] = normalizedValue - 1;
    return result;
  }, {});
};

const serializeAnswers = (
  sectionKey: PillarId,
  answers: Record<number, number>,
) => Object.entries(answers)
  .sort(([leftIndex], [rightIndex]) => Number(leftIndex) - Number(rightIndex))
  .reduce<Record<string, number>>((result, [questionIndex, answerIndex]) => {
    result[`${ANSWER_KEY_PREFIXES[sectionKey]}${Number(questionIndex) + 1}`] = Number(answerIndex) + 1;
    return result;
  }, {});

const createStateFromSection = (
  sectionKey: PillarId,
  section: BusinessProfileSection | undefined,
  questions: DiagnosticoQuestions,
): SectionState => {
  const fallbackQuestionCount = questions[sectionKey]?.length || DEFAULT_QUESTION_COUNT;

  if (!section) {
    return createEmptySectionState(sectionKey, fallbackQuestionCount);
  }

  const questionCount = Number(section.data.question_count) || fallbackQuestionCount;

  return {
    id: section.id,
    status: section.status,
    completedAt: section.completed_at,
    questionCount,
    uiKey: typeof section.data.ui_key === 'string' && section.data.ui_key.trim().length > 0
      ? section.data.ui_key
      : DEFAULT_SECTION_UI_KEYS[sectionKey],
    answers: deserializeAnswers(section.data.answers),
  };
};

const createDiagnosticoStateFromResponse = (
  response: BusinessProfileResponse,
  questions: DiagnosticoQuestions,
): DiagnosticoState => ({
  people: createStateFromSection('people', response.sections.people, questions),
  processes: createStateFromSection('processes', response.sections.processes, questions),
  products: createStateFromSection('products', response.sections.products, questions),
  finance: createStateFromSection('finance', response.sections.finance, questions),
});

const areSectionAnswersEqual = (
  leftAnswers: Record<number, number>,
  rightAnswers: Record<number, number>,
) => {
  const leftKeys = Object.keys(leftAnswers);
  const rightKeys = Object.keys(rightAnswers);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => leftAnswers[Number(key)] === rightAnswers[Number(key)]);
};

const areSectionsEqual = (
  currentSection: SectionState,
  baselineSection: SectionState,
) => currentSection.questionCount === baselineSection.questionCount
  && currentSection.uiKey === baselineSection.uiKey
  && areSectionAnswersEqual(currentSection.answers, baselineSection.answers);

const areDiagnosticoStatesEqual = (
  currentState: DiagnosticoState,
  baselineState: DiagnosticoState,
) => PILLAR_METADATA.every(({ id }) => {
  const currentSection = currentState[id];
  const baselineSection = baselineState[id];

  return areSectionsEqual(currentSection, baselineSection);
});

const deriveSectionStatus = (section: SectionState) => {
  const answeredCount = Object.keys(section.answers).length;

  if (answeredCount <= 0) {
    return 'draft' as const;
  }

  if (answeredCount >= section.questionCount) {
    return 'completed' as const;
  }

  return 'in_progress' as const;
};

const buildSavePayload = (
  currentState: DiagnosticoState,
  baselineState: DiagnosticoState,
): SaveBusinessProfilePayload => {
  const sections = PILLAR_METADATA.reduce<SaveBusinessProfilePayload['sections']>((result, { id }) => {
    const currentSection = currentState[id];
    const baselineSection = baselineState[id];

    const isUnchanged = currentSection.questionCount === baselineSection.questionCount
      && currentSection.uiKey === baselineSection.uiKey
      && areSectionAnswersEqual(currentSection.answers, baselineSection.answers);

    if (isUnchanged) {
      return result;
    }

    const nextStatus = deriveSectionStatus(currentSection);

    result[id] = {
      status: nextStatus,
      completed_at: nextStatus === 'completed'
        ? (currentSection.completedAt ?? baselineSection.completedAt ?? undefined)
        : null,
      data: {
        ui_key: currentSection.uiKey,
        question_count: currentSection.questionCount,
        answers: serializeAnswers(id, currentSection.answers),
      },
    };

    return result;
  }, {});

  return { sections };
};

const getNextQuestionIndex = (section: SectionState, questions: QuestionDefinition[]) => {
  const totalQuestions = questions.length || section.questionCount || DEFAULT_QUESTION_COUNT;

  for (let index = 0; index < totalQuestions; index += 1) {
    if (section.answers[index] === undefined) {
      return index;
    }
  }

  return Math.max(totalQuestions - 1, 0);
};

const getSectionEntryQuestionIndex = (section: SectionState, questions: QuestionDefinition[]) => {
  const answeredCount = Object.keys(section.answers).length;
  const totalQuestions = questions.length || section.questionCount || DEFAULT_QUESTION_COUNT;

  if (answeredCount <= 0 || answeredCount >= totalQuestions) {
    return 0;
  }

  return getNextQuestionIndex(section, questions);
};

export default function BusinessProfile() {
  const { t } = useLanguage();
  const diagnosisCopy = t.panelInicial.diagnosis;
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [sectionState, setSectionState] = useState<DiagnosticoState>(createEmptyDiagnosticoState);
  const [baselineSectionState, setBaselineSectionState] = useState<DiagnosticoState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [printJob, setPrintJob] = useState<BusinessDiagnosisPdfDocumentProps | null>(null);

  const diagnosticoQuestions = useMemo<DiagnosticoQuestions>(() => ({
    people: diagnosisCopy.questions.people,
    processes: diagnosisCopy.questions.processes,
    products: diagnosisCopy.questions.products,
    finance: diagnosisCopy.questions.finance,
  }), [diagnosisCopy.questions.finance, diagnosisCopy.questions.people, diagnosisCopy.questions.processes, diagnosisCopy.questions.products]);

  const pilares = useMemo(() => PILLAR_METADATA.map((pillar) => ({
    ...pillar,
    title: diagnosisCopy.pillars[pillar.titleKey].title,
    description: diagnosisCopy.pillars[pillar.titleKey].description,
  })), [diagnosisCopy.pillars]);
  const pillarTitles = useMemo(() => ({
    people: diagnosisCopy.pillars.people.title,
    processes: diagnosisCopy.pillars.processes.title,
    products: diagnosisCopy.pillars.products.title,
    finance: diagnosisCopy.pillars.finance.title,
  }), [diagnosisCopy.pillars.finance.title, diagnosisCopy.pillars.people.title, diagnosisCopy.pillars.processes.title, diagnosisCopy.pillars.products.title]);
  const diagnosisScoreReport = useMemo(() => buildBusinessDiagnosisScoreReport({
    questions: diagnosticoQuestions,
    sections: sectionState,
    pillarTitles,
  }), [diagnosticoQuestions, pillarTitles, sectionState]);
  const reportId = useMemo(() => {
    const now = new Date();
    const stamp = [
      now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');

    return `${BUSINESS_PROFILE_REPORT_ID_PREFIX}-${stamp}`;
  }, []);

  useEffect(() => {
    let active = true;

    businessProfileApi.getBusinessProfile()
      .then((response) => {
        if (!active) {
          return;
        }

        const nextSectionState = createDiagnosticoStateFromResponse(response, diagnosticoQuestions);

        setSectionState(nextSectionState);
        setBaselineSectionState(nextSectionState);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const emptyState = createDiagnosticoStateFromResponse({
          profile: {
            id: null,
            company_id: 0,
            version: 1,
            status: 'draft',
            started_at: null,
            completed_at: null,
          },
          sections: {
            people: {
              id: null,
              section_key: 'people',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.people,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: diagnosticoQuestions.people.length || DEFAULT_QUESTION_COUNT,
              },
            },
            processes: {
              id: null,
              section_key: 'processes',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.processes,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: diagnosticoQuestions.processes.length || DEFAULT_QUESTION_COUNT,
              },
            },
            products: {
              id: null,
              section_key: 'products',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.products,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: diagnosticoQuestions.products.length || DEFAULT_QUESTION_COUNT,
              },
            },
            finance: {
              id: null,
              section_key: 'finance',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.finance,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: diagnosticoQuestions.finance.length || DEFAULT_QUESTION_COUNT,
              },
            },
          },
        }, diagnosticoQuestions);

        setSectionState((currentState) => (
          areDiagnosticoStatesEqual(currentState, createEmptyDiagnosticoState())
            ? emptyState
            : currentState
        ));
        setBaselineSectionState(emptyState);
        setErrorMessage(error instanceof Error ? error.message : diagnosisCopy.messages.loadError);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const calculateProgress = (pillarId: PillarId) => Object.keys(sectionState[pillarId].answers).length;

  const totalQuestions = useMemo(
    () => Object.values(diagnosticoQuestions).reduce((acc, questions) => acc + questions.length, 0),
    [diagnosticoQuestions],
  );

  const totalAnswered = useMemo(
    () => Object.values(sectionState).reduce((acc, section) => acc + Object.keys(section.answers).length, 0),
    [sectionState],
  );

  const totalProgress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
  const hasUnsavedChanges = baselineSectionState !== null && !areDiagnosticoStatesEqual(sectionState, baselineSectionState);
  const isSectionDirty = (pillarId: PillarId) => (
    baselineSectionState !== null
      ? !areSectionsEqual(sectionState[pillarId], baselineSectionState[pillarId])
      : Object.keys(sectionState[pillarId].answers).length > 0
  );
  const getPillarActionLabel = (pillarId: PillarId) => {
    const currentSection = sectionState[pillarId];
    const answeredCount = Object.keys(currentSection.answers).length;
    const totalPillarQuestions = diagnosticoQuestions[pillarId].length;

    if (answeredCount <= 0) {
      return diagnosisCopy.start;
    }

    if (answeredCount >= totalPillarQuestions) {
      return isSectionDirty(pillarId) ? diagnosisCopy.reviewAnswers : diagnosisCopy.doAgain;
    }

    return diagnosisCopy.continue;
  };

  const handleAnswer = (pillarId: PillarId, questionIndex: number, answerIndex: number) => {
    setSectionState((currentState) => ({
      ...currentState,
      [pillarId]: {
        ...currentState[pillarId],
        answers: {
          ...currentState[pillarId].answers,
          [questionIndex]: answerIndex,
        },
      },
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const handleRestartPillar = (pillarId: PillarId) => {
    setSectionState((currentState) => ({
      ...currentState,
      [pillarId]: {
        ...currentState[pillarId],
        completedAt: null,
        answers: {},
      },
    }));
    setCurrentQuestion(0);

    if (errorMessage) {
      setErrorMessage('');
    }

    if (saveMessage) {
      setSaveMessage('');
    }
  };

  const handleNextQuestion = () => {
    if (!activePillar) {
      return;
    }

    const pillarQuestions = diagnosticoQuestions[activePillar];
    if (currentQuestion < pillarQuestions.length - 1) {
      setCurrentQuestion((previousValue) => previousValue + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previousValue) => previousValue - 1);
    }
  };

  const handleStartPillar = (pillarId: PillarId) => {
    setActivePillar(pillarId);
    setCurrentQuestion(getSectionEntryQuestionIndex(sectionState[pillarId], diagnosticoQuestions[pillarId]));
  };

  const handleDiscardChanges = () => {
    if (!baselineSectionState || isSaving) {
      return;
    }

    setSectionState(baselineSectionState);
    setErrorMessage('');
    setSaveMessage('');

    if (activePillar) {
      setCurrentQuestion(getNextQuestionIndex(baselineSectionState[activePillar], diagnosticoQuestions[activePillar]));
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!baselineSectionState || !hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      const response = await runWithMinimumDuration(
        businessProfileApi.saveBusinessProfile(
          buildSavePayload(sectionState, baselineSectionState),
        ),
        BUSINESS_PROFILE_SAVE_MINIMUM_LOADING_MS,
      );

      const nextSectionState = createDiagnosticoStateFromResponse(response, diagnosticoQuestions);

      setSectionState(nextSectionState);
      setBaselineSectionState(nextSectionState);
      setSaveMessage(diagnosisCopy.messages.saveSuccess);

      if (activePillar) {
        setActivePillar(null);
        setCurrentQuestion(0);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : diagnosisCopy.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintDiagnosis = () => {
    setErrorMessage('');
    setPrintJob({
      report: diagnosisScoreReport,
      title: diagnosisCopy.title,
      subtitle: diagnosisCopy.description,
      generatedAt: new Date(),
      reportId,
    });
  };

  const getColorClasses = (color: PillarColor) => {
    const colorMap: Record<PillarColor, { bg: string; text: string; border: string; icon: string }> = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-700',
        icon: 'bg-blue-100 dark:bg-blue-900/40',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-700',
        icon: 'bg-yellow-100 dark:bg-yellow-900/40',
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-700',
        icon: 'bg-orange-100 dark:bg-orange-900/40',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-700',
        icon: 'bg-green-100 dark:bg-green-900/40',
      },
    };

    return colorMap[color];
  };

  return (
    <>
      <div className={`space-y-6 ${hasUnsavedChanges ? 'pb-24 sm:pb-20' : ''}`}>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700/30 dark:bg-purple-900/10 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
                <span className="text-2xl">📊</span>
                {diagnosisCopy.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {diagnosisCopy.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintDiagnosis}
              className="w-full gap-2 border-purple-600 bg-purple-600 text-white hover:border-purple-700 hover:bg-purple-700 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              {diagnosisCopy.printDiagnosis}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-700/30 dark:bg-purple-900/20 dark:text-purple-300">
            {diagnosisCopy.messages.loading}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {diagnosisCopy.centerTitle}
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {diagnosisCopy.centerDescription}
          </p>
          <p className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
            {diagnosisCopy.questionCountLabel}{' '}
            <span className="text-purple-600">{diagnosisCopy.questionCount}</span>
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pilares.map((pilar) => {
              const progress = calculateProgress(pilar.id);
              const isComplete = progress === diagnosticoQuestions[pilar.id].length;

              return (
                <div key={pilar.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      isComplete ? 'border-purple-600 bg-purple-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {pilar.emoji} {pilar.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {diagnosisCopy.progress}
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {totalProgress}% {diagnosisCopy.progressOf}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pilares.map((pilar) => {
              const progress = calculateProgress(pilar.id);
              const isComplete = progress === diagnosticoQuestions[pilar.id].length;

              return (
                <div key={pilar.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      isComplete ? 'border-purple-600 bg-purple-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{pilar.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pilares.map((pilar) => {
            const progress = calculateProgress(pilar.id);
            const totalPillarQuestions = diagnosticoQuestions[pilar.id].length;
            const isActive = activePillar === pilar.id;
            const colors = getColorClasses(pilar.color);
            const activeQuestionIndex = Math.min(currentQuestion, Math.max(totalPillarQuestions - 1, 0));

            return (
              <div key={pilar.id}>
                <div className={`rounded-lg border-2 p-4 transition-all sm:p-6 ${colors.border} ${colors.bg}`}>
                  <div className="mb-4 flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${colors.icon}`}>
                      {pilar.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className={`mb-1 font-semibold ${colors.text}`}>{pilar.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{pilar.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {progress}/{totalPillarQuestions}
                    </span>
                    <Button
                      onClick={() => handleStartPillar(pilar.id)}
                      size="sm"
                      className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
                    >
                      {getPillarActionLabel(pilar.id)}
                    </Button>
                  </div>
                </div>

                {isActive ? (
                  <div className="mt-4 rounded-lg border-2 border-purple-600 bg-white p-4 shadow-lg dark:bg-gray-800 sm:p-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {pilar.emoji} {pilar.title}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivePillar(null)}
                        className="w-full sm:w-auto"
                      >
                        {diagnosisCopy.close}
                      </Button>
                    </div>

                    <div className="mb-8">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {diagnosisCopy.question} {activeQuestionIndex + 1} {diagnosisCopy.of} {totalPillarQuestions}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {progress}/{totalPillarQuestions} {diagnosisCopy.completed}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${((activeQuestionIndex + 1) / totalPillarQuestions) * 100}%` }}
                        />
                      </div>
                    </div>

                    {(() => {
                      const currentQ = diagnosticoQuestions[pilar.id][activeQuestionIndex];
                      const selectedAnswer = sectionState[pilar.id].answers[activeQuestionIndex];

                      return (
                        <div className="mb-8">
                          <p className="mb-6 text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
                            {activeQuestionIndex + 1}. {currentQ.question}
                          </p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {currentQ.options.map((option, optionIndex) => (
                              <button
                                key={optionIndex}
                                type="button"
                                onClick={() => handleAnswer(pilar.id, activeQuestionIndex, optionIndex)}
                                className={`rounded-lg border-2 px-4 py-4 text-left text-sm font-medium transition-all sm:px-6 sm:text-base ${
                                  selectedAnswer === optionIndex
                                    ? 'border-purple-600 bg-purple-600 text-white shadow-md'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-purple-900/20'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousQuestion}
                        disabled={activeQuestionIndex === 0}
                        className="w-full gap-2 sm:w-auto"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {diagnosisCopy.previous}
                      </Button>

                      {activeQuestionIndex < totalPillarQuestions - 1 ? (
                        <Button
                          size="sm"
                          onClick={handleNextQuestion}
                          className="w-full gap-2 bg-purple-600 hover:bg-purple-700 sm:w-auto"
                        >
                          {diagnosisCopy.next}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    {progress === totalPillarQuestions ? (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestartPillar(pilar.id)}
                          className="text-sm"
                        >
                          {diagnosisCopy.restart}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <SaveChangesBar
        isVisible={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSaveDiagnosis}
        onDiscard={handleDiscardChanges}
        saveLabel={diagnosisCopy.actions.save}
        savingLabel={diagnosisCopy.actions.saving}
        discardLabel={diagnosisCopy.actions.discard}
        message={diagnosisCopy.messages.unsavedChanges}
      />

      <LoadingBarOverlay
        isVisible={isSaving}
        title={diagnosisCopy.actions.saving}
      />

      <SuccessToast
        isVisible={Boolean(saveMessage)}
        message={saveMessage}
        onClose={() => setSaveMessage('')}
      />

      <BusinessDiagnosisPrintPortal
        job={printJob}
        onComplete={() => setPrintJob(null)}
      />
    </>
  );
}
