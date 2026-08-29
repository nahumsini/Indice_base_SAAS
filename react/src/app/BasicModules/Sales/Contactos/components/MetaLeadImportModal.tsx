import { useState } from 'react';
import { CheckCircle2, CloudDownload, Info, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ApiClientError } from '../../../../lib/apiClient';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { salesApi, type MetaLeadImportResponse } from '../../salesApi';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ContactCopy } from '../translations';

const actionClassNames = getSalesModalActionClassNames('coral');
const importLimits = [50, 100, 250, 500];

export function MetaLeadImportModal({
  copy,
  open,
  onOpenChange,
  onImported,
}: {
  copy: ContactCopy['metaImport'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => Promise<unknown>;
}) {
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [maxLeads, setMaxLeads] = useState(100);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<MetaLeadImportResponse | null>(null);

  const reset = () => {
    setPageId('');
    setAccessToken('');
    setMaxLeads(100);
    setBusy(false);
    setErrorMessage('');
    setResult(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy) return;
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleImport = async () => {
    setBusy(true);
    setErrorMessage('');
    setResult(null);
    try {
      const response = await salesApi.importMetaLeads({ pageId: pageId.trim(), accessToken, maxLeads });
      setResult(response);
      setAccessToken('');
      await onImported();
    } catch (error) {
      const code = error instanceof ApiClientError ? error.code : undefined;
      setErrorMessage(copy.errors[code as keyof typeof copy.errors] ?? copy.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = /^\d{1,40}$/.test(pageId.trim()) && accessToken.trim().length >= 20 && !busy;

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
      icon={<CloudDownload className="h-5 w-5" />}
      closeLabel={copy.cancel}
      modalType="standard-form"
      busy={busy}
      bodyClassName="space-y-5 bg-slate-50/70"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className={actionClassNames.secondary}
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className={actionClassNames.primary}
            onClick={() => void handleImport()}
            disabled={!canSubmit}
          >
            <CloudDownload className="h-4 w-4" />
            {busy ? copy.importing : copy.importAction}
          </Button>
        </>
      )}
    >
      <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{copy.securityTitle}</p>
            <p className="mt-1 leading-6">{copy.securityDescription}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.configurationTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.configurationDescription}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta-page-id">{copy.pageIdLabel}</Label>
            <Input
              id="meta-page-id"
              value={pageId}
              onChange={(event) => {
                setPageId(event.target.value.replace(/\D/g, '').slice(0, 40));
                setErrorMessage('');
                setResult(null);
              }}
              placeholder={copy.pageIdPlaceholder}
              inputMode="numeric"
              autoComplete="off"
              className="h-11 rounded-xl"
              disabled={busy}
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.pageIdHelp}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-lead-limit">{copy.limitLabel}</Label>
            <Select value={String(maxLeads)} onValueChange={(value) => setMaxLeads(Number(value))} disabled={busy}>
              <SelectTrigger id="meta-lead-limit" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importLimits.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>{copy.limitOption(limit)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.limitHelp}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-page-token">{copy.tokenLabel}</Label>
          <Input
            id="meta-page-token"
            type="password"
            value={accessToken}
            onChange={(event) => {
              setAccessToken(event.target.value);
              setErrorMessage('');
              setResult(null);
            }}
            placeholder={copy.tokenPlaceholder}
            autoComplete="new-password"
            spellCheck={false}
            className="h-11 rounded-xl font-mono text-sm"
            disabled={busy}
          />
          <div className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{copy.tokenHelp}</p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {result ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/35">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-emerald-950 dark:text-emerald-100">{copy.resultTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                {copy.resultDescription(result.imported, result.downloaded)}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [copy.resultImported, result.imported],
              [copy.resultDuplicates, result.skippedDuplicates],
              [copy.resultPrevious, result.skippedPreviouslyImported],
              [copy.resultInvalid, result.skippedInvalid],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-emerald-200/80 bg-white/70 px-3 py-3 dark:border-emerald-900 dark:bg-slate-900/60">
                <dt className="text-xs text-emerald-800 dark:text-emerald-300">{label}</dt>
                <dd className="mt-1 text-lg font-medium text-emerald-950 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </SalesModalFrame>
  );
}
