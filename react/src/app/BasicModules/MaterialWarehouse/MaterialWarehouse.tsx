import { useMemo, useRef } from 'react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { materialActivities, materialRecords } from './data';
import { MaterialWarehouseKpis } from './components/MaterialWarehouseKpis';
import { MaterialWarehouseTableView } from './components/MaterialWarehouseTableView';
import type { MaterialTabId } from './types';

const tabIds = ['materials', 'receipts', 'providers', 'requests', 'fulfillments', 'movements', 'kpis'] as const;
const tabs = [
  { id: 'materials', label: 'Material inventory', icon: '📦' }, { id: 'receipts', label: 'Receipts', icon: '📥' }, { id: 'providers', label: 'Providers', icon: '🏢' }, { id: 'requests', label: 'Production requests', icon: '📋' }, { id: 'fulfillments', label: 'Production fulfillments', icon: '🚚' }, { id: 'movements', label: 'Movements', icon: '↔️' }, { id: 'kpis', label: 'KPIs', icon: '📈' },
] as const;

export default function MaterialWarehouse() {
  const contentRef = useRef<HTMLDivElement>(null);
  const { activeTab, setActiveTab } = useRoutedModuleTab<MaterialTabId>('materials', tabIds, {});
  const content = useMemo(() => {
    if (activeTab === 'materials') return <MaterialWarehouseTableView kind="materials" records={materialRecords} title="Material inventory" description="Monitor available, reserved, and minimum stock by material." actionLabel="Add material" />;
    if (activeTab === 'kpis') return <MaterialWarehouseKpis />;
    const configuration = { receipts: ['Material receipts', 'Record supplier deliveries, origin evidence, and certificate attachments.', 'Create receipt'], providers: ['Providers', 'Shared provider directory for material supply and compliance evidence.', 'Open provider'], requests: ['Production requests', 'Review material requests created for planned production lots.', 'Review request'], fulfillments: ['Production fulfillments', 'Confirm the physical issue of materials to production.', 'Create fulfillment'], movements: ['Material movements', 'Trace every receipt, issue, adjustment, and return.', 'Export movements'] } as const;
    const [title, description, actionLabel] = configuration[activeTab];
    return <MaterialWarehouseTableView kind="activity" records={materialActivities} title={title} description={description} actionLabel={actionLabel} />;
  }, [activeTab]);
  return <IndiceModuleShell activeTab={activeTab} contentRef={contentRef} currentModule="material-warehouse" onTabChange={setActiveTab} subtitle="Manage raw materials, supplier evidence, production reservations, and traceability." tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon }))} title="Material warehouse" tone="coral"><div ref={contentRef}>{content}</div></IndiceModuleShell>;
}
