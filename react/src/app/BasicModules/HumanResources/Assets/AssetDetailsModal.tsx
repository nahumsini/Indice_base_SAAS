import type { ReactNode } from 'react';
import {
  Boxes,
  CalendarClock,
  Package2,
  Printer,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { IndiceModalFrame } from '../../../components/indice-modal';
import { cn } from '../../../components/ui/utils';
import { useLanguage } from '../../../shared/context';
import { type HrAsset } from '../../../api/HumanResources/assets';
import {
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import { useAssetsTranslations } from './hooks/useAssetsTranslations';
import type { AssetsTranslations } from './translations';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';
import { getAssetTypeLabel } from './utils/assets.utils';
import { buildDocumentFileName } from '../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata } from '../../shared/print/documentPdfEngine';

interface AssetDetailsModalProps {
  isOpen: boolean;
  asset: HrAsset | null;
  onClose: () => void;
}

const getStatusLabel = (status: HrAsset['status'], t: AssetsTranslations) => {
  const labelMap = {
    available: t.filters.available,
    assigned: t.filters.assigned,
    maintenance: t.filters.inMaintenance,
    custody: t.filters.custody,
    inactive: t.filters.inactive,
  } as const;

  return labelMap[status];
};

const getStatusClasses = (status: HrAsset['status']) => {
  const styles = {
    available:
      'border-[#d4ddff] bg-[#eef2ff] text-[#4054c6] dark:border-[#4658d4]/40 dark:bg-[#4658d4]/18 dark:text-[#a9b6ff]',
    assigned:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-300',
    maintenance:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-300',
    custody:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/25 dark:bg-slate-500/14 dark:text-slate-300',
    inactive:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/12 dark:text-rose-300',
  } as const;

  return styles[status];
};

const formatDateTime = (value: string | null, locale: string) => {
  if (!value) {
    return '-';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const formatValue = (value: number | null, currency: string | null | undefined) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return formatBusinessCurrencyAmount(value, normalizeBusinessCurrencyCode(currency, 'USD'), {
    maximumFractionDigits: 0,
  });
};

const getAssignmentActCopy = (locale: string) => {
  if (locale.startsWith('es')) {
    return {
      printButton: 'Imprimir acta',
      title: 'Acta responsiva de activo',
      brand: 'Índice ERP',
      generatedAt: 'Fecha de emisión',
      assetSection: 'Datos del activo',
      assignmentSection: 'Datos de asignación',
      signatures: 'Firmas',
      receiver: 'Recibe / Responsable del activo',
      issuer: 'Entrega / Responsable que otorga',
      signature: 'Firma',
      intro:
        'Por medio de la presente se hace constar la entrega del activo descrito a continuación, quedando bajo resguardo del responsable indicado para su uso laboral y cuidado operativo.',
      responsibility:
        'La persona responsable se compromete a conservar el activo en buen estado, reportar cualquier daño, pérdida o cambio de asignación, y devolverlo cuando la empresa lo solicite.',
      footer: 'Documento generado por Índice ERP para control interno de activos.',
    };
  }

  if (locale.startsWith('pt')) {
    return {
      printButton: 'Imprimir termo',
      title: 'Termo de responsabilidade de ativo',
      brand: 'Índice ERP',
      generatedAt: 'Data de emissão',
      assetSection: 'Dados do ativo',
      assignmentSection: 'Dados de atribuição',
      signatures: 'Assinaturas',
      receiver: 'Recebe / Responsável pelo ativo',
      issuer: 'Entrega / Responsável pela entrega',
      signature: 'Assinatura',
      intro:
        'Por meio deste documento registra-se a entrega do ativo descrito abaixo, ficando sob responsabilidade da pessoa indicada para uso profissional e cuidado operacional.',
      responsibility:
        'A pessoa responsável compromete-se a conservar o ativo em bom estado, comunicar danos, perdas ou mudanças de atribuição e devolvê-lo quando solicitado pela empresa.',
      footer: 'Documento gerado pelo Índice ERP para controle interno de ativos.',
    };
  }

  if (locale.startsWith('fr')) {
    return {
      printButton: 'Imprimer le document',
      title: "Attestation de responsabilité d'actif",
      brand: 'Índice ERP',
      generatedAt: "Date d'émission",
      assetSection: "Données de l'actif",
      assignmentSection: "Données d'attribution",
      signatures: 'Signatures',
      receiver: "Reçoit / Responsable de l'actif",
      issuer: "Remet / Responsable de l'attribution",
      signature: 'Signature',
      intro:
        "Le présent document constate la remise de l'actif décrit ci-dessous, placé sous la garde du responsable indiqué pour son usage professionnel.",
      responsibility:
        "La personne responsable s'engage à conserver l'actif en bon état, signaler tout dommage, perte ou changement d'attribution, et le restituer sur demande.",
      footer: 'Document généré par Índice ERP pour le contrôle interne des actifs.',
    };
  }

  return {
    printButton: 'Print assignment letter',
    title: 'Asset assignment letter',
    brand: 'Índice ERP',
    generatedAt: 'Issue date',
    assetSection: 'Asset information',
    assignmentSection: 'Assignment information',
    signatures: 'Signatures',
    receiver: 'Receiver / Asset custodian',
    issuer: 'Issuer / Company representative',
    signature: 'Signature',
    intro:
      'This document records the delivery of the asset described below, assigned to the indicated custodian for work use and operational care.',
    responsibility:
      'The custodian agrees to keep the asset in good condition, report any damage, loss, or assignment change, and return it when requested by the company.',
    footer: 'Document generated by Índice ERP for internal asset control.',
  };
};

const addPdfSection = (
  doc: import('jspdf').jsPDF,
  title: string,
  rows: Array<[string, string]>,
  startY: number,
) => {
  const left = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxValueWidth = pageWidth - 84;
  let y = startY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, left, y);
  y += 8;

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, left, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value || '-', maxValueWidth);
    doc.text(lines, 74, y);
    y += Math.max(7, lines.length * 5 + 2);
  });

  return y + 3;
};

const downloadAssetAssignmentActPdf = async (
  asset: HrAsset,
  t: AssetsTranslations,
  locale: string,
) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const actCopy = getAssignmentActCopy(locale);
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 18;
  const contentWidth = pageWidth - left * 2;
  const issuedAt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  applyStandardPdfMetadata(doc, {
    subject: actCopy.title,
    title: `${actCopy.title} ${asset.asset_code}`,
  });

  doc.setDrawColor(89, 143, 127);
  doc.setLineWidth(1.2);
  doc.line(left, 14, pageWidth - left, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(32, 36, 41);
  doc.text(actCopy.title, left, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 107, 115);
  doc.text(actCopy.brand, pageWidth - left, 27, { align: 'right' });

  let y = 43;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`${actCopy.generatedAt}: ${issuedAt}`, left, y);
  y += 10;

  doc.setFontSize(10);
  const introLines = doc.splitTextToSize(actCopy.intro, contentWidth);
  doc.text(introLines, left, y);
  y += introLines.length * 5 + 7;

  y = addPdfSection(
    doc,
    actCopy.assetSection,
    [
      [t.detailsModal.fields.code, asset.asset_code],
      [t.detailsModal.fields.type, getAssetTypeLabel(asset.asset_type, t)],
      [t.detailsModal.fields.asset, asset.name],
      [t.detailsModal.fields.model, asset.model || t.emptyValue],
      [t.detailsModal.fields.serialNumber, asset.serial_number || t.emptyValue],
      [t.detailsModal.fields.value, formatValue(asset.value_amount, asset.value_currency)],
      [t.detailsModal.fields.notes, asset.notes || t.detailsModal.empty.noNotes],
    ],
    y,
  );

  y = addPdfSection(
    doc,
    actCopy.assignmentSection,
    [
      [t.detailsModal.fields.responsible, asset.responsible_name || t.detailsModal.empty.unassigned],
      [t.detailsModal.fields.responsibleEmail, asset.responsible_email || t.detailsModal.empty.noEmail],
      [t.detailsModal.fields.unit, asset.unit_name || t.detailsModal.empty.noUnit],
      [t.detailsModal.fields.status, getStatusLabel(asset.status, t)],
      [t.detailsModal.fields.assignedAt, formatDateTime(asset.assigned_at, locale)],
    ],
    y,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const responsibilityLines = doc.splitTextToSize(actCopy.responsibility, contentWidth);
  doc.text(responsibilityLines, left, y);
  y += responsibilityLines.length * 5 + 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(actCopy.signatures, left, y);
  y += 24;

  const signatureWidth = (contentWidth - 12) / 2;
  const receiverName = asset.responsible_name || t.detailsModal.empty.unassigned;
  const issuerName = asset.updated_by_name || asset.created_by_name || t.detailsModal.empty.system;

  [
    { label: actCopy.receiver, name: receiverName, x: left },
    { label: actCopy.issuer, name: issuerName, x: left + signatureWidth + 12 },
  ].forEach((signature) => {
    doc.setDrawColor(148, 163, 184);
    doc.line(signature.x, y, signature.x + signatureWidth, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(signature.label, signature.x, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(signature.name, signature.x, y + 13, { maxWidth: signatureWidth });
    doc.text(actCopy.signature, signature.x, y + 19);
  });

  addStandardPdfFooters(doc, {
    confidentiality: 'Internal',
    folio: asset.asset_code,
    locale,
  });
  doc.save(buildDocumentFileName({
    documentType: 'asset-assignment',
    identifier: asset.asset_code || asset.name,
  }));
};

function SummaryStat({
  icon,
  label,
  value,
  isDarkMode,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        isDarkMode ? 'border-white/10 bg-[#10231f]' : 'border-[#DCEFEA] bg-white',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            isDarkMode ? 'bg-[#59C3A5]/18 text-[#9BE4D0]' : 'bg-[#E5F8F2] text-[#1F8A70]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div
            className={cn(
              'text-xs font-medium',
              isDarkMode ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {label}
          </div>
          <div className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  rows,
  isDarkMode,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  isDarkMode: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-[24px] border p-5',
        isDarkMode ? 'border-white/10 bg-[#10231f]' : 'border-[#DCEFEA] bg-white',
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
            isDarkMode ? 'bg-[#59C3A5]/18 text-[#9BE4D0]' : 'bg-[#E5F8F2] text-[#1F8A70]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={cn('text-lg font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {title}
          </h3>
          {subtitle ? (
            <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl border',
          isDarkMode ? 'border-white/8 bg-[#0b1c18]' : 'border-[#E1F3EF] bg-[#fbfefd]',
        )}
      >
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.label}
                className={cn(
                  index !== rows.length - 1 && (isDarkMode ? 'border-b border-white/8' : 'border-b border-[#E7F3F0]'),
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'w-[34%] px-4 py-3 text-left align-top text-xs font-medium sm:w-[220px]',
                    isDarkMode ? 'text-slate-400' : 'text-slate-500',
                  )}
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    'px-4 py-3 text-sm leading-6 align-top break-words',
                    isDarkMode ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AssetDetailsModal({ isOpen, asset, onClose }: AssetDetailsModalProps) {
  const t = useAssetsTranslations();
  const { currentLanguage } = useLanguage();
  const isDarkMode = useAssetsPortalTheme();
  const copy = t.detailsModal;

  if (!asset) {
    return null;
  }

  const assignmentActCopy = getAssignmentActCopy(currentLanguage.code);

  const handlePrintAssignmentAct = () => {
    void downloadAssetAssignmentActPdf(asset, t, currentLanguage.code);
  };

  const statusBadge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        getStatusClasses(asset.status),
      )}
    >
      {getStatusLabel(asset.status, t)}
    </span>
  );

  const summaryStats = [
    {
      icon: <Wallet className="size-4" />,
      label: copy.fields.value,
      value: formatValue(asset.value_amount, asset.value_currency),
    },
    {
      icon: <CalendarClock className="size-4" />,
      label: copy.fields.assignedAt,
      value: formatDateTime(asset.assigned_at, currentLanguage.code),
    },
    {
      icon: <Boxes className="size-4" />,
      label: copy.fields.unit,
      value: asset.unit_name || copy.empty.noUnit,
    },
  ];

  const overviewRows = [
    { label: copy.fields.code, value: asset.asset_code },
    { label: copy.fields.type, value: getAssetTypeLabel(asset.asset_type, t) },
    { label: copy.fields.asset, value: asset.name },
    { label: copy.fields.model, value: asset.model || t.emptyValue },
    { label: copy.fields.serialNumber, value: asset.serial_number || t.emptyValue },
    { label: copy.fields.notes, value: asset.notes || copy.empty.noNotes },
  ];

  const assignmentRows = [
    { label: copy.fields.responsible, value: asset.responsible_name || copy.empty.unassigned },
    { label: copy.fields.responsibleEmail, value: asset.responsible_email || copy.empty.noEmail },
    { label: copy.fields.unit, value: asset.unit_name || copy.empty.noUnit },
    { label: copy.fields.status, value: statusBadge },
    { label: copy.fields.assignedAt, value: formatDateTime(asset.assigned_at, currentLanguage.code) },
  ];

  const auditRows = [
    { label: copy.fields.createdBy, value: asset.created_by_name || copy.empty.system },
    { label: copy.fields.createdAt, value: formatDateTime(asset.created_at, currentLanguage.code) },
    { label: copy.fields.updatedBy, value: asset.updated_by_name || copy.empty.system },
    { label: copy.fields.updatedAt, value: formatDateTime(asset.updated_at, currentLanguage.code) },
  ];

  return (
    <IndiceModalFrame
      closeLabel={copy.close}
      contentClassName="sm:w-[min(96vw,1120px)] sm:max-w-[1120px]"
      description={asset.asset_code}
      eyebrow={getAssetTypeLabel(asset.asset_type, t)}
      footer={<Button type="button" onClick={onClose}>{copy.close}</Button>}
      footerLeading={(
        <Button type="button" variant="outline" onClick={handlePrintAssignmentAct}>
          <Printer className="size-4" />
          {assignmentActCopy.printButton}
        </Button>
      )}
      icon={<Package2 className="size-5" />}
      modalType="standard-form"
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      open={isOpen}
      title={copy.title}
      tone="aqua"
    >
          <div className="space-y-5">
            <section
              className={cn(
                'rounded-[24px] border p-5',
                isDarkMode ? 'border-[#315f55] bg-[#112a25]' : 'border-[#D7F1EA] bg-white',
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                        isDarkMode ? 'bg-white/10 text-white/85' : 'bg-[#E5F8F2] text-[#1F8A70]',
                      )}
                    >
                      {copy.sections.overview}
                    </span>
                    {statusBadge}
                  </div>
                  <h3 className={cn('text-2xl font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {asset.name}
                  </h3>
                  <p className={cn('mt-2 max-w-2xl text-sm leading-7', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                    {copy.subtitle}
                  </p>
                </div>

                <div
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm',
                    isDarkMode ? 'border-white/10 bg-[#0b1c18] text-slate-200' : 'border-[#DCEFEA] bg-[#F7FCFA] text-slate-700',
                  )}
                >
                  <div className="text-xs font-medium text-slate-500">
                    {copy.fields.code}
                  </div>
                  <div className={cn('mt-2 text-lg font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {asset.asset_code}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {summaryStats.map((stat) => (
                  <SummaryStat
                    key={stat.label}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <SectionCard
                icon={<Package2 className="size-5" />}
                title={copy.sections.overview}
                subtitle={getAssetTypeLabel(asset.asset_type, t)}
                rows={overviewRows}
                isDarkMode={isDarkMode}
              />

              <SectionCard
                icon={<UserRound className="size-5" />}
                title={copy.sections.assignment}
                subtitle={copy.fields.responsible}
                rows={assignmentRows}
                isDarkMode={isDarkMode}
              />
            </div>

            <SectionCard
              icon={<ShieldCheck className="size-5" />}
              title={copy.sections.audit}
              subtitle={copy.fields.updatedAt}
              rows={auditRows}
              isDarkMode={isDarkMode}
            />
          </div>
    </IndiceModalFrame>
  );
}
