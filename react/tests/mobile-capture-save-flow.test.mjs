import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve, dirname } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const root = resolve(import.meta.dirname, '../src/app/BasicModules/Sales');
const pure = createTypeScriptLoader({ '../../salesCrmContext': { salesOwners: [] } });
const stub = new Proxy({}, { get: (_, key) => key });
const noop = () => {};
function elements(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  return [...(node.type === type ? [node] : []), ...Object.values(node.props ?? {}).flatMap(value => elements(value, type))];
}

function productHarness() {
  const runtime = hookRuntime(), calls = [], products = [];
  const state = { failCreate: false, failUpdate: false, failImages: false, failRefresh: false, wait: null };
  const data = { name: 'Fixture', sku: 'TEST-1', category: 'Fixture', description: '', type: 'Service', status: 'Active', uploadedImages: [{ id: 'file', source: 'upload', objectKey: 'fixture-key' }] };
  const copy = pure(resolve(root, 'Productos/translations/es-MX.ts')).esMX;
  const { useProductsCatalog } = loadTypescript(resolve(root, 'Productos/hooks/useProductsCatalog.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/salesCrmContext')) return { productTypes: [], productStatuses: [], useSalesCrm: () => ({ products,
      createProductRecord: async input => { calls.push('create'); if (state.wait) await state.wait; if (state.failCreate) throw new Error('offline'); const result = { ...input, id: '77', backendId: 77 }; products.push(result); return result; },
      updateProductRecord: async (id, input) => { calls.push(`update:${id}`); if (state.failUpdate) throw new Error('update offline'); return { ...input, id, backendId: Number(id) }; },
      reloadProducts: async () => { calls.push('refresh'); if (state.failRefresh) throw new Error('list offline'); } }) };
    if (id.endsWith('/productCategories')) return { buildCatalogProductCategories: () => [], buildProductCategoryOptions: () => [], normalizeProductCategoryDirectory: () => [] };
    if (id.endsWith('/productForm')) return { initialProductForm: data, buildProductInput: input => input, buildProductForm: input => input };
    if (id.endsWith('/productImages')) return { getProductGalleryImages: () => [], persistProductImageDrafts: async images => images, registerPersistedProductImages: async id => { calls.push(`images:${id}`); if (state.failImages) throw new Error('image offline'); } };
    if (id.endsWith('/productOperationalStatus')) return { getProductAvailability: () => [] };
    if (id.endsWith('/productSalesReadiness')) return { getProductSalesReadiness: () => ({ status: 'READY' }), getProductAvailability: () => [] };
    if (id.endsWith('/productFormatters')) return { sortProducts: rows => rows };
    if (id.endsWith('/ProductsColumnsModal')) return { defaultProductTableVisibleColumns: [] };
    return stub;
  });
  const render = () => runtime.render(() => useProductsCatalog(copy));
  render().handleOpenCreateProduct();
  return { render, runtime, state, calls, data, copy };
}

test('product save blocks duplicate taps and dismissal until the owner write completes', async () => {
  const h = productHarness(); let finish;
  h.state.wait = new Promise(resolve => { finish = resolve; });
  const pending = h.render().handleSaveProduct();
  await h.runtime.flush();
  await h.render().handleSaveProduct();
  h.render().handleProductModalOpenChange(false);
  assert.equal(h.render().isCreateOpen, true);
  assert.equal(h.render().isSavingProduct, true);
  assert.deepEqual(h.calls, ['create']);
  h.render().setForm(current => ({...current, name: 'Changed while saving'}));
  assert.equal(h.render().form.name, 'Fixture');
  finish(); await pending;
  assert.equal(h.render().isCreateOpen, false);
  assert.equal(h.calls.filter(call => call === 'create').length, 1);
});

test('a product image retry updates the confirmed record and a failed refresh never reopens creation', async () => {
  const h = productHarness(); h.state.failImages = true;
  await h.render().handleSaveProduct();
  assert.equal(h.render().isCreateOpen, true);
  assert.equal(h.render().form.name, 'Fixture');
  assert.equal(h.render().productSaveError, h.copy.form.savedPendingImages);
  h.state.failImages = false; h.state.failRefresh = true;
  await h.render().handleSaveProduct();
  assert.deepEqual(h.calls, ['create', 'images:77', 'update:77', 'images:77', 'refresh']);
  assert.equal(h.render().isCreateOpen, false);
  // A deliberate new form starts a new record, rather than updating the previous one.
  h.render().handleOpenCreateProduct();
  h.state.failRefresh = false;
  await h.render().handleSaveProduct();
  assert.equal(h.calls.filter(call => call === 'create').length, 2);
});

test('an actual product write failure retains the form and allows a new write attempt', async () => {
  const h = productHarness(); h.state.failCreate = true;
  await h.render().handleSaveProduct();
  assert.equal(h.render().isCreateOpen, true);
  assert.equal(h.render().productSaveError, h.copy.form.saveFailed);
  assert.equal(h.calls.some(call => call.startsWith('images:')), false);
  h.state.failCreate = false;
  await h.render().handleSaveProduct();
  assert.equal(h.calls.filter(call => call === 'create').length, 2);
  assert.equal(h.render().isCreateOpen, false);
});

test('a failed product edit after a partial save keeps the identity but reports the current write failure', async () => {
  const h = productHarness(); h.state.failImages = true;
  await h.render().handleSaveProduct();
  h.render().setForm(current => ({...current, name: 'Corrected fixture'}));
  h.state.failUpdate = true;
  await h.render().handleSaveProduct();
  assert.equal(h.render().productSaveError, h.copy.form.saveFailed);
  assert.equal(h.render().form.name, 'Corrected fixture');
  assert.equal(h.calls.filter(call => call === 'create').length, 1);
  h.state.failUpdate = false; h.state.failImages = false;
  await h.render().handleSaveProduct();
  assert.equal(h.render().isCreateOpen, false);
  assert.equal(h.calls.filter(call => call === 'create').length, 1);
});

function contactHarness(editing) {
  const fixture = { ...pure(resolve(root, 'Contactos/constants/contactConstants.ts')).initialContactForm, id: '3', contactPerson: 'Fixture', company: 'Fixture', owner: '', phone: '', email: '', source: 'Manual', tags: [] };
  const runtime = hookRuntime(), calls = [], contacts = editing ? [fixture] : [];
  const state = { fail: true, wait: null };
  const file = resolve(root, 'Contactos/Contactos.tsx');
  const copy = pure(resolve(root, 'Contactos/translations/es-MX.ts')).esMX;
  const { default: Contactos } = loadTypescript(file, id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id.endsWith('/useContactosTranslations')) return { useContactosTranslations: () => copy, useContactosLearningTranslations: () => ({}) };
    if (id.endsWith('/salesCrmContext')) return { salesOwners: [], useSalesCrm: () => ({ contacts, opportunities: [], quotes: [],
      createContactRecord: async value => { calls.push(['create', value]); if (state.wait) await state.wait; if (state.fail) throw new Error('No hay conexión. Intenta de nuevo.'); return { ...value, id: '3' }; },
      updateContactRecord: async (id, value) => { calls.push(['update', id, value]); if (state.wait) await state.wait; if (state.fail) throw new Error('No hay conexión. Intenta de nuevo.'); return { ...value, id }; }, updateContact: noop }) };
    if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => null } };
    if (id.endsWith('/humanResources')) return { humanResourcesApi: { listHrUsers: async () => ({ items: [] }) } };
    if (id.endsWith('/salesApi')) return { salesApi: { context: async () => ({ users: [] }) } };
    if (id.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: noop };
    if (id.endsWith('/usePersistentColumnWidths')) return { usePersistentColumnWidths: ({ defaults }) => ({ columnWidths: defaults, resizeColumn: noop }) };
    if (id.endsWith('/useTablePagination')) return { useTablePagination: ({rows}) => ({ paginatedRows: rows, currentPage: 1, pageSize: 10, totalPages: 1, totalCount: rows.length }) };
    if (id.endsWith('/ui/utils')) return { cn: (...args) => args.join(' ') };
    if (/\/utils\//.test(id) || id.endsWith('/contactConstants') || id.endsWith('/formFeedbackCopy')) return pure(resolve(dirname(file), id));
    return stub;
  });
  const render = () => runtime.render(() => Contactos({}));
  const modal = () => elements(render(), 'ContactFormModal')[0];
  return { runtime, state, calls, contacts, render, modal };
}

for (const editing of [false, true]) {
  test(`contact ${editing ? 'edit' : 'create'} waits for confirmation, retains error and draft, then closes after retry`, async () => {
    const h = contactHarness(editing);
    h.render(); await h.runtime.flush();
    // Use the actual title-bar or row action to enter capture.
    const add = elements(h.render(), 'Button').find(node => node.props.children?.some?.(child => child === 'Agregar contacto'));
    assert.ok(add, 'create action must be reachable');
    if (editing) {
      const edit = elements(h.render(), 'ContactActionButton').find(node => node.props.label?.startsWith('Editar'));
      assert.ok(edit, 'edit action must be reachable'); edit.props.onClick();
    } else add.props.onClick();
    h.modal().props.setForm(current => ({ ...current, company: 'Fixture', contactPerson: 'Fixture', email: 'fixture@example.invalid' }));
    if (editing) h.state.fail = true;
    let reject;
    h.state.wait = new Promise((_, fail) => { reject = fail; });
    const pending = h.modal().props.onSave();
    await h.modal().props.onSave();
    h.modal().props.onOpenChange(false);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0][0], editing ? 'update' : 'create');
    assert.equal(h.modal().props.open, true);
    assert.equal(h.modal().props.isSaving, true);
    reject(new Error('No hay conexión. Intenta de nuevo.')); await pending; await h.runtime.flush();
    assert.equal(h.modal().props.form.company, 'Fixture');
    assert.equal(h.modal().props.formError, 'No hay conexión. Intenta de nuevo.');
    await h.runtime.flush();
    assert.equal(h.modal().props.formError, 'No hay conexión. Intenta de nuevo.', 'error must not disappear on the next effect');
    h.state.wait = null; h.state.fail = false;
    await h.modal().props.onSave();
    assert.equal(h.calls.length, 2);
    assert.equal(h.modal().props.open, false);
  });
}
