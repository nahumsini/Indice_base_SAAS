import { useRef } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../../components/SalesModalFrame';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';

const printActionClassNames = getSalesModalActionClassNames('coral');

export function MovementPrintModal({
  movement,
  movementLines,
  t,
  onClose,
}: {
  movement: InventoryOperationalMovement | null;
  movementLines?: InventoryOperationalMovement[];
  t: InventoryTranslations;
  onClose: () => void;
}) {
  const documentRef = useRef<HTMLElement>(null);
  if (!movement) return null;

  const lines = movementLines?.length ? movementLines : [movement];
  const movementValue = lines.reduce((total, line) => total + Math.abs(line.quantity) * (line.unitCost ?? 0), 0);
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow || !documentRef.current) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${movement.movementNumber ?? movement.id}</title>
          <style>
            body { margin: 0; background: #f1f5f9; font-family: Inter, Arial, sans-serif; }
            article { margin: 24px auto; max-width: 820px; background: white; padding: 48px; box-shadow: 0 1px 8px rgba(15,23,42,.16); }
            @media print { body { background: white; } article { margin: 0; box-shadow: none; max-width: none; } }
          </style>
        </head>
        <body>${documentRef.current.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <SalesModalFrame
      open={Boolean(movement)}
      onOpenChange={(open) => !open && onClose()}
      title={t.operational.modals.movementDocumentTitle}
      description={t.operational.modals.movementDocumentSubtitle}
      icon={<FileText className="h-6 w-6" />}
      contentClassName="flex h-[90vh] max-h-[900px] w-[calc(100vw-2rem)] max-w-[1040px] flex-col sm:max-w-[1040px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5"
      footer={(
        <>
          <Button variant="outline" className={printActionClassNames.secondary} onClick={onClose}>{t.common.close}</Button>
          <Button className={printActionClassNames.primary} onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t.operational.modals.printDocument}
          </Button>
        </>
      )}
    >
          <article ref={documentRef} className="mx-auto min-h-[760px] w-full max-w-[820px] bg-white px-12 py-10 shadow-xl ring-1 ring-slate-200">
            <header className="border-b border-slate-200 pb-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[#B63B32]">INDICE SALES OS</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{t.operational.modals.movementDocumentTitle}</h1>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{t.operational.movementTypes[movement.movementType]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{t.operational.columns.movement}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{movement.movementNumber ?? movement.id}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{movement.movementDate}</p>
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
              <h2 className="text-xl font-black text-slate-950">{t.operational.columns.product}</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#222831] text-white">
                    <tr>
                      <th className="px-4 py-3 font-black">{t.operational.columns.product}</th>
                      <th className="px-4 py-3 font-black">{t.operational.columns.quantity}</th>
                      <th className="px-4 py-3 text-right font-black">{t.operational.columns.estimatedValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t border-slate-200">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">{line.productName}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">SKU: {line.productSku ?? t.common.notAvailable}</p>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-700">{line.quantity >= 0 ? '+' : ''}{formatInventoryNumber(line.quantity)}</td>
                        <td className="px-4 py-4 text-right font-black text-slate-950">{formatInventoryCurrency(Math.abs(line.quantity) * (line.unitCost ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B63B32]">{t.operational.columns.estimatedValue}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatInventoryCurrency(movementValue)}</p>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t.operational.columns.reference}</p>
                <p className="mt-2 font-black text-slate-900">{movement.reference ?? t.common.notAvailable}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{movement.reason}</p>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t.operational.columns.files}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {movement.attachments?.length ? movement.attachments.map((file) => (
                    <span key={file.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{file.name}</span>
                  )) : <span className="text-sm font-semibold text-slate-400">{t.common.none}</span>}
                </div>
              </div>
            </section>
          </article>
    </SalesModalFrame>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
