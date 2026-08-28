import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, Plus, RotateCcw, Workflow } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import {
  defaultOpportunityFlowStages,
  type OpportunityFlow,
  type OpportunityFlowStage,
} from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { getOpportunityStageLabel } from '../utils/prospectosFlow';
import { OpportunityFlowListCard } from './OpportunityFlowListCard';
import { OpportunityFlowStageEditor } from './OpportunityFlowStageEditor';

const flowActionClassNames = getSalesModalActionClassNames('coral');
const reindex = (stages: OpportunityFlowStage[]) => stages.map((stage, position) => ({ ...stage, position }));

function localizedStages(
  stages: OpportunityFlowStage[],
  localizedDefaultLabels: Record<string, string>,
  clearCounts = false,
) {
  return reindex(stages.map((stage) => ({
    ...stage,
    label: getOpportunityStageLabel(stage, localizedDefaultLabels),
    opportunityCount: clearCounts ? 0 : stage.opportunityCount,
    usesDefaultLabel: false,
  })));
}

export function OpportunityFlowManagerModal({
  open,
  flows,
  selectedFlowId,
  canManage,
  loadError,
  copy,
  localizedDefaultLabels,
  onOpenChange,
  onRetry,
  onSelectFlow,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  flows: OpportunityFlow[];
  selectedFlowId: number | null;
  canManage: boolean;
  loadError: string;
  copy: ProspectosCopy['flow'];
  localizedDefaultLabels: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSelectFlow: (flowId: number) => Promise<void>;
  onCreate: (name: string, stages: OpportunityFlowStage[]) => Promise<OpportunityFlow>;
  onUpdate: (flowId: number, name: string, stages: OpportunityFlowStage[]) => Promise<OpportunityFlow>;
}) {
  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId) ?? flows[0] ?? null;
  const [view, setView] = useState<'catalog' | 'editor'>('catalog');
  const [draftFlowId, setDraftFlowId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftStages, setDraftStages] = useState<OpportunityFlowStage[]>(defaultOpportunityFlowStages);
  const [creating, setCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activatingFlowId, setActivatingFlowId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');

  const editorFlow = creating ? null : flows.find((flow) => flow.id === draftFlowId) ?? null;
  const isFactory = Boolean(editorFlow?.factory);
  const canEdit = view === 'editor' && canManage && (creating || !isFactory);
  const openStagesCount = draftStages.filter((stage) => stage.type === 'OPEN').length;
  const normalizedLabels = useMemo(
    () => draftStages.map((stage) => stage.label.trim().toLocaleLowerCase()),
    [draftStages],
  );
  const hasInvalidName = draftName.trim().length < 2 || draftName.trim().length > 100;
  const hasInvalidLabel = normalizedLabels.some((label) => label.length < 2 || label.length > 80);
  const hasDuplicateLabel = normalizedLabels.some((label, index) => normalizedLabels.indexOf(label) !== index);
  const canSave = canEdit && !hasInvalidName && !hasInvalidLabel && !hasDuplicateLabel
    && openStagesCount > 0 && !isSaving;

  useEffect(() => {
    if (!open) return;
    setView('catalog');
    setCreating(false);
    setDraftFlowId(null);
    setSaveError('');
  }, [open]);

  const openEditor = (flow: OpportunityFlow) => {
    setCreating(false);
    setDraftFlowId(flow.id);
    setDraftName(flow.name);
    setDraftStages(localizedStages(flow.stages, localizedDefaultLabels));
    setSaveError('');
    setView('editor');
  };

  const startNewFlow = () => {
    if (!canManage) return;
    const template = flows.find((flow) => flow.factory)?.stages ?? defaultOpportunityFlowStages;
    setCreating(true);
    setDraftFlowId(null);
    setDraftName(copy.newFlowName);
    setDraftStages(localizedStages(template, localizedDefaultLabels, true));
    setSaveError('');
    setView('editor');
  };

  const returnToCatalog = () => {
    if (isSaving) return;
    setView('catalog');
    setCreating(false);
    setDraftFlowId(null);
    setSaveError('');
  };

  const activateFlow = async (flowId: number) => {
    if (activatingFlowId !== null) return;
    setActivatingFlowId(flowId);
    setSaveError('');
    try {
      await onSelectFlow(flowId);
    } finally {
      setActivatingFlowId(null);
    }
  };

  const restoreDefault = () => {
    if (!canEdit) return;
    setDraftStages(localizedStages(defaultOpportunityFlowStages, localizedDefaultLabels, true));
    setSaveError('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const stages = reindex(draftStages.map((stage) => ({ ...stage, label: stage.label.trim() })));
      const saved = creating
        ? await onCreate(draftName.trim(), stages)
        : await onUpdate(draftFlowId as number, draftName.trim(), stages);
      await onSelectFlow(saved.id);
      setView('catalog');
      setCreating(false);
      setDraftFlowId(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const editorTitle = creating ? copy.createTitle : copy.editTitle(draftName);

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={view === 'editor' ? editorTitle : copy.title}
      description={view === 'editor' ? copy.editorDescription : copy.description}
      eyebrow={copy.eyebrow}
      icon={<Workflow className="h-6 w-6" />}
      modalType="operational-workspace"
      busy={isSaving}
      contentClassName="h-[92dvh]"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !px-0 !py-0"
      footerLeading={view === 'editor' && canEdit ? (
        <Button type="button" variant="outline" className={flowActionClassNames.secondary} disabled={isSaving} onClick={restoreDefault}>
          <RotateCcw className="h-4 w-4" />{copy.restoreDefault}
        </Button>
      ) : undefined}
      footerSummary={view === 'editor'
        ? copy.editorSummary(draftStages.length, openStagesCount)
        : copy.managerSummary(flows.length, selectedFlow?.name ?? copy.notAvailable)}
      footer={view === 'editor' ? (
        <>
          <Button type="button" variant="outline" className={flowActionClassNames.secondary} disabled={isSaving} onClick={returnToCatalog}>
            {copy.cancel}
          </Button>
          {canEdit ? (
            <Button className={flowActionClassNames.primary} disabled={!canSave} onClick={handleSave}>
              <Check className="h-4 w-4" />{isSaving ? copy.saving : creating ? copy.create : copy.save}
            </Button>
          ) : null}
        </>
      ) : (
        <Button type="button" variant="outline" className={flowActionClassNames.secondary} onClick={() => onOpenChange(false)}>
          {copy.close}
        </Button>
      )}
    >
      {view === 'catalog' ? (
        <section className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:p-5">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-medium text-slate-950">{copy.catalogTitle}</h3>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">{copy.catalogDescription}</p>
              </div>
              <Button type="button" className="h-11 shrink-0 gap-2 rounded-lg bg-[#FF6B5E] text-[#222831] hover:bg-[#E85C50]" disabled={!canManage || Boolean(loadError)} onClick={startNewFlow}>
                <Plus className="h-4 w-4" />{copy.newFlow}
              </Button>
            </div>

            {loadError ? (
              <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{loadError}</span>
                <Button type="button" variant="outline" className="h-11 gap-2 rounded-lg" onClick={onRetry}><RotateCcw className="h-4 w-4" />{copy.retry}</Button>
              </div>
            ) : !canManage ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{copy.adminOnly}</p>
              </div>
            ) : null}

            <div className="space-y-2.5">
              {flows.map((flow) => (
                <OpportunityFlowListCard
                  key={flow.id}
                  flow={flow}
                  selected={flow.id === selectedFlowId}
                  canManage={canManage}
                  activating={activatingFlowId === flow.id}
                  copy={copy}
                  onActivate={() => void activateFlow(flow.id)}
                  onOpen={() => openEditor(flow)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col bg-slate-50/70">
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 lg:px-5">
            <Button type="button" variant="ghost" className="h-11 gap-2 rounded-lg text-slate-600" disabled={isSaving} onClick={returnToCatalog}>
              <ArrowLeft className="h-4 w-4" />{copy.backToFlows}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-sm font-medium text-slate-700" htmlFor="opportunity-flow-name">{copy.flowName}</label>
                <Input id="opportunity-flow-name" value={draftName} maxLength={100} disabled={!canEdit || isSaving} className="mt-2 h-11 rounded-lg border-slate-200" onChange={(event) => setDraftName(event.target.value)} />
              </div>

              {isFactory ? (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{copy.factoryReadOnly}</p>
                </div>
              ) : null}
              {saveError ? (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{saveError}</p>
                </div>
              ) : null}

              <OpportunityFlowStageEditor stages={draftStages} canEdit={canEdit} busy={isSaving} copy={copy} onChange={setDraftStages} />
            </div>
          </div>
        </section>
      )}
    </SalesModalFrame>
  );
}
