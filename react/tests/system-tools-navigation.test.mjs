import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const read = path => readFileSync(resolve('src/app', path), 'utf8');
const element = (type, props) => ({ type, props });
const jsx = { jsx: element, jsxs: element, Fragment: 'Fragment' };
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const tokens = new Proxy({}, { get: (_, name) => name });

function sectionRoute(parameter, sections, fallback, initial) {
  let params = new URLSearchParams(initial), history = [params.toString()], position = 0;
  const { useQuerySection } = loadTypescript(resolve('src/app/hooks/useQuerySection.ts'), id => {
    assert.equal(id, 'react-router');
    return { useSearchParams: () => [params, change => {
      params = change(params); history.splice(position + 1); history.push(params.toString()); position++;
    }] };
  });
  return { render: () => useQuerySection(parameter, sections, fallback), history,
    back() { params = new URLSearchParams(history[--position]); }, forward() { params = new URLSearchParams(history[++position]); } };
}

test('AI and Training sections support direct links, Back/Forward and preserve unrelated query parameters', () => {
  for (const [parameter, sections, fallback] of [['ai-section', ['connections', 'guide', 'ideas'], 'guide'], ['view', ['home', 'induction', 'program', 'sales'], 'home']]) {
    const route = sectionRoute(parameter, sections, fallback, `${parameter}=${sections[0]}&source=dashboard`);
    assert.equal(route.render().section, sections[0]);
    for (const section of sections.slice(1)) route.render().setSection(section);
    assert.equal(route.render().section, sections.at(-1));
    assert.equal(new URLSearchParams(route.history.at(-1)).get('source'), 'dashboard');
    route.back(); assert.equal(route.render().section, sections.at(-2));
    route.forward(); assert.equal(route.render().section, sections.at(-1));
    const count = route.history.length; route.render().setSection('unknown'); route.render().setSection(sections.at(-1));
    assert.equal(route.history.length, count);
    assert.equal(sectionRoute(parameter, sections, fallback, `${parameter}=unknown&portal=root`).render().section, fallback);
  }
});

function workbar(props) {
  const runtime = hookRuntime();
  const { IndiceWorkspaceNavigation } = loadTypescript(resolve('src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx'), id => {
    if (id === 'react') return { ...runtime.hooks, Fragment: 'Fragment' };
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/moduleColors')) return { MODULE_COLORS: { blue: { primary: '#2563EB', iconHover: 'hover:bg-blue-50' } }, getModulePrimaryForeground: () => '#fff' };
    if (id.endsWith('/useMobileModuleNavigation')) return { useMobileModuleNavigation: () => {} };
    return tokens;
  });
  runtime.render(() => IndiceWorkspaceNavigation(props));
  return { tree: runtime.result, runtime };
}

test('system workbar uses one scroll rail, module artwork, a selected pill and mobile touch targets', () => {
  const selected = [];
  const { tree, runtime } = workbar({ ariaLabel: 'Tools', variant: 'workbar', moduleId: 'training', value: 'home', onValueChange: value => selected.push(value), items: [{ id: 'home', label: 'Home' }, { id: 'program', label: 'Program' }] });
  const all = nodes(tree), nav = all.find(node => node.type === 'nav'), buttons = all.filter(node => node.type === 'button');
  assert.match(nav.props.className, /flex-nowrap/); assert.match(nav.props.className, /overflow-x-auto/);
  assert.ok(all.find(node => node.type === 'IndiceHorizontalScrollControls'));
  assert.equal(buttons[0].props['aria-current'], 'page'); assert.equal(buttons[1].props['aria-current'], undefined);
  for (const button of buttons) { assert.match(button.props.className, /min-h-11/); assert.match(button.props.className, /rounded-full/); }
  const art = all.filter(node => node.type === 'ModuleTabEmoji');
  assert.deepEqual(art.map(node => [node.props.moduleId, node.props.tabId]), [['training', 'home'], ['training', 'program']]);
  buttons[1].props.onClick(); assert.deepEqual(selected, ['program']); runtime.unmount();
});

test('workbar keyboard navigation skips disabled sections and supports wrap, Home and End', () => {
  const selected = [];
  const { tree, runtime } = workbar({ ariaLabel: 'Tools', variant: 'workbar', value: 'a', onValueChange: value => selected.push(value), items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', disabled: true }, { id: 'c', label: 'C' }] });
  const all = nodes(tree), nav = all.find(node => node.type === 'nav');
  const buttons = all.filter(node => node.type === 'button' && !node.props.disabled).map(node => ({ focus() { document.activeElement = this; }, click: node.props.onClick }));
  global.document = { activeElement: buttons[0] };
  const press = key => nav.props.onKeyDown({ key, preventDefault() {}, currentTarget: { querySelectorAll: () => buttons } });
  press('ArrowRight'); press('ArrowRight'); press('End'); press('Home');
  assert.deepEqual(selected, ['c', 'a', 'c', 'a']); runtime.unmount();
});

test('platform desktop sidebar and existing internal selectors remain separate presentation modes', () => {
  const props = { ariaLabel: 'Tools', value: 'a', onValueChange() {}, items: [{ id: 'a', label: 'A' }] };
  const side = workbar({ ...props, variant: 'workbar', orientation: 'desktop-vertical' });
  assert.match(nodes(side.tree).find(node => node.type === 'nav').props.className, /lg:flex-col/);
  assert.equal(nodes(side.tree).find(node => node.type === 'IndiceHorizontalScrollControls').props.className, 'lg:hidden');
  side.runtime.unmount();
  for (const variant of ['sections', 'views', 'workflow']) {
    const internal = workbar({ ...props, variant });
    assert.equal(internal.tree.type, 'nav'); assert.equal(internal.tree.props['data-indice-workspace-navigation'], variant);
    assert.equal(nodes(internal.tree).some(node => node.type === 'IndiceHorizontalScrollControls'), false); internal.runtime.unmount();
  }
});

test('all five system tools retain their owning permissions and complete tab artwork', () => {
  const { moduleTabArtwork } = loadTypescript(resolve('src/app/components/icons/moduleTabArtwork.ts'), id => { throw Error(id); });
  for (const [module, tabs] of Object.entries({ 'home-panel': ['connections', 'guide', 'ideas'], 'kiosk-center': ['multi-kiosks', 'inventory', 'people', 'activity'], billing: ['plan', 'people', 'payment', 'history'], training: ['home', 'induction', 'program', 'sales'], 'platform-admin': ['websiteVisits', 'leads', 'commercialOperations', 'customers', 'companies', 'billing', 'consulting', 'systemTickets', 'catalog', 'audit', 'internalDevelopment'] })) {
    for (const tab of tabs) assert.ok(moduleTabArtwork[module][tab], `${module}/${tab}`);
  }
  assert.match(read('BasicModules/Dashboard/PanelInicial.tsx'), /visibleSubTabs\.some\(tab => tab.id === 'integrations'\)/);
  assert.match(read('BasicModules/Dashboard/PanelInicial.tsx'), /<Integrations navigationInHeader/);
  assert.match(read('KioskCenter/MultiKioskCenterPage.tsx'), /items=\{canManageGlobal \?/);
  assert.match(read('PlatformAdmin/PlatformAdminPage.tsx'), /items=\{visibleTabs\.map/);
  assert.doesNotMatch(read('Training/TrainingPage.tsx'), /platformAdminApi|distributorPortalApi|commercial_account_type/);
  assert.match(read('Training/TrainingPage.tsx'), /navigation=\{<TrainingNavigation/);
  assert.doesNotMatch(read('Training/TrainingWorkspace.tsx'), /IndiceWorkspaceNavigation/);
});

test('AI header and standalone content share the same section and show only its corresponding workspace', () => {
  const runtime = hookRuntime(); let section = 'guide';
  const copy = { guide: { description: 'Connect your assistant' }, ideas: { description: 'Questions for your assistant' }, navigation: { connections: 'Connections', guide: 'Guide', ideas: 'Ideas' } };
  const { default: Integrations } = loadTypescript(resolve('src/app/BasicModules/Dashboard/Integrations/Integrations.tsx'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
    if (id === './translations') return { getIntegrationsTranslations: () => copy };
    if (id === './useIntegrationSection') return { useIntegrationSection: () => ({ section, setSection: value => { section = value; } }) };
    return tokens;
  });
  for (const [view, component] of [['guide', 'AiSetupGuide'], ['connections', 'ManageAiConnections'], ['ideas', 'AiQuestionIdeas']]) {
    section = view; runtime.render(() => Integrations({ navigationInHeader: true }));
    assert.ok(nodes(runtime.result).find(node => node.type === component));
    assert.equal(nodes(runtime.result).some(node => node.type === 'IndiceWorkspaceNavigation'), false);
  }
  runtime.render(() => Integrations({}));
  assert.equal(nodes(runtime.result).find(node => node.type === 'IndiceWorkspaceNavigation').props.variant, 'workbar'); runtime.unmount();
});

test('subscription pills keep the same draft and only reveal and focus their owning sections', () => {
  const runtime = hookRuntime(), calls = [];
  const targets = new Map();
  global.document = { querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 181 }) }), getElementById: id => {
    const target = { style: {}, scrollIntoView: options => calls.push(['scroll', id, options.block]), focus: () => calls.push(['focus', id]) }; targets.set(id, target); return target;
  } };
  const { BillingDecisionGuide } = loadTypescript(resolve('src/app/Billing/components/BillingDecisionGuide.tsx'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/paymentMethodPresentation')) return { paymentMethodPresentation: () => ({ label: 'Card' }) };
    if (id.endsWith('/paymentMethod')) return { getPaymentMethodCopy: () => ({}) };
    return tokens;
  });
  runtime.render(() => BillingDecisionGuide({ copy: { selected: () => '2 modules', licensedUsers: 'Users' }, languageCode: 'es-MX', licensedUsers: 4, selectedCount: 2, paymentMethod: {} }));
  assert.equal(runtime.result.props.variant, 'workbar');
  for (const section of ['people', 'payment', 'history', 'plan']) runtime.result.props.onValueChange(section);
  assert.deepEqual(calls, ['people','payment','history','plan'].flatMap(id => [['scroll', `billing-${id}`, 'start'], ['focus', `billing-${id}`]]));
  for (const target of targets.values()) assert.equal(target.style.scrollMarginTop, '197px');
  runtime.unmount();
});

test('Platform navigation restores its scoped preference without overwriting the history entry being left', async () => {
  const runtime = hookRuntime(); let memory, position = 0;
  const history = ['source=dashboard'];
  let params = new URLSearchParams(history[0]);
  global.window = { location: { search: '?'+history[0] } };
  const setParams = (update, options) => {
    params = typeof update === 'function' ? update(params) : update;
    if (options?.replace) history[position] = params.toString();
    else { history.splice(position + 1); history.push(params.toString()); position++; }
    window.location.search = '?'+params.toString();
  };
  const valid = value => ['customers','leads','billing','companies','systemTickets'].includes(value);
  const { usePlatformNavigation } = loadTypescript(resolve('src/app/PlatformAdmin/usePlatformNavigation.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react-router') return { useSearchParams: () => [params,setParams] };
    if (id.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { memory = options; } };
    throw Error(id);
  });
  const render = () => runtime.render(() => usePlatformNavigation('customers', valid));
  render(); await runtime.flush();
  memory.onRestore({ section: 'billing' }); render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'billing'); assert.equal(history.length, 1);
  assert.equal(new URLSearchParams(history[0]).get('section'), 'billing');
  assert.equal(memory.moduleKey, 'platform-admin'); assert.equal(memory.tabKey, 'primary-navigation');
  assert.equal(memory.urlFields, undefined, 'memory must not rewrite section URLs before the router commits');
  runtime.result.setActiveTab('leads'); render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'leads'); assert.equal(history.length, 2);
  assert.equal(new URLSearchParams(history[0]).get('section'), 'billing');
  params = new URLSearchParams(history[--position]); window.location.search = '?'+params; render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'billing');
  params = new URLSearchParams(history[++position]); window.location.search = '?'+params; render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'leads');
  memory.onRestore({ section: 'customers' }); render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'leads', 'direct section wins over stored preference');
  const count = history.length; runtime.result.setActiveTab('invalid'); assert.equal(history.length, count);
  params = new URLSearchParams('section=users'); window.location.search = '?'+params; render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'companies');
  params = new URLSearchParams('section=training'); window.location.search = '?'+params; render(); await runtime.flush();
  assert.equal(runtime.result.activeTab, 'customers'); runtime.unmount();
});


test('optional compact vertical workbar retains named folders and keyboard navigation',()=>{
 const selected=[];const {tree,runtime}=workbar({ariaLabel:'Folders',variant:'workbar',orientation:'vertical',iconOnly:true,value:'inbox',onValueChange:id=>selected.push(id),items:[{id:'inbox',label:'Inbox'},{id:'archive',label:'Archive',description:'INBOX.Archive'}]});
 const all=nodes(tree),nav=all.find(n=>n.type==='nav'),buttons=all.filter(n=>n.type==='button');
 assert.equal(nav.props['aria-orientation'],'vertical');
 assert.equal(all.some(n=>n.type==='IndiceHorizontalScrollControls'),false);
 assert.deepEqual(buttons.map(b=>b.props['aria-label']),['Inbox','Archive']);
 assert.equal(buttons[1].props.title,'Archive · INBOX.Archive');
 buttons[1].props.onClick();assert.deepEqual(selected,['archive']);runtime.unmount();
});
