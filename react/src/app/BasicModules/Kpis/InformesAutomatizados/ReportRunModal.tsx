import { FileText, Download } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { Button } from '../../../components/ui/button';
import type { ReportRun } from './automatedReportsApi';

export function ReportRunModal({ run, onClose }: { run: ReportRun; onClose: () => void }) {
  const accounting = run.reportType === 'ACCOUNTING';
  const summary = (accounting ? run.snapshot.headline : run.snapshot.summary) as Record<string, unknown> | undefined;
  const readiness = run.snapshot.readiness as { message?: string } | undefined;
  const context = run.snapshot.context as { presentationCurrency?: string; preferredCurrency?: string; currency?: string } | undefined;
  const metrics = accounting ? [['revenue', 'Ingresos'], ['grossProfit', 'Utilidad bruta'], ['operatingProfit', 'Utilidad operativa'], ['netProfit', 'Utilidad neta'], ['totalAssets', 'Activos'], ['totalLiabilities', 'Pasivos'], ['totalEquity', 'Patrimonio'], ['netCashChange', 'Cambio en efectivo']] : [['salesTotal', 'Ventas'], ['collectedTotal', 'Cobranza'], ['expensesTotal', 'Gastos'], ['operatingProfit', 'Utilidad operativa'], ['receivablesTotal', 'Cartera'], ['payablesTotal', 'Cuentas por pagar']];
  const download = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `indice-informe-${run.id}.json`; a.click(); URL.revokeObjectURL(url); };
  return <IndiceModalFrame open modalType="standard-form" tone="blue" icon={<FileText className="h-5 w-5" />} title="Informe generado" description={`${run.from} / ${run.to} · ${context?.presentationCurrency ?? context?.preferredCurrency ?? context?.currency ?? ''}`} closeLabel="Cerrar" onOpenChange={open => { if (!open) onClose(); }} footer={<><Button variant="outline" onClick={download}><Download className="h-4 w-4" />Descargar informe completo</Button><Button onClick={onClose}>Cerrar</Button></>} footerSummary={`Generado: ${new Date(run.generatedAt).toLocaleString()}`}>
    {readiness?.message && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{readiness.message}</p>}
    {summary?.profitReady === false && <p className="mb-4 text-sm text-amber-800">La utilidad requiere completar la evidencia financiera.</p>}
    <dl className="grid gap-3 sm:grid-cols-2">{metrics.map(([key, label]) => <div key={key} className="rounded-xl border p-3"><dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-2 text-xl">{typeof summary?.[key] === 'number' && !(key === 'operatingProfit' && summary?.profitReady === false) ? new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summary[key] as number) : 'Sin información verificable'}</dd></div>)}</dl>
    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">El archivo conserva el informe completo, sus matrices o estados y las observaciones de calidad del momento de generación.</p>
  </IndiceModalFrame>;
}
