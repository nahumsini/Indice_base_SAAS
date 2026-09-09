import { useLanguage } from "../shared/context";
import { getSalesProcessCopy, type SalesProcessCopy } from "./translations/sales";
import { useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarCheck,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Handshake,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Presentation,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../components/frontend-os';

type SalesStage = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  objective: string;
  description: string;
  color: string;
  icon: typeof MessageCircle;
  actions: string[];
  questions: string[];
  avoid: string[];
  result: string;
  evidence: string;
  resourceIds: string[];
};

type CommercialResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  version: string;
  updatedAt: string;
  editable?: boolean;
  required?: boolean;
};

export const salesResources = (copy: SalesProcessCopy): CommercialResource[] => [
  {
    id: 'consulting-guide', title: copy.salesConsultingGuide, category: copy.consulting, version: '1.0', updatedAt: copy.august2026, required: true,
    description: copy.aCompleteMethodForPreparingAndLeadingA60,
    editable: true,
  },
  {
    id: 'basic-modules', title: copy.basicModulesTechnicalOverview, category: copy.product, version: '1.0', updatedAt: copy.august2026, required: true,
    description: copy.mainFunctionsStrengthsAndScopeOfTheModulesEvery,
    editable: true,
  },
  {
    id: 'operating-manual', title: copy.distributorOperatingManual, category: copy.operations, version: '1.0', updatedAt: copy.august2026, required: true,
    description: copy.responsibilitiesSupportCertificationsCommissionsBrandingAndOperatingRules,
    editable: true,
  },
  {
    id: 'income-guide', title: copy.incomeGrowthGuide, category: copy.growth, version: '1.0', updatedAt: copy.august2026,
    description: copy.scenariosInMexicanPesosExplainingTheValueOfBuilding,
    editable: true,
  },
  {
    id: 'agreement-draft', title: copy.draftDistributionAgreement, category: copy.legal, version: copy.draft10, updatedAt: copy.august2026,
    description: copy.referenceDocumentSubjectToLegalReviewAndApprovalBefore,
    editable: true,
  },
];

export const salesStages = (copy: SalesProcessCopy): SalesStage[] => [
  {
    id: 'contact', number: 1, title: copy.contactAndTrust, shortTitle: copy.contact, icon: MessageCircle, color: '#2563EB',
    objective: copy.startAMeaningfulConversationAndBuildTrust,
    description: copy.theFirstContactIsAboutGettingToKnowThe,
    actions: [copy.researchTheCompanySIndustrySizeAndContext, copy.introduceYourselfAsAnAuthorizedIndiceDistributor, copy.listenBeforeExplainingTheProduct, copy.recordTheContactAndAgreeOnAFollowUp],
    questions: [copy.whatDoesTheCompanyDo, copy.howManyPeopleAreInvolvedInOperations, copy.whichPartOfTheBusinessTakesTheMostTime],
    avoid: [copy.listingEveryModule, copy.sendingAQuoteBeforeUnderstandingTheNeed, copy.pressuringTheProspectToCloseInTheFirstMessage],
    result: copy.prospectContactedAndAFollowUpConversationAgreed,
    evidence: copy.contactLeadSourceInitialNeedAndNextActionRecorded,
    resourceIds: ['operating-manual'],
  },
  {
    id: 'demo', number: 2, title: copy.discoveryAndDemo, shortTitle: copy.demo, icon: Presentation, color: '#06A88D',
    objective: copy.scheduleA6090MinuteDiagnosticConsultation,
    description: copy.keepTheDemonstrationBriefAndRelevantShowIndiceS,
    actions: [copy.confirmTheProblemTheProspectWantsToSolve, copy.presentIndiceAsAPlatformWithOngoingSupport, copy.showOnlyARelevantViewOrFeature, copy.offerAFreeConsultationAndScheduleADate],
    questions: [copy.howDoYouManageThatOperationToday, copy.whatHappensWhenTheInformationIsUnavailable, copy.whoShouldAttendADiagnosticSession],
    avoid: [copy.givingAnOverlyLongGenericDemonstration, copy.promisingFeaturesWithoutVerifyingTheScope, copy.endingWithoutSuggestingAConsultationDate],
    result: copy.consultationScheduledWithParticipantsAndPurposeDefined,
    evidence: copy.dateAttendeesAndInitialPainPointDocumented,
    resourceIds: ['basic-modules', 'consulting-guide'],
  },
  {
    id: 'consulting', number: 3, title: copy.consultingAndDiagnosis, shortTitle: copy.consulting, icon: Search, color: '#F0B429',
    objective: copy.understandTheCustomerSPainPointsAndRecommendThe,
    description: copy.mapPeopleProcessesProductsAndFinanceThenPresentOnly,
    actions: [copy.breakTheIceDuringTheFirst510Minutes, copy.interviewTheCustomerAndMapTheFourPillars, copy.confirmEachPainPointSImpactUrgencyAndPriority, copy.demonstrateRelevantModulesAndEstablishTheirValue],
    questions: [copy.whatWouldYouLikeToImproveFirst, copy.whereDoYouFeelYouLoseControlMoneyOr, copy.howWouldYouKnowTheSolutionIsWorking],
    avoid: [copy.turningTheSessionIntoAnInterrogation, copy.presentingEveryModule, copy.discussingPriceBeforeEstablishingValue],
    result: copy.diagnosisDocumentedSolutionRecommendedAndProposalPresented,
    evidence: copy.businessMapPainPointsRecommendedModulesAndAgreements,
    resourceIds: ['consulting-guide', 'basic-modules'],
  },
  {
    id: 'closing', number: 4, title: copy.closingAndAgreements, shortTitle: copy.closing, icon: Handshake, color: '#F66B61',
    objective: copy.turnTheProposalIntoADecisionAndAConcrete,
    description: copy.ifTheCustomerDoesNotBuyDuringTheConsultation,
    actions: [copy.confirmScopeModulesUsersAndOwners, copy.identifyTheRealObjectionAndTheDecisionMaker, copy.addValueBeforeReducingThePrice, copy.documentTheProposalTermsAndNextDate],
    questions: [copy.whatDoYouNeedToResolveBeforeStarting, copy.whoElseIsInvolvedInTheDecision, copy.whatWouldBeASuitableStartDate],
    avoid: [copy.reducingThePriceAsTheFirstResponse, copy.inventingUnauthorizedPromotions, copy.leavingFollowUpWithoutADate],
    result: copy.saleWonOrTheTrueLossReasonClearlyRecorded,
    evidence: copy.proposalObjectionsDecisionAndNextCommitment,
    resourceIds: ['operating-manual', 'income-guide'],
  },
  {
    id: 'implementation', number: 5, title: copy.implementation, shortTitle: copy.implementation, icon: ClipboardCheck, color: '#8B5CF6',
    objective: copy.helpTheCustomerUseThePurchasedModulesCorrectly,
    description: copy.implementationStartsAfterPaymentSessionsDependOnThePurchased,
    actions: [copy.completeOnboardingAndConfirmOwners, copy.scheduleTheSessionsIncludedInThePackage, copy.configureAndTrainOneModuleAtATime, copy.documentAgreementsPendingTasksAndEvidenceOfUse],
    questions: [copy.whoWillOwnEachModule, copy.whatInformationShouldBePreparedBeforeTheSession, copy.whatResultWillWeVerifyAtTheEnd],
    avoid: [copy.schedulingSessionsWithoutAnObjective, copy.trainingWithoutDataOrOwners, copy.declaringAModuleImplementedWhenNobodyUsesIt],
    result: copy.modulesConfiguredUsersTrainedAndOperationsStarted,
    evidence: copy.scheduledSessionsOwnersAgreementsAndProofOfAdoption,
    resourceIds: ['basic-modules', 'operating-manual'],
  },
  {
    id: 'follow-up', number: 6, title: copy.monthlyFollowUp, shortTitle: copy.followUp, icon: CalendarCheck, color: '#177D66',
    objective: copy.sustainAdoptionRemoveObstaclesAndStrengthenRetention,
    description: copy.supportContinuesAfterImplementationCallEveryCustomerMonthlyTo,
    actions: [copy.scheduleTheMonthlyCallInAdvance, copy.reviewUsageResultsQuestionsAndPendingTasks, copy.recommendImprovementsOrModulesWhenTheyProvideRealValue, copy.escalateWhatYouCannotResolveToTheCorporateTeam],
    questions: [copy.whatHasImprovedSinceTheLastSession, copy.whichFeatureIsStillNotBeingUsed, copy.whatObstacleShouldWeResolveThisMonth],
    avoid: [copy.contactingTheCustomerOnlyToCollectPayment, copy.waitingForTheCustomerToReportAProblem, copy.recommendingModulesWithoutADemonstratedNeed],
    result: copy.customerSupportedNextSessionScheduledAndPlanUpdated,
    evidence: copy.monthlyMinutesIssuesRecommendationsAndNextDate,
    resourceIds: ['operating-manual', 'consulting-guide'],
  },
];

export function SalesProcess({ basePath }: { basePath: string }) {
  const { currentLanguage } = useLanguage();
  const copy = getSalesProcessCopy(currentLanguage.code);
  const resources = salesResources(copy);
  const stages = salesStages(copy);
  const [activeId, setActiveId] = useState(stages[0].id);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? null;
  const active = stages.find((stage) => stage.id === activeId) ?? stages[0];
  const ActiveIcon = active.icon;
  const activeResources = resources.filter((resource) => active.resourceIds.includes(resource.id));

  return (
    <div className="space-y-5" data-training-view="sales-process">
      <section className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-5 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><BriefcaseBusiness className="h-5 w-5" /></span>
            <div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{copy.indiceSalesMethod}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.fromProspectToLongTermRelationship}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.theSaleContinuesAfterPaymentListenDiagnoseImplementAnd}</p></div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 text-sm sm:flex">
            <div className="rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.stages}</p><p className="mt-1 font-medium text-slate-950 dark:text-white">{copy.requiredStages}</p></div>
            <div className="rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.result}</p><p className="mt-1 font-medium text-slate-950 dark:text-white">{copy.activeCustomer}</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3"><Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-[#257B68] dark:text-[#8FE0CA]" /><div><h4 className="font-medium text-slate-950 dark:text-white">{copy.firstIdentifyTheLeadSource}</h4><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.socialMediaAndDirectProspectingAreOpportunitySourcesNot}</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LeadSource icon={Users} title={copy.socialMediaLead} description={copy.arrivedThroughCampaignsContentFormsOrSocialMediaMessages} />
          <LeadSource icon={Target} title={copy.prospectingLead} description={copy.identifiedAndContactedDirectlyByTheDistributor} />
        </div>
      </section>

      <IndiceWorkspaceNavigation
        ariaLabel="Etapas del proceso de venta"
        tone="aqua"
        variant="workflow"
        value={activeId}
        onValueChange={setActiveId}
        items={stages.map((stage) => ({ id: stage.id, label: stage.shortTitle, description: copy.stage.replace('{p0}', String(stage.number)), icon: <stage.icon /> }))}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-t-4 p-5" style={{ borderTopColor: active.color, backgroundColor: `${active.color}0D` }}>
            <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${active.color}18`, color: active.color }}><ActiveIcon className="h-5 w-5" /></span><div><p className="text-xs font-medium" style={{ color: active.color }}>{copy.stageLabel}{active.number} {copy.of6}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{active.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{active.description}</p></div></div>
          </div>
          <div className="border-t border-slate-100 p-6 dark:border-slate-800">
            <InfoHeading icon={Target} title={copy.stageObjective} /><p className="mt-2 text-sm font-medium leading-6 text-slate-800 dark:text-slate-200">{active.objective}</p>
            <div className="mt-6"><InfoHeading icon={CheckCircle2} title={copy.requiredActions} /><List items={active.actions} tone="success" /></div>
            <div className="mt-6"><InfoHeading icon={Lightbulb} title={copy.suggestedQuestions} /><List items={active.questions} tone="question" /></div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-red-100 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/20"><InfoHeading icon={ShieldAlert} title={copy.avoidTheseMistakes} tone="danger" /><List items={active.avoid} tone="danger" /></article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"><InfoHeading icon={Sparkles} title={copy.resultNeededToAdvance} tone="success" /><p className="mt-3 text-sm font-medium leading-6 text-emerald-950 dark:text-emerald-100">{active.result}</p></article>
          <article className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20"><InfoHeading icon={ClipboardCheck} title={copy.requiredEvidence} tone="question" /><p className="mt-3 text-sm leading-6 text-blue-950 dark:text-blue-100">{active.evidence}</p><p className="mt-4 border-t border-blue-200 pt-4 text-xs leading-5 text-blue-700 dark:border-blue-900 dark:text-blue-300">{copy.evidenceIsAssessedInTheCertificationPathReadingThis}</p></article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <InfoHeading icon={FileText} title={copy.resourcesForThisStage} />
            <div className="mt-3 space-y-2">{activeResources.map((resource) => <button key={resource.id} type="button" onClick={() => setSelectedResourceId(resource.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left outline-none transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/5 focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:border-slate-700 dark:hover:bg-slate-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#257B68] dark:text-[#8FE0CA]"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900 dark:text-white">{resource.title}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{copy.viewOrDownloadV}{resource.version}</span></span><Eye className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div>
          </article>
        </aside>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{copy.salesLibrary}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.indiceSalesKit}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.alwaysUseTheVersionPublishedHereRequiredMaterialsAre}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"><FileText className="h-4 w-4" />{resources.length} {copy.currentDocuments}</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} basePath={basePath} onPreview={() => setSelectedResourceId(resource.id)} />)}</div>
      </section>

      {selectedResource ? <ResourcePreview resource={selectedResource} basePath={basePath} onClose={() => setSelectedResourceId(null)} /> : null}
    </div>
  );
}

function ResourceCard({ resource, basePath, onPreview }: { resource: CommercialResource; basePath: string; onPreview: () => void }) {
  const { currentLanguage } = useLanguage();
  const copy = getSalesProcessCopy(currentLanguage.code);
  return <article className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-slate-50/40 p-5 dark:border-slate-700 dark:bg-slate-800/50"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><FileText className="h-5 w-5" /></span>{resource.required ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800"><BadgeCheck className="h-3.5 w-3.5" />{copy.required}</span> : null}</div><p className="mt-4 text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{resource.category}</p><h4 className="mt-1 font-medium text-slate-950 dark:text-white">{resource.title}</h4><p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{resource.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700"><span>{copy.v}{resource.version}</span><span>{resource.updatedAt}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={onPreview} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-white px-3 text-sm font-medium text-[#257B68] hover:bg-[#59C3A5]/5 dark:bg-slate-900 dark:text-[#8FE0CA]"><Eye className="h-4 w-4" />{copy.viewGuide}</button><a href={resourceUrl(basePath, resource, 'pdf', true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white hover:bg-[#126553]"><Download className="h-4 w-4" />{copy.pdf}</a></div></article>;
}

function ResourcePreview({ resource, basePath, onClose }: { resource: CommercialResource; basePath: string; onClose: () => void }) {
  const { currentLanguage } = useLanguage();
  const copy = getSalesProcessCopy(currentLanguage.code);
  const pdfUrl = resourceUrl(basePath, resource, 'pdf', false);
  const pdfDownloadUrl = resourceUrl(basePath, resource, 'pdf', true);
  const editableUrl = resourceUrl(basePath, resource, 'docx', true);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={resource.title}><div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"><header className="flex items-center gap-4 border-b border-[#59C3A5]/30 bg-[#59C3A5]/5 px-5 py-4 dark:bg-[#59C3A5]/10"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-medium text-slate-950 dark:text-white">{resource.title}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{resource.category} {copy.version}{resource.version} · {resource.updatedAt}</p></div><div className="hidden items-center gap-2 sm:flex">{resource.editable ? <a href={editableUrl} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="h-4 w-4" />{copy.editable}</a> : null}<a href={pdfDownloadUrl} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white hover:bg-[#126553]"><Download className="h-4 w-4" />{copy.downloadPDF}</a></div><button type="button" onClick={onClose} aria-label={copy.closeDocument} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></header><iframe src={pdfUrl} title={resource.title} className="min-h-0 flex-1 bg-slate-100" /><footer className="flex gap-2 border-t border-slate-200 p-3 sm:hidden dark:border-slate-700">{resource.editable ? <a href={editableUrl} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"><Download className="h-4 w-4" />{copy.editable}</a> : null}<a href={pdfDownloadUrl} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#177D66] text-sm font-medium text-white"><Download className="h-4 w-4" />{copy.pdf}</a></footer></div></div>;
}

function resourceUrl(basePath: string, resource: CommercialResource, format: 'pdf' | 'docx', download: boolean) {
  return `${basePath}/resources/${resource.id}/${format}${download ? '?download=true' : ''}`;
}

function LeadSource({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#257B68] dark:text-[#8FE0CA]"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

function InfoHeading({ icon: Icon, title, tone = 'default' }: { icon: typeof Target; title: string; tone?: 'default' | 'danger' | 'success' | 'question' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-emerald-700' : tone === 'question' ? 'text-blue-600' : 'text-slate-700';
  return <div className={`flex items-center gap-2 ${color}`}><Icon className="h-4 w-4" /><h4 className="text-sm font-medium text-slate-950 dark:text-white">{title}</h4></div>;
}

function List({ items, tone }: { items: string[]; tone: 'success' | 'question' | 'danger' }) {
  const dot = tone === 'danger' ? 'bg-red-500' : tone === 'question' ? 'bg-blue-500' : 'bg-emerald-500';
  return <ul className="mt-3 space-y-2.5">{items.map((entry) => <li key={entry} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{entry}</li>)}</ul>;
}
