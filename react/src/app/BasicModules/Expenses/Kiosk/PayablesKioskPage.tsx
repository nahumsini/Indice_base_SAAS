import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ArrowLeft, Check, File, KeyRound, Loader2, Paperclip, ScanFace, ShieldCheck, Store, Trash2, Upload, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { LiveFaceChallenge, type LiveFaceChallengeCapture } from '../../../components/LiveFaceChallenge';
import { KioskIdentityGate } from '../../../components/kiosk-engine/KioskIdentityGate';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { useKioskSessionBoundary } from '../../../components/kiosk-engine/useKioskSessionBoundary';
import { ApiClientError } from '../../../lib/apiClient';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
  type BudgetTaxCountry,
} from '../Budgets/budgetTaxCatalog';
import { DEFAULT_FINANCE_CURRENCY } from '../constants/financeCurrencyOptions';
import { publicPayableKioskService, type PayableKioskBootstrap, type PayableKioskFaceStatus } from '../services';
import { formatCurrency } from '../utils/expenses.utils';
import { BudgetTaxControls, type TaxControlDraft } from '../components/modals/BudgetTaxControls';
import { useExpensesTranslations } from '../Expenses/hooks/useExpensesTranslations';

type ScreenMode = 'access' | 'provider-registration' | 'payable';
type FaceMode = 'idle' | 'enroll' | 'verify';
type PublicWorkspaceCopy = ReturnType<typeof useExpensesTranslations>['expenses']['payablesKiosk']['publicWorkspace'];

type PayableDraft = TaxControlDraft & {
  attachments: AttachmentDraft[];
  concept: string;
  dueDate: string;
  externalReference: string;
  notes: string;
};

type ProviderDraft = {
  contactName: string;
  email: string;
  legalName: string;
  name: string;
  notes: string;
  phone: string;
  taxId: string;
};

type AttachmentDraft = {
  file?: File;
  id: string;
  isLocalObjectUrl?: boolean;
  name: string;
  size: number;
  url?: string;
};

const inputClass = 'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['csv', 'doc', 'docx', 'heic', 'heif', 'jpeg', 'jpg', 'pdf', 'png', 'txt', 'webp', 'xls', 'xlsx']);
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
]);

export default function PayablesKioskPage() {
  const t = useExpensesTranslations();
  const copy = t.expenses.payablesKiosk.publicWorkspace;
  const { token = '' } = useParams();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const payableSubmissionLockRef = useRef(false);
  const [bootstrap, setBootstrap] = useState<PayableKioskBootstrap | null>(null);
  const [draft, setDraft] = useState<PayableDraft>(() => createPayableDraft(DEFAULT_FINANCE_CURRENCY));
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [faceConsent, setFaceConsent] = useState(false);
  const [faceMode, setFaceMode] = useState<FaceMode>('idle');
  const [faceStatus, setFaceStatus] = useState<PayableKioskFaceStatus | null>(null);
  const [isConfirmingFaceWithdrawal, setIsConfirmingFaceWithdrawal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<ScreenMode>('access');
  const [pin, setPin] = useState('');
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(createProviderDraft());
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');

  const currency = draft.budgetCurrencyCode;
  const amount = toMoneyNumber(draft.amount);
  const taxes = draft.taxEnabled ? toMoneyNumber(draft.taxes) : 0;
  const subtotal = draft.taxEnabled && draft.taxIncluded ? Math.max(amount - taxes, 0) : amount;
  const total = draft.taxEnabled && draft.taxIncluded ? amount : amount + taxes;
  const canSubmitPayable = isAuthorized && selectedProviderId !== null && draft.concept.trim().length > 0 && amount > 0 && !isSubmitting;
  const canSubmitProvider = providerDraft.name.trim().length > 0 && !isSubmitting;
  const canAttachMoreFiles = draft.attachments.length < MAX_ATTACHMENTS;
  const canRegisterProvider = Boolean(bootstrap?.kiosk.allowProviderRegistration);
  const title = bootstrap?.kiosk.name ?? copy.payableTitle;

  const expireSession = useCallback(() => {
    setIsAuthorized(false);
    setPin('');
    setMode('access');
    setFaceConsent(false);
    setFaceMode('idle');
    setFaceStatus(null);
    setSelectedProviderId(null);
    setIsConfirmingFaceWithdrawal(false);
    setSessionMessage(copy.sessionExpired);
  }, [copy.sessionExpired]);
  const { isOnline, isSessionExpiring } = useKioskSessionBoundary({
    active: isAuthorized,
    expiresAt: bootstrap?.expires_at,
    inactivityTimeoutSeconds: bootstrap?.inactivity_timeout_seconds ?? 300,
    onExpire: expireSession,
  });

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setFailureToastMessage('');
    publicPayableKioskService.bootstrap(token)
      .then(response => {
        setBootstrap(response);
        setFailureToastMessage('');
        setDraft(createPayableDraft(response.kiosk.currencyCode || DEFAULT_FINANCE_CURRENCY));
      })
      .catch(error => setFailureToastMessage(publicErrorMessage(error, copy.errors.bootstrap)))
      .finally(() => setIsLoading(false));

    return () => revokeLocalUrls(objectUrlsRef.current);
  }, [copy.errors.bootstrap, token]);

  const updateDraft = (updates: Partial<PayableDraft>) => setDraft(current => ({ ...current, ...updates }));

  const authenticate = async () => {
    if (pin.length !== 5 || !token) return;
    setFailureToastMessage('');
    setSuccessToastMessage('');
    setIsSubmitting(true);
    try {
      const response = await publicPayableKioskService.authenticate(token, pin);
      setBootstrap(response);
      setSelectedProviderId(
        response.identityType === 'EMPLOYEE'
          ? response.providers?.[0]?.id ?? null
          : response.provider?.id ?? null,
      );
      setIsAuthorized(true);
      setMode('payable');
      setSessionMessage('');
      setSuccessToastMessage(copy.accessTitle);
      try {
        setFaceStatus(await publicPayableKioskService.faceStatus(token));
      } catch {
        setFaceStatus(null);
      }
    } catch (error) {
      setFailureToastMessage(
        error instanceof ApiClientError && error.status === 429
          ? copy.errors.rateLimited
          : publicErrorMessage(error, copy.errors.pin),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFaceChallenge = async (captures: LiveFaceChallengeCapture[]) => {
    if (!token || faceMode === 'idle') return;
    setFailureToastMessage('');
    setSuccessToastMessage('');
    setIsSubmitting(true);
    try {
      if (faceMode === 'enroll') {
        await publicPayableKioskService.enrollFace(token, captures);
        setSuccessToastMessage(copy.face.enrollmentSuccess);
      } else {
        const result = await publicPayableKioskService.verifyFace(token, captures);
        if (!result.matched || !result.livenessPassed) throw new Error(copy.errors.face);
        setSuccessToastMessage(copy.face.verificationSuccess);
      }
      setFaceStatus(await publicPayableKioskService.faceStatus(token));
      setFaceMode('idle');
      setFaceConsent(false);
    } catch (error) {
      setFailureToastMessage(copy.errors.face);
      void error;
      throw new Error(copy.errors.face);
    } finally {
      setIsSubmitting(false);
    }
  };

  const withdrawFaceConsent = async () => {
    if (!token) return;
    setFailureToastMessage('');
    setIsSubmitting(true);
    try {
      await publicPayableKioskService.withdrawFaceConsent(token);
      setFaceStatus(await publicPayableKioskService.faceStatus(token));
      setFaceMode('idle');
      setFaceConsent(false);
      setIsConfirmingFaceWithdrawal(false);
      setSuccessToastMessage(copy.face.withdrawSuccess);
    } catch (error) {
      setFailureToastMessage(publicErrorMessage(error, copy.errors.face));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const availableSlots = MAX_ATTACHMENTS - draft.attachments.length;
    const candidates = Array.from(files);
    const acceptedFiles = candidates.filter(isAllowedAttachment).slice(0, availableSlots);
    if (acceptedFiles.length !== candidates.length) {
      setFailureToastMessage(copy.errors.filesInvalid);
    } else {
      setFailureToastMessage('');
    }
    const nextFiles = acceptedFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return { id: `payable-kiosk-file-${Date.now()}-${index}`, file, isLocalObjectUrl: true, name: file.name, size: file.size, url };
    });
    updateDraft({ attachments: [...draft.attachments, ...nextFiles] });
  };

  const removeAttachment = (attachmentId: string) => {
    const attachment = draft.attachments.find(item => item.id === attachmentId);
    if (attachment?.isLocalObjectUrl && attachment.url) {
      URL.revokeObjectURL(attachment.url);
      objectUrlsRef.current.delete(attachment.url);
    }
    updateDraft({ attachments: draft.attachments.filter(item => item.id !== attachmentId) });
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !canSubmitProvider) return;
    setFailureToastMessage('');
    setSuccessToastMessage('');
    setIsSubmitting(true);
    try {
      await publicPayableKioskService.registerProvider(token, providerDraft);
      setProviderDraft(createProviderDraft());
      setSuccessToastMessage(copy.registrationSubmitted);
      setMode('access');
    } catch (error) {
      setFailureToastMessage(publicErrorMessage(error, copy.errors.provider));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !canSubmitPayable || payableSubmissionLockRef.current) return;
    payableSubmissionLockRef.current = true;
    setFailureToastMessage('');
    setSuccessToastMessage('');
    setIsSubmitting(true);
    try {
      const response = await publicPayableKioskService.createPayable(token, {
        concept: draft.concept.trim(),
        currencyCode: currency,
        description: draft.notes.trim(),
        dueDate: draft.dueDate || undefined,
        externalReference: draft.externalReference.trim(),
        providerId: selectedProviderId ?? undefined,
        subtotalAmount: subtotal,
        taxAmount: taxes,
        totalAmount: total,
      });
      const filesToUpload = draft.attachments.flatMap(attachment => attachment.file ? [attachment.file] : []);
      let failedUploads = 0;
      for (const file of filesToUpload) {
        try {
          await publicPayableKioskService.uploadAttachment(token, response.expenseId, file);
        } catch {
          failedUploads += 1;
        }
      }
      revokeLocalUrls(objectUrlsRef.current);
      setDraft(createPayableDraft(currency));
      if (failedUploads > 0) {
        setSuccessToastMessage(copy.uploadPartial(failedUploads));
      } else {
        setSuccessToastMessage(copy.submissionSuccess);
      }
    } catch (error) {
      setFailureToastMessage(publicErrorMessage(error, copy.errors.submission));
    } finally {
      payableSubmissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <KioskShell copy={copy} errorMessage={failureToastMessage} isLoading={false} isOnline={isOnline} sessionMessage={sessionMessage} successMessage={successToastMessage} title={copy.payableTitle} subtitle={copy.missingDescription}>
        <EmptyState title={copy.missingTitle} description={copy.missingDescription} />
      </KioskShell>
    );
  }

  return (
    <KioskShell copy={copy} errorMessage={failureToastMessage} isLoading={isLoading} isOnline={isOnline} minimal={!isAuthorized && mode === 'access'} sessionMessage={sessionMessage || (isSessionExpiring ? copy.sessionExpiring : '')} successMessage={successToastMessage} title={title} subtitle={copy.subtitle}>
      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#147514]" /> {copy.loading}
        </div>
      ) : (
        <>
          {!isAuthorized && mode === 'access' ? (
            <section className="space-y-3">
              <ModeCard active description={copy.accessDescription} icon={<KeyRound />} label={copy.accessLabel} onClick={() => setMode('access')} />
              <ModeCard active={false} description={copy.providerChoiceDescription} disabled={!canRegisterProvider} icon={<UserPlus />} label={copy.providerChoiceLabel} onClick={() => setMode('provider-registration')} />
            </section>
          ) : null}

          {mode === 'access' ? (
            <KioskIdentityGate
              backspaceLabel={copy.clearPin}
              clearLabel={copy.clearPin}
              description={copy.pinDescription}
              disabled={!isOnline || isLoading}
              isSubmitting={isSubmitting}
              onPinChange={(value) => {
                setPin(value);
                if (failureToastMessage) setFailureToastMessage('');
              }}
              onSubmit={() => void authenticate()}
              pinAriaLabel={copy.pinPlaceholder}
              pinLength={5}
              pinValue={pin}
              privacyMessage={copy.pinPrivacy}
              submitLabel={copy.continueLabel}
              title={copy.pinTitle}
              tone="green"
            />
          ) : null}

          {mode === 'provider-registration' ? (
            <form onSubmit={submitProvider} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <button type="button" onClick={() => setMode('access')} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500"><ArrowLeft className="h-4 w-4" />{copy.back}</button>
              <h2 className="text-xl font-medium text-slate-950 dark:text-white">{copy.providerRegistrationTitle}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.providerRegistrationDescription}</p>
              <div className="mt-5 grid gap-4">
                <Field label={copy.fields.name} required><input className={inputClass} value={providerDraft.name} onChange={event => setProviderDraft({ ...providerDraft, name: event.target.value })} /></Field>
                <Field label={copy.fields.legalName}><input className={inputClass} value={providerDraft.legalName} onChange={event => setProviderDraft({ ...providerDraft, legalName: event.target.value })} /></Field>
                <Field label={copy.fields.taxId}><input className={inputClass} value={providerDraft.taxId} onChange={event => setProviderDraft({ ...providerDraft, taxId: event.target.value })} /></Field>
                <Field label={copy.fields.email}><input type="email" inputMode="email" autoComplete="email" className={inputClass} value={providerDraft.email} onChange={event => setProviderDraft({ ...providerDraft, email: event.target.value })} /></Field>
                <Field label={copy.fields.phone}><input type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={providerDraft.phone} onChange={event => setProviderDraft({ ...providerDraft, phone: event.target.value })} /></Field>
                <Field label={copy.fields.contactName}><input className={inputClass} value={providerDraft.contactName} onChange={event => setProviderDraft({ ...providerDraft, contactName: event.target.value })} /></Field>
                <Field label={copy.notes}><textarea className={`${inputClass} min-h-24 resize-y`} value={providerDraft.notes} onChange={event => setProviderDraft({ ...providerDraft, notes: event.target.value })} /></Field>
              </div>
              <Button type="submit" disabled={!canSubmitProvider} className="mt-5 h-12 w-full rounded-xl bg-[#147514] font-medium text-white hover:bg-[#105010]">{copy.submitProvider}</Button>
            </form>
          ) : null}

          {mode === 'payable' ? (
            <form onSubmit={submitPayable} className="space-y-5">
              {faceStatus && (faceStatus.available || faceStatus.enrolled) ? (
                <section className="rounded-[22px] border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/60">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#147514] dark:bg-emerald-950/60"><ScanFace className="h-5 w-5" /></span>
                    <div><h2 className="text-lg font-medium text-slate-950 dark:text-white">{copy.face.title}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.face.description}</p></div>
                  </div>
                  {faceMode !== 'idle' ? (
                    <div className="mt-5">
                      <LiveFaceChallenge
                        compact
                        title={faceMode === 'enroll' ? copy.face.enroll : copy.face.verify}
                        helperText={faceMode === 'enroll' ? copy.face.enrollmentHelper : copy.face.verificationHelper}
                        onSubmit={submitFaceChallenge}
                        onCancel={() => setFaceMode('idle')}
                        onError={() => setFailureToastMessage(copy.errors.face)}
                        resetToken={`${faceMode}-${faceStatus.enrollmentId ?? 'new'}`}
                        copy={copy.face.challenge}
                      />
                    </div>
                  ) : faceStatus.enrolled ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><ShieldCheck className="h-5 w-5" /><div><p className="text-sm font-medium">{copy.face.enrolled}</p><p className="text-xs font-medium opacity-80">{copy.face.enrolledHint}</p></div></div>
                      {isConfirmingFaceWithdrawal ? (
                        <div role="alertdialog" aria-label={copy.face.confirmWithdraw} className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"><p className="text-sm font-medium text-red-800 dark:text-red-200">{copy.face.confirmWithdrawDescription}</p><div className="mt-3 flex gap-2"><Button type="button" variant="outline" onClick={() => setIsConfirmingFaceWithdrawal(false)}>{copy.face.cancel}</Button><Button type="button" disabled={isSubmitting} onClick={() => void withdrawFaceConsent()} className="bg-red-600 text-white hover:bg-red-700">{copy.face.confirmWithdraw}</Button></div></div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">{faceStatus.available ? <Button type="button" onClick={() => setFaceMode('verify')} className="bg-[#147514] text-white hover:bg-[#105010]">{copy.face.verify}</Button> : null}<Button type="button" variant="outline" onClick={() => setIsConfirmingFaceWithdrawal(true)} className="text-red-700">{copy.face.withdraw}</Button></div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><input type="checkbox" checked={faceConsent} onChange={event => setFaceConsent(event.target.checked)} className="mt-1 h-5 w-5 accent-[#147514]" /><span><span className="block text-sm font-medium text-slate-900 dark:text-white">{copy.face.consent}</span><span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{copy.face.consentHint}</span></span></label>
                      <Button type="button" disabled={!faceConsent} onClick={() => setFaceMode('enroll')} className="w-full bg-[#147514] text-white hover:bg-[#105010]">{copy.face.enroll}</Button>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-xl font-medium text-slate-950 dark:text-white">{copy.payableTitle}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{bootstrap?.employee?.name ?? bootstrap?.provider?.name}</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{currency}</span>
                </div>
                <div className="mt-5 grid gap-4">
                  {bootstrap?.identityType === 'EMPLOYEE' ? (
                    <Field label={copy.provider} required>
                      <select
                        required
                        className={inputClass}
                        value={selectedProviderId ?? ''}
                        onChange={event => setSelectedProviderId(event.target.value ? Number(event.target.value) : null)}
                      >
                        <option value="">{copy.providerPlaceholder}</option>
                        {(bootstrap.providers ?? []).map(provider => (
                          <option key={provider.id} value={provider.id}>{provider.name}</option>
                        ))}
                      </select>
                      <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">{copy.employeeProviderHint}</span>
                    </Field>
                  ) : null}
                  <Field label={copy.dueDate}><input type="date" value={draft.dueDate} onChange={event => updateDraft({ dueDate: event.target.value })} className={inputClass} /></Field>
                  <Field label={copy.externalReference}><input value={draft.externalReference} onChange={event => updateDraft({ externalReference: event.target.value })} className={inputClass} placeholder={copy.externalReferencePlaceholder} /></Field>
                  <Field label={copy.concept} required><input required value={draft.concept} onChange={event => updateDraft({ concept: event.target.value })} placeholder={copy.conceptPlaceholder} className={inputClass} /></Field>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-medium text-slate-950 dark:text-white">{copy.totalAmount}</h2>
                <div className="mt-5 grid gap-4">
                  <Field label={t.expenses.modal.amount} required><input required min={0.01} step="0.01" type="number" value={draft.amount} onChange={event => updateDraft({ amount: event.target.value })} placeholder="0.00" className={inputClass} /></Field>
                  <BudgetTaxControls draft={draft} onDraftChange={updateDraft} />
                  <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-3">
                    <SummaryMetric label={t.expenses.modal.summarySubtotal} value={formatCurrency(subtotal, currency)} />
                    <SummaryMetric label={copy.taxAmount} value={formatCurrency(taxes, currency)} />
                    <SummaryMetric strong label={copy.totalAmount} value={formatCurrency(total, currency)} />
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><Paperclip className="h-4 w-4 text-[#147514]" /><h2 className="text-sm font-medium text-slate-500">{copy.evidence}</h2></div>
                <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed bg-slate-50 px-4 py-6 text-center transition ${canAttachMoreFiles ? 'border-[#147514]/25 hover:bg-[#147514]/5' : 'cursor-not-allowed opacity-60'}`}>
                  <input type="file" multiple disabled={!canAttachMoreFiles} onChange={event => { addAttachments(event.target.files); event.target.value = ''; }} className="hidden" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]"><Upload className="h-5 w-5" /></span>
                  <span className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{copy.attachmentAction}</span>
                  <span className="mt-1 text-xs font-medium text-slate-500">{copy.attachmentHint}</span>
                </label>
                {draft.attachments.length > 0 ? <div className="mt-3 space-y-2">{draft.attachments.map(attachment => <AttachmentRow key={attachment.id} attachment={attachment} deleteLabel={t.common.delete} onRemove={() => removeAttachment(attachment.id)} />)}</div> : null}
              </section>

              <Field label={copy.notes}><textarea value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} placeholder={copy.notesPlaceholder} className={`${inputClass} min-h-28 resize-y`} /></Field>
              <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
                <Button type="submit" disabled={!canSubmitPayable} className="h-12 w-full rounded-2xl bg-[#147514] text-base font-medium text-white shadow-lg shadow-[#147514]/20 hover:bg-[#105010]">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {copy.submitPayable}
                </Button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </KioskShell>
  );
}

function KioskShell({ children, copy, errorMessage, isLoading, isOnline, minimal = false, sessionMessage, subtitle, successMessage, title }: {
  children: ReactNode;
  copy: PublicWorkspaceCopy;
  errorMessage: string;
  isLoading: boolean;
  isOnline: boolean;
  minimal?: boolean;
  sessionMessage: string;
  subtitle: string;
  successMessage: string;
  title: string;
}) {
  return (
    <KioskPublicShell
      banners={!isOnline ? <div role="alert" className="bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-900">{copy.offline}</div> : null}
      errorMessage={errorMessage}
      header={(<header className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.kioskEyebrow}</p>
        <h1 className="mt-1 line-clamp-2 break-words text-2xl font-medium leading-tight tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </header>)}
      loadingOverlay={<LoadingBarOverlay isVisible={isLoading} title={copy.loading} description={copy.subtitle} />}
      maxWidthClassName="max-w-[480px]"
      minimalContent={minimal}
      sessionExpiredMessage={sessionMessage || null}
      successMessage={successMessage}
    >
      <div className="space-y-5 dark:[&_form]:border-slate-700 dark:[&_form]:bg-slate-900 dark:[&_section]:border-slate-700 dark:[&_section]:bg-slate-900">{children}</div>
    </KioskPublicShell>
  );
}

function ModeCard({ active, description, disabled, icon, label, onClick }: { active: boolean; description: string; disabled?: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition dark:bg-slate-900 ${active ? 'border-[#147514]/30 bg-white text-slate-900 dark:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-[#147514]/40 dark:border-slate-700 dark:text-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span><span className="block text-base font-medium">{label}</span><span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{description}</span></span></button>;
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><Store className="mx-auto h-8 w-8 text-[#147514]" /><p className="mt-4 text-lg font-medium text-slate-950 dark:text-white">{title}</p><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p></div>;
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}{required ? ' *' : ''}</span>{children}</label>;
}

function SummaryMetric({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return <div className={`min-w-0 rounded-2xl border border-slate-200 bg-white px-2 py-3 dark:border-slate-700 dark:bg-slate-900 ${strong ? 'col-span-2' : ''}`}><p className="truncate text-xs font-medium text-slate-500">{label}</p><p title={value} className={`mt-1 truncate text-xs ${strong ? 'font-medium text-[#147514]' : 'font-medium text-slate-900 dark:text-white'}`}>{value}</p></div>;
}

function AttachmentRow({ attachment, deleteLabel, onRemove }: { attachment: AttachmentDraft; deleteLabel: string; onRemove: () => void }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><File className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{attachment.name}</p><p className="text-xs font-medium text-slate-500">{formatFileSize(attachment.size)}</p></div><button type="button" onClick={onRemove} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" aria-label={deleteLabel}><Trash2 className="h-4 w-4" /></button></div>;
}

function createPayableDraft(currency: string): PayableDraft {
  const budgetCurrencyCode = currency || DEFAULT_FINANCE_CURRENCY;
  const taxCountry = normalizeTaxCountry(inferTaxCountryFromCurrency(budgetCurrencyCode));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  return { amount: '', attachments: [], budgetCurrencyCode, concept: '', dueDate: '', externalReference: '', notes: '', taxes: '', taxCountry, taxEnabled: false, taxIncluded: false, taxMode: 'none', taxProfileId: defaultTaxProfile?.id ?? '', taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '', taxSpecialAmount: '' };
}

function createProviderDraft(): ProviderDraft {
  return { contactName: '', email: '', legalName: '', name: '', notes: '', phone: '', taxId: '' };
}

function revokeLocalUrls(urls: Set<string>) {
  urls.forEach(url => URL.revokeObjectURL(url));
  urls.clear();
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function isAllowedAttachment(file: File) {
  if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) return false;
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  return ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type.toLowerCase()) || ALLOWED_ATTACHMENT_EXTENSIONS.has(extension);
}

function publicErrorMessage(_error: unknown, fallback: string) {
  return fallback;
}
