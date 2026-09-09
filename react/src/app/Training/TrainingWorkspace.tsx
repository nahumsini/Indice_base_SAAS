import { useTrainingProgramCopy, trainingProgramText, trainingProgramNumber, type TrainingProgramCopy } from "./translations/program";
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  GraduationCap,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../components/frontend-os';
import { apiClient } from '../lib/apiClient';
import { IndiceInduction } from './IndiceInduction';
import { SalesProcess } from './SalesProcess';
import { CertificateCard, TrainingExamPanel, type ExamSummaryResponse } from './TrainingExamPanel';

type TrainingPortal = 'root' | 'distributor';
type TrainingItem = { id: string; title: string; description: string; route?: string };
type TrainingGroup = { title: string; items: TrainingItem[] };
type TrainingAssessment = {
  code: string;
  title: string;
  scenario: string;
  practice: string;
  evidence: string;
  consultantOutcome: string;
  coverage: string[];
  options: Array<{ code: string; label: string }>;
};
type TrainingSession = {
  id: string;
  number: number;
  title: string;
  description: string;
  accent: string;
  icon: typeof LayoutDashboard;
  groups: TrainingGroup[];
  assessment: TrainingAssessment;
};
type TrainingWorkspaceResponse = {
  program_code: string;
  program_version: string;
  completed_item_codes: string[];
  audience_summary?: { active_learners?: number; completed_checks?: number; last_activity_at?: string | null };
};

const item = (id: string, title: string, description: string, route?: string): TrainingItem => ({ id, title, description, route });
const assessment = (
  code: string,
  title: string,
  scenario: string,
  practice: string,
  evidence: string,
  consultantOutcome: string,
  coverage: string[],
  options: Array<[string, string]>,
): TrainingAssessment => ({ code, title, scenario, practice, evidence, consultantOutcome, coverage, options: options.map(([optionCode, label]) => ({ code: optionCode, label })) });

export const getTrainingSessions = (copy: TrainingProgramCopy): TrainingSession[] => [
  {
    id: 'indice', number: 1, title: copy.indiceAndTheHomeDashboard, icon: LayoutDashboard, accent: '#2563EB',
    description: copy.understandTheIndiceOfferingAndMasterThe,
    assessment: assessment(
      'assessment.indice',
      copy.buildTheFoundationBeforeShowingIndicators,
      copy.aNewCompanyAsksForADashboard,
      copy.configureADemoCompanyWithAProfile,
      copy.brieflyExplainWhyStructureAndPermissionsMust,
      copy.canExplainIndicePrepareTheCompanyGuide,
      [copy.profile, copy.businessStructure, copy.companyProfile, copy.consulting, copy.usersAndPermissions, copy.dashboard],
      [
        ['show-dashboard', copy.immediatelyShowEveryIndicatorSoTheClient],
        ['configure-foundation', copy.firstDefineStructureResponsibilitiesAndPermissionsThen],
        ['import-spreadsheet', copy.importTheirExistingSpreadsheetsAndRetainThe],
      ],
    ),
    groups: [
      { title: copy.foundations, items: [
        item('indice.propuesta', copy.explainWhatIndiceIs, copy.explainThatItIsAManagementPlatform),
        item('indice.navegacion', copy.navigateModulesAndTabs, copy.locateModulesTabsAndShortcutsAndReturn, '/dashboard'),
        item('indice.personalizacion', copy.personalizeTheExperience, copy.useLanguageThemeProfileAndColumnsTo),
      ]},
      { title: copy.dashboard, items: [
        item('indice.dashboard', copy.interpretTheDashboard, copy.recognizeIndicatorsAlertsSummariesAndMainShortcuts, '/dashboard'),
        item('indice.filtros', copy.useFiltersPeriodsAndCurrency, copy.changeTheAnalysisPeriodAndUnderstandIts),
        item('indice.notificaciones', copy.manageNotifications, copy.reviewNoticesIdentifyPendingWorkAndFollow),
      ]},
    ],
  },
  {
    id: 'rh', number: 2, title: copy.humanResources, icon: Users, accent: '#59C3A5',
    description: copy.manageEmployeesStructureAccessAndHumanResources,
    assessment: assessment(
      'assessment.rh',
      copy.diagnoseGapsInWorkforceControl,
      copy.theOwnerSaysEmployeesArriveLateGhost,
      copy.createACompleteEmployeeRecordAssignA,
      copy.provideAScreenshotOrNoteDistinguishingThe,
      copy.canDistinguishRecordsAccessSchedulesAttendanceIncidents,
      [copy.employees, copy.attendance, copy.control, copy.payroll, copy.announcements, copy.assets, copy.employeeRecords, copy.permissions, copy.incentives, 'KPIs'],
      [
        ['start-payroll', copy.startWithPayrollToAutomaticallyDetectWho],
        ['configure-people-control', copy.organizeEmployeesPositionsLocationsAndSchedulesThen],
        ['share-admin-user', copy.shareOneAdministratorAccountSoEveryoneCan],
      ],
    ),
    groups: [
      { title: copy.employees, items: [
        item('rh.colaboradores', copy.reviewEmployees, copy.searchFilterAndUnderstandTheListS, '/human-resources/collaborators'),
        item('rh.agregar', copy.addAnEmployee, copy.correctlyRecordPersonalAndEmploymentDetailsPosition, '/human-resources/collaborators'),
        item('rh.editar', copy.editAnEmployee, copy.updateInformationAndMaintainAReliableEmployment, '/human-resources/collaborators'),
        item('rh.columnas', copy.customizeColumns, copy.useTheColumnsButtonToDisplayInformation, '/human-resources/collaborators'),
      ]},
      { title: copy.operationsAndControl, items: [
        item('rh.accesos', copy.assignRolesAndAccess, copy.distinguishTheEmploymentRecordFromPermissionsTo),
        item('rh.asistencia', copy.reviewAttendanceAndSchedules, copy.understandLocationsSchedulesIncidentsAndAttendanceRecords),
        item('rh.documentos', copy.manageDocuments, copy.reviewAndMaintainDocumentsAssociatedWithEach),
        item('rh.nomina', copy.recognizeThePayrollWorkflow, copy.locateIncidentsAndInputsUsedInCalculations),
      ]},
    ],
  },
  {
    id: 'procesos', number: 3, title: copy.processesAndTasks, icon: Workflow, accent: '#F4C84A',
    description: copy.turnRecurringActivitiesIntoClearProcessesAnd,
    assessment: assessment(
      'assessment.procesos',
      copy.chooseBetweenATaskProjectAndProcess,
      copy.aBranchOpeningRepeatsWeeklyAndThe,
      copy.createAnOpeningProcessWithStagesOwners,
      copy.provideAProcessMapAndTheCriteria,
      copy.canTurnInformalWorkIntoMeasurableExecution,
      [copy.agendaAndTasks, copy.projects, copy.processes, copy.evidence, copy.followUp, copy.taskKiosk, 'KPIs'],
      [
        ['weekly-project', copy.createANewProjectEveryWeekAnd],
        ['repeatable-process', copy.createARecurringProcessWithStagesOwners],
        ['single-reminder', copy.createAPersonalReminderForTheOwner],
      ],
    ),
    groups: [
      { title: copy.processes, items: [
        item('procesos.diferencia', copy.distinguishProcessesAndTasks, copy.understandWhenToModelAWorkflowAnd),
        item('procesos.crear', copy.createAProcess, copy.defineTheGoalStagesOwnersDatesAnd, '/processes-tasks/processes'),
        item('procesos.seguimiento', copy.superviseExecution, copy.reviewProcessStatusesDelaysOwnersAndEvidence, '/processes-tasks/processes'),
      ]},
      { title: copy.tasks, items: [
        item('tareas.crear', copy.createAndAssignATask, copy.defineTheOwnerPriorityDeadlineAndInstructions, '/processes-tasks/calendar'),
        item('tareas.evidencia', copy.recordEvidenceAndComments, copy.documentProgressSoFollowUpDoesNot),
        item('tareas.vistas', copy.useWorkViews, copy.switchBetweenTableBoardAndCalendarViews),
      ]},
    ],
  },
  {
    id: 'finanzas', number: 4, title: copy.finance, icon: CircleDollarSign, accent: '#FF6B63',
    description: copy.recognizeAvailableFinancialWorkflowsAndHowThey,
    assessment: assessment(
      'assessment.finanzas',
      copy.restoreControlOverCash,
      copy.theOwnerSuspectsMoneyIsDisappearingFrom,
      copy.createAFundWithAnOwnerAnd,
      copy.provideEvidenceOfTheFundTransactionReceipt,
      copy.canDistinguishExpensesPayablesBudgetsLedgerAccounts,
      [copy.expenses, copy.accountsPayable, copy.budgets, copy.suppliers, copy.ledgerAccounts, copy.paymentAccounts, copy.pettyCash, copy.reconciliation, copy.statementsAndKpis],
      [
        ['adjust-balance', copy.adjustTheClosingBalanceEachWeekTo],
        ['controlled-fund', copy.separateFundsAndOwnersRecordEveryInflow],
        ['expense-only', copy.recordOnlyTheMonthlyTotalAsOne],
      ],
    ),
    groups: [
      { title: copy.operationalControl, items: [
        item('finanzas.caja', copy.operatePettyCash, copy.recordFundsTransactionsReceiptsAndOwnersWith, '/petty-cash/cash'),
        item('finanzas.gastos', copy.recordAndReviewExpenses, copy.classifyExpensesAndMaintainSupportingEvidenceFor, '/expenses/expenses'),
        item('finanzas.proveedores', copy.manageSuppliers, copy.maintainSupplierDetailsTermsAndDocuments),
        item('finanzas.compras', copy.understandThePurchasingWorkflow, copy.connectRequestsOrdersReceiptsAndPayments),
      ]},
      { title: copy.planning, items: [
        item('finanzas.cuentas', copy.distinguishReceivablesAndPayables, copy.locateObligationsDueDatesAndBalanceFollow),
        item('finanzas.presupuestos', copy.reviewBudgets, copy.comparePlansAgainstExecutionAndIdentifyVariances),
        item('finanzas.impuestos', copy.recognizeCurrencyAndTaxes, copy.understandTheirEffectOnRecordsReportsAnd),
      ]},
    ],
  },
  {
    id: 'ventas', number: 5, title: copy.sales, icon: ShoppingCart, accent: '#2563EB',
    description: copy.trackTheSalesCycleFromFirstContact,
    assessment: assessment(
      'assessment.ventas',
      copy.recoverOpportunitiesLackingFollowUp,
      copy.theCompanyReceivesLeadsThroughSocialMedia,
      copy.recordAContactAndOpportunityWithSource,
      copy.demonstrateTheCompletePathFromContactTo,
      copy.canDesignATraceableSalesProcessExplain,
      [copy.contacts, copy.leads, copy.salesPipeline, copy.quotes, copy.sales, copy.contracts, copy.commissions, copy.paymentAccounts, 'KPIs'],
      [
        ['contact-list', copy.createAContactListAndCheckWho],
        ['commercial-flow', copy.defineTheSourceOwnerStageAndNext],
        ['quote-everyone', copy.sendEveryoneTheSameQuoteAndRecord],
      ],
    ),
    groups: [
      { title: copy.salesCycle, items: [
        item('ventas.clientes', copy.manageCustomersAndContacts, copy.recordUsefulInformationAndMaintainAnOrganized, '/sales/contacts'),
        item('ventas.oportunidades', copy.manageOpportunities, copy.recordSourceStageValueOwnerAndNext, '/sales/leads'),
        item('ventas.cotizaciones', copy.prepareQuotes, copy.createClearProposalsWithLineItemsValidity, '/sales/quotes'),
        item('ventas.cierre', copy.recordTheSale, copy.formalizeTheSalesOutcomeAndContinueThe, '/sales'),
      ]},
      { title: copy.followUp, items: [
        item('ventas.pipeline', copy.interpretThePipeline, copy.identifyStalledOpportunitiesNextActionsAndClosing),
        item('ventas.inventario', copy.connectSalesAndInventory, copy.understandHowASaleAffectsStockLevels),
        item('ventas.posventa', copy.planAfterSalesSupport, copy.setOwnersAndNextContactsAfterClosing),
      ]},
    ],
  },
  {
    id: 'kpis', number: 6, title: copy.kpisAndFinancialStatements, icon: BarChart3, accent: '#8B5CF6',
    description: copy.interpretIndicatorsAndReportsToTurnInformation,
    assessment: assessment(
      'assessment.kpis',
      copy.turnAVarianceIntoADecision,
      copy.marginFellFivePointsFromThePrevious,
      copy.selectThePeriodCompanyUnitAndCurrency,
      copy.prepareAnAnalysisNoteWithContextComparison,
      copy.canValidateAnIndicatorSContextInvestigate,
      [copy.executiveDashboard, copy.filtersAndComparisons, copy.indicatorDetails, copy.accountingReports, copy.financialStatements, copy.automatedReports],
      [
        ['act-on-total', copy.makeTheDecisionFromTheOverallPercentage],
        ['validate-and-drill', copy.validateThePeriodUnitAndCurrencyInspect],
        ['export-first', copy.exportTheDashboardAndAskTheClient],
      ],
    ),
    groups: [
      { title: copy.analysis, items: [
        item('kpis.operativos', copy.distinguishOperationalAndFinancialKpis, copy.connectEachIndicatorToASpecificQuestion, '/kpis'),
        item('kpis.filtros', copy.analyzePeriodsAndTrends, copy.comparePeriodsAndAvoidConclusionsBasedOn, '/kpis'),
        item('kpis.detalle', copy.drillDownFromAnIndicator, copy.useDetailsToFindTheCauseBehind),
      ]},
      { title: copy.financialStatements, items: [
        item('estados.resultados', copy.interpretTheIncomeStatement, copy.recognizeRevenueCostsExpensesAndProfit),
        item('estados.balance', copy.interpretTheBalanceSheet, copy.understandAssetsLiabilitiesAndEquity),
        item('estados.flujo', copy.interpretCashFlow, copy.distinguishAccountingProfitFromAvailableCash),
        item('estados.decision', copy.turnFindingsIntoActions, copy.defineAnActionOwnerAndDateBased),
      ]},
    ],
  },
  {
    id: 'comercial', number: 7, title: copy.salesProcessAndOngoingSupport, icon: BriefcaseBusiness, accent: '#177D66',
    description: copy.sellIndiceThroughListeningEmpathyAndA,
    assessment: assessment(
      'assessment.comercial',
      copy.leadAValueFocusedConsultation,
      copy.inTheFirstFewMinutesAProspect,
      copy.prepareAndRehearseAMinuteConsultationOpening,
      copy.provideAScriptOrMeetingNoteWith,
      copy.canProspectDiagnoseDemonstrateNegotiateWithoutDevaluing,
      [copy.prospecting, copy.firstContact, copy.companyMap, copy.diagnosis, copy.personalizedDemo, copy.closing, copy.implementation, copy.followUpAndEthics],
      [
        ['discount-now', copy.giveAnInitialDiscountToKeepTheir],
        ['diagnose-value', copy.acknowledgeTheQuestionExplainThatScopeDepends],
        ['send-price-list', copy.sendTheFullPriceListAndAsk],
      ],
    ),
    groups: [
      { title: copy.prospectingAndFirstContact, items: [
        item('comercial.origen', copy.identifyTheLeadSSource, copy.distinguishYourOwnProspectingFromALead),
        item('comercial.investigar', copy.prepareTheFirstApproach, copy.researchTheIndustrySizeContactAndPossible),
        item('comercial.contacto', copy.makeFirstContact, copy.callWriteOrVisitToCreateValue),
        item('comercial.mensaje', copy.communicateTheHeartOfIndice, copy.explainThatWeOfferTechnologyAndA),
      ]},
      { title: copy.aMinuteConsultation, items: [
        item('consultoria.preparacion', copy.prepareTheSession, copy.confirmParticipantsResearchTheCompanyPrepareOpen),
        item('consultoria.presentacion', copy.introduceTheTeamAndBreakTheIce, copy.spendAroundMinutesBuildingTrustAndExplaining),
        item('consultoria.escucha', copy.listenForApproximatelyMinutes, copy.letTheClientDescribeTheirCompanyFrustrations),
        item('consultoria.dolor', copy.identifyThePriorityProblem, copy.understandImpactUrgencyAndCauseThenConfirm),
        item('consultoria.demo', copy.giveAPersonalizedDemo, copy.brieflyShowTheDashboardThenTheModule),
      ]},
      { title: copy.scopeNegotiationAndClosing, items: [
        item('cierre.alcance', copy.determineTheActualScope, copy.defineModulesUsersBranchesMigrationTrainingAnd),
        item('cierre.temperatura', copy.assessReadinessToBuy, copy.closeDuringTheSessionWhenNeedAuthority),
        item('cierre.valor', copy.negotiateByAddingValue, copy.offerUsersTemporaryModulesOrSupportBefore),
        item('cierre.acuerdos', copy.recordAgreementsAndTheNextStep, copy.clearlyDocumentOwnersDatesConditionsAndObjections),
      ]},
      { title: copy.aLongTermRelationship, items: [
        item('acompanamiento.implementacion', copy.handOverToImplementation, copy.startWithClearOwnersPlansDatesConfiguration),
        item('acompanamiento.adopcion', copy.followUpOnAdoption, copy.checkThatTheClientUsesIndiceAnd),
        item('acompanamiento.60meses', copy.buildAMonthRelationship, copy.seeTheClientAsARecurringHuman),
      ]},
    ],
  },
];

export function TrainingWorkspace({ portal, locale: _locale }: { portal: TrainingPortal; locale?: string }) {
  const navigate = useNavigate();
  const { copy, locale } = useTrainingProgramCopy();
  const sessions = useMemo(() => getTrainingSessions(copy), [copy]);
  const basePath = portal === 'root' ? '/api/v1/platform-admin/training' : '/api/v1/distributor-portal/training';
  const [workspace, setWorkspace] = useState<TrainingWorkspaceResponse | null>(null);
  const [examSummary, setExamSummary] = useState<ExamSummaryResponse | null>(null);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [savingItem, setSavingItem] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'home' | 'induction' | 'program' | 'sales'>('home');

  const load = async () => {
    setError('');
    try {
      const [nextWorkspace, nextExams] = await Promise.all([
        apiClient<TrainingWorkspaceResponse>(basePath),
        apiClient<ExamSummaryResponse>(`${basePath}/exams`),
      ]);
      setWorkspace(nextWorkspace);
      setExamSummary(nextExams);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : copy.trainingCouldNotBeLoaded); }
  };
  const loadExamSummary = async () => setExamSummary(await apiClient<ExamSummaryResponse>(`${basePath}/exams`));
  useEffect(() => { void load(); }, [basePath]);

  const completed = useMemo(() => new Set(workspace?.completed_item_codes ?? []), [workspace?.completed_item_codes]);
  const allItems = useMemo(() => sessions.flatMap((session) => session.groups.flatMap((group) => group.items)), [sessions]);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeItems = activeSession.groups.flatMap((group) => group.items);
  const completedTasks = allItems.filter((trainingItem) => completed.has(trainingItem.id)).length;
  const completedAssessments = examSummary?.modules.filter((exam) => exam.passed).length ?? 0;
  const finalExamPassed = Boolean(examSummary?.final_exam.passed);
  const totalCompleted = completedTasks + completedAssessments + (finalExamPassed ? 1 : 0);
  const totalRequirements = allItems.length + sessions.length + 1;
  const sessionCompleted = activeItems.filter((trainingItem) => completed.has(trainingItem.id)).length;
  const activeExam = examSummary?.modules.find((exam) => exam.code === activeSession.id);
  const assessmentPassed = Boolean(activeExam?.passed);
  const percentage = Math.round((totalCompleted / totalRequirements) * 100);
  const nextItem = allItems.find((trainingItem) => !completed.has(trainingItem.id));
  const nextSession = sessions.find((session) => session.groups.some((group) => group.items.some((trainingItem) => trainingItem.id === nextItem?.id)))
    ?? sessions.find((session) => !examSummary?.modules.find((exam) => exam.code === session.id)?.passed)
    ?? sessions[0];

  const continueProgram = () => {
    setActiveSessionId(nextSession.id);
    setView('program');
  };

  const toggle = async (trainingItem: TrainingItem) => {
    const nextCompleted = !completed.has(trainingItem.id);
    setSavingItem(trainingItem.id);
    setError('');
    setWorkspace((current) => current ? {
      ...current,
      completed_item_codes: nextCompleted
        ? [...current.completed_item_codes, trainingItem.id]
        : current.completed_item_codes.filter((code) => code !== trainingItem.id),
    } : current);
    try {
      setWorkspace(await apiClient<TrainingWorkspaceResponse>(`${basePath}/progress`, {
        method: 'PATCH', body: JSON.stringify({ itemCode: trainingItem.id, completed: nextCompleted }),
      }));
      await loadExamSummary();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.progressCouldNotBeSaved);
      await load();
    } finally { setSavingItem(''); }
  };

  return (
    <div className="space-y-5" data-workspace="training">
      <IndiceTitleBar
        tone="aqua"
        icon={<GraduationCap className="h-5 w-5" />}
        eyebrow={trainingProgramText(copy.indiceAcademyVersionP, { p0: workspace?.program_version ?? '2026.1' }, locale)}
        title={portal === 'root' ? copy.trainingAndContent : copy.indiceAcademy}
        subtitle={portal === 'root' ? copy.superviseTheProgramAndReviewTheSame : copy.getToKnowThePlatformPractiseIts}
        actions={portal === 'distributor' ? <button type="button" onClick={continueProgram} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553]"><BookOpenCheck className="h-4 w-4" />{totalCompleted ? copy.continueLearning : copy.startLearning}</button> : undefined}
      />

      <IndiceWorkspaceNavigation<'home' | 'induction' | 'program' | 'sales'>
        ariaLabel={copy.trainingNavigation}
        tone="aqua"
        value={view}
        onValueChange={setView}
        items={[
          { id: 'home', label: copy.home, icon: <LayoutDashboard /> },
          { id: 'induction', label: copy.getToKnowIndice, description: copy.indiceInduction, icon: <Globe2 /> },
          { id: 'program', label: copy.certificationPath, icon: <BookOpenCheck /> },
          { id: 'sales', label: copy.salesProcess, description: copy.salesMethodForDistributors, icon: <BriefcaseBusiness /> },
        ]}
        className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      />

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {view === 'home' ? <AcademyHome
        portal={portal}
        percentage={percentage}
        completed={totalCompleted}
        total={totalRequirements}
        nextSession={nextSession}
        nextItem={nextItem}
        workspace={workspace}
        onContinue={continueProgram}
        onInduction={() => setView('induction')}
      /> : null}

      {view === 'induction' ? <IndiceInduction /> : null}

      {view === 'sales' ? <SalesProcess basePath={basePath} /> : null}

      {view === 'program' ? <>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 xl:sticky xl:top-36">
          <p className="px-3 pb-2 pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.certificationStages}</p>
          <div className="space-y-1.5">{sessions.map((session) => {
            const sessionItems = session.groups.flatMap((group) => group.items);
            const stageValidated = Boolean(examSummary?.modules.find((exam) => exam.code === session.id)?.passed);
            const done = sessionItems.filter((trainingItem) => completed.has(trainingItem.id)).length + (stageValidated ? 1 : 0);
            const active = session.id === activeSession.id;
            const Icon = session.icon;
            return <button key={session.id} type="button" onClick={() => setActiveSessionId(session.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${active ? 'bg-[#177D66] text-white shadow-sm' : 'text-slate-700 hover:bg-[#59C3A5]/5 dark:text-slate-300 dark:hover:bg-slate-800'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: active ? 'rgba(255,255,255,.16)' : `${session.accent}18`, color: active ? 'white' : session.accent }}>{stageValidated ? <ShieldCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{trainingProgramNumber(session.number, locale)}. {session.title}</span><span className={`mt-0.5 block text-xs ${active ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>{stageValidated ? copy.competencyValidated : trainingProgramText(copy.pOfPRequirements, { p0: done, p1: sessionItems.length + 1 }, locale)}</span></span><ChevronRight className="h-4 w-4 shrink-0 opacity-60" /></button>;
          })}</div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-5 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{copy.stage}{" "}{trainingProgramNumber(activeSession.number, locale)}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{activeSession.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{activeSession.description}</p></div><div className="shrink-0 rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 text-right dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.stageProgress}</p><p className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{trainingProgramText(copy.pOfPRequirements, { p0: sessionCompleted + (assessmentPassed ? 1 : 0), p1: activeItems.length + 1 }, locale)}</p><p className={`mt-1 text-xs ${assessmentPassed ? 'text-[#177D66] dark:text-[#8FE0CA]' : 'text-slate-500 dark:text-slate-400'}`}>{assessmentPassed ? copy.competencyValidated : copy.validationPending}</p></div></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{copy.consultativeMasteryStandard}</p><h4 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{copy.whatYouShouldBeAbleToDo}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{activeSession.assessment.consultantOutcome}</p></div></div>
            <div className="mt-4 flex flex-wrap gap-2">{activeSession.assessment.coverage.map((capability) => <span key={capability} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{capability}</span>)}</div>
          </div>

          {activeSession.id === 'comercial' ? <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><Sparkles className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>{copy.theHeartOfIndice}</strong> {copy.weOfferMoreThanAToolWe}</p></div> : null}

          {activeSession.groups.map((group) => <div key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h4 className="font-medium text-slate-950 dark:text-white">{group.title}</h4></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{group.items.map((trainingItem) => {
            const checked = completed.has(trainingItem.id);
            const saving = savingItem === trainingItem.id;
            return <div key={trainingItem.id} className={`flex gap-4 p-5 transition ${checked ? 'bg-emerald-50/40 dark:bg-emerald-950/15' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'}`}><button type="button" aria-label={trainingProgramText(copy.pP, { p0: checked ? copy.markPending : copy.markLearned, p1: trainingItem.title }, locale)} aria-pressed={checked} disabled={saving || !workspace} onClick={() => void toggle(trainingItem)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border outline-none transition focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-[#59C3A5] dark:border-slate-600 dark:bg-slate-800'} disabled:opacity-50`}>{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-current" /> : <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className={`text-sm font-medium ${checked ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>{trainingItem.title}</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{trainingItem.description}</p></div>{trainingItem.route ? <button type="button" onClick={() => navigate(trainingItem.route!)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"><ExternalLink className="h-3.5 w-3.5" />{copy.openInIndice}</button> : null}</div></div></div>;
          })}</div></div>)}

          {activeExam ? <TrainingExamPanel basePath={basePath} exam={activeExam} title={trainingProgramText(copy.assessmentP, { p0: activeSession.title }, locale)} onChanged={loadExamSummary} /> : <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{copy.preparingThisStageSAssessment}</div>}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-blue-600" /><p className="text-sm text-slate-600 dark:text-slate-300">{copy.practicePreparesYouForTheStageOnly}</p></div><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><RefreshCw className="h-4 w-4" />{copy.refreshProgress}</button></div>
        </section>
      </div>
      {examSummary ? <div className="mt-5 space-y-4">
        <TrainingExamPanel basePath={basePath} exam={examSummary.final_exam} title={copy.finalConsultativeCertificationExam} finalExam onChanged={loadExamSummary} />
        {examSummary.certificate ? <CertificateCard certificate={examSummary.certificate} /> : null}
      </div> : null}
      </> : null}
    </div>
  );
}

function AcademyHome({
  portal,
  percentage,
  completed,
  total,
  nextSession,
  nextItem,
  workspace,
  onContinue,
  onInduction,
}: {
  portal: TrainingPortal;
  percentage: number;
  completed: number;
  total: number;
  nextSession: TrainingSession;
  nextItem?: TrainingItem;
  workspace: TrainingWorkspaceResponse | null;
  onContinue: () => void;
  onInduction: () => void;
}) {
  const { copy, locale } = useTrainingProgramCopy();
  const NextIcon = nextSession.icon;
  return <div className="space-y-5" data-training-view="home">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <article className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-6 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><NextIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{copy.yourNextStep}</p>
            <h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{nextItem ? nextSession.title : copy.programCompleted}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{nextItem?.title ?? copy.youHaveCompletedAllPracticalProgramActivities}</p>
            {nextItem ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{nextItem.description}</p> : null}
            <button type="button" onClick={onContinue} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553]"><BookOpenCheck className="h-4 w-4" />{completed ? copy.continueWhereILeftOff : copy.startTheProgram}</button>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.practicalMastery}</p><p className="mt-1 text-4xl font-medium text-slate-950 dark:text-white">{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(percentage / 100)}</p></div><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{trainingProgramText(copy.pOfPRequirements, { p0: completed, p1: total }, locale)}</p></div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#59C3A5] transition-all" style={{ width: `${new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(percentage / 100)}` }} /></div>
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.thisPercentageRepresentsFunctionsYouUnderstandAnd}</p>
      </article>
    </section>

    {portal === 'root' && workspace?.audience_summary ? <section className="grid gap-3 sm:grid-cols-3">
      <Summary label={copy.activeParticipants} value={trainingProgramNumber(workspace.audience_summary.active_learners ?? 0, locale)} />
      <Summary label={copy.completedTopics} value={trainingProgramNumber(workspace.audience_summary.completed_checks ?? 0, locale)} />
      <Summary label={copy.publishedProgram} value={`v${workspace.program_version}`} />
    </section> : null}

    <section>
      <div className="max-w-3xl"><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{copy.recommendedPath}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.learnDemonstrateAndSupport}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.trainingConnectsProductKnowledgeWithDiagnosisPractice}</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <LearningStage color="#2563EB" number="1" title={copy.getToKnowIndice} description={copy.understandTheOfferingTheFourPillarsAnd} action={copy.openInduction} onClick={onInduction} />
        <LearningStage color="#59C3A5" number="2" title={copy.masterTheModules} description={copy.connectEachFunctionToASpecificBusiness} />
        <LearningStage color="#F4C84A" number="3" title={copy.practiseConsulting} description={copy.listenDiagnoseAndDemonstrateOnlyWhatCreates} />
        <LearningStage color="#FF6B5E" number="4" title={copy.sellAndSupport} description={copy.buildTrustAndAUsefulRelationshipLasting} action={copy.goToProgram} onClick={onContinue} />
      </div>
    </section>

    <section className="flex flex-col gap-4 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 sm:flex-row sm:items-center dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><Sparkles className="h-5 w-5" /></span>
      <div><h3 className="font-medium text-slate-950 dark:text-white">{copy.theHeartOfIndice298}</h3><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{copy.weOfferMoreThanSoftwareWeCombine}</p></div>
    </section>
  </div>;
}

function LearningStage({ color, number, title, description, action, onClick }: { color: string; number: string; title: string; description: string; action?: string; onClick?: () => void }) {
  const { locale } = useTrainingProgramCopy();
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-medium" style={{ backgroundColor: `${color}18`, color }}>{trainingProgramNumber(Number(number), locale)}</span><h4 className="mt-4 font-medium text-slate-950 dark:text-white">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>{action && onClick ? <button type="button" onClick={onClick} className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium" style={{ color }}>{action}<ChevronRight className="h-4 w-4" /></button> : null}</article>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">{value}</p></div>;
}
