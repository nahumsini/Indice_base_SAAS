import { useRef } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { printDocumentHtml } from '../../../../shared/print/documentHtmlPrintEngine';

const printActionClassNames = getSalesModalActionClassNames('coral');

export function MovementPrintModal({
  movement,
  movementLines,
  t,
  locale,
  onClose,
}: {
  movement: InventoryOperationalMovement | null;
  movementLines?: InventoryOperationalMovement[];
  t: InventoryTranslations;
  locale: string;
  onClose: () => void;
}) {
  const documentRef = useRef<HTMLElement>(null);
  if (!movement) return null;

  const lines = movementLines?.length ? movementLines : [movement];
  const movementValue = lines.reduce((total, line) => total + Math.abs(line.quantity) * (line.unitCost ?? 0), 0);
  const isControlAct = movement.movementType === 'adjustment' || movement.movementType === 'transfer';
  const documentTitle = isControlAct
    ? `${t.operational.movementTypes[movement.movementType]} · ${t.operational.modals.movementDocumentTitle}`
    : t.operational.modals.movementDocumentTitle;
  const handlePrint = () => {
    if (!documentRef.current) return;
    printDocumentHtml({
      bodyHtml: documentRef.current.outerHTML,
      contentStyles: `
        body { padding: 12mm 14mm 10mm; }
        article { margin: 0 auto !important; min-height: 0 !important; max-width: none !important; padding: 0 !important; box-shadow: none !important; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        footer { break-inside: avoid; }
      `,
      documentTitle: `inventory_movement_${movement.movementNumber ?? movement.id}`,
      includeApplicationStyles: true,
      locale,
      pageSize: 'a4',
    });
  };

  return (
    <SalesModalFrame
      open={Boolean(movement)}
      onOpenChange={(open) => !open && onClose()}
      title={t.operational.modals.movementDocumentTitle}
      description={t.operational.modals.movementDocumentSubtitle}
      icon={<FileText className="h-6 w-6" />}
      modalType="operational-workspace"
      contentClassName="flex h-[90vh] max-h-[900px] w-[calc(100vw-2rem)] max-w-[1040px] flex-col sm:max-w-[1040px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5"
      footerLeading={(
        <Button variant="outline" className={printActionClassNames.secondary} onClick={onClose}>
          {t.common.close}
        </Button>
      )}
      footerSummary={`${movement.movementNumber ?? movement.id} · ${t.operational.movementTypes[movement.movementType]}`}
      footer={(
        <Button className={printActionClassNames.primary} onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          {t.operational.modals.printDocument}
        </Button>
      )}
    >
          <article ref={documentRef} className="mx-auto min-h-[760px] w-full max-w-[820px] bg-white px-12 py-10 shadow-xl ring-1 ring-slate-200">
            <header className="border-b border-slate-200 pb-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-medium text-[#B63B32]">{movement.businessName ?? movement.businessUnitName ?? t.operational.modals.movementDocumentTitle}</p>
                  <h1 className="mt-3 text-4xl font-medium tracking-normal text-slate-950">{documentTitle}</h1>
                  <p className="mt-2 text-sm font-medium text-slate-500">{t.operational.movementTypes[movement.movementType]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">{t.operational.columns.movement}</p>
                  <p className="mt-1 text-lg font-medium text-slate-950">{movement.movementNumber ?? movement.id}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{movement.movementDate}</p>
                </div>
              </div>
            </header>

            <section className="grid gap-4 border-b border-slate-200 py-7 md:grid-cols-2">
              <InfoBlock label={t.operational.columns.from} value={movement.fromWarehouseName ?? t.common.notAvailable} />
              <InfoBlock label={t.operational.columns.to} value={movement.toWarehouseName ?? t.common.notAvailable} />
              <InfoBlock label={t.operational.modals.supplier} value={movement.supplierName ?? movement.fromWarehouseName ?? t.common.notAvailable} />
              <InfoBlock label={t.operational.columns.responsible} value={movement.responsibleName} />
              <InfoBlock label={t.operational.columns.status} value={t.operational.movementStatuses[movement.status]} />
            </section>

            <section className="py-7">
              <h2 className="text-xl font-medium text-slate-950">{t.operational.columns.product}</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#222831] text-white">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.operational.columns.product}</th>
                      <th className="px-4 py-3 font-medium">{t.operational.columns.quantity}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.operational.columns.estimatedValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t border-slate-200">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-950">{line.productName}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">SKU: {line.productSku ?? t.common.notAvailable}</p>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-700">{line.quantity >= 0 ? '+' : ''}{formatInventoryNumber(line.quantity)}</td>
                        <td className="px-4 py-4 text-right font-medium text-slate-950">{formatInventoryCurrency(Math.abs(line.quantity) * (line.unitCost ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5 text-right">
                <p className="text-xs font-medium text-[#B63B32]">{t.operational.columns.estimatedValue}</p>
                <p className="mt-2 text-2xl font-medium text-slate-950">{formatInventoryCurrency(movementValue)}</p>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-medium text-slate-500">{t.operational.columns.reference}</p>
                <p className="mt-2 font-medium text-slate-900">{movement.reference ?? t.common.notAvailable}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{movement.reason}</p>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{t.operational.columns.files}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {movement.attachments?.length ? movement.attachments.map((file) => (
                    <span key={file.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{file.name}</span>
                  )) : <span className="text-sm font-medium text-slate-400">{t.common.none}</span>}
                </div>
              </div>
            </section>
            <footer className="mt-8 border-t border-slate-200 pt-10">
              <p className="mb-10 text-xs leading-5 text-slate-500">
                {isControlAct
                  ? 'Acta operativa de control de inventario. Las firmas confirman revisión del movimiento; no sustituyen autorizaciones requeridas por la política interna.'
                  : 'Documento operativo de trazabilidad de inventario.'}
              </p>
              <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
                <div><div className="border-t border-slate-400 pt-2">{movement.responsibleName}</div></div>
                <div><div className="border-t border-slate-400 pt-2">Entrega / origen</div></div>
                <div><div className="border-t border-slate-400 pt-2">Recibe / autoriza</div></div>
              </div>
            </footer>
          </article>
    </SalesModalFrame>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-medium text-slate-950">{value}</p>
    </div>
  );
}
