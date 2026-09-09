import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, ImageIcon } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import type { Product } from '../../shared/commercial/products';
import type {
  PurchaseOrder,
  SupplierCatalogDecision,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';
import { formatDate, formatMoney, numberFrom, statusClassName } from '../utils/purchaseOrderFormat';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

const reviewStatuses: SupplierSubmissionStatus[] = [
  'IN_REVIEW', 'NEEDS_CLARIFICATION', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED',
];

type ResolutionDraft = {
  decision: SupplierCatalogDecision;
  productId: string;
  productCode: string;
  sku: string;
  productName: string;
  productDescription: string;
  category: string;
  taxCategory: string;
  salePrice: string;
  reviewNote: string;
};

const resolutionCopy = {
  'en-CA': { decision: 'Catalog decision', existing: 'Link existing product', create: 'Create new product', reject: 'Reject item', product: 'Catalog product', salePrice: 'Sale price', code: 'Product code', sku: 'Internal SKU', name: 'Product name', category: 'Category', note: 'Item review note', blocked: 'Sale price must be equal to or greater than supplier cost.', currency: 'The product currency must match the proposal currency.', required: 'Complete the catalog decision for every approved item.', zero: 'This product will have zero margin.' },
  'en-US': { decision: 'Catalog decision', existing: 'Link existing product', create: 'Create new product', reject: 'Reject item', product: 'Catalog product', salePrice: 'Sale price', code: 'Product code', sku: 'Internal SKU', name: 'Product name', category: 'Category', note: 'Item review note', blocked: 'Sale price must be equal to or greater than supplier cost.', currency: 'The product currency must match the proposal currency.', required: 'Complete the catalog decision for every approved item.', zero: 'This product will have zero margin.' },
  'es-MX': { decision: 'Decisión de catálogo', existing: 'Vincular producto existente', create: 'Crear producto nuevo', reject: 'Rechazar partida', product: 'Producto del catálogo', salePrice: 'Precio de venta', code: 'Código de producto', sku: 'SKU interno', name: 'Nombre del producto', category: 'Categoría', note: 'Nota de revisión de la partida', blocked: 'El precio de venta debe ser igual o mayor que el costo del proveedor.', currency: 'La moneda del producto debe coincidir con la moneda de la propuesta.', required: 'Completa la decisión de catálogo de cada partida aprobada.', zero: 'Este producto quedará con margen cero.' },
  'es-CO': { decision: 'Decisión de catálogo', existing: 'Vincular producto existente', create: 'Crear producto nuevo', reject: 'Rechazar partida', product: 'Producto del catálogo', salePrice: 'Precio de venta', code: 'Código de producto', sku: 'SKU interno', name: 'Nombre del producto', category: 'Categoría', note: 'Nota de revisión de la partida', blocked: 'El precio de venta debe ser igual o mayor que el costo del proveedor.', currency: 'La moneda del producto debe coincidir con la moneda de la propuesta.', required: 'Completa la decisión de catálogo de cada partida aprobada.', zero: 'Este producto quedará con margen cero.' },
  'fr-CA': { decision: 'Décision de catalogue', existing: 'Lier un produit existant', create: 'Créer un nouveau produit', reject: 'Refuser l’article', product: 'Produit du catalogue', salePrice: 'Prix de vente', code: 'Code produit', sku: 'SKU interne', name: 'Nom du produit', category: 'Catégorie', note: 'Note de révision de l’article', blocked: 'Le prix de vente doit être égal ou supérieur au coût fournisseur.', currency: 'La devise du produit doit correspondre à celle de la proposition.', required: 'Complétez la décision de catalogue pour chaque article approuvé.', zero: 'Ce produit aura une marge nulle.' },
  'pt-BR': { decision: 'Decisão de catálogo', existing: 'Vincular produto existente', create: 'Criar produto novo', reject: 'Rejeitar item', product: 'Produto do catálogo', salePrice: 'Preço de venda', code: 'Código do produto', sku: 'SKU interno', name: 'Nome do produto', category: 'Categoria', note: 'Nota de revisão do item', blocked: 'O preço de venda deve ser igual ou superior ao custo do fornecedor.', currency: 'A moeda do produto deve coincidir com a moeda da proposta.', required: 'Conclua a decisão de catálogo de cada item aprovado.', zero: 'Este produto ficará com margem zero.' },
  'ko-CA': { decision: '카탈로그 결정', existing: '기존 제품 연결', create: '새 제품 만들기', reject: '항목 거부', product: '카탈로그 제품', salePrice: '판매 가격', code: '제품 코드', sku: '내부 SKU', name: '제품명', category: '카테고리', note: '항목 검토 메모', blocked: '판매 가격은 공급업체 원가 이상이어야 합니다.', currency: '제품 통화는 제안서 통화와 일치해야 합니다.', required: '승인된 모든 항목의 카탈로그 결정을 완료하세요.', zero: '이 제품은 마진이 0입니다.' },
  'zh-CA': { decision: '目录决定', existing: '关联现有产品', create: '创建新产品', reject: '拒绝项目', product: '目录产品', salePrice: '销售价格', code: '产品代码', sku: '内部 SKU', name: '产品名称', category: '类别', note: '项目审核备注', blocked: '销售价格必须等于或高于供应商成本。', currency: '产品币种必须与提案币种一致。', required: '请完成每个已批准项目的目录决定。', zero: '该产品的利润率将为零。' },
} as const;

const fieldClassName = 'mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function SupplierSubmissionDetailModal({
  onConvert, onClose, onReview, products, saving, submission, warehouses,
}: {
  onConvert: (submissionId: number, payload: SupplierSubmissionConvertPayload) => Promise<PurchaseOrder>;
  onClose: () => void;
  onReview: (submissionId: number, payload: SupplierSubmissionReviewPayload) => Promise<SupplierSubmission>;
  products: Product[];
  saving: boolean;
  submission: SupplierSubmission | null;
  warehouses: PosWarehouseSummary[];
}) {
  const { copy, locale } = usePurchaseOrderTranslations();
  const localCopy = resolutionCopy[locale];
  const productOptions = useMemo(() => products.filter(product => product.salesProductBackendId), [products]);
  const [reviewStatus, setReviewStatus] = useState<SupplierSubmissionStatus>('IN_REVIEW');
  const [reviewNote, setReviewNote] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [expectedDate, setExpectedDate] = useState('');
  const [convertNote, setConvertNote] = useState('');
  const [resolutions, setResolutions] = useState<Record<number, ResolutionDraft>>({});

  useEffect(() => {
    if (!submission) return;
    const nextStatus = reviewStatuses.includes(submission.status)
      ? submission.status
      : submission.status === 'CONVERTED_TO_PURCHASE_ORDER' ? 'APPROVED' : 'IN_REVIEW';
    setReviewStatus(nextStatus);
    setReviewNote('');
    setConvertNote('');
    setResolutions(Object.fromEntries(submission.items.map(item => {
      const product = productOptions.find(option => option.salesProductBackendId === item.productId);
      return [item.id, {
        decision: item.productId ? 'LINK_EXISTING' : 'CREATE_NEW',
        productId: item.productId ? String(item.productId) : '',
        productCode: '',
        sku: item.providerSku ?? '',
        productName: item.productName,
        productDescription: item.productDescription ?? '',
        category: product?.department ?? '',
        taxCategory: '',
        salePrice: product ? String(product.salePrice) : '',
        reviewNote: item.reviewNote ?? '',
      } satisfies ResolutionDraft];
    })));
  }, [productOptions, submission?.id]);

  useEffect(() => {
    if (!warehouseId && warehouses[0]?.id) setWarehouseId(String(warehouses[0].id));
  }, [warehouseId, warehouses]);

  const updateResolution = (itemId: number, changes: Partial<ResolutionDraft>) => {
    setResolutions(current => ({ ...current, [itemId]: { ...current[itemId], ...changes } }));
  };

  const selectExistingProduct = (itemId: number, value: string) => {
    const product = productOptions.find(option => String(option.salesProductBackendId) === value);
    updateResolution(itemId, { productId: value, salePrice: product ? String(product.salePrice) : '' });
  };

  const resolutionErrors = useMemo(() => {
    if (!submission) return [];
    return submission.items.flatMap(item => {
      const draft = resolutions[item.id];
      if (!draft) return [`${item.productName}: ${localCopy.required}`];
      if (draft.decision === 'REJECT') return [];
      const salePrice = Number(draft.salePrice);
      const errors: string[] = [];
      if (!draft.salePrice || !Number.isFinite(salePrice) || salePrice < numberFrom(item.unitCost)) {
        errors.push(`${item.productName}: ${localCopy.blocked}`);
      }
      if (draft.decision === 'CREATE_NEW' && !draft.productName.trim()) {
        errors.push(`${item.productName}: ${localCopy.name}`);
      }
      if (draft.decision === 'LINK_EXISTING') {
        const product = productOptions.find(option => String(option.salesProductBackendId) === draft.productId);
        if (!draft.productId) errors.push(`${item.productName}: ${localCopy.product}`);
        if (product?.currency && product.currency.toUpperCase() !== submission.currencyCode.toUpperCase()) {
          errors.push(`${item.productName}: ${localCopy.currency}`);
        }
      }
      return errors;
    });
  }, [localCopy, productOptions, resolutions, submission]);

  if (!submission) return null;

  const approvedItems = submission.items.filter(item => resolutions[item.id]?.decision !== 'REJECT');
  const canConvert = Boolean(
    ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
      && !submission.convertedPurchaseOrderId && approvedItems.length
      && !resolutionErrors.length && warehouses.length && warehouseId,
  );

  const submitReview = async () => {
    const updated = await onReview(submission.id, { status: reviewStatus, reviewNote: reviewNote || null });
    setReviewStatus(updated.status === 'CONVERTED_TO_PURCHASE_ORDER' ? 'APPROVED' : updated.status);
    setReviewNote('');
  };

  const submitConvert = async () => {
    if (!canConvert) return;
    await onConvert(submission.id, {
      warehouseId: Number(warehouseId), expectedDate: expectedDate || null, notes: convertNote || null,
      itemResolutions: submission.items.map(item => {
        const draft = resolutions[item.id];
        return {
          itemId: item.id,
          decision: draft.decision,
          productId: draft.decision === 'LINK_EXISTING' ? Number(draft.productId) : null,
          productCode: draft.productCode || null,
          sku: draft.sku || null,
          productName: draft.productName || null,
          productDescription: draft.productDescription || null,
          category: draft.category || null,
          taxCategory: draft.taxCategory || null,
          salePrice: draft.decision === 'REJECT' ? null : Number(draft.salePrice),
          reviewNote: draft.reviewNote || null,
        };
      }),
    });
  };

  return <PosModalFrame
    modalType="operational-workspace" onClose={onClose} closeLabel={copy.submissionDetail.closeLabel}
    title={submission.submissionNumber}
    subtitle={`${submission.providerName} · ${formatMoney(submission.totalAmount, submission.currencyCode, locale)}`}
    eyebrow={copy.submissionDetail.eyebrow} icon={<FileText className="h-6 w-6" />} tone="coral" size="xl"
    bodyClassName="p-0" footerClassName={posModalModuleFooterClassName}
    footer={<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-white/85">{copy.submissionDetail.footerSummary(submission.items.length, formatMoney(submission.totalAmount, submission.currencyCode, locale))}</p><button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>{copy.submissionDetail.close}</button></div>}
  >
    <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[minmax(0,1fr)_340px]">
      <main className="space-y-4 p-4 sm:p-6">
        <section className="rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-lg font-medium text-slate-950 dark:text-white">{copy.submissionDetail.itemsTitle}</h4><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.submissionDetail.itemsSubtitle}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(submission.status)}`}>{copy.submissionStatus[submission.status]}</span></div>
          {resolutionErrors.length ? <div className="mt-4 flex gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{localCopy.required}</p><ul className="mt-1 list-disc pl-4 text-xs">{resolutionErrors.map(error => <li key={error}>{error}</li>)}</ul></div></div> : null}
          <div className="mt-4 space-y-4">
            {submission.items.map(item => {
              const draft = resolutions[item.id];
              if (!draft) return null;
              const supplierCost = numberFrom(item.unitCost);
              const salePrice = Number(draft.salePrice);
              const priceBlocked = draft.decision !== 'REJECT' && (!draft.salePrice || salePrice < supplierCost);
              return <article key={item.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="grid gap-4 md:grid-cols-[72px_minmax(0,1fr)_auto]">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white text-slate-400 dark:bg-slate-900">{item.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7" />}</div>
                  <div><h5 className="font-medium text-slate-950 dark:text-white">{item.productName}</h5><p className="mt-1 text-xs text-slate-500">{item.providerSku || copy.submissionDetail.noSupplierSku}</p>{item.productDescription ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.productDescription}</p> : null}</div>
                  <div className="text-right"><p className="text-xs text-slate-500">{item.quantity} {copy.common.units}</p><p className="mt-1 font-medium text-slate-700 dark:text-slate-200">{copy.submissionDetail.unitCost(formatMoney(item.unitCost, submission.currencyCode, locale))}</p><p className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{formatMoney(item.lineTotal, submission.currencyCode, locale)}</p></div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.decision}<select value={draft.decision} onChange={event => updateResolution(item.id, { decision: event.target.value as SupplierCatalogDecision })} className={fieldClassName}><option value="LINK_EXISTING">{localCopy.existing}</option><option value="CREATE_NEW">{localCopy.create}</option><option value="REJECT">{localCopy.reject}</option></select></label>
                  {draft.decision === 'LINK_EXISTING' ? <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.product}<select value={draft.productId} onChange={event => selectExistingProduct(item.id, event.target.value)} className={fieldClassName}><option value="">{localCopy.product}</option>{productOptions.map(product => <option key={product.salesProductBackendId} value={product.salesProductBackendId}>{product.name} · {product.sku || product.barcode || product.salesProductBackendId}</option>)}</select></label> : null}
                  {draft.decision === 'CREATE_NEW' ? <><label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.name}<input value={draft.productName} maxLength={220} onChange={event => updateResolution(item.id, { productName: event.target.value })} className={fieldClassName} /></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.sku}<input value={draft.sku} maxLength={80} onChange={event => updateResolution(item.id, { sku: event.target.value })} className={fieldClassName} /></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.code}<input value={draft.productCode} maxLength={40} onChange={event => updateResolution(item.id, { productCode: event.target.value })} className={fieldClassName} /></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.category}<input value={draft.category} maxLength={100} onChange={event => updateResolution(item.id, { category: event.target.value })} className={fieldClassName} /></label></> : null}
                  {draft.decision !== 'REJECT' ? <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.salePrice} ({submission.currencyCode})<input type="number" min={supplierCost} step="0.0001" value={draft.salePrice} onChange={event => updateResolution(item.id, { salePrice: event.target.value })} className={`${fieldClassName} ${priceBlocked ? 'border-red-400 focus:border-red-500' : ''}`} /></label> : null}
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{localCopy.note}<input value={draft.reviewNote} maxLength={4000} onChange={event => updateResolution(item.id, { reviewNote: event.target.value })} className={fieldClassName} /></label>
                </div>
                {priceBlocked ? <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" />{localCopy.blocked}</p> : null}
                {!priceBlocked && draft.decision !== 'REJECT' && salePrice === supplierCost ? <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{localCopy.zero}</p> : null}
              </article>;
            })}
          </div>
        </section>
      </main>
      <aside className="space-y-4 border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <Summary label={copy.submissionDetail.provider} value={submission.providerName} />
        <Summary label={copy.submissionDetail.submittedBy} value={submission.submittedByName || copy.submissionDetail.supplierFallback} />
        <Summary label={copy.common.date} value={formatDate(submission.submittedAt?.slice(0, 10) ?? submission.createdAt?.slice(0, 10), locale, copy.common.noDate)} />
        <Summary label={copy.common.total} value={formatMoney(submission.totalAmount, submission.currencyCode, locale)} highlight />
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><h4 className="font-medium text-slate-950 dark:text-white">{copy.submissionDetail.internalReview}</h4><select value={reviewStatus} onChange={event => setReviewStatus(event.target.value as SupplierSubmissionStatus)} className={fieldClassName}>{reviewStatuses.map(status => <option key={status} value={status}>{copy.submissionStatus[status]}</option>)}</select><textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder={copy.submissionDetail.reviewNote} className={`${fieldClassName} min-h-20 py-2`} /><button type="button" disabled={saving} onClick={() => void submitReview()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"><CheckCircle2 className="h-4 w-4" />{copy.submissionDetail.saveReview}</button></section>
        <section className="rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4"><h4 className="font-medium text-slate-950 dark:text-white">{copy.submissionDetail.convertTitle}</h4><select value={warehouseId} onChange={event => setWarehouseId(event.target.value)} className={fieldClassName}>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select><input type="date" value={expectedDate} onChange={event => setExpectedDate(event.target.value)} className={fieldClassName} /><textarea value={convertNote} onChange={event => setConvertNote(event.target.value)} placeholder={copy.submissionDetail.convertNote} className={`${fieldClassName} min-h-20 py-2`} /><button type="button" disabled={saving || !canConvert || numberFrom(submission.totalAmount) <= 0} onClick={() => void submitConvert()} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-60"><ArrowRight className="h-4 w-4" />{copy.submissionDetail.convert}</button></section>
      </aside>
    </div>
  </PosModalFrame>;
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return <div className={`rounded-2xl border p-4 ${highlight ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{value}</p></div>;
}
