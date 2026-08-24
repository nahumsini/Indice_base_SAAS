import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { ClipboardPaste, PencilLine, Plus, Rows3, Trash2, Upload } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import type { SalesCatalogItem, SalesProductStatus, SalesProductType } from '../../types';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';

export type ProductBulkDraft = {
  name: string;
  sku: string;
  category: string;
  type: SalesProductType;
  status: SalesProductStatus;
  price: number;
  cost: number;
};
export type ProductBulkEditDraft = ProductBulkDraft & { id: string };
type BulkMode = 'create' | 'edit';
type EditableField = 'name' | 'sku' | 'category' | 'type' | 'status' | 'price' | 'cost';
type EditableRow = {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  category: string;
  type: string;
  status: string;
  price: string;
  cost: string;
  originalName: string;
  originalSku: string;
  originalCategory: string;
  originalType: string;
  originalStatus: string;
  originalPrice: string;
  originalCost: string;
};

const actionClassNames = getSalesModalActionClassNames('coral');
const initialRowCount = 18;
const supermarketProductExamples = [
  'Leche entera 1 L',
  'Arroz blanco 1 kg',
  'Aceite vegetal 900 ml',
  'Huevos blancos 12 piezas',
  'Pan de caja integral',
  'Atún en agua 140 g',
  'Café soluble 200 g',
  'Azúcar estándar 1 kg',
  'Papel higiénico 4 rollos',
  'Detergente líquido 1 L',
];

function emptyRow(index: number): EditableRow {
  return {
    id: `bulk-product-${Date.now()}-${index}`,
    name: '', sku: '', category: '', type: '', status: '', price: '', cost: '',
    originalName: '', originalSku: '', originalCategory: '', originalType: '', originalStatus: '', originalPrice: '', originalCost: '',
  };
}

function emptyRows(count = initialRowCount) {
  return Array.from({ length: count }, (_, index) => emptyRow(index));
}

function productRows(products: SalesCatalogItem[]): EditableRow[] {
  return products.map((product) => ({
    id: `bulk-edit-${product.id}`,
    productId: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    type: product.type,
    status: product.status,
    price: String(product.price),
    cost: String(product.cost),
    originalName: product.name,
    originalSku: product.sku,
    originalCategory: product.category,
    originalType: product.type,
    originalStatus: product.status,
    originalPrice: String(product.price),
    originalCost: String(product.cost),
  }));
}

function parseMoney(value: string, preferredCurrency: string, allowBlank = false) {
  let normalized = value.trim();
  if (!normalized && allowBlank) return 0;
  const currencyPrefix = preferredCurrency.trim().toUpperCase();
  if (currencyPrefix && normalized.toUpperCase().startsWith(currencyPrefix)) normalized = normalized.slice(currencyPrefix.length).trim();
  normalized = normalized.replace(/^\$\s*/, '').replace(/\s/g, '');
  if (!normalized || /[^\d,.-]/.test(normalized) || normalized.includes('-')) return Number.NaN;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(normalized)) return Number(normalized.replace(/,/g, ''));
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(normalized)) return Number(normalized.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(\.\d{1,2})?$/.test(normalized)) return Number(normalized);
  if (/^\d+(,\d{1,2})$/.test(normalized)) return Number(normalized.replace(',', '.'));
  return Number.NaN;
}

function clipboardRows(text: string) {
  const rows = text.replace(/\r/g, '').split('\n').filter((row) => row.trim()).map((row) => row.split('\t'));
  const first = rows[0]?.map((cell) => cell.trim().toLowerCase()) ?? [];
  const hasHeader = first.some((cell) => cell.includes('nombre')) && first.some((cell) => cell.includes('precio'));
  return hasHeader ? rows.slice(1) : rows;
}

function isChanged(row: EditableRow) {
  return row.name !== row.originalName
    || row.sku !== row.originalSku
    || row.category !== row.originalCategory
    || row.type !== row.originalType
    || row.status !== row.originalStatus
    || row.price !== row.originalPrice
    || row.cost !== row.originalCost;
}

const typeAliases: Record<string, SalesProductType> = {
  product: 'Product', producto: 'Product', service: 'Service', servicio: 'Service', package: 'Package', paquete: 'Package',
  subscription: 'Subscription', suscripcion: 'Subscription', suscripción: 'Subscription',
  'operational item': 'Operational item', 'articulo operativo': 'Operational item', 'artículo operativo': 'Operational item',
};
const statusAliases: Record<string, SalesProductStatus> = {
  active: 'Active', activo: 'Active', activa: 'Active', inactive: 'Inactive', inactivo: 'Inactive', inactiva: 'Inactive',
  draft: 'Draft', borrador: 'Draft',
};

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function ProductBulkIntegrationModal({
  open,
  isSaving,
  preferredCurrency,
  products,
  categories,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  isSaving: boolean;
  preferredCurrency: string;
  products: SalesCatalogItem[];
  categories: ProductCategoryConfig[];
  onOpenChange: (open: boolean) => void;
  onCreate: (rows: ProductBulkDraft[]) => Promise<{ created: number; failedRows: ProductBulkDraft[]; errors: string[] }>;
  onUpdate: (rows: ProductBulkEditDraft[]) => Promise<{ updated: number; failedRows: ProductBulkEditDraft[]; errors: string[] }>;
}) {
  const [mode, setMode] = useState<BulkMode>('create');
  const [rows, setRows] = useState<EditableRow[]>(() => emptyRows());
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setMode('create');
      setRows(emptyRows());
      setMessage('');
    }
  }, [open]);

  const changeMode = (nextMode: BulkMode) => {
    setMode(nextMode);
    setRows(nextMode === 'create' ? emptyRows() : productRows(products));
    setMessage('');
  };

  const evaluatedRows = useMemo(() => {
    const usedSkuCounts = new Map<string, number>();
    const existingSkus = new Set(products.map((product) => normalizedKey(product.sku)).filter(Boolean));
    rows.forEach((row) => {
      const key = normalizedKey(row.sku);
      if (key) usedSkuCounts.set(key, (usedSkuCounts.get(key) ?? 0) + 1);
    });
    const categoryLookup = new Map(categories.flatMap((category) => [
      [normalizedKey(category.value), category.value],
      [normalizedKey(category.name), category.value],
    ]));

    return rows.map((row) => {
    const used = mode === 'edit' || Boolean(Object.values(row).some((value) => typeof value === 'string' && value.trim() && value !== row.id));
    const price = parseMoney(row.price, preferredCurrency);
    const cost = parseMoney(row.cost, preferredCurrency, mode === 'create');
    const resolvedCategory = row.category.trim() ? categoryLookup.get(normalizedKey(row.category)) : undefined;
    const resolvedType = row.type.trim() ? typeAliases[normalizedKey(row.type)] : mode === 'create' ? 'Product' : undefined;
    const resolvedStatus = row.status.trim() ? statusAliases[normalizedKey(row.status)] : mode === 'create' ? 'Active' : undefined;
    const nameError = used && !row.name.trim() ? 'El nombre es obligatorio.' : '';
    const skuWasChanged = normalizedKey(row.sku) !== normalizedKey(row.originalSku);
    const skuDuplicate = Boolean(row.sku.trim()) && ((mode === 'create' || skuWasChanged)
      && ((usedSkuCounts.get(normalizedKey(row.sku)) ?? 0) > 1
        || (mode === 'create' && existingSkus.has(normalizedKey(row.sku)))));
    const skuError = used && mode === 'edit' && !row.sku.trim()
      ? 'El SKU es obligatorio para editar.'
      : used && skuDuplicate
        ? 'El SKU ya está utilizado o está duplicado en la tabla.'
        : '';
    const categoryError = used && row.category.trim() && !resolvedCategory ? 'Selecciona una categoría existente.' : '';
    const typeError = used && row.type.trim() && !resolvedType ? 'Usa Producto, Servicio, Paquete, Suscripción o Artículo operativo.' : '';
    const statusError = used && row.status.trim() && !resolvedStatus ? 'Usa Activo, Inactivo o Borrador.' : '';
    const priceError = used && (!Number.isFinite(price) || price <= 0) ? 'Ingresa un precio numérico mayor a cero.' : '';
    const costError = used && (!Number.isFinite(cost) || cost < 0) ? 'Ingresa un costo numérico igual o mayor a cero.' : '';
    const valid = used && !nameError && !skuError && !categoryError && !typeError && !statusError && !priceError && !costError;
    return { row, used, price, cost, resolvedCategory, resolvedType, resolvedStatus, nameError, skuError, categoryError, typeError, statusError, priceError, costError, valid };
    });
  }, [categories, mode, preferredCurrency, products, rows]);
  const usedRows = evaluatedRows.filter(({ used }) => used);
  const invalidRows = usedRows.filter(({ valid }) => !valid);
  const readyRows = usedRows.filter(({ valid, row }) => valid && (mode === 'create' || isChanged(row)));

  const updateCell = (rowIndex: number, field: EditableField, value: string) => {
    setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row));
    setMessage('');
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, startRow: number, startColumn: number) => {
    const pasted = clipboardRows(event.clipboardData.getData('text'));
    if (pasted.length === 0) return;
    event.preventDefault();
    setRows((current) => {
      const requiredLength = startRow + pasted.length;
      const next = mode === 'create' ? [...current, ...emptyRows(Math.max(requiredLength - current.length, 0))] : [...current];
      pasted.slice(0, Math.max(next.length - startRow, 0)).forEach((cells, rowOffset) => {
        const targetIndex = startRow + rowOffset;
        const target = { ...next[targetIndex] };
        const fields: EditableField[] = ['name', 'price', 'cost', 'sku', 'category', 'type', 'status'];
        cells.forEach((cell, columnOffset) => {
          const field = fields[startColumn + columnOffset];
          if (field) target[field] = cell.trim();
        });
        next[targetIndex] = target;
      });
      return next;
    });
    setMessage(`${pasted.length} filas pegadas. Revisa las celdas marcadas antes de guardar.`);
  };

  const submit = async () => {
    if (invalidRows.length > 0) {
      setMessage(`No se guardó ningún cambio. Corrige ${invalidRows.length} ${invalidRows.length === 1 ? 'fila marcada' : 'filas marcadas'} antes de continuar.`);
      return;
    }
    if (readyRows.length === 0) {
      setMessage(mode === 'create' ? 'Agrega al menos un producto válido.' : 'Modifica al menos un producto antes de guardar.');
      return;
    }
    if (mode === 'create') {
      const result = await onCreate(readyRows.map(({ row, price, cost, resolvedCategory, resolvedType, resolvedStatus }) => ({
        name: row.name.trim(),
        sku: row.sku.trim(),
        category: resolvedCategory ?? '',
        type: resolvedType ?? 'Product',
        status: resolvedStatus ?? 'Active',
        price,
        cost,
      })));
      if (result.failedRows.length === 0) {
        onOpenChange(false);
        return;
      }
      setRows([
        ...result.failedRows.map((row, index) => ({
          ...emptyRow(index), id: `bulk-retry-${Date.now()}-${index}`,
          name: row.name, sku: row.sku, category: row.category, type: row.type, status: row.status,
          price: String(row.price), cost: String(row.cost),
        })),
        ...emptyRows(Math.max(initialRowCount - result.failedRows.length, 3)),
      ]);
      const reason = result.errors[0] ? ` Motivo: ${result.errors[0]}` : '';
      setMessage(`Se crearon ${result.created} productos. Quedaron ${result.failedRows.length} filas sin guardar para reintentar sin duplicar las exitosas.${reason}`);
      return;
    }

    const result = await onUpdate(readyRows.map(({ row, price, cost, resolvedCategory, resolvedType, resolvedStatus }) => ({
      id: row.productId!, name: row.name.trim(), sku: row.sku.trim(), category: resolvedCategory!,
      type: resolvedType!, status: resolvedStatus!, price, cost,
    })));
    const failedIds = new Set(result.failedRows.map((row) => row.id));
    setRows((current) => current.map((row) => (
      row.productId && isChanged(row) && !failedIds.has(row.productId)
        ? {
          ...row,
          originalName: row.name,
          originalSku: row.sku,
          originalCategory: row.category,
          originalType: row.type,
          originalStatus: row.status,
          originalPrice: row.price,
          originalCost: row.cost,
        }
        : row
    )));
    const reason = result.errors[0] ? ` Motivo: ${result.errors[0]}` : '';
    setMessage(result.failedRows.length > 0
      ? `Se actualizaron ${result.updated} productos. Revisa y reintenta los ${result.failedRows.length} que no pudieron guardarse.${reason}`
      : `${result.updated} productos actualizados correctamente.`);
  };

  return (
    <SalesModalFrame
      open={open}
      busy={isSaving}
      onOpenChange={onOpenChange}
      title="Integración masiva de productos"
      description="Agrega productos nuevos o edita todo tu catálogo en una tabla compatible con Excel."
      icon={<Rows3 className="h-6 w-6" />}
      modalType="large-workspace"
      contentClassName="h-[min(92dvh,860px)] max-w-[1120px]"
      bodyClassName="min-h-0 overflow-hidden bg-slate-50 p-0"
      footerLeading={<span className="text-xs font-medium text-white/90">{mode === 'create' ? `${readyRows.length} productos listos` : `${readyRows.length} cambios listos`}</span>}
      footer={(
        <>
          <Button variant="outline" className={actionClassNames.secondary} disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className={actionClassNames.primary} disabled={isSaving || readyRows.length === 0 || invalidRows.length > 0} onClick={() => void submit()}>
            {mode === 'create' ? <Upload className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            {isSaving ? (mode === 'create' ? 'Creando productos…' : 'Guardando cambios…') : (mode === 'create' ? `Crear ${readyRows.length} productos` : `Guardar ${readyRows.length} cambios`)}
          </Button>
        </>
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
          <Button type="button" variant={mode === 'create' ? 'default' : 'ghost'} className={mode === 'create' ? 'bg-[#FF655B] hover:bg-[#E9574F]' : ''} onClick={() => changeMode('create')}><Plus className="h-4 w-4" />Agregar productos</Button>
          <Button type="button" variant={mode === 'edit' ? 'default' : 'ghost'} className={mode === 'edit' ? 'bg-[#FF655B] hover:bg-[#E9574F]' : ''} onClick={() => changeMode('edit')}><PencilLine className="h-4 w-4" />Editar productos existentes</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-950">
          <span className="flex items-center gap-2 font-medium"><ClipboardPaste className="h-4 w-4" />Pega desde Excel: nombre | precio final | costo | SKU | categoría | tipo | estado</span>
          <span>{mode === 'create' ? 'Las filas vacías no se importan.' : `${products.length} productos cargados para edición.`}</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950">
          La moneda que se tomará es la divisa preferida actual: <strong>{preferredCurrency}</strong>. No se guardará nada mientras exista una celda con errores.
        </div>
        <datalist id="bulk-product-categories">{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.name} />)}</datalist>
        <datalist id="bulk-product-types"><option value="Producto" /><option value="Servicio" /><option value="Paquete" /><option value="Suscripción" /><option value="Artículo operativo" /></datalist>
        <datalist id="bulk-product-statuses"><option value="Activo" /><option value="Inactivo" /><option value="Borrador" /></datalist>
        <IndiceModalValidation messages={message ? [message] : []} />
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className="w-full min-w-[1540px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr>
                <th className="w-12 border-b border-r border-slate-300 px-2 py-3 text-center text-xs font-medium text-slate-500">#</th>
                <th className="w-[360px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Nombre del producto</th>
                <th className="w-[210px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Precio final ({preferredCurrency})</th>
                <th className="w-[190px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Costo ({preferredCurrency})</th>
                <th className="w-[190px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">SKU</th>
                <th className="w-[210px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Categoría</th>
                <th className="w-[190px] border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Tipo</th>
                <th className="w-[160px] border-b border-slate-300 px-3 py-3 text-left font-medium text-slate-800">Estado</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRows.map(({ row, nameError, skuError, categoryError, typeError, statusError, priceError, costError, valid, used }, index) => {
                const invalid = used && !valid;
                const changed = mode === 'edit' && isChanged(row);
                return (
                  <tr key={row.id} className={invalid ? 'bg-red-50' : changed ? 'bg-amber-50' : 'bg-blue-50/35'}>
                    <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-xs text-slate-400">{index + 1}</td>
                    <td className="border-b border-r border-slate-200 p-0"><input aria-invalid={Boolean(nameError)} title={nameError} value={row.name} onPaste={(event) => handlePaste(event, index, 0)} onChange={(event) => updateCell(index, 'name', event.target.value)} placeholder={`Ej. ${supermarketProductExamples[index % supermarketProductExamples.length]}`} className="h-11 w-full bg-transparent px-3 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" /></td>
                    {(['price', 'cost'] as const).map((field, columnIndex) => {
                      const error = field === 'price' ? priceError : costError;
                      return (
                        <td key={field} className="border-b border-r border-slate-200 p-0">
                          <div className="flex items-center"><span className="pl-3 text-xs font-medium text-slate-500">{preferredCurrency}</span><input aria-invalid={Boolean(error)} aria-label={field === 'price' ? 'Precio final de venta' : 'Costo'} title={error} value={row[field]} inputMode="decimal" onPaste={(event) => handlePaste(event, index, columnIndex + 1)} onChange={(event) => updateCell(index, field, event.target.value)} placeholder="0.00" className="h-11 w-full bg-transparent px-2 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" /></div>
                        </td>
                      );
                    })}
                    {([
                      { field: 'sku' as const, error: skuError, placeholder: mode === 'create' ? 'Automático si se deja vacío' : 'SKU', list: undefined },
                      { field: 'category' as const, error: categoryError, placeholder: 'Categoría existente', list: 'bulk-product-categories' },
                      { field: 'type' as const, error: typeError, placeholder: 'Producto', list: 'bulk-product-types' },
                    ]).map(({ field, error, placeholder, list }, columnIndex) => (
                      <td key={field} className="border-b border-r border-slate-200 p-0">
                        <input list={list} aria-invalid={Boolean(error)} title={error} value={row[field]} onPaste={(event) => handlePaste(event, index, columnIndex + 3)} onChange={(event) => updateCell(index, field, event.target.value)} placeholder={placeholder} className="h-11 w-full bg-transparent px-3 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" />
                      </td>
                    ))}
                    <td className="border-b border-slate-200 p-0"><input list="bulk-product-statuses" aria-invalid={Boolean(statusError)} title={statusError} value={row.status} onPaste={(event) => handlePaste(event, index, 6)} onChange={(event) => updateCell(index, 'status', event.target.value)} placeholder="Activo" className="h-11 w-full bg-transparent px-3 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {mode === 'create' ? (
          <div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => setRows((current) => [...current, ...emptyRows(10)])}><Plus className="h-4 w-4" />Agregar 10 filas</Button><Button type="button" variant="ghost" disabled={isSaving} onClick={() => { setRows(emptyRows()); setMessage(''); }}><Trash2 className="h-4 w-4" />Limpiar tabla</Button></div>
        ) : <p className="text-xs text-slate-500">Las filas amarillas tienen cambios pendientes; las rojas contienen errores que debes corregir.</p>}
      </div>
    </SalesModalFrame>
  );
}
