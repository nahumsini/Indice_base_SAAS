import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Printer, RotateCcw } from 'lucide-react';

import {
  personalPerformanceApi,
  type PersonalPerformanceResponse,
  type PersonalPerformanceSection,
  type PersonalPerformanceSectionKey,
  type PersonalPerformanceSectionStatus,
  type SavePersonalPerformancePayload,
} from '../../../api/HomePanel/PersonalPerformance/personalPerformance';
import {
  runWithMinimumDuration,
} from '../../../components/LoadingBarOverlay';
import { Button } from '../../../components/ui/button';
import { DashboardTitleBar } from '../components/DashboardTitleBar';
import { IndiceConfirmationDialog } from '../../../components/indice-modal';
import {
  PersonalPerformancePrintPortal,
  type PersonalPerformancePdfDocumentProps,
} from './PersonalPerformancePdf';
import {
  usePersonalPerformanceResolvedLocale,
  usePersonalPerformanceTranslations,
} from './hooks/usePersonalPerformanceTranslations';
import { buildPersonalPerformanceEngineReport } from './personalPerformanceEngine';
import {
  buildReportFileName,
  getReportUserDisplayName,
  loadReportUserDisplayName,
  USER_PROFILE_UPDATED_EVENT,
} from '../reportFileName';

type SectionId = PersonalPerformanceSectionKey;
type QuestionDefinition = {
  question: string;
  options: string[];
};

type SectionState = {
  id: number | null;
  status: PersonalPerformanceSectionStatus;
  completedAt: string | null;
  questionCount: number;
  uiKey: string;
  answers: Record<number, number>;
};

type PersonalPerformanceState = Record<SectionId, SectionState>;
type PersonalPerformanceQuestions = Record<SectionId, QuestionDefinition[]>;

const DEFAULT_SECTION_UI_KEYS: Record<SectionId, string> = {
  sleep_recovery: 'sleep_recovery',
  nutrition_energy: 'nutrition_energy',
  stress_clarity: 'stress_clarity',
  balance_sustainability: 'balance_sustainability',
};

const ANSWER_KEY_PREFIXES: Record<SectionId, string> = {
  sleep_recovery: 'sr',
  nutrition_energy: 'ne',
  stress_clarity: 'sc',
  balance_sustainability: 'bs',
};

const DEFAULT_QUESTION_COUNT = 10;
const PERSONAL_PERFORMANCE_AUTO_SAVE_DEBOUNCE_MS = 700;
const PERSONAL_PERFORMANCE_REPORT_ID_PREFIX = 'IDX-PPI';

const SECTION_METADATA: Array<{
  id: SectionId;
  emoji: string;
}> = [
  { id: 'sleep_recovery', emoji: '😴' },
  { id: 'nutrition_energy', emoji: '🥗' },
  { id: 'stress_clarity', emoji: '🧠' },
  { id: 'balance_sustainability', emoji: '⚖️' },
];

const createEmptySectionState = (sectionKey: SectionId, questionCount = DEFAULT_QUESTION_COUNT): SectionState => ({
  id: null,
  status: 'draft',
  completedAt: null,
  questionCount,
  uiKey: DEFAULT_SECTION_UI_KEYS[sectionKey],
  answers: {},
});

const createEmptyPersonalPerformanceState = (): PersonalPerformanceState => ({
  sleep_recovery: createEmptySectionState('sleep_recovery'),
  nutrition_energy: createEmptySectionState('nutrition_energy'),
  stress_clarity: createEmptySectionState('stress_clarity'),
  balance_sustainability: createEmptySectionState('balance_sustainability'),
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
  sectionKey: SectionId,
  answers: Record<number, number>,
) => Object.entries(answers)
  .sort(([leftIndex], [rightIndex]) => Number(leftIndex) - Number(rightIndex))
  .reduce<Record<string, number>>((result, [questionIndex, answerIndex]) => {
    result[`${ANSWER_KEY_PREFIXES[sectionKey]}${Number(questionIndex) + 1}`] = Number(answerIndex) + 1;
    return result;
  }, {});

const createStateFromSection = (
  sectionKey: SectionId,
  section: PersonalPerformanceSection | undefined,
  questions: PersonalPerformanceQuestions,
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

const createStateFromResponse = (
  response: PersonalPerformanceResponse,
  questions: PersonalPerformanceQuestions,
): PersonalPerformanceState => ({
  sleep_recovery: createStateFromSection('sleep_recovery', response.sections.sleep_recovery, questions),
  nutrition_energy: createStateFromSection('nutrition_energy', response.sections.nutrition_energy, questions),
  stress_clarity: createStateFromSection('stress_clarity', response.sections.stress_clarity, questions),
  balance_sustainability: createStateFromSection('balance_sustainability', response.sections.balance_sustainability, questions),
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

const areStatesEqual = (
  currentState: PersonalPerformanceState,
  baselineState: PersonalPerformanceState,
) => SECTION_METADATA.every(({ id }) => (
  areSectionsEqual(currentState[id], baselineState[id])
));

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
  currentState: PersonalPerformanceState,
  baselineState: PersonalPerformanceState,
): SavePersonalPerformancePayload => {
  const sections = SECTION_METADATA.reduce<SavePersonalPerformancePayload['sections']>((result, { id }) => {
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

export default function PersonalPerformance() {
  const performanceUi = usePersonalPerformanceTranslations();
  const resolvedLocale = usePersonalPerformanceResolvedLocale();
  const actionsUi = performanceUi.actions;
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [sectionState, setSectionState] = useState<PersonalPerformanceState>(createEmptyPersonalPerformanceState);
  const [baselineSectionState, setBaselineSectionState] = useState<PersonalPerformanceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportUserName, setReportUserName] = useState('');
  const [printJob, setPrintJob] = useState<PersonalPerformancePdfDocumentProps | null>(null);
  const [restartConfirmationOpen, setRestartConfirmationOpen] = useState(false);
  const sectionStateRef = useRef(sectionState);
  const failedAutoSaveKeyRef = useRef('');

  const questions = useMemo<PersonalPerformanceQuestions>(() => performanceUi.questions, [performanceUi.questions]);
  const sections = useMemo(() => SECTION_METADATA.map((section) => ({
    ...section,
    title: performanceUi.sections[section.id].title,
    onboardingTitle: performanceUi.onboarding.sections[section.id].title,
    onboardingIntro: performanceUi.onboarding.sections[section.id].intro,
  })), [performanceUi.onboarding.sections, performanceUi.sections]);
  const sectionTitles = useMemo(() => ({
    sleep_recovery: performanceUi.sections.sleep_recovery.title,
    nutrition_energy: performanceUi.sections.nutrition_energy.title,
    stress_clarity: performanceUi.sections.stress_clarity.title,
    balance_sustainability: performanceUi.sections.balance_sustainability.title,
  }), [performanceUi.sections]);
  const engineReport = useMemo(() => buildPersonalPerformanceEngineReport({
    questions,
    sections: sectionState,
    sectionTitles,
    locale: resolvedLocale,
  }), [questions, resolvedLocale, sectionState, sectionTitles]);
  const scoreReport = engineReport.scoreReport;
  const reportId = useMemo(() => {
    const now = new Date();
    const stamp = [
      now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');

    return `${PERSONAL_PERFORMANCE_REPORT_ID_PREFIX}-${stamp}`;
  }, []);

  useEffect(() => {
    sectionStateRef.current = sectionState;
  }, [sectionState]);

  useEffect(() => {
    let active = true;

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: Parameters<typeof getReportUserDisplayName>[0] }>).detail;
      if (detail?.user) {
        setReportUserName(getReportUserDisplayName(detail.user));
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate);

    loadReportUserDisplayName()
      .then((displayName) => {
        if (active) {
          setReportUserName(displayName);
        }
      });

    return () => {
      active = false;
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;

    runWithMinimumDuration(personalPerformanceApi.getPersonalPerformance())
      .then((response) => {
        if (!active) {
          return;
        }

        const nextState = createStateFromResponse(response, questions);
        setSectionState(nextState);
        setBaselineSectionState(nextState);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const emptyState = createStateFromResponse({
          profile: {
            id: null,
            user_id: 0,
            company_id: 0,
            version: 1,
            status: 'draft',
            started_at: null,
            completed_at: null,
          },
          sections: {
            sleep_recovery: {
              id: null,
              section_key: 'sleep_recovery',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.sleep_recovery,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: questions.sleep_recovery.length || DEFAULT_QUESTION_COUNT,
              },
            },
            nutrition_energy: {
              id: null,
              section_key: 'nutrition_energy',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.nutrition_energy,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: questions.nutrition_energy.length || DEFAULT_QUESTION_COUNT,
              },
            },
            stress_clarity: {
              id: null,
              section_key: 'stress_clarity',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.stress_clarity,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: questions.stress_clarity.length || DEFAULT_QUESTION_COUNT,
              },
            },
            balance_sustainability: {
              id: null,
              section_key: 'balance_sustainability',
              status: 'draft',
              completed_at: null,
              data: {
                ui_key: DEFAULT_SECTION_UI_KEYS.balance_sustainability,
                answers: {},
                saved_at: null,
                answered_count: 0,
                question_count: questions.balance_sustainability.length || DEFAULT_QUESTION_COUNT,
              },
            },
          },
        }, questions);

        setSectionState((currentState) => (
          areStatesEqual(currentState, createEmptyPersonalPerformanceState())
            ? emptyState
            : currentState
        ));
        setBaselineSectionState(emptyState);
        setErrorMessage(error instanceof Error ? error.message : performanceUi.messages.loadError);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [questions]);

  const calculateProgress = (sectionId: SectionId) => Object.keys(sectionState[sectionId].answers).length;

  const totalQuestions = useMemo(
    () => Object.values(questions).reduce((acc, sectionQuestions) => acc + sectionQuestions.length, 0),
    [questions],
  );

  const totalAnswered = useMemo(
    () => Object.values(sectionState).reduce((acc, section) => acc + Object.keys(section.answers).length, 0),
    [sectionState],
  );

  const totalProgress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
  const hasUnsavedChanges = baselineSectionState !== null && !areStatesEqual(sectionState, baselineSectionState);

  const handleAnswer = (sectionId: SectionId, questionIndex: number, answerIndex: number) => {
    setSectionState((currentState) => ({
      ...currentState,
      [sectionId]: {
        ...currentState[sectionId],
        answers: {
          ...currentState[sectionId].answers,
          [questionIndex]: answerIndex,
        },
      },
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

  };

  const handleStartSection = (sectionId: SectionId) => {
    if (activeSection === sectionId) {
      return;
    }

    setActiveSection(sectionId);
    setCurrentQuestion(getSectionEntryQuestionIndex(sectionState[sectionId], questions[sectionId]));
  };

  const handleSave = async (
    stateToSave = sectionState,
    baselineToSave = baselineSectionState,
  ) => {
    if (!baselineToSave || areStatesEqual(stateToSave, baselineToSave)) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await personalPerformanceApi.savePersonalPerformance(
        buildSavePayload(stateToSave, baselineToSave),
      );

      const nextState = createStateFromResponse(response, questions);

      setBaselineSectionState(nextState);
      if (areStatesEqual(sectionStateRef.current, stateToSave)) {
        setSectionState(nextState);
      }
      failedAutoSaveKeyRef.current = '';
    } catch (error) {
      failedAutoSaveKeyRef.current = JSON.stringify(stateToSave);
      setErrorMessage(error instanceof Error ? error.message : performanceUi.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isLoading || isSaving || !baselineSectionState || !hasUnsavedChanges) {
      return undefined;
    }

    const autoSaveKey = JSON.stringify(sectionState);
    if (failedAutoSaveKeyRef.current === autoSaveKey) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      void handleSave(sectionState, baselineSectionState);
    }, PERSONAL_PERFORMANCE_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [baselineSectionState, hasUnsavedChanges, isLoading, isSaving, sectionState]);

  const handlePrint = () => {
    setErrorMessage('');
    setPrintJob({
      report: scoreReport,
      engineReport,
      title: performanceUi.title,
      subtitle: performanceUi.description,
      generatedAt: new Date(),
      reportId,
      copy: performanceUi.pdf,
      fileName: buildReportFileName(performanceUi.pdf.fileName, reportUserName),
      locale: resolvedLocale,
      userLabel: reportUserName,
    });
  };

  const handleRestartPerformance = async () => {
    setIsSaving(true); setErrorMessage('');
    try {
      const response = await personalPerformanceApi.restartPersonalPerformance();
      const nextState = createStateFromResponse(response, questions);
      setSectionState(nextState); setBaselineSectionState(nextState); setActiveSection(null); setCurrentQuestion(0);
      setRestartConfirmationOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : performanceUi.messages.saveError);
    } finally { setIsSaving(false); }
  };

  const firstIncompleteSection = sections.find((section) => (
    calculateProgress(section.id) < questions[section.id].length
  ));
  const activeSectionData = activeSection
    ? sections.find((section) => section.id === activeSection) ?? null
    : null;
  const activeSectionIndex = activeSectionData
    ? sections.findIndex((section) => section.id === activeSectionData.id)
    : -1;
  const activeSectionQuestions = activeSectionData ? questions[activeSectionData.id] : [];
  const activeQuestionIndex = Math.min(currentQuestion, Math.max(activeSectionQuestions.length - 1, 0));
  const activeQuestion = activeSectionData ? activeSectionQuestions[activeQuestionIndex] : null;
  const activeSelectedAnswer = activeSectionData
    ? sectionState[activeSectionData.id].answers[activeQuestionIndex]
    : undefined;
  const isPerformanceComplete = totalQuestions > 0 && totalAnswered >= totalQuestions;

  const handleStartGuidedFlow = () => {
    handleStartSection(firstIncompleteSection?.id ?? sections[0].id);
  };

  const handleGuidedNext = () => {
    if (!activeSectionData || activeSelectedAnswer === undefined) {
      return;
    }

    if (activeQuestionIndex < activeSectionQuestions.length - 1) {
      setCurrentQuestion(activeQuestionIndex + 1);
      return;
    }

    const nextSection = sections[activeSectionIndex + 1];
    if (nextSection) {
      handleStartSection(nextSection.id);
      return;
    }

    setActiveSection(null);
  };

  const handleGuidedPrevious = () => {
    if (!activeSectionData) {
      return;
    }

    if (activeQuestionIndex > 0) {
      setCurrentQuestion(activeQuestionIndex - 1);
      return;
    }

    const previousSection = sections[activeSectionIndex - 1];
    if (previousSection) {
      setActiveSection(previousSection.id);
      setCurrentQuestion(Math.max(questions[previousSection.id].length - 1, 0));
    }
  };

  const titleBarActions = isPerformanceComplete && !activeSection ? (
    <div className="flex w-full gap-2 sm:w-auto">
    <Button variant="outline" size="sm" onClick={() => setRestartConfirmationOpen(true)} disabled={isSaving} className="flex-1 gap-2 sm:flex-none"><RotateCcw className="h-4 w-4" />{performanceUi.restartDialog.action}</Button>
    <Button
      size="sm"
      onClick={handlePrint}
      className="flex-1 gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:flex-none"
    >
      <Printer className="h-4 w-4" />
      {performanceUi.printReport}
    </Button></div>
  ) : undefined;

  return (
    <>
      <div className="space-y-4">
        <DashboardTitleBar
          actions={titleBarActions}
          emoji="📈"
          subtitle={performanceUi.description}
          title={performanceUi.title}
        />

        {isLoading ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
            {performanceUi.messages.loading}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activeSectionData
                  ? `${activeSectionData.emoji} ${activeSectionData.onboardingTitle}`
                  : performanceUi.centerTitle}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {activeSectionData ? activeSectionData.onboardingIntro : performanceUi.centerDescription}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-blue-700 dark:text-blue-300">{totalProgress}%</span>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${totalProgress}%` }} />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {sections.map((section, index) => {
              const progress = calculateProgress(section.id);
              const complete = progress === questions[section.id].length;
              const active = activeSection === section.id;

              return (
                <div
                  key={section.id}
                  className={`rounded-xl border px-3 py-2 ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : complete
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        {index + 1}
                      </span>
                    )}
                    <span className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                      {section.onboardingTitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {!activeSectionData ? (
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {performanceUi.questionCountLabel} {performanceUi.questionCount}
              </p>
              <Button
                onClick={handleStartGuidedFlow}
                className="mt-5 min-h-11 w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto sm:min-w-56"
              >
                {totalAnswered === 0
                  ? actionsUi.start
                  : isPerformanceComplete
                    ? actionsUi.reviewAnswers
                    : actionsUi.continue}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : activeQuestion ? (
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  {actionsUi.question} {activeQuestionIndex + 1} {actionsUi.of} {activeSectionQuestions.length}
                </span>
                <span>{activeSectionIndex + 1}/{sections.length}</span>
              </div>

              <h3 className="mb-5 text-lg font-medium text-gray-950 dark:text-white sm:text-xl">
                {activeQuestion.question}
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {activeQuestion.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    type="button"
                    onClick={() => handleAnswer(activeSectionData.id, activeQuestionIndex, optionIndex)}
                    aria-pressed={activeSelectedAnswer === optionIndex}
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      activeSelectedAnswer === optionIndex
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <span>{option}</span>
                    {activeSelectedAnswer === optionIndex ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGuidedPrevious}
                  disabled={activeSectionIndex === 0 && activeQuestionIndex === 0}
                  className="w-full gap-2 sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {actionsUi.previous}
                </Button>
                <Button
                  size="sm"
                  onClick={handleGuidedNext}
                  disabled={activeSelectedAnswer === undefined}
                  className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 sm:w-auto"
                >
                  {activeQuestionIndex === activeSectionQuestions.length - 1
                    && activeSectionIndex === sections.length - 1
                    ? actionsUi.close
                    : actionsUi.next}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </section>

      </div>

      <IndiceConfirmationDialog
        busy={isSaving}
        cancelLabel={performanceUi.restartDialog.cancel}
        confirmLabel={performanceUi.restartDialog.action}
        description={performanceUi.restartDialog.description}
        icon={<RotateCcw className="h-5 w-5" />}
        onCancel={() => setRestartConfirmationOpen(false)}
        onConfirm={() => void handleRestartPerformance()}
        open={restartConfirmationOpen}
        title={performanceUi.restartDialog.title}
        tone="blue"
      />

      <PersonalPerformancePrintPortal
        job={printJob}
        onComplete={() => setPrintJob(null)}
      />
    </>
  );
}
